"""
Invitation request management endpoints for Founding Member program.
Handles submission of invitation requests that are manually reviewed.
Also includes PUBLIC team invitation acceptance endpoint.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Literal
import logging
from datetime import datetime, UTC
from apps.api.utils.database import get_supabase_client, get_service_role_client
from apps.api.utils.recaptcha import verify_recaptcha_token
from apps.api.models.team import TeamInvitationAccept, TeamInvitationAcceptResponse
from apps.api.config.brand import CONTACT_EMAIL

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/invitations", tags=["invitations"])

class InvitationRequest(BaseModel):
    """Request model for founding member invitation requests"""
    email: EmailStr = Field(..., description="Work email address")
    companyName: str = Field(..., min_length=2, max_length=200, alias="companyName")
    organizationType: Literal["SME", "AGENCY"] = Field(..., alias="organizationType")
    useCase: str | None = Field(None, max_length=500, alias="useCase")
    referralSource: str | None = Field(None, max_length=200, alias="referralSource")
    recaptchaToken: str = Field(..., min_length=10, alias="recaptchaToken", description="reCAPTCHA Enterprise token")

    class Config:
        populate_by_name = True


class InvitationResponse(BaseModel):
    """Response model for invitation request submission"""
    success: bool
    message: str
    email: str


# Simple in-memory rate limiting (IP-based)
# For production, use Redis or a proper rate limiting solution
rate_limit_store: dict[str, list[datetime]] = {}

def check_rate_limit(ip: str, max_requests: int = 3, window_minutes: int = 60) -> bool:
    """
    Simple rate limiting: 3 requests per hour per IP.
    Returns True if within limit, False if exceeded.
    """
    now = datetime.now(UTC)

    # Clean up old entries
    if ip in rate_limit_store:
        rate_limit_store[ip] = [
            ts for ts in rate_limit_store[ip]
            if (now - ts).total_seconds() < window_minutes * 60
        ]
    else:
        rate_limit_store[ip] = []

    # Check limit
    if len(rate_limit_store[ip]) >= max_requests:
        return False

    # Add current request
    rate_limit_store[ip].append(now)
    return True


@router.post("/request", response_model=InvitationResponse)
async def request_invitation(
    request_data: InvitationRequest,
    request: Request
) -> InvitationResponse:
    """
    Submit an invitation request for the Founding Member program.

    Workflow:
    1. Rate limit check (3 requests per hour per IP)
    2. Check if email already has a pending request
    3. Check if email is already whitelisted in alpha_invites
    4. Save request to invitation_requests table
    5. Send confirmation email to applicant
    6. Send notification email to admin

    Returns success message with next steps.
    """
    supabase = get_supabase_client()

    # Get client IP for rate limiting
    client_ip = request.client.host if request.client else "unknown"

    # Rate limiting
    if not check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again in an hour."
        )

    # reCAPTCHA verification
    user_agent = request.headers.get("user-agent")
    is_valid, risk_score, reason = await verify_recaptcha_token(
        token=request_data.recaptchaToken,
        action="submit_invitation",
        user_agent=user_agent,
        user_ip=client_ip
    )

    if not is_valid:
        logger.warning(
            f"reCAPTCHA verification failed for {request_data.email}. "
            f"Score: {risk_score}, Reason: {reason}"
        )
        raise HTTPException(
            status_code=400,
            detail=f"Security verification failed. Please try again or contact us at {CONTACT_EMAIL}"
        )

    logger.info(f"reCAPTCHA passed for {request_data.email}. Score: {risk_score}")

    try:
        # Check if email already has a pending invitation request
        check_result = supabase.rpc(
            'has_pending_invitation_request',
            {'p_email': request_data.email}
        ).execute()

        if check_result.data:
            logger.info(f"Duplicate invitation request attempt for: {request_data.email}")
            raise HTTPException(
                status_code=400,
                detail="You already have a pending invitation request. We'll contact you within 2-3 business days."
            )

        # Check if email is already whitelisted in alpha_invites
        existing_invite = supabase.from_("alpha_invites")\
            .select("email, status")\
            .eq("email", request_data.email.lower())\
            .execute()

        if existing_invite.data and len(existing_invite.data) > 0:
            invite_status = existing_invite.data[0].get("status")
            if invite_status == "active":
                logger.info(f"Email already whitelisted: {request_data.email}")
                raise HTTPException(
                    status_code=400,
                    detail="This email is already whitelisted! You can sign up directly at /signup"
                )

        # Save invitation request to database
        insert_result = supabase.from_("invitation_requests").insert({
            "email": request_data.email.lower(),
            "company_name": request_data.companyName,
            "organization_type": request_data.organizationType,
            "use_case": request_data.useCase,
            "referral_source": request_data.referralSource,
            "status": "pending",
            "requested_at": datetime.now(UTC).isoformat()
        }).execute()

        if not insert_result.data:
            logger.error(f"Failed to save invitation request for: {request_data.email}")
            raise HTTPException(
                status_code=500,
                detail="Failed to save your request. Please try again or contact us directly."
            )

        logger.info(f"New invitation request saved: {request_data.email} ({request_data.organizationType})")

        # TODO: Send confirmation email to applicant
        # TODO: Send notification email to admin (CONTACT_EMAIL)

        return InvitationResponse(
            success=True,
            message="Your invitation request has been received. We'll review it within 2-3 business days.",
            email=request_data.email
        )

    except HTTPException:
        # Re-raise HTTP exceptions (rate limit, duplicates, etc.)
        raise
    except Exception as e:
        logger.error(f"Error processing invitation request: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing your request. Please contact us at {CONTACT_EMAIL}"
        )


@router.get("/check/{email}")
async def check_invitation_status(email: str):
    """
    Check if an email has a pending invitation request or is already whitelisted.
    Useful for frontend validation.
    """
    supabase = get_supabase_client()

    try:
        # Check pending request
        pending_check = supabase.rpc(
            'has_pending_invitation_request',
            {'p_email': email}
        ).execute()

        if pending_check.data:
            return {
                "status": "pending",
                "message": "You have a pending invitation request"
            }

        # Check if whitelisted
        existing_invite = supabase.from_("alpha_invites")\
            .select("status")\
            .eq("email", email.lower())\
            .execute()

        if existing_invite.data and len(existing_invite.data) > 0:
            return {
                "status": "whitelisted",
                "message": "This email is already whitelisted for signup"
            }

        return {
            "status": "not_found",
            "message": "No invitation request or whitelist found"
        }

    except Exception as e:
        logger.error(f"Error checking invitation status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error checking invitation status"
        )


# =============================================================================
# Team Invitation Acceptance (PUBLIC - No Authentication Required)
# =============================================================================

@router.post("/team/accept", response_model=TeamInvitationAcceptResponse)
async def accept_team_invitation(acceptance: TeamInvitationAccept):
    """
    Accept a team invitation by signing up and completing onboarding.

    PUBLIC ENDPOINT - No authentication required (user doesn't have account yet).

    Two-Phase Process:
    1. Get invitation details and email from token
    2. Create auth user via Supabase Auth sign_up()
    3. Complete onboarding via complete_user_onboarding() database function

    Database-First: complete_user_onboarding() is atomic transaction that:
    - Validates invitation token
    - Creates user profile in users table
    - Assigns role in user_role_assignments
    - Marks invitation as accepted
    - Returns complete user context
    """
    supabase = get_supabase_client()

    try:
        # First, get the invitation to retrieve the email
        invitation_result = supabase.from_("team_invitations")\
            .select("email, status, expires_at")\
            .eq("invitation_token", acceptance.invitation_token)\
            .single()\
            .execute()

        if not invitation_result.data:
            raise HTTPException(status_code=400, detail="Invalid invitation token")

        invitation = invitation_result.data

        # Check invitation status
        if invitation["status"] != "pending":
            raise HTTPException(status_code=400, detail=f"Invitation has already been {invitation['status']}")

        # Check if expired - handle various datetime formats from Supabase
        expires_at_str = invitation["expires_at"]
        if expires_at_str:
            # Handle both Z suffix and +00:00 formats
            if expires_at_str.endswith('Z'):
                expires_at_str = expires_at_str[:-1] + '+00:00'
            elif not ('+' in expires_at_str or expires_at_str.endswith('00:00')):
                # No timezone info - assume UTC
                expires_at_str = expires_at_str + '+00:00'
            expires_at = datetime.fromisoformat(expires_at_str)
            if expires_at < datetime.now(UTC):
                raise HTTPException(status_code=410, detail="Invitation has expired")

        email = invitation["email"]

        # Phase 1: Create pre-confirmed auth user via Admin API
        # Since user received invitation email, they've already verified email ownership
        # Using admin API allows us to skip the confirmation email
        service_client = get_service_role_client()

        admin_response = service_client.auth.admin.create_user({
            "email": email,
            "password": acceptance.password,
            "email_confirm": True,  # Auto-confirm since they received invitation
            "user_metadata": {
                "full_name": acceptance.full_name,
                "invited_via": "team_invitation"
            }
        })

        if not admin_response.user:
            raise HTTPException(status_code=500, detail="Failed to create auth user")

        user_id = admin_response.user.id
        logger.info(f"Created pre-confirmed user {email} with id {user_id}")

        # Phase 2: Sign in the user to get session tokens
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": acceptance.password
        })

        if not auth_response.session:
            logger.warning(f"User created but sign-in failed for {email}")

        # Phase 3: Complete onboarding via database function (atomic)
        result = supabase.rpc(
            "complete_user_onboarding",
            {
                "p_user_id": str(user_id),
                "p_invitation_token": acceptance.invitation_token,
                "p_full_name": acceptance.full_name
            }
        ).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to complete user onboarding")

        onboarding_data = result.data

        logger.info(f"Team invitation accepted: {email} joined as {onboarding_data['role_name']}")

        # Return success with tokens
        return TeamInvitationAcceptResponse(
            user_id=onboarding_data["user_id"],
            email=onboarding_data["email"],
            org_id=onboarding_data["org_id"],
            org_name=onboarding_data["org_name"],
            role_name=onboarding_data["role_name"],
            access_token=auth_response.session.access_token if auth_response.session else "",
            refresh_token=auth_response.session.refresh_token if auth_response.session else "",
            message="Invitation accepted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accepting team invitation: {str(e)}")
        if "Invalid or already used" in str(e):
            raise HTTPException(status_code=400, detail=str(e))
        elif "expired" in str(e).lower():
            raise HTTPException(status_code=410, detail=str(e))
        elif "already registered" in str(e).lower() or "already exists" in str(e).lower():
            raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in instead.")
        else:
            raise HTTPException(status_code=500, detail=str(e))
