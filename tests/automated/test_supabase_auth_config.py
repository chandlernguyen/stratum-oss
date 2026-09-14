"""
Configuration guards for SupabaseAuth.

Regression tests for a fail-open default: `get_supabase_client_with_token`
previously fell back to a hardcoded public demo anon key when
SUPABASE_ANON_KEY was unset.

Two problems with that fallback:
  1. Fail-open. A misconfigured deployment silently builds a client against
     the wrong project instead of failing loudly at the point of misuse.
  2. It reads as a leaked credential in a public repository, even though this
     particular key is Supabase's well-known local demo key.

The behaviour we want is an explicit failure that names the missing variable.
"""

import pathlib

import jwt as pyjwt
import pytest
from fastapi import HTTPException

from apps.api.auth.supabase_auth import SupabaseAuth

SRC = pathlib.Path(__file__).resolve().parents[2] / "apps/api/auth/supabase_auth.py"

# The secret Supabase's local stack uses, and the one this file previously
# defaulted to. It is public knowledge, so accepting tokens signed with it is
# accepting tokens anyone can mint.
KNOWN_LOCAL_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long"


def test_missing_anon_key_raises(monkeypatch):
    """An unset SUPABASE_ANON_KEY must fail loudly, not fall back."""
    monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)

    auth = SupabaseAuth()

    with pytest.raises(ValueError) as exc:
        auth.get_supabase_client_with_token("dummy-token")

    assert "SUPABASE_ANON_KEY" in str(exc.value), (
        "the error should name the missing variable so the fix is obvious"
    )


def test_no_hardcoded_anon_key_in_source():
    """
    Guard the invariant directly. A future edit reintroducing a literal
    anon/service key as a default would otherwise pass silently.
    """
    src = SRC.read_text()

    assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in src, (
        "supabase_auth.py contains a hardcoded JWT literal; "
        "configuration must come from the environment"
    )
    assert 'os.getenv("SUPABASE_ANON_KEY",' not in src, (
        "SUPABASE_ANON_KEY must not have a default value"
    )


def test_bearer_token_is_not_logged():
    """
    The auth dependency logged the first 20 characters of every bearer token.

    Credential material must never reach logs, not even a prefix: log pipelines
    are rarely protected to the same standard as the tokens themselves. The
    authentication outcome is logged instead.
    """
    src = SRC.read_text()

    assert "credentials.credentials[:" not in src, (
        "auth code appears to log part of the bearer token"
    )
    assert "token: {credentials" not in src, (
        "auth code appears to interpolate the bearer token into a message"
    )


def test_jwt_secret_has_no_default():
    """A default HS256 secret is a secret everyone knows."""
    assert 'os.getenv("SUPABASE_JWT_SECRET",' not in SRC.read_text(), (
        "SUPABASE_JWT_SECRET must not have a default value"
    )


def test_hs256_token_signed_with_the_known_local_secret_is_rejected(monkeypatch):
    """
    With no SUPABASE_JWT_SECRET configured, a token signed with the well-known
    local secret must not verify.
    """
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    monkeypatch.setenv("SUPABASE_URL", "http://127.0.0.1:56321")

    auth = SupabaseAuth()
    forged = pyjwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000000",
            "aud": "authenticated",
            "iss": "http://127.0.0.1:56321/auth/v1",
        },
        KNOWN_LOCAL_SECRET,
        algorithm="HS256",
    )

    with pytest.raises(HTTPException):
        auth.verify_jwt_token(forged)


def test_verifier_pins_the_issuer():
    """Both verification paths must require the expected issuer."""
    assert "issuer=" in SRC.read_text(), (
        "JWT decoding must pin the issuer, not only the audience"
    )
