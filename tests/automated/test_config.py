"""
Single source of truth for backend test configuration.

Why this module exists
----------------------
Backend tests used to read the services they talk to from bare ``os.getenv``
calls whose fallbacks were Supabase's and FastAPI's *default* ports
(``127.0.0.1:54321`` and ``localhost:8000``). This project deliberately runs on
custom ports (``563xx``) so that it does not collide with other local Supabase
projects, and the tests therefore pointed at nothing. Because roughly 54 test
modules carried their own copy of those fallbacks, fixing one did not fix the
rest, and the failure looked like a broken application rather than a broken
fallback.

Configuration is resolved in this order, first match wins:

1. an explicit environment variable,
2. ``tests/.env``,
3. ``apps/api/.env`` if it exists,
4. the local-development defaults below, which mirror ``supabase/config.toml``.

The defaults are the last resort on purpose. A fresh clone with no ``.env``
still gets a runnable suite, and wrong configuration surfaces as a connection
error against a known-correct port instead of against port 54321.

Ports are defined once, at the bottom of this module. If
``supabase/config.toml`` changes, change them in exactly one place.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# tests/automated/test_config.py -> repo root is three levels up.
REPO_ROOT = Path(__file__).resolve().parents[2]
TESTS_ENV = REPO_ROOT / "tests" / ".env"
API_ENV = REPO_ROOT / "apps" / "api" / ".env"

# Load the least specific file first so a developer's tests/.env wins over the
# application's .env. python-dotenv does not override already-set variables, so
# real environment variables (e.g. from CI) win over both.
if API_ENV.exists():
    load_dotenv(API_ENV)
if TESTS_ENV.exists():
    load_dotenv(TESTS_ENV, override=True)

# --- Defaults, matching supabase/config.toml and the README ---
_DEFAULT_SUPABASE_HOST = "127.0.0.1"
_DEFAULT_SUPABASE_API_PORT = "56321"
_DEFAULT_DB_PORT = "56322"
_DEFAULT_API_PORT = "56300"

# Supabase's local-development anon and service_role JWTs are deterministic:
# they are signed with the fixed local JWT secret below. Both are public
# knowledge and only ever valid against a local stack.
_LOCAL_JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long"
_LOCAL_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9."
    "CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
)
_LOCAL_SERVICE_ROLE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0."
    "EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
)


def _default_supabase_url() -> str:
    return f"http://{_DEFAULT_SUPABASE_HOST}:{_DEFAULT_SUPABASE_API_PORT}"


def _default_api_base_url() -> str:
    return f"http://{_DEFAULT_SUPABASE_HOST}:{_DEFAULT_API_PORT}"


# --- Supabase (PostgREST) ---
SUPABASE_URL: str = os.getenv("SUPABASE_URL") or _default_supabase_url()
SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY") or _LOCAL_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY: str = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY") or _LOCAL_SERVICE_ROLE_KEY
)

# --- Backend API (uvicorn) ---
API_BASE_URL: str = os.getenv("API_BASE_URL") or _default_api_base_url()

# --- Direct Postgres, used by the handful of tests that bypass PostgREST ---
DB_HOST: str = os.getenv("DB_HOST") or _DEFAULT_SUPABASE_HOST
DB_PORT: str = os.getenv("DB_PORT") or _DEFAULT_DB_PORT
DB_NAME: str = os.getenv("DB_NAME") or "postgres"
DB_USER: str = os.getenv("DB_USER") or "postgres"
DB_PASSWORD: str = os.getenv("DB_PASSWORD") or "postgres"

# --- Test credentials, seeded by supabase/seed.sql ---
TEST_EMAIL: str = os.getenv("TEST_EMAIL") or "sme.owner@example.com"
TEST_PASSWORD: str = os.getenv("TEST_PASSWORD") or "LocalDevOnly123!"
AGENCY_OWNER_EMAIL: str = os.getenv("AGENCY_OWNER_EMAIL") or "agency.owner@example.com"

# --- Health endpoints, so callers do not re-spell the paths ---
HEALTH_URL: str = f"{API_BASE_URL}/api/v1/health"
