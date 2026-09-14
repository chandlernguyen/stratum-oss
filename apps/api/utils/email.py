"""
Email Sending Utility using Resend
==================================
Direct email sending via Resend API for custom transactional emails.

This replaces Supabase's invite_user_by_email() to give us full control
over the invitation flow in our multi-tenant application.

Usage:
    from apps.api.utils.email import send_team_invitation_email

    await send_team_invitation_email(
        to_email="user@example.com",
        invitation_link="https://app.com/accept-invitation/token123",
        inviter_name="John Doe",
        org_name="Acme Corp",
        role_name="analyst"
    )
"""

import os
import logging
import resend
from typing import Optional

from apps.api.config.brand import BRAND_NAME, CONTACT_EMAIL

logger = logging.getLogger(__name__)

# Initialize Resend with API key
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", f"{BRAND_NAME} <{CONTACT_EMAIL}>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:56310")


def _get_resend_client():
    """Get configured Resend client."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured - emails will not be sent")
        return None
    resend.api_key = RESEND_API_KEY
    return resend


def send_team_invitation_email(
    to_email: str,
    invitation_link: str,
    inviter_name: str,
    org_name: str,
    role_name: str
) -> bool:
    """
    Send a team invitation email using Resend.

    Args:
        to_email: Email address of the invitee
        invitation_link: Full URL to accept the invitation
        inviter_name: Name of the person who sent the invitation
        org_name: Name of the organization
        role_name: Role the invitee will have

    Returns:
        True if email was sent successfully, False otherwise
    """
    # Check if we should send real emails
    is_local = FRONTEND_URL.startswith("http://localhost") or FRONTEND_URL.startswith("http://127.0.0.1")
    force_send_emails = os.getenv("FORCE_SEND_EMAILS", "false").lower() == "true"

    if is_local and not force_send_emails:
        logger.info(f"[LOCAL DEV] Would send invitation email to: {to_email}")
        logger.info(f"[LOCAL DEV] Invitation link: {invitation_link}")
        logger.info(f"[LOCAL DEV] Inviter: {inviter_name}, Org: {org_name}, Role: {role_name}")
        logger.info(f"[LOCAL DEV] Set FORCE_SEND_EMAILS=true to send actual emails")
        return True  # Pretend it worked

    client = _get_resend_client()
    if not client:
        logger.error("Cannot send email - Resend not configured")
        return False

    # Build the email HTML
    html_content = _build_invitation_email_html(
        invitation_link=invitation_link,
        inviter_name=inviter_name,
        org_name=org_name,
        role_name=role_name
    )

    text_content = _build_invitation_email_text(
        invitation_link=invitation_link,
        inviter_name=inviter_name,
        org_name=org_name,
        role_name=role_name
    )

    try:
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"You're invited to join {org_name} on STRAŦUM",
            "html": html_content,
            "text": text_content,
        }

        result = resend.Emails.send(params)

        if result and result.get("id"):
            logger.info(f"Invitation email sent successfully to {to_email} (ID: {result['id']})")
            return True
        else:
            logger.error(f"Failed to send invitation email to {to_email}: No ID returned")
            return False

    except Exception as e:
        logger.error(f"Error sending invitation email to {to_email}: {str(e)}")
        return False


def _build_invitation_email_html(
    invitation_link: str,
    inviter_name: str,
    org_name: str,
    role_name: str
) -> str:
    """Build HTML email content for team invitation."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited to Join {org_name}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1E293B; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1E293B; font-size: 24px; margin-bottom: 5px;">STRAŦUM</h1>
        <p style="color: #64748B; font-size: 14px; margin: 0;">Intelligence Over Execution</p>
    </div>

    <div style="background-color: #F8FAFC; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h2 style="color: #1E293B; font-size: 20px; margin-top: 0;">You're Invited!</h2>

        <p style="color: #475569; font-size: 16px;">
            Hi there,
        </p>

        <p style="color: #475569; font-size: 16px;">
            <strong>{inviter_name}</strong> has invited you to join <strong>{org_name}</strong> on STRAŦUM as a <strong>{role_name}</strong>.
        </p>

        <p style="color: #475569; font-size: 16px;">
            STRAŦUM is an AI-powered marketing intelligence platform that helps teams create data-driven strategies and content.
        </p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{invitation_link}"
               style="display: inline-block; background-color: #F59E0B; color: #1E293B; font-weight: 600; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-size: 16px;">
                Accept Invitation
            </a>
        </div>

        <p style="color: #64748B; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="{invitation_link}" style="color: #F59E0B; word-break: break-all;">{invitation_link}</a>
        </p>
    </div>

    <div style="text-align: center; color: #94A3B8; font-size: 12px;">
        <p>This invitation will expire in 7 days.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        <p style="margin-top: 20px;">&copy; 2025 STRAŦUM. All rights reserved.</p>
    </div>
</body>
</html>
"""


def _build_invitation_email_text(
    invitation_link: str,
    inviter_name: str,
    org_name: str,
    role_name: str
) -> str:
    """Build plain text email content for team invitation."""
    return f"""STRAŦUM - Intelligence Over Execution

You're Invited!

Hi there,

{inviter_name} has invited you to join {org_name} on STRAŦUM as a {role_name}.

STRAŦUM is an AI-powered marketing intelligence platform that helps teams create data-driven strategies and content.

Accept your invitation here:
{invitation_link}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

© 2025 STRAŦUM. All rights reserved.
"""
