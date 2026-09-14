"""
Subscription enforcement middleware for STRAŦUM.

Checks that the user's organization has an active (or trialing/grandfathered)
subscription before allowing access to protected endpoints.

All tiers get access to all 9 agents — differentiation is seats + org type + client capacity.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import Depends, HTTPException, status

from apps.api.auth.supabase_auth import get_current_user_with_org
from apps.api.utils.database import get_supabase_client

logger = logging.getLogger(__name__)

# Subscription statuses that grant access
ACTIVE_STATUSES = {"active", "trialing", "trial", "grandfathered"}


def _check_trial_expired(org: dict, org_id: str) -> None:
    """Raise 402 if the org is on a trial/trialing status with an expired trial_ends_at."""
    sub_status = org.get("subscription_status", "")
    if sub_status not in ("trial", "trialing"):
        return

    trial_ends = org.get("trial_ends_at")
    if not trial_ends:
        # No trial_ends_at set — allow access (edge case)
        return

    trial_ends_dt = datetime.fromisoformat(trial_ends.replace("Z", "+00:00"))
    if trial_ends_dt.tzinfo is None:
        trial_ends_dt = trial_ends_dt.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > trial_ends_dt:
        logger.info(f"Trial expired: org={org_id}, trial_ends_at={trial_ends}")
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Your trial has expired. Please subscribe to continue using STRAŦUM agents.",
        )


async def verify_active_subscription(
    user: Dict[str, Any] = Depends(get_current_user_with_org),
) -> Dict[str, Any]:
    """
    FastAPI dependency that verifies the user's organization has an active subscription.

    Returns the user dict enriched with subscription info.
    Raises 402 Payment Required if no active subscription.
    """
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization found",
        )

    supabase = get_supabase_client()
    org_response = (
        supabase.table("organizations")
        .select("subscription_tier, subscription_status, trial_ends_at")
        .eq("id", org_id)
        .single()
        .execute()
    )

    if not org_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    org = org_response.data
    sub_status = org.get("subscription_status", "inactive")
    sub_tier = org.get("subscription_tier", "free")

    # Allow access if subscription is active, trialing, or grandfathered
    if sub_status in ACTIVE_STATUSES:
        _check_trial_expired(org, org_id)
        user["subscription_tier"] = sub_tier
        user["subscription_status"] = sub_status
        return user

    # Block access — subscription required
    logger.info(
        f"Subscription check failed: org={org_id}, tier={sub_tier}, status={sub_status}"
    )
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail="Active subscription required. Please subscribe to continue using STRAŦUM agents.",
    )


async def verify_write_access(
    user: Dict[str, Any] = Depends(get_current_user_with_org),
) -> Dict[str, Any]:
    """
    FastAPI dependency that verifies the user has write access (not in read-only mode).

    Grandfathered orgs with an expired grace period are read-only and cannot
    use AI agents or create content. All other active statuses get full write access.

    Returns the user dict. Raises 403 if read-only, 402 if no active subscription.
    """
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization found",
        )

    supabase = get_supabase_client()
    org_response = (
        supabase.table("organizations")
        .select("subscription_tier, subscription_status, grace_period_ends_at, trial_ends_at")
        .eq("id", org_id)
        .single()
        .execute()
    )

    if not org_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    org = org_response.data
    sub_status = org.get("subscription_status", "inactive")
    sub_tier = org.get("subscription_tier", "free")

    # Non-grandfathered active statuses: full write access
    if sub_status in ACTIVE_STATUSES and sub_status != "grandfathered":
        _check_trial_expired(org, org_id)
        user["subscription_tier"] = sub_tier
        user["subscription_status"] = sub_status
        return user

    # Grandfathered: check grace period
    if sub_status == "grandfathered":
        grace_ends = org.get("grace_period_ends_at")
        if not grace_ends:
            # Grace period not started yet — full access
            user["subscription_tier"] = sub_tier
            user["subscription_status"] = sub_status
            return user

        grace_ends_dt = datetime.fromisoformat(grace_ends.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) <= grace_ends_dt:
            # Still within grace period — full access
            user["subscription_tier"] = sub_tier
            user["subscription_status"] = sub_status
            return user

        # Grace period expired — read-only
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your founding member grace period has expired. Please subscribe to continue using STRAŦUM agents.",
        )

    # Not active at all
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail="Active subscription required. Please subscribe to continue using STRAŦUM agents.",
    )
