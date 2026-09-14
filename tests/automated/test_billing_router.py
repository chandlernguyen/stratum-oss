"""
Unit tests for billing router endpoints and webhook handlers.

Tests verify:
- Checkout session creation (with/without existing Stripe customer)
- Customer portal session creation
- Subscription status queries
- Webhook signature verification and event routing
- All 4 webhook event handlers
- WEBHOOK_HANDLERS mapping

All external dependencies (Stripe SDK, Supabase) are mocked.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import stripe


# ── Helpers ──────────────────────────────────────────────────────────────


def _mock_supabase_chain(data, *, is_list=False, seats_used=0, clients_used=0, can_manage=True):
    """Build a mock Supabase client with chained query methods.

    Args:
        data: The data to return from the organization lookup.
        is_list: If True, return data as a list result (no .single()).
        seats_used: Value for the active-member count. This must be a real int:
            get_subscription computes ``seats_used > max_seats``, and comparing
            an unconfigured MagicMock against an int raises TypeError.
        clients_used: Value returned by the ``count_active_clients`` RPC.
        can_manage: Value returned by the ``user_has_permission`` RPC. Defaults
            to True so tests exercise the endpoint they name rather than being
            short-circuited by the 403 owner check; pass False to test that
            check explicitly.

    The client is routed per table rather than returning one shared MagicMock,
    because ``.table()`` is called for both ``organizations`` and ``users``.
    """
    org_result = MagicMock(data=data)

    table_chains = {}

    def _table(name):
        chain = MagicMock()
        if name == "organizations":
            chain.select.return_value.eq.return_value.single.return_value.execute.return_value = org_result
        elif name == "users":
            # .select("id", count="exact").eq(...).is_(...).execute()
            chain.select.return_value.eq.return_value.is_.return_value.execute.return_value = MagicMock(
                data=[], count=seats_used
            )
        # update chain, used by the grace-period auto-start path
        chain.update.return_value.eq.return_value.execute.return_value = org_result
        table_chains.setdefault(name, chain)
        return chain

    rpc_results = {
        "count_active_clients": clients_used,
        "user_has_permission": can_manage,
    }

    def _rpc(fn_name, *args, **kwargs):
        result = MagicMock()
        result.execute.return_value = MagicMock(data=rpc_results.get(fn_name, 0))
        return result

    mock = MagicMock()
    mock.table.side_effect = _table
    mock.rpc.side_effect = _rpc
    # Exposed so tests can assert on a specific table's query chain, e.g.
    # mock.table_chains["organizations"].update.call_args
    mock.table_chains = table_chains
    return mock


def _make_user(org_id="org-123", email="test@test.com", user_id="user-1"):
    return {"org_id": org_id, "email": email, "id": user_id}


# ── TestCreateCheckoutSession ────────────────────────────────────────────


class TestCreateCheckoutSession:
    """Tests for POST /api/v1/billing/create-checkout-session."""

    @pytest.mark.asyncio
    async def test_happy_path_existing_stripe_customer(self):
        """When org already has a stripe_customer_id, skip Customer.create."""
        from apps.api.routers.billing import create_checkout_session, CreateCheckoutRequest

        user = _make_user()
        data = CreateCheckoutRequest(
            price_id="price_solo",
            success_url="https://app.test/success",
            cancel_url="https://app.test/cancel",
        )
        mock_sb = _mock_supabase_chain(
            {"id": "org-123", "stripe_customer_id": "cus_existing", "name": "Test Org"}
        )

        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/session_123"
        mock_session.id = "cs_123"

        with (
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
            patch("apps.api.routers.billing.stripe.checkout.Session.create", return_value=mock_session) as mock_create,
            patch("apps.api.routers.billing.stripe.Customer.create") as mock_cust_create,
        ):
            result = await create_checkout_session(data=data, current_user=user)

        mock_cust_create.assert_not_called()
        assert result["checkout_url"] == "https://checkout.stripe.com/session_123"
        assert result["session_id"] == "cs_123"

    @pytest.mark.asyncio
    async def test_auto_creates_stripe_customer_when_none(self):
        """When org has no stripe_customer_id, create one via Stripe."""
        from apps.api.routers.billing import create_checkout_session, CreateCheckoutRequest

        user = _make_user()
        data = CreateCheckoutRequest(
            price_id="price_solo",
            success_url="https://app.test/success",
            cancel_url="https://app.test/cancel",
        )
        mock_sb = _mock_supabase_chain(
            {"id": "org-123", "stripe_customer_id": None, "name": "Test Org"}
        )

        mock_customer = MagicMock()
        mock_customer.id = "cus_new_123"
        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/new"
        mock_session.id = "cs_new"

        with (
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
            patch("apps.api.routers.billing.stripe.Customer.create", return_value=mock_customer) as mock_cust,
            patch("apps.api.routers.billing.stripe.checkout.Session.create", return_value=mock_session),
        ):
            result = await create_checkout_session(data=data, current_user=user)

        mock_cust.assert_called_once()
        call_kwargs = mock_cust.call_args
        assert call_kwargs.kwargs["email"] == "test@test.com"
        assert result["checkout_url"] == "https://checkout.stripe.com/new"

    @pytest.mark.asyncio
    async def test_400_when_no_org_id(self):
        """Returns 400 when user has no org_id."""
        from apps.api.routers.billing import create_checkout_session, CreateCheckoutRequest
        from fastapi import HTTPException

        user = {"email": "orphan@test.com", "id": "user-1"}
        data = CreateCheckoutRequest(
            price_id="price_solo",
            success_url="https://app.test/success",
            cancel_url="https://app.test/cancel",
        )
        with pytest.raises(HTTPException) as exc_info:
            await create_checkout_session(data=data, current_user=user)
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_404_when_org_not_found(self):
        """Returns 404 when org doesn't exist in DB."""
        from apps.api.routers.billing import create_checkout_session, CreateCheckoutRequest
        from fastapi import HTTPException

        user = _make_user()
        data = CreateCheckoutRequest(
            price_id="price_solo",
            success_url="https://app.test/success",
            cancel_url="https://app.test/cancel",
        )
        mock_sb = _mock_supabase_chain(None)

        with (
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
            pytest.raises(HTTPException) as exc_info,
        ):
            await create_checkout_session(data=data, current_user=user)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_correct_params_to_checkout_session_create(self):
        """Stripe checkout.Session.create called with correct mode, line_items, metadata."""
        from apps.api.routers.billing import create_checkout_session, CreateCheckoutRequest

        user = _make_user()
        data = CreateCheckoutRequest(
            price_id="price_team",
            success_url="https://app.test/success",
            cancel_url="https://app.test/cancel",
        )
        mock_sb = _mock_supabase_chain(
            {"id": "org-123", "stripe_customer_id": "cus_existing", "name": "Test Org"}
        )
        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/test"
        mock_session.id = "cs_test"

        with (
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
            patch("apps.api.routers.billing.stripe.checkout.Session.create", return_value=mock_session) as mock_create,
        ):
            await create_checkout_session(data=data, current_user=user)

        mock_create.assert_called_once()
        kwargs = mock_create.call_args.kwargs
        assert kwargs["mode"] == "subscription"
        assert kwargs["line_items"] == [{"price": "price_team", "quantity": 1}]
        assert kwargs["metadata"] == {"org_id": "org-123"}

    @pytest.mark.asyncio
    async def test_org_id_in_subscription_data_metadata(self):
        """org_id should appear in subscription_data.metadata for webhook matching."""
        from apps.api.routers.billing import create_checkout_session, CreateCheckoutRequest

        user = _make_user(org_id="org-456")
        data = CreateCheckoutRequest(
            price_id="price_solo",
            success_url="https://app.test/success",
            cancel_url="https://app.test/cancel",
        )
        mock_sb = _mock_supabase_chain(
            {"id": "org-456", "stripe_customer_id": "cus_456", "name": "Test Org"}
        )
        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/test"
        mock_session.id = "cs_test"

        with (
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
            patch("apps.api.routers.billing.stripe.checkout.Session.create", return_value=mock_session) as mock_create,
        ):
            await create_checkout_session(data=data, current_user=user)

        kwargs = mock_create.call_args.kwargs
        assert kwargs["subscription_data"]["metadata"]["org_id"] == "org-456"

    @pytest.mark.asyncio
    async def test_response_contains_checkout_url_and_session_id(self):
        """Response must include checkout_url and session_id."""
        from apps.api.routers.billing import create_checkout_session, CreateCheckoutRequest

        user = _make_user()
        data = CreateCheckoutRequest(
            price_id="price_solo",
            success_url="https://app.test/success",
            cancel_url="https://app.test/cancel",
        )
        mock_sb = _mock_supabase_chain(
            {"id": "org-123", "stripe_customer_id": "cus_existing", "name": "Org"}
        )
        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/abc"
        mock_session.id = "cs_abc"

        with (
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
            patch("apps.api.routers.billing.stripe.checkout.Session.create", return_value=mock_session),
        ):
            result = await create_checkout_session(data=data, current_user=user)

        assert "checkout_url" in result
        assert "session_id" in result
        assert result["checkout_url"] == "https://checkout.stripe.com/abc"
        assert result["session_id"] == "cs_abc"


