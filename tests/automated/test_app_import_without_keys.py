"""
The application must be importable without provider credentials.

Importing apps.api.main previously constructed a google.genai client at import
time, in two places:

  - apps/api/services/context_intelligence.py built its Gemini client inside
    __init__ of a module-level singleton
  - apps/api/routers/action_plan_detector.py raised outright if GOOGLE_API_KEY
    was unset, then built a client at module scope

The effect was that `import apps.api.main` failed with

    ValueError: Missing key inputs argument! To use the Google AI API, provide
    (`api_key`) arguments.

before the application could start at all. That blocks first-run setup,
prevents a key-free demo mode, and turns a missing env var into a confusing
import-time crash rather than an actionable error at the point of use.

Importing must be free; requiring a key belongs at the point of use.
"""

import os
import pathlib
import subprocess
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]

CREDENTIAL_VARS = ("GOOGLE_API_KEY", "GEMINI_API_KEY")


def _run_without_ai_credentials(code: str) -> subprocess.CompletedProcess:
    env = {k: v for k, v in os.environ.items() if k not in CREDENTIAL_VARS}
    # Core application config (Supabase) is still required at import and is
    # validated there with an actionable message. That is deliberate fail-fast
    # for genuinely required config; this test is scoped to AI provider
    # credentials, which are optional.
    env.setdefault("SUPABASE_URL", "http://127.0.0.1:56321")
    return subprocess.run(
        [sys.executable, "-c", code],
        cwd=REPO_ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=180,
    )


def test_app_imports_without_google_api_key():
    result = _run_without_ai_credentials("import apps.api.main")
    assert result.returncode == 0, (
        "importing apps.api.main must not require AI provider credentials.\n"
        f"stderr tail:\n{result.stderr[-3000:]}"
    )


def test_lazy_client_reports_missing_key_at_use_not_import():
    """
    The lazy client should still fail clearly when actually used without a key,
    so the fix does not silently turn a misconfiguration into a runtime no-op.
    """
    code = (
        "from apps.api.services.context_intelligence import context_intelligence\n"
        "try:\n"
        "    _ = context_intelligence.client\n"
        "except ValueError as e:\n"
        "    assert 'GOOGLE_API_KEY' in str(e)\n"
        "else:\n"
        "    raise SystemExit('expected ValueError when using the client without a key')\n"
    )
    result = _run_without_ai_credentials(code)
    assert result.returncode == 0, result.stderr[-3000:]
