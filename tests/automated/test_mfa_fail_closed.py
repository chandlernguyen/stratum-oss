"""
MFA enforcement must fail closed.

``require_aal2`` calls a database function to check whether the caller has MFA
enrolled. If that lookup errors, the previous implementation logged a warning
and allowed the request through ("fail open"), which disables the gate exactly
when the database is unhealthy — the moment an attacker would prefer. These
tests pin the fail-closed behaviour.
"""

import asyncio

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

import apps.api.middleware.mfa as mfa
import apps.api.auth.supabase_auth as supabase_auth_module


class _FailingClient:
    """Stands in for the service-role client when the MFA lookup errors."""

    def rpc(self, *_args, **_kwargs):
        return self

    def execute(self, *_args, **_kwargs):
        raise RuntimeError("database unavailable")


class _Aal1Auth:
    def verify_jwt_token(self, _token):
        return {"aal": "aal1"}


def _credentials():
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials="test-token")


def _stub_user_lookup(monkeypatch):
    async def fake_get_current_user(_credentials, _client):
        return {
            "id": "00000000-0000-0000-0000-000000000000",
            "email": "user@example.com",
        }

    monkeypatch.setattr(mfa, "get_current_user", fake_get_current_user)
    monkeypatch.setattr(mfa, "get_supabase_client", lambda: _FailingClient())
    monkeypatch.setattr(supabase_auth_module, "supabase_auth", _Aal1Auth())


def test_mfa_lookup_error_denies_access(monkeypatch):
    _stub_user_lookup(monkeypatch)

    with pytest.raises(HTTPException) as caught:
        asyncio.run(mfa.require_aal2(_credentials()))

    assert caught.value.status_code in (403, 503), (
        "an MFA-enrollment lookup error must deny the request, not allow it"
    )


def test_mfa_lookup_error_does_not_leak_exception_text(monkeypatch):
    _stub_user_lookup(monkeypatch)

    with pytest.raises(HTTPException) as caught:
        asyncio.run(mfa.require_aal2(_credentials()))

    assert "database unavailable" not in str(caught.value.detail)