# ── TestCreatePortalSession ──────────────────────────────────────────────


class TestCreatePortalSession:
    """Tests for POST /api/v1/billing/create-portal-session."""

    @pytest.mark.asyncio
    async def test_happy_path_returns_portal_url(self):
        from apps.api.routers.billing import create_portal_session, CreatePortalRequest

        user = _make_user()
        data = CreatePortalRequest(return_url="https://app.test/settings")
        mock_sb = _mock_supabase_chain({"stripe_customer_id": "cus_existing"})

        mock_portal = MagicMock()
        mock_portal.url = "https://billing.stripe.com/portal_abc"

        with (
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
            patch("apps.api.routers.billing.stripe.billing_portal.Session.create", return_value=mock_portal),
        ):
            result = await create_portal_session(data=data, current_user=user)

        assert result["portal_url"] == "https://billing.stripe.com/portal_abc"

    @pytest.mark.asyncio
    async def test_400_when_no_org_id(self):
        from apps.api.routers.billing import create_portal_session, CreatePortalRequest
        from fastapi import HTTPException

        user = {"email": "orphan@test.com", "id": "user-1"}
        data = CreatePortalRequest(return_url="https://app.test/settings")

        with pytest.raises(HTTPException) as exc_info:
            await create_portal_session(data=data, current_user=user)
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_400_when_no_stripe_customer_id(self):
        """Should tell user to subscribe first."""
        from apps.api.routers.billing import create_portal_session, CreatePortalRequest
        from fastapi import HTTPException

        user = _make_user()
        data = CreatePortalRequest(return_url="https://app.test/settings")
        mock_sb = _mock_supabase_chain({"stripe_customer_id": None})

        with (
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
            pytest.raises(HTTPException) as exc_info,
        ):
            await create_portal_session(data=data, current_user=user)
        assert exc_info.value.status_code == 400
        assert "subscribe" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_400_when_org_data_is_none(self):
        from apps.api.routers.billing import create_portal_session, CreatePortalRequest
        from fastapi import HTTPException

        user = _make_user()
        data = CreatePortalRequest(return_url="https://app.test/settings")
        mock_sb = _mock_supabase_chain(None)

        with (
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
            pytest.raises(HTTPException) as exc_info,
        ):
            await create_portal_session(data=data, current_user=user)
        assert exc_info.value.status_code == 400


