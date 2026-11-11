"""
Behaviour of SupabaseAuth.verify_jwt_token, the single verifier every router
depends on.

These pin the rejections that make a JWT a boundary rather than a hint:
expiry, audience, issuer, signature, and algorithm. They run without network
access: the JWKS is injected instead of fetched.
"""

import time

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException

from apps.api.auth.supabase_auth import SupabaseAuth

LOCAL_URL = "http://127.0.0.1:56321"
HOSTED_URL = "https://example.supabase.co"
TEST_SECRET = "test-only-secret-that-is-at-least-32-characters"
KID = "test-key"


def _claims(url, **overrides):
    claims = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "aud": "authenticated",
        "iss": f"{url}/auth/v1",
        "exp": int(time.time()) + 300,
    }
    claims.update(overrides)
    return claims


@pytest.fixture
def local_auth(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", LOCAL_URL)
    monkeypatch.setenv("SUPABASE_JWT_SECRET", TEST_SECRET)
    return SupabaseAuth()


@pytest.fixture
def ec_key():
    return ec.generate_private_key(ec.SECP256R1())


@pytest.fixture
def hosted_auth(monkeypatch, ec_key):
    monkeypatch.setenv("SUPABASE_URL", HOSTED_URL)
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    auth = SupabaseAuth()
    jwk = pyjwt.algorithms.ECAlgorithm.to_jwk(ec_key.public_key(), as_dict=True)
    auth._jwks_keys = {"keys": [{**jwk, "kid": KID, "alg": "ES256"}]}
    return auth


def _hs256(claims):
    return pyjwt.encode(claims, TEST_SECRET, algorithm="HS256")


def _es256(key, claims, kid=KID):
    return pyjwt.encode(claims, key, algorithm="ES256", headers={"kid": kid})


def _assert_rejected(auth, token):
    with pytest.raises(HTTPException) as exc:
        auth.verify_jwt_token(token)
    assert exc.value.status_code == 401


# --- HS256, local stack -------------------------------------------------------

def test_valid_hs256_token_verifies(local_auth):
    payload = local_auth.verify_jwt_token(_hs256(_claims(LOCAL_URL)))
    assert payload["sub"] == "00000000-0000-0000-0000-000000000001"


def test_expired_token_is_rejected(local_auth):
    _assert_rejected(local_auth, _hs256(_claims(LOCAL_URL, exp=int(time.time()) - 60)))


def test_wrong_audience_is_rejected(local_auth):
    _assert_rejected(local_auth, _hs256(_claims(LOCAL_URL, aud="anon")))


def test_wrong_issuer_is_rejected(local_auth):
    _assert_rejected(local_auth, _hs256(_claims(LOCAL_URL, iss="https://evil.example/auth/v1")))


def test_tampered_signature_is_rejected(local_auth):
    header, payload, signature = _hs256(_claims(LOCAL_URL)).split(".")
    flipped = ("A" if signature[0] != "A" else "B") + signature[1:]
    _assert_rejected(local_auth, f"{header}.{payload}.{flipped}")


def test_token_signed_with_another_secret_is_rejected(local_auth):
    other = pyjwt.encode(_claims(LOCAL_URL), "x" * 48, algorithm="HS256")
    _assert_rejected(local_auth, other)


# --- ES256 via JWKS -----------------------------------------------------------

def test_valid_es256_token_verifies(hosted_auth, ec_key):
    payload = hosted_auth.verify_jwt_token(_es256(ec_key, _claims(HOSTED_URL)))
    assert payload["aud"] == "authenticated"


def test_unknown_key_id_is_rejected(hosted_auth, ec_key):
    _assert_rejected(hosted_auth, _es256(ec_key, _claims(HOSTED_URL), kid="unknown"))


def test_es256_token_from_another_key_is_rejected(hosted_auth):
    stranger = ec.generate_private_key(ec.SECP256R1())
    _assert_rejected(hosted_auth, _es256(stranger, _claims(HOSTED_URL)))


def test_hs256_token_is_rejected_outside_the_local_stack(hosted_auth):
    """Off the local stack only ES256 is accepted, whatever the header claims."""
    token = pyjwt.encode(_claims(HOSTED_URL), TEST_SECRET, algorithm="HS256", headers={"kid": KID})
    _assert_rejected(hosted_auth, token)


def test_unsigned_token_with_a_known_kid_is_rejected(hosted_auth):
    token = pyjwt.encode(_claims(HOSTED_URL), None, algorithm="none", headers={"kid": KID})
    _assert_rejected(hosted_auth, token)
