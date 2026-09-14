#!/usr/bin/env python3
"""
Live integration checks for the native iOS app contract.

These tests intentionally validate the backend endpoints that the iOS app uses,
paired with the real local Supabase seed state. They complement XCUITest smoke
coverage with deterministic checks for:

- turn-by-turn conversation memory
- SSE streaming events
- SME vs agency schema routing
- agency client/campaign scoped sessions
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

import psycopg2
import pytest
import requests
from psycopg2.extras import RealDictCursor
from supabase import Client, create_client


SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:56321")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
)
API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:56300")
PG_HOST = os.getenv("PGHOST", "127.0.0.1")
PG_PORT = int(os.getenv("PGPORT", "56322"))
PG_DATABASE = os.getenv("PGDATABASE", "postgres")
PG_USER = os.getenv("PGUSER", "postgres")
PG_PASSWORD = os.getenv("PGPASSWORD", "postgres")


@dataclass
class AuthContext:
    client: Client
    access_token: str
    user_id: str
    org_id: str

    @property
    def headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }


@dataclass
class StreamResult:
    text: str
    tool_names: list[str]
    saw_stream_end: bool
    saw_text_chunk: bool
    raw_events: list[dict[str, Any]]


def authenticate(email: str, password: str) -> AuthContext:
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    auth_response = client.auth.sign_in_with_password({
        "email": email,
        "password": password,
    })

    user = auth_response.user
    session = auth_response.session
    assert user is not None, f"failed to authenticate {email}: no user returned"
    assert session is not None, f"failed to authenticate {email}: no session returned"

    profile = (
        client.table("users")
        .select("org_id")
        .eq("id", user.id)
        .single()
        .execute()
        .data
    )
    assert profile and profile.get("org_id"), f"no org_id found for {email}"

    return AuthContext(
        client=client,
        access_token=session.access_token,
        user_id=user.id,
        org_id=profile["org_id"],
    )


def create_session(
    auth: AuthContext,
    *,
    agent_type: str,
    client_id: str | None = None,
    campaign_id: str | None = None,
    mode: str | None = None,
) -> str:
    payload: dict[str, Any] = {"agent_type": agent_type}
    if client_id:
        payload["client_id"] = client_id
    if campaign_id:
        payload["campaign_id"] = campaign_id
    if mode:
        payload["mode"] = mode

    response = requests.post(
        f"{API_BASE_URL}/api/v1/direct-agents/sessions",
        headers=auth.headers,
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    assert data.get("session_id"), f"missing session_id in create response: {data}"
    return data["session_id"]


def stream_chat(
    auth: AuthContext,
    *,
    agent_type: str,
    session_id: str,
    message: str,
    client_id: str | None = None,
    campaign_id: str | None = None,
    mode: str | None = None,
    timeout_seconds: int = 180,
) -> StreamResult:
    payload: dict[str, Any] = {
        "session_id": session_id,
        "message": message,
    }
    if client_id:
        payload["client_id"] = client_id
    if campaign_id:
        payload["campaign_id"] = campaign_id
    if mode:
        payload["mode"] = mode

    response = requests.post(
        f"{API_BASE_URL}/api/v1/direct-agents/{agent_type}/chat",
        headers=auth.headers,
        json=payload,
        stream=True,
        timeout=(30, timeout_seconds),
    )
    response.raise_for_status()
    assert "text/event-stream" in response.headers.get("content-type", "")

    current_event = ""
    current_data_lines: list[str] = []
    full_text = ""
    tool_names: list[str] = []
    saw_stream_end = False
    saw_text_chunk = False
    raw_events: list[dict[str, Any]] = []

    def flush_event() -> None:
        nonlocal current_event, current_data_lines, full_text, saw_stream_end, saw_text_chunk
        if not current_event or not current_data_lines:
            current_event = ""
            current_data_lines = []
            return

        payload_str = "\n".join(current_data_lines)
        data = json.loads(payload_str)
        raw_events.append({"event": current_event, "data": data})

        if current_event == "text_chunk":
            token = data.get("token", "")
            full_text += token
            saw_text_chunk = saw_text_chunk or bool(token)
        elif current_event == "tool_result":
            tool_name = data.get("tool_name")
            if tool_name:
                tool_names.append(tool_name)
        elif current_event == "error":
            pytest.fail(f"agent stream returned error event: {data}")
        elif current_event == "stream_end":
            saw_stream_end = True

        current_event = ""
        current_data_lines = []

    for raw_line in response.iter_lines(decode_unicode=True):
        if raw_line is None:
            continue

        line = raw_line.rstrip("\r")
        if line.startswith("event:"):
            current_event = line[6:].strip()
        elif line.startswith("data:"):
            current_data_lines.append(line[5:].lstrip())
        elif line == "":
            flush_event()
            if saw_stream_end:
                break

    if current_event or current_data_lines:
        flush_event()

    return StreamResult(
        text=full_text,
        tool_names=tool_names,
        saw_stream_end=saw_stream_end,
        saw_text_chunk=saw_text_chunk,
        raw_events=raw_events,
    )


def fetch_first_agency_client_and_campaign(auth: AuthContext) -> tuple[dict[str, Any], dict[str, Any]]:
    clients = (
        auth.client
        .table("clients")
        .select("id, name, slug, industry, created_at")
        .eq("org_id", auth.org_id)
        .order("name")
        .execute()
        .data
    )
    assert clients, "expected seeded agency clients"
    client = clients[0]

    campaigns = (
        auth.client
        .rpc(
            "get_campaigns_list_routed",
            {
                "p_org_id": auth.org_id,
                "p_include_archived": False,
                "p_client_id": client["id"],
                "p_status": None,
                "p_limit": 8,
                "p_offset": 0,
            },
        )
        .execute()
        .data
    )
    assert campaigns, f"expected seeded campaigns for client {client['name']}"
    return client, campaigns[0]


def fetch_session_location(session_id: str) -> dict[str, Any]:
    query = """
        select schema_name, session_id, client_id, campaign_id
        from (
            select 'public'::text as schema_name,
                   id::text as session_id,
                   client_id::text as client_id,
                   (session_data->>'campaign_id')::text as campaign_id
            from public.agent_conversations
            where id = %s

            union all

            select 'agency'::text as schema_name,
                   id::text as session_id,
                   client_id::text as client_id,
                   campaign_id::text as campaign_id
            from agency.agent_conversations
            where id = %s
        ) located
        limit 1
    """

    with psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        dbname=PG_DATABASE,
        user=PG_USER,
        password=PG_PASSWORD,
    ) as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, (session_id, session_id))
            row = cursor.fetchone()

    assert row is not None, f"session {session_id} was not found in public or agency schema"
    return dict(row)


@pytest.mark.integration
def test_ios_sme_strategy_stream_turn_by_turn_memory() -> None:
    auth = authenticate("sme.owner@example.com", "LocalDevOnly123!")

    session_id = create_session(auth, agent_type="strategy")
    location = fetch_session_location(session_id)

    assert location["schema_name"] == "public"
    assert location["client_id"] is None
    assert location["campaign_id"] is None

    first_turn = stream_chat(
        auth,
        agent_type="strategy",
        session_id=session_id,
        message="We are discussing Northstar Coffee. In one sentence, what is the main strategic risk?",
    )

    assert first_turn.saw_stream_end, "expected stream_end event on first turn"
    assert first_turn.saw_text_chunk or first_turn.tool_names, "expected text or tool events on first turn"
    assert first_turn.text.strip(), "expected non-empty assistant text on first turn"

    second_turn = stream_chat(
        auth,
        agent_type="strategy",
        session_id=session_id,
        message="What company are we discussing? Reply with just the company name.",
    )

    normalized = second_turn.text.lower()
    assert second_turn.saw_stream_end, "expected stream_end event on second turn"
    assert "northstar" in normalized and "coffee" in normalized, second_turn.text


@pytest.mark.integration
def test_ios_agency_campaign_session_routes_and_preserves_scope() -> None:
    auth = authenticate("agency.owner@example.com", "LocalDevOnly123!")
    client, campaign = fetch_first_agency_client_and_campaign(auth)

    session_id = create_session(
        auth,
        agent_type="campaign_planning",
        client_id=client["id"],
        campaign_id=campaign["id"],
    )
    location = fetch_session_location(session_id)

    assert location["schema_name"] == "agency"
    assert location["client_id"] == client["id"]
    assert location["campaign_id"] == campaign["id"]

    first_turn = stream_chat(
        auth,
        agent_type="campaign_planning",
        session_id=session_id,
        client_id=client["id"],
        campaign_id=campaign["id"],
        message="What campaign and client are we scoped to right now? Answer concisely.",
    )

    assert first_turn.saw_stream_end, "expected stream_end event on scoped first turn"
    assert first_turn.saw_text_chunk or first_turn.tool_names, "expected text or tool events on scoped first turn"
    assert first_turn.text.strip(), "expected non-empty assistant text on scoped first turn"

    second_turn = stream_chat(
        auth,
        agent_type="campaign_planning",
        session_id=session_id,
        message="Reply with the client company name and campaign name for this session.",
    )

    normalized = second_turn.text.lower()
    expected_client_name = client["name"].lower()
    expected_campaign_name = campaign["name"].lower()
    assert second_turn.saw_stream_end, "expected stream_end event on scoped second turn"
    assert expected_client_name in normalized, second_turn.text
    assert expected_campaign_name in normalized, second_turn.text