# ── TestGetSubscription ──────────────────────────────────────────────────


class TestGetSubscription:
    """Tests for GET /api/v1/billing/subscription."""

    @pytest.mark.asyncio
    async def test_returns_correct_tier_status_seats(self):
        from apps.api.routers.billing import get_subscription

        user = _make_user()
        mock_sb = _mock_supabase_chain({
            "subscription_tier": "team",
            "subscription_status": "active",
            "stripe_subscription_id": "sub_abc",
            "trial_ends_at": None,
            "subscription_period_end": "1735689600",
        })

        with patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb):
            result = await get_subscription(current_user=user)

        assert result.tier == "team"
        assert result.status == "active"
        assert result.max_seats == 3
        assert result.stripe_subscription_id == "sub_abc"

    @pytest.mark.asyncio
    async def test_free_tier_defaults(self):
        """When org has free tier defaults from DB, endpoint returns expected values."""
        from apps.api.routers.billing import get_subscription

        user = _make_user()
        mock_sb = _mock_supabase_chain({
            "subscription_tier": "free",
            "subscription_status": "inactive",
            "stripe_subscription_id": None,
            "trial_ends_at": None,
            "subscription_period_end": None,
        })

        with patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb):
            result = await get_subscription(current_user=user)

        assert result.tier == "free"
        assert result.status == "inactive"
        assert result.max_seats == 1
        assert result.stripe_subscription_id is None

    @pytest.mark.asyncio
    async def test_400_when_no_org_id(self):
        from apps.api.routers.billing import get_subscription
        from fastapi import HTTPException

        user = {"email": "orphan@test.com", "id": "user-1"}

        with pytest.raises(HTTPException) as exc_info:
            await get_subscription(current_user=user)
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_404_when_org_not_found(self):
        from apps.api.routers.billing import get_subscription
        from fastapi import HTTPException

        user = _make_user()
        mock_sb = _mock_supabase_chain(None)

        with (
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
            pytest.raises(HTTPException) as exc_info,
        ):
            await get_subscription(current_user=user)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_max_seats_maps_correctly_per_tier(self):
        """solo=1, team=3, agency=10, unknown tier=1."""
        from apps.api.routers.billing import get_subscription

        expected = {"solo": 1, "team": 3, "agency": 10, "custom": 1}
        for tier, expected_seats in expected.items():
            user = _make_user()
            mock_sb = _mock_supabase_chain({
                "subscription_tier": tier,
                "subscription_status": "active",
                "stripe_subscription_id": None,
                "trial_ends_at": None,
                "subscription_period_end": None,
            })

            with patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb):
                result = await get_subscription(current_user=user)

            assert result.max_seats == expected_seats, f"tier={tier} expected {expected_seats} seats, got {result.max_seats}"


