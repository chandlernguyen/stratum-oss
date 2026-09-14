"""
Stripe billing endpoints for STRAŦUM commercialization.

Handles:
- Checkout session creation (authenticated)
- Customer portal session (authenticated)
- Webhook processing (PUBLIC - Stripe signature verification)
- Subscription status queries (authenticated)

Pricing tiers: Solo ($29/mo), Team ($79/mo), Agency ($199/mo)
All tiers get all 9 agents. Differentiation: seats + org type + client capacity.
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.database import get_service_role_client

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# Price ID → tier mapping
PRICE_TO_TIER = {
    os.getenv("STRIPE_PRICE_SOLO", ""): "solo",
    os.getenv("STRIPE_PRICE_TEAM", ""): "team",
    os.getenv("STRIPE_PRICE_AGENCY", ""): "agency",
}

# Tier → max seats
TIER_SEATS = {
    "solo": 1,
    "team": 3,
    "agency": 10,
}

# Tier → max clients
TIER_CLIENTS = {
    "solo": 0,
    "team": 0,
    "agency": 5,
    "free": 0,
}

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])


async def get_or_create_stripe_customer(
    org_id: str, customer_id: str | None, email: str, org_name: str, user_id: str
) -> str:
    """
    Validate existing Stripe customer or create a new one.

    Handles stale/fake customer IDs (e.g., seed data) by catching Stripe errors
    and auto-creating a real customer. Updates the organization record.
    """
    supabase = get_service_role_client()

    # If we have a customer ID, verify it's real
    if customer_id:
        try:
            stripe.Customer.retrieve(customer_id)
            return customer_id
        except stripe.InvalidRequestError:
            logger.warning(f"Stale Stripe customer ID '{customer_id}' for org {org_id}, creating new one")
            # Clear the stale ID before creating a new one
            supabase.table("organizations").update(
                {"stripe_customer_id": None}
            ).eq("id", org_id).execute()

    # Create a real Stripe customer
    customer = stripe.Customer.create(
        email=email,
        name=org_name,
        metadata={
            "org_id": str(org_id),
            "user_id": str(user_id),
        },
    )

    supabase.table("organizations").update(
        {"stripe_customer_id": customer.id}
    ).eq("id", org_id).execute()

    logger.info(f"Created Stripe customer {customer.id} for org {org_id}")
    return customer.id


# ── Request/Response Models ──────────────────────────────────────────

class CreateCheckoutRequest(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str


class CreatePortalRequest(BaseModel):
    return_url: str


class SubscriptionResponse(BaseModel):
    tier: str
    status: str
    stripe_subscription_id: str | None = None
    trial_ends_at: str | None = None
    period_end: str | None = None
    max_seats: int = 1
    seats_used: int = 0
    can_manage_billing: bool = False
    max_clients: int = 0
    clients_used: int = 0
    over_seat_limit: bool = False
    over_client_limit: bool = False
    grace_period_started_at: str | None = None
    grace_period_ends_at: str | None = None
    grace_period_days_remaining: int | None = None
    is_read_only: bool = False
    is_trial_expired: bool = False


# ── Authenticated Endpoints ──────────────────────────────────────────

@router.post("/create-checkout-session")
async def create_checkout_session(
    data: CreateCheckoutRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a Stripe Checkout session for subscription signup."""
    org_id = current_user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization found")

    supabase = get_service_role_client()

    # Check billing manage permission
    perm = supabase.rpc("user_has_permission", {
        "p_user_id": current_user.get("id"),
        "p_org_id": org_id,
        "p_permission_name": "organization.billing.manage",
    }).execute()
    if not perm.data:
        raise HTTPException(status_code=403, detail="Only organization owners can manage billing")

    # Get or create Stripe customer
    org_response = supabase.table("organizations").select(
        "id, stripe_customer_id, name"
    ).eq("id", org_id).single().execute()

    if not org_response.data:
        raise HTTPException(status_code=404, detail="Organization not found")

    org = org_response.data

    customer_id = await get_or_create_stripe_customer(
        org_id=org_id,
        customer_id=org.get("stripe_customer_id"),
        email=current_user.get("email"),
        org_name=org.get("name"),
        user_id=current_user.get("id"),
    )

    # Create checkout session
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": data.price_id, "quantity": 1}],
        success_url=data.success_url,
        cancel_url=data.cancel_url,
        metadata={"org_id": str(org_id)},
        subscription_data={
            "metadata": {"org_id": str(org_id)},
        },
    )

    return {"checkout_url": session.url, "session_id": session.id}


