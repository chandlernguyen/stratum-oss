"""
MFA AAL2 Enforcement Middleware

This middleware enforces Multi-Factor Authentication (MFA) for sensitive API endpoints.

Key Behavior:
- Users WITHOUT MFA enrolled: Can access with AAL1 (MFA is optional by default)
- Users WITH MFA enrolled but AAL1 session: Blocked with 403 (must verify MFA)
- Users WITH MFA enrolled and AAL2 session: Allowed (MFA verified)
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any
import logging

# Import existing auth utilities to avoid duplication
from ..auth.supabase_auth import get_current_user
from ..utils.database import get_supabase_client

logger = logging.getLogger(__name__)

security = HTTPBearer()

async def require_aal2(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    FastAPI dependency requiring AAL2 (MFA verification) for users with MFA enrolled.

    This dependency implements the correct MFA enforcement logic:
    1. Extract user information and AAL level from JWT
    2. If AAL is already aal2, allow access
    3. If AAL is aal1, check if user has MFA enrolled:
       - If NO MFA enrolled: Allow access (MFA is optional)
       - If MFA enrolled: Reject with 403 (must verify MFA first)

    Returns:
        Dict[str, Any]: User information with org_id

    Raises:
        HTTPException: 403 if MFA verification required but not completed
        HTTPException: 401 if authentication fails
    """
    try:
        # Use existing get_current_user to extract user info and validate JWT
        # This already handles JWT verification, user extraction, and org_id fetching
        user = await get_current_user(credentials, get_supabase_client())

        # Extract AAL level from JWT payload
        # Note: get_current_user doesn't currently extract AAL, so we need to do it here
        from ..auth.supabase_auth import supabase_auth
        payload = supabase_auth.verify_jwt_token(credentials.credentials)
        aal_level = payload.get("aal", "aal1")

        # Add AAL level to user dict for downstream handlers
        user["aal"] = aal_level

        # If already AAL2, allow access immediately
        if aal_level == "aal2":
            logger.debug(f"User {user.get('email')} has AAL2 session - access granted")
            return user

        # AAL1 session - check if user has MFA enrolled
        user_id = user.get("id")

        # Use service role client to check MFA enrollment via database function
        # Note: get_supabase_client is already imported at top of file
        admin_client = get_supabase_client()  # Service role client

        # Check if user has verified MFA factors using database function
        # This function accesses auth.mfa_factors with SECURITY DEFINER
        try:
            # Call the database function to check MFA enrollment
            result = admin_client.rpc(
                'check_user_mfa_enrolled',
                {'p_user_id': str(user_id)}
            ).execute()

            # The function returns a boolean
            has_mfa_enrolled = result.data if result.data is not None else False

            if has_mfa_enrolled:
                # User has MFA enrolled but session is AAL1
                logger.warning(
                    f"AAL2 required for user {user.get('email')} "
                    f"(MFA enrolled) but session is AAL1"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error": "mfa_required",
                        "message": "Multi-factor authentication verification required",
                        "code": "AAL2_REQUIRED"
                    }
                )

            # No MFA enrolled - allow AAL1 access (MFA is optional by default)
            logger.debug(f"User {user.get('email')} has no MFA enrolled - AAL1 access allowed")
            return user

        except HTTPException:
            # Re-raise HTTPException (our 403 MFA required error)
            raise
        except Exception:
            # Fail closed: if the enrollment lookup errors we cannot prove the
            # caller is safe, so deny rather than wave the request through.
            logger.error(
                "Error checking MFA status for user %s", user_id, exc_info=True
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "error": "mfa_check_unavailable",
                    "message": "Multi-factor authentication status could not be verified",
                },
            )

    except HTTPException:
        # Re-raise HTTP exceptions (401, 403, 503)
        raise
    except Exception:
        # Unexpected error during authentication
        logger.error("Unexpected error in require_aal2", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during authentication",
        )


# Alias for backwards compatibility with existing code
verify_aal2 = require_aal2