# ── TestWebhookEndpoint ──────────────────────────────────────────────────


class TestWebhookEndpoint:
    """Tests for POST /api/v1/billing/webhook."""

    def _make_request(self, sig_header="whsec_test_sig", body=b'{"test": true}'):
        mock_request = AsyncMock()
        mock_request.body = AsyncMock(return_value=body)
        mock_request.headers = {}
        if sig_header is not None:
            mock_request.headers["stripe-signature"] = sig_header
        return mock_request

    @pytest.mark.asyncio
    async def test_400_when_signature_header_missing(self):
        from apps.api.routers.billing import stripe_webhook
        from fastapi import HTTPException

        request = self._make_request(sig_header=None)

        with pytest.raises(HTTPException) as exc_info:
            await stripe_webhook(request)
        assert exc_info.value.status_code == 400
        assert "signature" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_400_when_signature_verification_fails(self):
        from apps.api.routers.billing import stripe_webhook
        from fastapi import HTTPException

        request = self._make_request()

        with (
            patch("apps.api.routers.billing.STRIPE_WEBHOOK_SECRET", "whsec_configured"),
            patch(
                "apps.api.routers.billing.stripe.Webhook.construct_event",
                side_effect=stripe.SignatureVerificationError("bad sig", "whsec_test"),
            ),
            pytest.raises(HTTPException) as exc_info,
        ):
            await stripe_webhook(request)
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_500_when_webhook_secret_not_configured(self):
        from apps.api.routers.billing import stripe_webhook
        from fastapi import HTTPException

        request = self._make_request()

        with (
            patch("apps.api.routers.billing.STRIPE_WEBHOOK_SECRET", None),
            pytest.raises(HTTPException) as exc_info,
        ):
            await stripe_webhook(request)
        assert exc_info.value.status_code == 500

    @pytest.mark.asyncio
    async def test_200_for_unhandled_event_types(self):
        from apps.api.routers.billing import stripe_webhook

        request = self._make_request()
        mock_event = {"type": "customer.created", "data": {"object": {}}}

        with (
            patch("apps.api.routers.billing.STRIPE_WEBHOOK_SECRET", "whsec_test"),
            patch("apps.api.routers.billing.stripe.Webhook.construct_event", return_value=mock_event),
        ):
            result = await stripe_webhook(request)

        assert result["status"] == "ok"

    @pytest.mark.asyncio
    async def test_200_with_error_status_when_handler_raises(self):
        """Handler exceptions return 200 with error status to prevent Stripe retries."""
        from apps.api.routers.billing import stripe_webhook

        request = self._make_request()
        mock_event = {"type": "checkout.session.completed", "data": {"object": {}}}

        async def failing_handler(event):
            raise ValueError("DB connection failed")

        with (
            patch("apps.api.routers.billing.STRIPE_WEBHOOK_SECRET", "whsec_test"),
            patch("apps.api.routers.billing.stripe.Webhook.construct_event", return_value=mock_event),
            patch("apps.api.routers.billing.WEBHOOK_HANDLERS", {"checkout.session.completed": failing_handler}),
        ):
            result = await stripe_webhook(request)

        assert result["status"] == "error"