@router.post("/create-portal-session")
async def create_portal_session(
    data: CreatePortalRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a Stripe Customer Portal session for managing subscription."""
    org_id = current_user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization found")

    supabase = get_service_role_client()

    # Check billing manage permission
    perm = supabase.rpc("user_has_permission", {
        "p_user_id": current_user.get("id"),
        "p_org_id": org_id,
        "p_permission_name": "organization.billing.manage",
    }).execute()
    if not perm.data:
        raise HTTPException(status_code=403, detail="Only organization owners can manage billing")

    org_response = supabase.table("organizations").select(
        "stripe_customer_id, name"
    ).eq("id", org_id).single().execute()

    if not org_response.data:
        raise HTTPException(status_code=404, detail="Organization not found")

    customer_id = org_response.data.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No billing account found. Please subscribe first.")

    # Validate customer exists in Stripe (handles stale/fake IDs)
    try:
        stripe.Customer.retrieve(customer_id)
    except stripe.InvalidRequestError:
        raise HTTPException(status_code=400, detail="No billing account found. Please subscribe first.")

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=data.return_url,
    )

    return {"portal_url": session.url}


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get current subscription status for the user's organization."""
    org_id = current_user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization found")

    supabase = get_service_role_client()

    org_response = supabase.table("organizations").select(
        "subscription_tier, subscription_status, stripe_subscription_id, "
        "trial_ends_at, subscription_period_end, max_clients, type, "
        "grace_period_started_at, grace_period_ends_at"
    ).eq("id", org_id).single().execute()

    if not org_response.data:
        raise HTTPException(status_code=404, detail="Organization not found")

    org = org_response.data
    tier = org.get("subscription_tier", "free")

    # Database-first: auto-start grace period for grandfathered orgs on first access
    if org.get("subscription_status") == "grandfathered" and not org.get("grace_period_started_at"):
        now = datetime.now(timezone.utc)
        ends_at = now + timedelta(days=45)
        supabase.table("organizations").update({
            "grace_period_started_at": now.isoformat(),
            "grace_period_ends_at": ends_at.isoformat(),
        }).eq("id", org_id).execute()
        org["grace_period_started_at"] = now.isoformat()
        org["grace_period_ends_at"] = ends_at.isoformat()
        logger.info(f"Grace period auto-started: org={org_id}, ends_at={ends_at.isoformat()}")

    # Count current active members (exclude archived)
    members_response = supabase.table("users").select(
        "id", count="exact"
    ).eq("org_id", org_id).is_("archived_at", "null").execute()
    seats_used = members_response.count or 0

    # Count active clients via RPC (routes to correct schema)
    clients_result = supabase.rpc("count_active_clients", {
        "p_org_id": org_id,
    }).execute()
    clients_used = clients_result.data or 0

    # Check billing manage permission
    perm_response = supabase.rpc("user_has_permission", {
        "p_user_id": current_user.get("id"),
        "p_org_id": org_id,
        "p_permission_name": "organization.billing.manage",
    }).execute()
    can_manage = perm_response.data if isinstance(perm_response.data, bool) else False

    max_seats = TIER_SEATS.get(tier, 1)
    max_clients = TIER_CLIENTS.get(tier, 0)

    # Compute grace period state
    grace_started = org.get("grace_period_started_at")
    grace_ends = org.get("grace_period_ends_at")
    is_read_only = False
    days_remaining = None

    if org.get("subscription_status") == "grandfathered" and grace_ends:
        grace_ends_dt = datetime.fromisoformat(grace_ends.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        if now > grace_ends_dt:
            is_read_only = True
            days_remaining = 0
        else:
            days_remaining = max(0, (grace_ends_dt - now).days)

    # Check expired trial
    trial_expired = False
    if org.get("subscription_status") in ("trial", "trialing"):
        trial_ends = org.get("trial_ends_at")
        if trial_ends:
            trial_ends_dt = datetime.fromisoformat(trial_ends.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > trial_ends_dt:
                is_read_only = True
                trial_expired = True

    return SubscriptionResponse(
        tier=tier,
        status=org.get("subscription_status", "inactive"),
        stripe_subscription_id=org.get("stripe_subscription_id"),
        trial_ends_at=org.get("trial_ends_at"),
        period_end=org.get("subscription_period_end"),
        max_seats=max_seats,
        seats_used=seats_used,
        can_manage_billing=can_manage,
        max_clients=max_clients,
        clients_used=clients_used,
        over_seat_limit=seats_used > max_seats,
        over_client_limit=clients_used > max_clients,
        grace_period_started_at=grace_started,
        grace_period_ends_at=grace_ends,
        grace_period_days_remaining=days_remaining,
        is_read_only=is_read_only,
        is_trial_expired=trial_expired,
    )


# ── Webhook (PUBLIC - no auth, Stripe signature verification) ────────

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events.

    This endpoint is PUBLIC — authentication is via Stripe signature verification,
    not user JWT. Stripe retries failed webhooks for up to 72 hours.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")

    if not STRIPE_WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        raise HTTPException(status_code=500, detail="Webhook not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except stripe.SignatureVerificationError:
        logger.warning("Invalid Stripe webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    logger.info(f"Stripe webhook received: {event['type']}")

    # Route to handler
    handler = WEBHOOK_HANDLERS.get(event["type"])
    if handler:
        try:
            await handler(event)
        except Exception as e:
            logger.error(f"Webhook handler error for {event['type']}: {e}", exc_info=True)
            # Return 200 to prevent Stripe retries for application errors
            # Log the error for manual investigation
            return {"status": "error", "message": str(e)}
    else:
        logger.info(f"Unhandled webhook event type: {event['type']}")

    return {"status": "ok"}


# ── Webhook Helpers ──────────────────────────────────────────────────

async def auto_revoke_excess_invitations(org_id: str, new_max_users: int):
    """
    Auto-revoke pending invitations that exceed the new seat limit after downgrade.
    Revokes newest invitations first (LIFO), preserving older ones.
    """
    supabase = get_service_role_client()

    # Count current active members (non-archived)
    members = supabase.table("users").select(
        "id", count="exact"
    ).eq("org_id", org_id).is_("archived_at", "null").execute()
    current_members = members.count or 0

    # Get pending invitations ordered newest first
    invitations = supabase.table("team_invitations").select(
        "id, email, created_at"
    ).eq("org_id", org_id).eq("status", "pending").order(
        "created_at", desc=True
    ).execute()

    pending = invitations.data or []
    available_for_pending = max(0, new_max_users - current_members)

    # Revoke excess (newest first)
    to_revoke = pending[available_for_pending:]
    for inv in to_revoke:
        supabase.table("team_invitations").update({
            "status": "revoked",
        }).eq("id", inv["id"]).execute()
        logger.info(f"Auto-revoked invitation {inv['id']} ({inv['email']}) for org {org_id} due to downgrade")

    if to_revoke:
        logger.info(f"Auto-revoked {len(to_revoke)} excess pending invitations for org {org_id}")


# ── Webhook Event Handlers ───────────────────────────────────────────

async def handle_checkout_completed(event: dict):
    """Activate subscription after successful checkout."""
    session = event["data"]["object"]
    org_id = session.get("metadata", {}).get("org_id")
    subscription_id = session.get("subscription")

    if not org_id or not subscription_id:
        logger.error(f"Missing org_id or subscription_id in checkout session: {session.get('id')}")
        return

    # Fetch subscription details from Stripe
    subscription = stripe.Subscription.retrieve(subscription_id)
    sub_item = subscription["items"]["data"][0]
    price_id = sub_item["price"]["id"]
    tier = PRICE_TO_TIER.get(price_id, "solo")

    supabase = get_service_role_client()
    supabase.table("organizations").update({
        "subscription_tier": tier,
        "subscription_status": "active",
        "stripe_subscription_id": subscription_id,
        "stripe_customer_id": session.get("customer"),
        "stripe_price_id": price_id,
        "subscription_period_end": datetime.fromtimestamp(
            sub_item["current_period_end"], tz=timezone.utc
        ).isoformat() if sub_item.get("current_period_end") else None,
        "trial_ends_at": None,  # Clear trial since they've paid
        "max_users": TIER_SEATS.get(tier, 1),
        "max_clients": TIER_CLIENTS.get(tier, 0),
        "grace_period_started_at": None,  # Clear grace period on upgrade
        "grace_period_ends_at": None,
    }).eq("id", org_id).execute()

    logger.info(f"Subscription activated: org={org_id}, tier={tier}")


async def handle_subscription_updated(event: dict):
    """Handle subscription changes (upgrades, downgrades, renewals)."""
    subscription = event["data"]["object"]
    org_id = subscription.get("metadata", {}).get("org_id")

    if not org_id:
        logger.warning(f"No org_id in subscription metadata: {subscription.get('id')}")
        return

    sub_item = subscription["items"]["data"][0]
    price_id = sub_item["price"]["id"]
    tier = PRICE_TO_TIER.get(price_id, "solo")
    status = subscription.get("status")  # active, past_due, canceled, etc.

    # Map Stripe status to our status
    status_map = {
        "active": "active",
        "past_due": "past_due",
        "canceled": "canceled",
        "unpaid": "suspended",
        "trialing": "trial",
    }

    supabase = get_service_role_client()
    supabase.table("organizations").update({
        "subscription_tier": tier,
        "subscription_status": status_map.get(status, status),
        "stripe_price_id": price_id,
        "subscription_period_end": datetime.fromtimestamp(
            sub_item["current_period_end"], tz=timezone.utc
        ).isoformat() if sub_item.get("current_period_end") else None,
        "max_users": TIER_SEATS.get(tier, 1),
        "max_clients": TIER_CLIENTS.get(tier, 0),
    }).eq("id", org_id).execute()

    # Auto-revoke excess pending invitations on downgrade
    await auto_revoke_excess_invitations(org_id, TIER_SEATS.get(tier, 1))

    logger.info(f"Subscription updated: org={org_id}, tier={tier}, status={status}")


async def handle_subscription_deleted(event: dict):
    """Handle subscription cancellation (at period end)."""
    subscription = event["data"]["object"]
    org_id = subscription.get("metadata", {}).get("org_id")

    if not org_id:
        logger.warning(f"No org_id in subscription metadata: {subscription.get('id')}")
        return

    # Only reset org if the deleted subscription is the one we're tracking
    supabase = get_service_role_client()
    org = supabase.table("organizations").select(
        "stripe_subscription_id"
    ).eq("id", org_id).single().execute()

    if org.data and org.data.get("stripe_subscription_id") != subscription.get("id"):
        logger.info(f"Ignoring deletion of stale subscription {subscription.get('id')} for org={org_id}")
        return

    supabase.table("organizations").update({
        "subscription_tier": "free",
        "subscription_status": "canceled",
        "stripe_subscription_id": None,
        "stripe_price_id": None,
        "subscription_period_end": None,
        "max_users": 1,
        "max_clients": 0,
    }).eq("id", org_id).execute()

    # Auto-revoke excess pending invitations
    await auto_revoke_excess_invitations(org_id, 1)

    logger.info(f"Subscription canceled: org={org_id}")


async def handle_payment_failed(event: dict):
    """Handle failed payment — flag the org."""
    invoice = event["data"]["object"]
    customer_id = invoice.get("customer")

    if not customer_id:
        return

    supabase = get_service_role_client()
    org_response = supabase.table("organizations").select("id").eq(
        "stripe_customer_id", customer_id
    ).execute()

    if org_response.data:
        org_id = org_response.data[0]["id"]
        supabase.table("organizations").update({
            "subscription_status": "past_due",
        }).eq("id", org_id).execute()
        logger.warning(f"Payment failed: org={org_id}, customer={customer_id}")


# Event type → handler mapping
WEBHOOK_HANDLERS = {
    "checkout.session.completed": handle_checkout_completed,
    "customer.subscription.updated": handle_subscription_updated,
    "customer.subscription.deleted": handle_subscription_deleted,
    "invoice.payment_failed": handle_payment_failed,
}
