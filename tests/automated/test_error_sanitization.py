"""
Unit Tests: Error Message Sanitization

Tests the error sanitization system that prevents information disclosure
in production error responses.

Run Instructions:
    # Run all error sanitization tests
    poetry run pytest tests/automated/test_error_sanitization.py -v -s

    # Run specific test
    poetry run pytest tests/automated/test_error_sanitization.py::TestErrorSanitization::test_sensitive_info_detection -v -s

Prerequisites:
    - Python path configured for imports

Date: November 1, 2025
"""
import sys
import pathlib
import pytest
from fastapi import HTTPException

# Add project root to Python path for imports
project_root = pathlib.Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from apps.api.utils.error_sanitization import (
    contains_sensitive_info,
    sanitize_error_message,
    sanitize_validation_error,
    get_error_template,
)


class TestErrorSanitization:
    """Test suite for error message sanitization"""

    def test_sensitive_info_detection(self):
        """
        Test: Verify sensitive information patterns are detected

        Patterns to detect: file paths, SQL queries, env vars
        """
        print("\n🧪 Testing sensitive information detection...")

        sensitive_messages = [
            "File \"/app/api/main.py\", line 42",
            "SELECT * FROM users WHERE id=123",
            "SUPABASE_SERVICE_ROLE_KEY not found",
            "Database error: INSERT INTO table VALUES",
            "C:\\Users\\Admin\\project\\api\\routers\\auth.py",
        ]

        for msg in sensitive_messages:
            result = contains_sensitive_info(msg)
            print(f"Message: '{msg[:50]}...' -> Sensitive: {result}")
            assert result is True, f"Should detect sensitive info in: {msg[:50]}"

        print("✅ All sensitive patterns detected")

    def test_safe_messages_allowed(self):
        """
        Test: Verify safe messages are not flagged

        Safe messages: generic errors without internal details
        """
        print("\n🧪 Testing safe messages are allowed...")

        safe_messages = [
            "Invalid credentials provided",
            "Resource not found",
            "Rate limit exceeded",
            "Validation failed for user input",
        ]

        for msg in safe_messages:
            result = contains_sensitive_info(msg)
            print(f"Message: '{msg}' -> Sensitive: {result}")
            assert result is False, f"Should not flag safe message: {msg}"

        print("✅ All safe messages passed")

    def test_production_mode_sanitization(self):
        """
        Test: Verify production mode sanitizes sensitive errors

        Expected: Generic error message, no sensitive details exposed
        """
        print("\n🧪 Testing production mode error sanitization...")

        # Create error with sensitive info
        error = Exception("File \"/app/api/main.py\", line 42: Database connection failed")

        result = sanitize_error_message(
            error=error,
            status_code=500,
            debug_mode=False,  # Production mode
            request_id="test-request-123"
        )

        print(f"Original: {str(error)}")
        print(f"Sanitized: {result['detail']}")
        print(f"Request ID: {result.get('request_id')}")

        # Should not contain file path
        assert "/app/api/main.py" not in result["detail"], \
            "Production response should not contain file paths"

        # Should have generic message
        assert "internal server error" in result["detail"].lower(), \
            "Should use generic error message"

        # Should include request ID for support
        assert result.get("request_id") == "test-request-123", \
            "Should include request ID"

        print("✅ Sensitive information sanitized in production")

    def test_debug_mode_detailed_errors(self):
        """
        Test: Verify debug mode shows detailed errors

        Expected: Full error details including file paths
        """
        print("\n🧪 Testing debug mode detailed errors...")

        error = Exception("File \"/app/api/main.py\", line 42: Database connection failed")

        result = sanitize_error_message(
            error=error,
            status_code=500,
            debug_mode=True,  # Development mode
            request_id="test-request-456"
        )

        print(f"Debug response: {result['detail']}")

        # Should contain full error message
        assert "/app/api/main.py" in result["detail"], \
            "Debug mode should show full error details"

        # Should include error type
        assert result.get("error_type") == "Exception", \
            "Should include error type"

        print("✅ Detailed errors shown in debug mode")

    def test_http_exception_sanitization(self):
        """
        Test: Verify HTTPException messages are handled correctly

        Safe HTTPException messages should pass through
        """
        print("\n🧪 Testing HTTPException sanitization...")

        # Safe HTTP exception (custom message)
        error = HTTPException(status_code=404, detail="Campaign not found")

        result = sanitize_error_message(
            error=error,
            status_code=404,
            debug_mode=False
        )

        print(f"HTTPException: {result['detail']}")

        # Safe message should pass through
        assert "Campaign not found" in result["detail"], \
            "Safe HTTPException messages should pass through"

        print("✅ HTTPException handled correctly")

    def test_validation_error_sanitization_production(self):
        """
        Test: Verify Pydantic validation errors are sanitized in production

        Expected: Generic validation message without schema details
        """
        print("\n🧪 Testing validation error sanitization (production)...")

        validation_errors = [
            {
                "loc": ["body", "email"],
                "msg": "value is not a valid email address: Invalid email format",
                "type": "value_error.email"
            },
            {
                "loc": ["body", "password"],
                "msg": "ensure this value has at least 10 characters",
                "type": "value_error.any_str.min_length"
            }
        ]

        result = sanitize_validation_error(
            validation_errors=validation_errors,
            debug_mode=False
        )

        print(f"Sanitized validation: {result['detail']}")

        # Should mention invalid fields
        assert "field" in result["detail"].lower() or "value" in result["detail"].lower(), \
            "Should mention validation failure"

        # Should not expose internal type error codes
        assert "value_error" not in result["detail"], \
            "Should not expose internal error types"

        print("✅ Validation errors sanitized in production")

    def test_validation_error_debug_mode(self):
        """
        Test: Verify validation errors show details in debug mode

        Expected: Full validation error details for debugging
        """
        print("\n🧪 Testing validation errors (debug mode)...")

        validation_errors = [
            {
                "loc": ["body", "email"],
                "msg": "value is not a valid email address",
                "type": "value_error.email"
            }
        ]

        result = sanitize_validation_error(
            validation_errors=validation_errors,
            debug_mode=True
        )

        print(f"Debug validation: {result}")

        # Should include full error details
        assert isinstance(result["detail"], list), \
            "Debug mode should return full error list"

        assert result["detail"][0]["type"] == "value_error.email", \
            "Should include error type in debug mode"

        print("✅ Full validation details in debug mode")

    def test_error_templates(self):
        """
        Test: Verify error templates provide appropriate messages

        Expected: Generic but helpful error messages
        """
        print("\n🧪 Testing error message templates...")

        test_cases = [
            ("database_error", "database"),
            ("authentication_failed", "authentication"),
            ("rate_limit_exceeded", "rate limit"),
            ("resource_not_found", "not found"),
        ]

        for error_type, expected_keyword in test_cases:
            message = get_error_template(error_type)
            print(f"{error_type}: {message}")

            assert expected_keyword in message.lower(), \
                f"Error template should mention '{expected_keyword}'"

        print("✅ Error templates working correctly")

    def test_sql_injection_pattern_detection(self):
        """
        Test: Verify SQL queries are detected and sanitized

        SQL queries can reveal database schema
        """
        print("\n🧪 Testing SQL injection pattern detection...")

        sql_errors = [
            "psycopg2.ProgrammingError: SELECT * FROM users",
            "Database query failed: UPDATE organizations SET name='test'",
            "Error executing: DELETE FROM campaigns WHERE id=5",
        ]

        for sql_error in sql_errors:
            detected = contains_sensitive_info(sql_error)
            print(f"SQL: '{sql_error[:40]}...' -> Detected: {detected}")

            assert detected is True, \
                f"Should detect SQL pattern in: {sql_error[:40]}"

        print("✅ SQL patterns detected correctly")

    def test_environment_variable_pattern_detection(self):
        """
        Test: Verify environment variable references are detected

        Env var names can reveal configuration structure
        """
        print("\n🧪 Testing environment variable detection...")

        env_errors = [
            "SUPABASE_SERVICE_ROLE_KEY is not set",
            "Missing environment variable: GOOGLE_API_KEY",
            "DATABASE_URL connection failed",
        ]

        for env_error in env_errors:
            detected = contains_sensitive_info(env_error)
            print(f"Env: '{env_error}' -> Detected: {detected}")

            assert detected is True, \
                f"Should detect env var in: {env_error}"

        print("✅ Environment variable patterns detected")


if __name__ == "__main__":
    """Run tests directly with pytest"""
    import subprocess
    import sys

    print("🧪 Running Error Sanitization Tests...")
    print("=" * 60)

    result = subprocess.run(
        ["poetry", "run", "pytest", __file__, "-v", "-s"],
        cwd=str(pathlib.Path(__file__).resolve().parents[2])
    )

    sys.exit(result.returncode)