# ── TestHandleCheckoutCompleted ──────────────────────────────────────────


class TestHandleCheckoutCompleted:
    """Tests for handle_checkout_completed webhook handler."""

    @pytest.mark.asyncio
    async def test_activates_subscription_with_correct_tier(self):
        from apps.api.routers.billing import handle_checkout_completed

        event = {
            "data": {
                "object": {
                    "id": "cs_123",
                    "metadata": {"org_id": "org-123"},
                    "subscription": "sub_123",
                    "customer": "cus_123",
                }
            }
        }

        mock_subscription = {
            "items": {"data": [{"price": {"id": "price_team_123"}}]},
            "current_period_end": 1735689600,
        }
        mock_sb = _mock_supabase_chain({})

        with (
            patch("apps.api.routers.billing.PRICE_TO_TIER", {"price_team_123": "team"}),
            patch("apps.api.routers.billing.stripe.Subscription.retrieve", return_value=mock_subscription),
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
        ):
            await handle_checkout_completed(event)

        # Verify the update was called
        update_call = mock_sb.table_chains["organizations"].update
        update_call.assert_called_once()
        update_data = update_call.call_args[0][0]
        assert update_data["subscription_status"] == "active"
        assert update_data["subscription_tier"] == "team"
        assert update_data["stripe_subscription_id"] == "sub_123"

    @pytest.mark.asyncio
    async def test_early_return_when_no_org_id(self):
        from apps.api.routers.billing import handle_checkout_completed

        event = {
            "data": {
                "object": {
                    "id": "cs_123",
                    "metadata": {},
                    "subscription": "sub_123",
                }
            }
        }

        with patch("apps.api.routers.billing.get_service_role_client") as mock_client:
            await handle_checkout_completed(event)
            mock_client.assert_not_called()

    @pytest.mark.asyncio
    async def test_early_return_when_no_subscription(self):
        from apps.api.routers.billing import handle_checkout_completed

        event = {
            "data": {
                "object": {
                    "id": "cs_123",
                    "metadata": {"org_id": "org-123"},
                    "subscription": None,
                }
            }
        }

        with patch("apps.api.routers.billing.get_service_role_client") as mock_client:
            await handle_checkout_completed(event)
            mock_client.assert_not_called()

    @pytest.mark.asyncio
    async def test_defaults_to_solo_for_unknown_price_id(self):
        from apps.api.routers.billing import handle_checkout_completed

        event = {
            "data": {
                "object": {
                    "id": "cs_123",
                    "metadata": {"org_id": "org-123"},
                    "subscription": "sub_123",
                    "customer": "cus_123",
                }
            }
        }
        mock_subscription = {
            "items": {"data": [{"price": {"id": "price_unknown_xyz"}}]},
            "current_period_end": 1735689600,
        }
        mock_sb = _mock_supabase_chain({})

        with (
            patch("apps.api.routers.billing.PRICE_TO_TIER", {}),
            patch("apps.api.routers.billing.stripe.Subscription.retrieve", return_value=mock_subscription),
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
        ):
            await handle_checkout_completed(event)

        update_data = mock_sb.table_chains["organizations"].update.call_args[0][0]
        assert update_data["subscription_tier"] == "solo"


