"""
Query validation on the insights router.

The sort, order and export-format parameters are allow-listed by pattern.
These pin that the allow-lists still reject unknown values, and that the
router declares them without FastAPI's deprecated `regex=` keyword, which a
later FastAPI release removes.
"""

import importlib
import sys
import warnings

import pytest
from fastapi import FastAPI
from fastapi.exceptions import FastAPIDeprecationWarning
from fastapi.testclient import TestClient

from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.database import get_supabase_client

MODULE = "apps.api.routers.insights"


def test_router_declares_no_deprecated_parameters():
    sys.modules.pop(MODULE, None)
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always", FastAPIDeprecationWarning)
        importlib.import_module(MODULE)
    deprecations = [w for w in caught if issubclass(w.category, FastAPIDeprecationWarning)]
    assert not deprecations, [str(w.message) for w in deprecations]


@pytest.fixture
def client():
    router = importlib.import_module(MODULE).router
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: {"id": "test-user"}
    app.dependency_overrides[get_supabase_client] = lambda: None
    return TestClient(app, raise_server_exceptions=False)


@pytest.mark.parametrize(
    "path, params",
    [
        ("/api/v1/insights/", {"sort": "password"}),
        ("/api/v1/insights/", {"order": "sideways"}),
        ("/api/v1/insights/export", {"format": "xml"}),
    ],
)
def test_unknown_allow_listed_values_are_rejected(client, path, params):
    assert client.get(path, params=params).status_code == 422
