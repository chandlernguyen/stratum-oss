import uuid

from fastapi import FastAPI
from fastapi.testclient import TestClient

from apps.api.routers.mobile_push import router as mobile_push_router
from apps.api.services.push_notifications import (
    APNS_SANDBOX_HOST,
    APNS_PRODUCTION_HOST,
    PushNotificationConfig,
    PushNotificationService,
)


def test_mobile_push_dispatch_requires_secret(monkeypatch):
    monkeypatch.setenv("PUSH_DISPATCH_SECRET", "top-secret")
    app = FastAPI()
    app.include_router(mobile_push_router)

    client = TestClient(app)
    response = client.post("/api/v1/internal/mobile-push/dispatch")

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid push dispatch secret"


def test_mobile_push_dispatch_uses_service_when_secret_matches(monkeypatch):
    monkeypatch.setenv("PUSH_DISPATCH_SECRET", "top-secret")
    monkeypatch.setenv("APNS_KEY_ID", "KEY1234567")
    monkeypatch.setenv("APNS_TEAM_ID", "TEAM123456")
    monkeypatch.setenv("APNS_TOPIC", "com.example.stratum")
    monkeypatch.setenv(
        "APNS_PRIVATE_KEY",
        "-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----",
    )
    app = FastAPI()
    app.include_router(mobile_push_router)

    async def fake_dispatch_pending_deliveries(self, limit=None):
        return {"claimed": 1, "delivered": 1, "limit": limit}

    monkeypatch.setattr(
        PushNotificationService,
        "dispatch_pending_deliveries",
        fake_dispatch_pending_deliveries,
    )

    client = TestClient(app)
    response = client.post(
        "/api/v1/internal/mobile-push/dispatch?limit=12",
        headers={"X-Push-Dispatch-Secret": "top-secret"},
    )

    assert response.status_code == 200
    assert response.json() == {"claimed": 1, "delivered": 1, "limit": 12}


def test_push_notification_payload_contains_native_drill_in_metadata():
    service = PushNotificationService(
        config=PushNotificationConfig(
            dispatch_secret="dispatch",
            apns_key_id="KEY1234567",
            apns_team_id="TEAM123456",
            apns_topic="com.example.stratum",
            apns_private_key="-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----",
        )
    )

    notification_id = uuid.uuid4()
    resource_id = uuid.uuid4()
    payload = service._build_payload(
        {
            "notification_id": notification_id,
            "notification_type": "approval_request",
            "title": "Launch approval required",
            "body": "Review the launch assets before 5 PM.",
            "resource_type": "campaign",
            "resource_id": resource_id,
            "action_url": f"/campaigns/{resource_id}",
        }
    )

    assert payload["aps"]["alert"]["title"] == "Launch approval required"
    assert payload["resource_type"] == "campaign"
    assert payload["resource_id"] == str(resource_id)
    assert payload["notification_id"] == str(notification_id)
    assert payload["action_url"] == f"/campaigns/{resource_id}"


def test_push_notification_uses_correct_apns_host_by_environment():
    assert PushNotificationService._apns_host("development") == APNS_SANDBOX_HOST
    assert PushNotificationService._apns_host("sandbox") == APNS_SANDBOX_HOST
    assert PushNotificationService._apns_host("production") == APNS_PRODUCTION_HOST


def test_push_notification_headers_prefer_delivery_bundle_id(monkeypatch):
    service = PushNotificationService(
        config=PushNotificationConfig(
            dispatch_secret="dispatch",
            apns_key_id="KEY1234567",
            apns_team_id="TEAM123456",
            apns_topic="com.example.stratumapp",
            apns_private_key="-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----",
        )
    )
    monkeypatch.setattr(service, "_apns_bearer_token", lambda: "test-token")

    headers = service._build_headers(
        {
            "bundle_id": "com.example.CustomBundle",
            "environment": "production",
        }
    )

    assert headers["authorization"] == "bearer test-token"
    assert headers["apns-topic"] == "com.example.CustomBundle"


def test_push_notification_headers_fall_back_to_config_topic(monkeypatch):
    service = PushNotificationService(
        config=PushNotificationConfig(
            dispatch_secret="dispatch",
            apns_key_id="KEY1234567",
            apns_team_id="TEAM123456",
            apns_topic="com.example.stratumapp",
            apns_private_key="-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----",
        )
    )
    monkeypatch.setattr(service, "_apns_bearer_token", lambda: "test-token")

    headers = service._build_headers(
        {
            "bundle_id": "",
            "environment": "production",
        }
    )

    assert headers["apns-topic"] == "com.example.stratumapp"
