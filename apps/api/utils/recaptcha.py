"""
reCAPTCHA Enterprise verification utility.
Verifies tokens from frontend and creates assessments.
"""
import os
import logging
from typing import Optional
from google.cloud import recaptchaenterprise_v1
from google.cloud.recaptchaenterprise_v1 import Assessment

logger = logging.getLogger(__name__)


class RecaptchaVerifier:
    """
    Handles reCAPTCHA Enterprise assessment creation and verification.

    Uses Google Cloud service account authentication (automatic on Cloud Run).
    For local development, set GOOGLE_APPLICATION_CREDENTIALS environment variable.
    """

    def __init__(self):
        # No default. The previous default was a real reCAPTCHA site key from the
        # author's deployment, which meant a self-hoster silently sent their users
        # through someone else's reCAPTCHA project. reCAPTCHA is an optional
        # commercial integration; unset values are handled explicitly by
        # is_configured() rather than by shipping somebody's key.
        self.project_id = os.getenv("GCP_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT_ID", "")
        self.site_key = os.getenv("RECAPTCHA_SITE_KEY", "")
        self.min_score = float(os.getenv("RECAPTCHA_MIN_SCORE", "0.5"))

    def is_configured(self) -> bool:
        """True when a site key is present, i.e. verification can actually run."""
        return bool(self.site_key)

    def create_assessment(
        self,
        token: str,
        action: str,
        user_agent: Optional[str] = None,
        user_ip: Optional[str] = None
    ) -> tuple[bool, float, str]:
        """
        Create a reCAPTCHA Enterprise assessment for the given token.

        Args:
            token: The reCAPTCHA token from the frontend
            action: The action name (e.g., 'submit_invitation')
            user_agent: Optional user agent string
            user_ip: Optional user IP address

        Returns:
            Tuple of (is_valid, risk_score, reason)
            - is_valid: True if assessment passed all checks
            - risk_score: Score from 0.0 (bot) to 1.0 (legitimate user)
            - reason: Human-readable reason if validation failed
        """
        try:
            client = recaptchaenterprise_v1.RecaptchaEnterpriseServiceClient()

            # Build the assessment request
            event = recaptchaenterprise_v1.Event()
            event.site_key = self.site_key
            event.token = token

            # Add optional context
            if user_agent:
                event.user_agent = user_agent
            if user_ip:
                event.user_ip_address = user_ip

            assessment = recaptchaenterprise_v1.Assessment()
            assessment.event = event

            request = recaptchaenterprise_v1.CreateAssessmentRequest()
            request.assessment = assessment
            request.parent = f"projects/{self.project_id}"

            # Create the assessment
            response = client.create_assessment(request)

            # Check if token is valid
            if not response.token_properties.valid:
                invalid_reason = response.token_properties.invalid_reason
                logger.warning(f"Invalid reCAPTCHA token: {invalid_reason}")
                return False, 0.0, f"Invalid token: {invalid_reason}"

            # Check if action matches
            if response.token_properties.action != action:
                logger.warning(
                    f"Action mismatch. Expected: {action}, Got: {response.token_properties.action}"
                )
                return False, 0.0, f"Action mismatch"

            # Get risk score
            risk_score = response.risk_analysis.score

            # Log risk reasons
            if response.risk_analysis.reasons:
                logger.info(f"Risk analysis reasons: {response.risk_analysis.reasons}")

            # Check if score meets minimum threshold
            if risk_score < self.min_score:
                logger.warning(
                    f"reCAPTCHA score too low: {risk_score} < {self.min_score}"
                )
                return False, risk_score, f"Score too low: {risk_score}"

            # Get assessment name for potential annotation
            assessment_name = client.parse_assessment_path(response.name).get("assessment")
            logger.info(
                f"reCAPTCHA assessment passed. Name: {assessment_name}, Score: {risk_score}"
            )

            return True, risk_score, "Success"

        except Exception as e:
            logger.error(f"reCAPTCHA assessment error: {str(e)}", exc_info=True)
            return False, 0.0, f"Assessment error: {str(e)}"


# Global instance
_verifier: Optional[RecaptchaVerifier] = None


def get_recaptcha_verifier() -> RecaptchaVerifier:
    """Get or create the global RecaptchaVerifier instance."""
    global _verifier
    if _verifier is None:
        _verifier = RecaptchaVerifier()
    return _verifier


async def verify_recaptcha_token(
    token: str,
    action: str,
    user_agent: Optional[str] = None,
    user_ip: Optional[str] = None
) -> tuple[bool, float, str]:
    """
    Convenience function to verify a reCAPTCHA token.

    Args:
        token: The reCAPTCHA token from the frontend
        action: The action name (e.g., 'submit_invitation')
        user_agent: Optional user agent string
        user_ip: Optional user IP address

    Returns:
        Tuple of (is_valid, risk_score, reason)
    """
    verifier = get_recaptcha_verifier()
    if not verifier.is_configured():
        # reCAPTCHA is optional. When no site key is configured we cannot verify
        # anything, so say so plainly instead of failing every request with an
        # opaque assessment error, or — worse — silently checking against a key
        # that belongs to someone else's deployment.
        return True, 0.0, "reCAPTCHA not configured; verification skipped"
    return verifier.create_assessment(token, action, user_agent, user_ip)