# ── TestHandleSubscriptionUpdated ────────────────────────────────────────


class TestHandleSubscriptionUpdated:
    """Tests for handle_subscription_updated webhook handler."""

    def _make_event(self, status, org_id="org-123", price_id="price_team"):
        return {
            "data": {
                "object": {
                    "id": "sub_123",
                    "metadata": {"org_id": org_id},
                    "status": status,
                    "items": {"data": [{"price": {"id": price_id}}]},
                    "current_period_end": 1735689600,
                }
            }
        }

    @pytest.mark.asyncio
    async def test_active_maps_to_active(self):
        from apps.api.routers.billing import handle_subscription_updated

        event = self._make_event("active")
        mock_sb = _mock_supabase_chain({})

        with (
            patch("apps.api.routers.billing.PRICE_TO_TIER", {"price_team": "team"}),
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
        ):
            await handle_subscription_updated(event)

        update_data = mock_sb.table_chains["organizations"].update.call_args[0][0]
        assert update_data["subscription_status"] == "active"

    @pytest.mark.asyncio
    async def test_past_due_maps_to_past_due(self):
        from apps.api.routers.billing import handle_subscription_updated

        event = self._make_event("past_due")
        mock_sb = _mock_supabase_chain({})

        with (
            patch("apps.api.routers.billing.PRICE_TO_TIER", {"price_team": "team"}),
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
        ):
            await handle_subscription_updated(event)

        update_data = mock_sb.table_chains["organizations"].update.call_args[0][0]
        assert update_data["subscription_status"] == "past_due"

    @pytest.mark.asyncio
    async def test_canceled_maps_to_canceled(self):
        from apps.api.routers.billing import handle_subscription_updated

        event = self._make_event("canceled")
        mock_sb = _mock_supabase_chain({})

        with (
            patch("apps.api.routers.billing.PRICE_TO_TIER", {"price_team": "team"}),
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
        ):
            await handle_subscription_updated(event)

        update_data = mock_sb.table_chains["organizations"].update.call_args[0][0]
        assert update_data["subscription_status"] == "canceled"

    @pytest.mark.asyncio
    async def test_trialing_maps_to_trial(self):
        from apps.api.routers.billing import handle_subscription_updated

        event = self._make_event("trialing")
        mock_sb = _mock_supabase_chain({})

        with (
            patch("apps.api.routers.billing.PRICE_TO_TIER", {"price_team": "team"}),
            patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb),
        ):
            await handle_subscription_updated(event)

        update_data = mock_sb.table_chains["organizations"].update.call_args[0][0]
        assert update_data["subscription_status"] == "trial"

    @pytest.mark.asyncio
    async def test_early_return_when_no_org_id(self):
        from apps.api.routers.billing import handle_subscription_updated

        event = {
            "data": {
                "object": {
                    "id": "sub_123",
                    "metadata": {},
                    "status": "active",
                    "items": {"data": [{"price": {"id": "price_team"}}]},
                }
            }
        }

        with patch("apps.api.routers.billing.get_service_role_client") as mock_client:
            await handle_subscription_updated(event)
            mock_client.assert_not_called()


# ── TestHandleSubscriptionDeleted ────────────────────────────────────────


