"""
Collaboration API Endpoints (DEPRECATED)
=========================================

DEPRECATION NOTICE:
These API endpoints are deprecated in favor of database-first approach.
Frontend now calls supabase.rpc() directly for all collaboration features.

Database functions (Migration 283):
- create_approval_request()
- list_approval_requests()
- get_approval_request()
- resolve_approval_request()
- create_comment()
- list_comments()
- update_comment()
- delete_comment()
- create_task()
- list_tasks()
- get_task()
- update_task()
- list_notifications()
- get_assignable_team_members()

See: /docs/architecture/DATABASE_FIRST_COLLABORATION_REFACTOR_ACTION_PLAN_2025_12_04.md
"""

from fastapi import APIRouter, HTTPException
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/collaboration", tags=["collaboration"])


@router.get("/health")
async def collaboration_health():
    """Health check for collaboration module"""
    return {
        "status": "healthy",
        "message": "Collaboration features use database-first approach. Frontend calls supabase.rpc() directly.",
        "deprecated_endpoints": True
    }


# All other endpoints removed - frontend uses supabase.rpc() directly
# If legacy support is needed, uncomment and update to call database functions via RPC
