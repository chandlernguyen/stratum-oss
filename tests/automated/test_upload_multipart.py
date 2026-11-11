"""
Multipart parsing on the chat upload route.

The route parses a file and a form field before it validates anything, so
these pin how the web stack treats well-formed and broken multipart bodies.
Every case is rejected before the file would reach the Gemini Files API, so
nothing leaves the process.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from apps.api.middleware.subscription import verify_write_access
from apps.api.routers.direct_agents import router

URL = "/api/v1/direct-agents/strategy/upload"


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[verify_write_access] = lambda: {"id": "test-user"}
    return TestClient(app, raise_server_exceptions=False)


def test_parsed_file_reaches_validation(client):
    """A well-formed body is parsed: the route sees the part's content type."""
    response = client.post(
        URL,
        files={"file": ("logo.png", b"\x89PNG\r\n", "image/png")},
        data={"session_id": "s-1"},
    )
    assert response.status_code == 400
    assert "Unsupported file type: image/png" in response.json()["detail"]


def test_missing_file_part_is_a_validation_error(client):
    response = client.post(URL, data={"session_id": "s-1"})
    assert response.status_code == 422


def test_truncated_multipart_body_is_a_client_error(client):
    body = b'--b\r\nContent-Disposition: form-data; name="file"; filename="a.txt"\r\n'
    response = client.post(URL, content=body, headers={"Content-Type": "multipart/form-data; boundary=b"})
    assert 400 <= response.status_code < 500


def test_multipart_without_boundary_is_a_client_error(client):
    response = client.post(URL, content=b"garbage", headers={"Content-Type": "multipart/form-data"})
    assert 400 <= response.status_code < 500