class TestHandleSubscriptionDeleted:
    """Tests for handle_subscription_deleted webhook handler."""

    @pytest.mark.asyncio
    async def test_resets_to_free_canceled(self):
        from apps.api.routers.billing import handle_subscription_deleted

        event = {
            "data": {
                "object": {
                    "id": "sub_123",
                    "metadata": {"org_id": "org-123"},
                }
            }
        }
        mock_sb = _mock_supabase_chain({})

        with patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb):
            await handle_subscription_deleted(event)

        update_data = mock_sb.table_chains["organizations"].update.call_args[0][0]
        assert update_data["subscription_tier"] == "free"
        assert update_data["subscription_status"] == "canceled"
        assert update_data["stripe_subscription_id"] is None
        assert update_data["stripe_price_id"] is None

    @pytest.mark.asyncio
    async def test_sets_max_users_to_1(self):
        from apps.api.routers.billing import handle_subscription_deleted

        event = {
            "data": {
                "object": {
                    "id": "sub_123",
                    "metadata": {"org_id": "org-123"},
                }
            }
        }
        mock_sb = _mock_supabase_chain({})

        with patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb):
            await handle_subscription_deleted(event)

        update_data = mock_sb.table_chains["organizations"].update.call_args[0][0]
        assert update_data["max_users"] == 1

    @pytest.mark.asyncio
    async def test_early_return_when_no_org_id(self):
        from apps.api.routers.billing import handle_subscription_deleted

        event = {
            "data": {
                "object": {
                    "id": "sub_123",
                    "metadata": {},
                }
            }
        }

        with patch("apps.api.routers.billing.get_service_role_client") as mock_client:
            await handle_subscription_deleted(event)
            mock_client.assert_not_called()


# ── TestHandlePaymentFailed ──────────────────────────────────────────────


class TestHandlePaymentFailed:
    """Tests for handle_payment_failed webhook handler."""

    @pytest.mark.asyncio
    async def test_sets_past_due_when_org_found(self):
        from apps.api.routers.billing import handle_payment_failed

        event = {
            "data": {
                "object": {
                    "customer": "cus_123",
                }
            }
        }
        mock_sb = MagicMock()
        # .select().eq().execute() returns a list (no .single())
        mock_sb.table_chains["organizations"].select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "org-123"}]
        )
        mock_sb.table_chains["organizations"].update.return_value.eq.return_value.execute.return_value = MagicMock(data={})

        with patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb):
            await handle_payment_failed(event)

        # Verify update was called with past_due
        update_call = mock_sb.table_chains["organizations"].update
        update_call.assert_called_once_with({"subscription_status": "past_due"})

    @pytest.mark.asyncio
    async def test_early_return_when_no_customer(self):
        from apps.api.routers.billing import handle_payment_failed

        event = {
            "data": {
                "object": {
                    "customer": None,
                }
            }
        }

        with patch("apps.api.routers.billing.get_service_role_client") as mock_client:
            await handle_payment_failed(event)
            mock_client.assert_not_called()

    @pytest.mark.asyncio
    async def test_no_update_when_org_not_found(self):
        from apps.api.routers.billing import handle_payment_failed

        event = {
            "data": {
                "object": {
                    "customer": "cus_unknown",
                }
            }
        }
        mock_sb = MagicMock()
        mock_sb.table_chains["organizations"].select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        with patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb):
            await handle_payment_failed(event)

        # update should not be called when no org found
        mock_sb.table_chains["organizations"].update.assert_not_called()

    @pytest.mark.asyncio
    async def test_updates_only_first_matched_org(self):
        """If somehow multiple orgs match, only the first is updated."""
        from apps.api.routers.billing import handle_payment_failed

        event = {
            "data": {
                "object": {
                    "customer": "cus_dup",
                }
            }
        }
        mock_sb = MagicMock()
        mock_sb.table_chains["organizations"].select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "org-first"}, {"id": "org-second"}]
        )
        mock_sb.table_chains["organizations"].update.return_value.eq.return_value.execute.return_value = MagicMock(data={})

        with patch("apps.api.routers.billing.get_service_role_client", return_value=mock_sb):
            await handle_payment_failed(event)

        # Should use org_response.data[0]["id"] = "org-first"
        eq_call = mock_sb.table_chains["organizations"].update.return_value.eq
        eq_call.assert_called_once_with("id", "org-first")


# ── TestWebhookHandlersMapping ───────────────────────────────────────────


class TestWebhookHandlersMapping:
    """Verify the WEBHOOK_HANDLERS dict is configured correctly."""

    def test_has_exactly_4_event_types(self):
        from apps.api.routers.billing import WEBHOOK_HANDLERS

        expected_keys = {
            "checkout.session.completed",
            "customer.subscription.updated",
            "customer.subscription.deleted",
            "invoice.payment_failed",
        }
        assert set(WEBHOOK_HANDLERS.keys()) == expected_keys
        assert len(WEBHOOK_HANDLERS) == 4
