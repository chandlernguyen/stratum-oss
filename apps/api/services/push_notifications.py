"""
Push notification delivery service for native mobile clients.

This service keeps delivery state durable per notification x device so retries
do not duplicate sends across a user's devices.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import httpx
import jwt
from fastapi import HTTPException, status
from psycopg2.extras import RealDictCursor

from apps.api.utils.database import get_db_connection

logger = logging.getLogger(__name__)

APNS_PRODUCTION_HOST = "https://api.push.apple.com"
APNS_SANDBOX_HOST = "https://api.sandbox.push.apple.com"
ALLOWED_AUTHORIZATION_STATES = ("authorized", "provisional", "ephemeral")
INVALID_DEVICE_REASONS = {"BadDeviceToken", "DeviceTokenNotForTopic", "Unregistered"}


@dataclass(frozen=True)
class PushNotificationConfig:
    dispatch_secret: str
    apns_key_id: str
    apns_team_id: str
    apns_topic: str
    apns_private_key: str
    batch_size: int = 25
    max_attempts: int = 5
    stale_processing_minutes: int = 10
    request_timeout_seconds: float = 10.0

    @classmethod
    def from_env(cls) -> "PushNotificationConfig":
        dispatch_secret = os.getenv("PUSH_DISPATCH_SECRET", "").strip()
        apns_key_id = os.getenv("APNS_KEY_ID", "").strip()
        apns_team_id = os.getenv("APNS_TEAM_ID", "").strip()
        apns_topic = os.getenv("APNS_TOPIC", "").strip()
        apns_private_key = os.getenv("APNS_PRIVATE_KEY", "").strip()
        apns_private_key_path = os.getenv("APNS_PRIVATE_KEY_PATH", "").strip()

        if not apns_private_key and apns_private_key_path:
            try:
                with open(apns_private_key_path, "r", encoding="utf-8") as handle:
                    apns_private_key = handle.read().strip()
            except OSError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Push dispatch not configured: could not read APNS_PRIVATE_KEY_PATH",
                ) from exc

        if apns_private_key:
            apns_private_key = apns_private_key.replace("\\n", "\n")

        missing = [
            name
            for name, value in (
                ("PUSH_DISPATCH_SECRET", dispatch_secret),
                ("APNS_KEY_ID", apns_key_id),
                ("APNS_TEAM_ID", apns_team_id),
                ("APNS_TOPIC", apns_topic),
                ("APNS_PRIVATE_KEY/APNS_PRIVATE_KEY_PATH", apns_private_key),
            )
            if not value
        ]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Push dispatch not configured: missing {', '.join(missing)}",
            )

        return cls(
            dispatch_secret=dispatch_secret,
            apns_key_id=apns_key_id,
            apns_team_id=apns_team_id,
            apns_topic=apns_topic,
            apns_private_key=apns_private_key,
            batch_size=max(1, int(os.getenv("PUSH_DISPATCH_BATCH_SIZE", "25"))),
            max_attempts=max(1, int(os.getenv("PUSH_DISPATCH_MAX_ATTEMPTS", "5"))),
            stale_processing_minutes=max(
                1, int(os.getenv("PUSH_DISPATCH_PROCESSING_TIMEOUT_MINUTES", "10"))
            ),
            request_timeout_seconds=max(
                1.0, float(os.getenv("PUSH_DISPATCH_TIMEOUT_SECONDS", "10"))
            ),
        )


class PushNotificationService:
    def __init__(self, config: Optional[PushNotificationConfig] = None):
        self.config = config or PushNotificationConfig.from_env()
        self._bearer_token: Optional[str] = None
        self._bearer_token_generated_at: float = 0.0

    async def dispatch_pending_deliveries(self, limit: Optional[int] = None) -> Dict[str, Any]:
        batch_limit = min(limit or self.config.batch_size, self.config.batch_size)
        enqueued = self._enqueue_deliveries()
        claimed = self._claim_deliveries(batch_limit)

        delivered = 0
        failed = 0
        invalid_devices = 0

        for delivery in claimed:
            try:
                apns_id = await self._send_delivery(delivery)
                self._mark_delivered(delivery["delivery_id"], apns_id)
                delivered += 1
            except APNSDeliveryError as exc:
                self._mark_failed(
                    delivery_id=delivery["delivery_id"],
                    push_device_id=delivery["push_device_id"],
                    reason=exc.reason,
                    invalid_device=exc.invalid_device,
                )
                if exc.invalid_device:
                    invalid_devices += 1
                else:
                    failed += 1

        summary = {
            "queued": enqueued,
            "claimed": len(claimed),
            "delivered": delivered,
            "failed": failed,
            "invalid_devices": invalid_devices,
            "remaining_capacity": max(batch_limit - len(claimed), 0),
        }
        logger.info("Mobile push dispatch finished", extra=summary)
        return summary

    def _enqueue_deliveries(self) -> int:
        query = """
            INSERT INTO public.notification_push_deliveries (notification_id, push_device_id)
            SELECT n.id, pd.id
            FROM public.notifications n
            JOIN public.push_devices pd
              ON pd.user_id = n.user_id
            WHERE n.is_read = FALSE
              AND pd.platform = 'ios'
              AND pd.is_active = TRUE
              AND pd.authorization_status = ANY(%s)
              AND n.created_at >= pd.created_at
            ON CONFLICT (notification_id, push_device_id) DO NOTHING
        """

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (list(ALLOWED_AUTHORIZATION_STATES),))
                inserted = cursor.rowcount or 0
            conn.commit()
        return inserted

    def _claim_deliveries(self, limit: int) -> List[Dict[str, Any]]:
        claim_query = """
            WITH candidate AS (
                SELECT npd.id
                FROM public.notification_push_deliveries npd
                JOIN public.push_devices pd
                  ON pd.id = npd.push_device_id
                JOIN public.notifications n
                  ON n.id = npd.notification_id
                WHERE pd.platform = 'ios'
                  AND pd.is_active = TRUE
                  AND pd.authorization_status = ANY(%s)
                  AND n.is_read = FALSE
                  AND (
                    npd.status = 'pending'
                    OR (npd.status = 'failed' AND npd.attempt_count < %s)
                    OR (
                        npd.status = 'processing'
                        AND npd.attempt_count < %s
                        AND npd.last_attempted_at < NOW() - (%s * INTERVAL '1 minute')
                    )
                  )
                ORDER BY COALESCE(npd.last_attempted_at, npd.created_at) ASC
                LIMIT %s
                FOR UPDATE SKIP LOCKED
            )
            UPDATE public.notification_push_deliveries AS npd
            SET status = 'processing',
                attempt_count = npd.attempt_count + 1,
                last_attempted_at = NOW(),
                updated_at = NOW(),
                last_error = NULL
            FROM candidate
            WHERE npd.id = candidate.id
            RETURNING npd.id
        """

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    claim_query,
                    (
                        list(ALLOWED_AUTHORIZATION_STATES),
                        self.config.max_attempts,
                        self.config.max_attempts,
                        self.config.stale_processing_minutes,
                        limit,
                    ),
                )
                claimed_ids = [row["id"] for row in cursor.fetchall()]
                if not claimed_ids:
                    conn.commit()
                    return []

                cursor.execute(
                    """
                    SELECT
                        npd.id AS delivery_id,
                        npd.notification_id,
                        npd.push_device_id,
                        npd.attempt_count,
                        pd.device_token,
                        pd.bundle_id,
                        pd.environment,
                        n.type AS notification_type,
                        n.title,
                        n.body,
                        n.resource_type,
                        n.resource_id,
                        n.action_url
                    FROM public.notification_push_deliveries npd
                    JOIN public.push_devices pd
                      ON pd.id = npd.push_device_id
                    JOIN public.notifications n
                      ON n.id = npd.notification_id
                    WHERE npd.id = ANY(%s)
                    ORDER BY npd.last_attempted_at ASC
                    """,
                    (claimed_ids,),
                )
                deliveries = [dict(row) for row in cursor.fetchall()]
            conn.commit()
        return deliveries

    async def _send_delivery(self, delivery: Dict[str, Any]) -> str:
        payload = self._build_payload(delivery)
        url = f"{self._apns_host(delivery['environment'])}/3/device/{delivery['device_token']}"
        headers = self._build_headers(delivery)

        timeout = httpx.Timeout(self.config.request_timeout_seconds)
        async with httpx.AsyncClient(http2=True, timeout=timeout) as client:
            response = await client.post(url, headers=headers, content=json.dumps(payload))

        apns_id = response.headers.get("apns-id", "")
        if response.status_code == 200:
            return apns_id

        reason = "UnknownError"
        try:
            response_json = response.json()
            reason = response_json.get("reason") or reason
        except ValueError:
            pass

        logger.warning("APNs delivery failed", extra={"reason": reason})
        raise APNSDeliveryError(reason=reason, invalid_device=reason in INVALID_DEVICE_REASONS)

    def _build_headers(self, delivery: Dict[str, Any]) -> Dict[str, str]:
        return {
            "authorization": f"bearer {self._apns_bearer_token()}",
            "apns-topic": delivery.get("bundle_id") or self.config.apns_topic,
            "apns-push-type": "alert",
            "apns-priority": "10",
            "content-type": "application/json",
        }

    def _build_payload(self, delivery: Dict[str, Any]) -> Dict[str, Any]:
        payload = {
            "aps": {
                "alert": {
                    "title": delivery["title"],
                    "body": delivery.get("body") or delivery["notification_type"].replace("_", " ").title(),
                },
                "sound": "default",
                "thread-id": delivery.get("resource_type") or "general",
            },
            "notification_id": str(delivery["notification_id"]),
            "resource_type": delivery.get("resource_type") or "",
            "resource_id": str(delivery["resource_id"]) if delivery.get("resource_id") else "",
            "action_url": delivery.get("action_url") or "",
            "type": delivery["notification_type"],
        }
        return payload

    def _apns_bearer_token(self) -> str:
        now = time.time()
        if self._bearer_token and (now - self._bearer_token_generated_at) < 50 * 60:
            return self._bearer_token

        token = jwt.encode(
            {"iss": self.config.apns_team_id, "iat": int(now)},
            self.config.apns_private_key,
            algorithm="ES256",
            headers={"alg": "ES256", "kid": self.config.apns_key_id},
        )
        self._bearer_token = token
        self._bearer_token_generated_at = now
        return token

    def _mark_delivered(self, delivery_id: str, apns_id: str) -> None:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE public.notification_push_deliveries
                    SET status = 'delivered',
                        apns_id = NULLIF(%s, ''),
                        delivered_at = NOW(),
                        updated_at = NOW(),
                        last_error = NULL
                    WHERE id = %s
                    """,
                    (apns_id, delivery_id),
                )
            conn.commit()

    def _mark_failed(
        self,
        delivery_id: str,
        push_device_id: str,
        reason: str,
        invalid_device: bool,
    ) -> None:
        delivery_status = "invalid_device" if invalid_device else "failed"
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE public.notification_push_deliveries
                    SET status = %s,
                        last_error = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (delivery_status, reason, delivery_id),
                )
                if invalid_device:
                    cursor.execute(
                        """
                        UPDATE public.push_devices
                        SET is_active = FALSE,
                            disabled_at = NOW(),
                            last_error = %s,
                            updated_at = NOW()
                        WHERE id = %s
                        """,
                        (reason, push_device_id),
                    )
                else:
                    cursor.execute(
                        """
                        UPDATE public.push_devices
                        SET last_error = %s,
                            updated_at = NOW()
                        WHERE id = %s
                        """,
                        (reason, push_device_id),
                    )
            conn.commit()

    @staticmethod
    def _apns_host(environment: Optional[str]) -> str:
        if environment in {"development", "sandbox"}:
            return APNS_SANDBOX_HOST
        return APNS_PRODUCTION_HOST


class APNSDeliveryError(Exception):
    def __init__(self, reason: str, invalid_device: bool = False):
        super().__init__(reason)
        self.reason = reason
        self.invalid_device = invalid_device
