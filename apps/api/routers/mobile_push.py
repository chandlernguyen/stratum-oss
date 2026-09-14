import hmac
import os
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status

from apps.api.services.push_notifications import PushNotificationService

router = APIRouter(prefix="/api/v1/internal/mobile-push", tags=["mobile-push"])

# The template ships this value; treating it as "configured" would give every
# deployment that copied the template the same secret.
_PLACEHOLDER_SECRETS = {"", "replace-with-a-long-random-secret"}


def require_dispatch_secret(
    dispatch_secret: Optional[str] = Header(default=None, alias="X-Push-Dispatch-Secret"),
) -> None:
    configured_secret = os.getenv("PUSH_DISPATCH_SECRET", "").strip()
    if configured_secret in _PLACEHOLDER_SECRETS:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push dispatch secret is not configured",
        )

    if not dispatch_secret or not hmac.compare_digest(dispatch_secret, configured_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid push dispatch secret",
        )


@router.post("/dispatch", dependencies=[Depends(require_dispatch_secret)])
async def dispatch_mobile_push(
    limit: Optional[int] = Query(default=None, ge=1, le=100),
) -> dict:
    service = PushNotificationService()
    return await service.dispatch_pending_deliveries(limit=limit)
