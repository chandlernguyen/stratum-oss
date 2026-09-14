"""
Error Message Sanitization Utility

Prevents information disclosure in production error responses by sanitizing
error messages before sending to clients.

Security Concerns in Error Messages:
- Stack traces revealing internal file paths
- Database schema details and SQL queries
- Environment variable names and values
- Internal configuration details
- Sensitive business logic

Based on:
- OWASP Top 10 2025: A05 - Security Misconfiguration
- CWE-209: Information Exposure Through an Error Message

Date: November 1, 2025
"""
import re
import logging
from typing import Dict, Any, Optional
from fastapi import status

logger = logging.getLogger(__name__)

# Patterns that indicate sensitive information in error messages
SENSITIVE_PATTERNS = [
    # File paths (Unix and Windows)
    r"/[a-zA-Z0-9_\-./]+\.py",
    r"[A-Z]:\\[a-zA-Z0-9_\-\\]+\.py",

    # SQL queries and database schema
    r"(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\s+",
    r"FROM\s+[a-zA-Z0-9_]+",
    r"WHERE\s+[a-zA-Z0-9_]+\s*=",

    # Environment variables
    r"[A-Z_]+_KEY",
    r"[A-Z_]+_SECRET",
    r"[A-Z_]+_TOKEN",
    r"DATABASE_URL",
    r"SUPABASE_",

    # Function/method names with file paths
    r"File\s+\"[^\"]+\"",
    r"line\s+\d+",

    # Stack trace indicators
    r"Traceback\s+\(most recent call last\)",
    r"raise\s+[a-zA-Z]+Error",
]

# Generic error messages by status code
GENERIC_ERROR_MESSAGES = {
    400: "Invalid request. Please check your input and try again.",
    401: "Authentication required. Please log in and try again.",
    403: "You don't have permission to access this resource.",
    404: "The requested resource was not found.",
    422: "The request data is invalid. Please check your input.",
    429: "Too many requests. Please try again later.",
    500: "An internal server error occurred. Please try again later.",
    503: "The service is temporarily unavailable. Please try again later.",
}


def contains_sensitive_info(message: str) -> bool:
    """
    Check if error message contains sensitive information.

    Args:
        message: Error message to check

    Returns:
        True if message contains sensitive patterns
    """
    if not message:
        return False

    message_str = str(message)

    for pattern in SENSITIVE_PATTERNS:
        if re.search(pattern, message_str, re.IGNORECASE):
            return True

    return False


def sanitize_error_message(
    error: Exception,
    status_code: int,
    debug_mode: bool = False,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sanitize error message for client response.

    In production (debug_mode=False):
    - Returns generic error messages
    - Hides stack traces and internal details
    - Logs full error server-side for debugging

    In development (debug_mode=True):
    - Returns detailed error information
    - Includes stack traces for easier debugging

    Args:
        error: The exception that occurred
        status_code: HTTP status code
        debug_mode: Whether to include detailed error info (development only)
        request_id: Optional request ID for tracking

    Returns:
        Sanitized error response dict
    """
    error_message = str(error)
    error_type = type(error).__name__

    # Log full error details server-side (always)
    log_context = {
        "error_type": error_type,
        "error_message": error_message,
        "status_code": status_code,
        "request_id": request_id,
    }

    if status_code >= 500:
        logger.error(f"Server error: {error_type}: {error_message}", extra=log_context)
    elif status_code >= 400:
        logger.warning(f"Client error: {error_type}: {error_message}", extra=log_context)

    # Development mode: Return detailed errors
    if debug_mode:
        response = {
            "detail": error_message,
            "error_type": error_type,
            "status_code": status_code,
        }

        if request_id:
            response["request_id"] = request_id

        return response

    # Production mode: Sanitize errors
    # Check if error message contains sensitive information
    has_sensitive_info = contains_sensitive_info(error_message)

    if has_sensitive_info:
        # Replace with generic message
        generic_message = GENERIC_ERROR_MESSAGES.get(
            status_code,
            "An error occurred. Please try again later."
        )

        logger.warning(
            f"Sanitized error message containing sensitive info: {error_type}",
            extra={"original_message": error_message[:100]}
        )

        response = {"detail": generic_message}
    else:
        # Keep error message if it's safe (e.g., HTTPException with custom message)
        # But still limit detail to avoid accidental leakage
        safe_message = error_message[:200]  # Limit message length
        response = {"detail": safe_message}

    # Add request ID for support/debugging (safe to expose)
    if request_id:
        response["request_id"] = request_id
        response["support_message"] = f"Please provide request ID {request_id} when contacting support."

    return response


def sanitize_validation_error(
    validation_errors: list,
    debug_mode: bool = False
) -> Dict[str, Any]:
    """
    Sanitize Pydantic validation errors.

    Validation errors can expose field names, allowed values, and schema details.

    Args:
        validation_errors: List of validation error dicts from Pydantic
        debug_mode: Whether to include detailed validation info

    Returns:
        Sanitized validation error response
    """
    if debug_mode:
        # Development: Show full validation details
        return {
            "detail": validation_errors,
            "error_type": "ValidationError"
        }

    # Production: Sanitize validation errors
    # Group errors by field for cleaner messages
    field_errors = {}

    for error in validation_errors:
        field = " -> ".join(str(loc) for loc in error.get("loc", []))
        msg = error.get("msg", "Invalid value")

        # Remove internal type information
        msg = re.sub(r"value_error\.\w+", "invalid value", msg, flags=re.IGNORECASE)
        msg = re.sub(r"type_error\.\w+", "invalid type", msg, flags=re.IGNORECASE)

        if field in field_errors:
            field_errors[field].append(msg)
        else:
            field_errors[field] = [msg]

    # Build user-friendly error message
    if len(field_errors) == 1:
        field, messages = list(field_errors.items())[0]
        detail = f"Invalid value for {field}: {messages[0]}"
    else:
        detail = f"Invalid values for {len(field_errors)} fields. Please check your input."

    return {
        "detail": detail,
        "errors": field_errors if len(field_errors) <= 5 else None  # Limit exposed fields
    }


# Error message templates for common scenarios
ERROR_TEMPLATES = {
    "database_error": "A database error occurred. Please try again later.",
    "authentication_failed": "Authentication failed. Please check your credentials.",
    "authorization_failed": "You don't have permission to perform this action.",
    "resource_not_found": "The requested resource was not found.",
    "rate_limit_exceeded": "Rate limit exceeded. Please try again in a few minutes.",
    "external_service_error": "An external service is temporarily unavailable.",
    "validation_failed": "The request data is invalid. Please check your input.",
}


def get_error_template(error_type: str) -> str:
    """
    Get a generic error message template for a given error type.

    Args:
        error_type: Type of error (database_error, authentication_failed, etc.)

    Returns:
        Generic error message
    """
    return ERROR_TEMPLATES.get(error_type, "An error occurred. Please try again later.")
