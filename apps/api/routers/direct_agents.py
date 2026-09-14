"""
FastAPI router for all 10 refactored, tool-based agent endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from supabase import Client
import logging
import json
from datetime import datetime, UTC, timedelta
import tempfile
import os
import aiofiles

from apps.api.models.chat_models import ChatRequest, ChatResponse, FileUploadResponse, UploadedFileInfo
from apps.api.agents.direct_strategy_agent import DirectStrategyAgent
from apps.api.agents.direct_persona_agent import DirectPersonaAgent
from apps.api.agents.direct_marketing_strategy_agent import DirectMarketingStrategyAgent
from apps.api.agents.direct_content_agent import DirectContentAgent
from apps.api.agents.direct_campaign_execution_agent import DirectCampaignExecutionAgent
from apps.api.agents.direct_competitive_intelligence_agent import DirectCompetitiveIntelligenceAgent
from apps.api.agents.direct_client_success_agent import DirectClientSuccessAgent
from apps.api.agents.direct_performance_intelligence_agent import DirectPerformanceIntelligenceAgent
from apps.api.agents.direct_quick_start_agent import DirectQuickStartAgent
from apps.api.exceptions import GeminiAPIError
from apps.api.services.session_service import SessionService
from apps.api.auth.supabase_auth import get_current_user_with_org
from apps.api.utils.database import get_supabase_client
from apps.api.middleware.locale import get_locale_from_request
from apps.api.middleware.subscription import verify_active_subscription, verify_write_access

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/direct-agents", tags=["Direct Agents"])

from apps.api.middleware.ai_rate_limit import (  # noqa: E402
    AI_RATE_LIMIT_ENABLED,
    AI_RATE_LIMIT_REQUESTS,
    check_ai_rate_limit,
)

AGENT_MAP = {
    "strategy": DirectStrategyAgent,
    "persona": DirectPersonaAgent,
    "marketing_strategy": DirectMarketingStrategyAgent,
    "content": DirectContentAgent,
    "performance_intelligence": DirectPerformanceIntelligenceAgent,  # Consolidates analytics, roi_budget, quick_wins
    "campaign_planning": DirectCampaignExecutionAgent,  # Renamed from campaign_planning
    "competitive_intelligence": DirectCompetitiveIntelligenceAgent,
    "client_success": DirectClientSuccessAgent,
    "quick_start": DirectQuickStartAgent,  # NEW: Unified onboarding agent combining strategy, persona, marketing strategy
}

class SessionRequest(BaseModel):
    agent_type: str = Field(..., max_length=50, description="Agent type identifier")
    campaign_id: Optional[str] = Field(None, max_length=100)
    client_id: Optional[str] = Field(None, max_length=100)
    mode: Optional[str] = Field(None, max_length=50)

class SessionUpdateRequest(BaseModel):
    session_title: str = Field(..., min_length=1, max_length=200, description="Session title")

class QuickStartRequest(BaseModel):
    company: str = Field(..., min_length=1, max_length=200, description="Company name")
    goal: str = Field(..., min_length=1, max_length=500, description="Business goal")
    audience: str = Field(..., min_length=1, max_length=500, description="Target audience")
    budget: str = Field(..., min_length=1, max_length=100, description="Budget range")
    timeline: str = Field(..., min_length=1, max_length=100, description="Timeline")

class QuickStartResponse(BaseModel):
    strategy_output_id: str
    persona_output_id: str
    marketing_strategy_output_id: str
    success: bool
    message: str

@router.post("/sessions", response_model=Dict[str, str])
async def create_agent_session(
    request: SessionRequest,
    user: Dict[str, Any] = Depends(verify_write_access),
    db: Client = Depends(get_supabase_client)
):
    """Create a new chat session for any agent type."""
    agent_type = request.agent_type
    if agent_type not in AGENT_MAP:
        raise HTTPException(status_code=404, detail=f"Agent type '{agent_type}' not found.")

    logger.info(f"User {user.get('email')} creating '{agent_type}' session.")
    try:
        # get_current_user_with_org already provides org_id from JWT
        org_id = user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")
        session_service = SessionService(db)

        # Create session with generic title (background title generation will update it)
        # Use "New Session" consistent with SME behavior - intelligent title generated after first messages
        session_name = "New Session"

        session_id = await session_service.create_session(
            user_id=user["id"],
            org_id=org_id,
            agent_type=agent_type,
            session_name=session_name,
            campaign_id=request.campaign_id,
            client_id=request.client_id,
            mode=request.mode
        )
        response = {
            "session_id": session_id,
            "agent_type": agent_type,  # Include agent_type for cross-agent routing
        }
        # Only include mode if provided (response_model requires all values to be strings)
        if request.mode:
            response["mode"] = request.mode
        return response
    except Exception as e:
        logger.error(f"Failed to create session for agent '{agent_type}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create session.")

@router.get("/content/analyze-needs")
async def analyze_content_needs(
    user: Dict[str, Any] = Depends(get_current_user_with_org)
):
    """Analyze content needs and return recommendations."""
    try:
        org_id = user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        # Week 4: Get org_type for schema routing
        org_type = None
        db = get_supabase_client()
        try:
            org_result = db.table("organizations").select("type").eq("id", org_id).execute()
            if org_result.data:
                org_type = org_result.data[0].get("type")
        except Exception as e:
            logger.warning(f"Could not retrieve org_type for analyze-needs: {e}")

        # Initialize content agent
        agent = DirectContentAgent()
        await agent.__ainit__(org_id=org_id, user_id=user["id"], org_type=org_type)

        # Analyze content needs through planning tools
        result = await agent.planning_tools.analyze_content_needs(
            include_prerequisites=True,
            max_recommendations=5
        )

        return result
    except Exception as e:
        logger.error(f"Failed to analyze content needs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{agent_type}/sessions")
async def get_agent_sessions(
    agent_type: str,
    archived: bool = False,
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
):
    """Get all sessions for a specific agent type for the current user."""
    if agent_type not in AGENT_MAP:
        raise HTTPException(status_code=404, detail=f"Agent type '{agent_type}' not found.")

    try:
        org_id = user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        # Use Database-First RPC function for schema routing
        # This works for both Agency (agency.agent_conversations) and SME (public.agent_conversations)
        result = db.rpc('get_conversations_routed', {
            'p_org_id': org_id,
            'p_agent_type': agent_type,
            'p_client_id': None,  # Get all sessions regardless of client
            'p_limit': 100,
            'p_offset': 0
        }).execute()

        conversations = result.data or []

        # Filter by user_id for SME users (Agency users see all client sessions)
        # Note: get_conversations_routed returns user_id, so we can filter here
        user_conversations = [c for c in conversations if c.get("user_id") == user["id"]]

        # Filter by archived status
        if archived:
            filtered_conversations = [c for c in user_conversations if c.get("archived_at") is not None]
        else:
            filtered_conversations = [c for c in user_conversations if c.get("archived_at") is None]

        # Transform to sessions format
        sessions_data = []
        for conversation in filtered_conversations:
            session = {
                "id": conversation["id"],
                "agent_type": agent_type,  # Include agent_type for cross-agent routing
                "mode": conversation.get("mode"),  # Include mode for marketing_strategy routing
                "created_at": conversation["created_at"],
                "updated_at": conversation["updated_at"],
                "session_title": conversation.get("title"),  # Already extracted by RPC function
                "message_count": conversation.get("message_count", 0),  # Already calculated by RPC function
                "first_message": "No messages" if conversation.get("message_count", 0) == 0 else "",  # TODO: Add first_message to RPC function
                "archived": bool(conversation.get("archived_at")),
                "archived_at": conversation.get("archived_at"),
                "archived_by": None,  # TODO: Add to RPC function
                "archive_reason": None  # TODO: Add to RPC function
            }

            # Add persona-specific fields if this is a persona agent
            # For SME users, this comes from session_data (need to fetch separately)
            # For Agency users, this would come from persona_id foreign key (TODO)
            if agent_type == "persona":
                # Fetch session details to get persona info
                session_details = db.rpc('get_session_routed', {
                    'p_session_id': conversation["id"]
                }).execute()
                if session_details.data:
                    session_data = session_details.data[0].get("session_data") or {}
                    session["persona_id"] = session_data.get("persona_id")
                    session["persona_name"] = session_data.get("persona_name")

            sessions_data.append(session)

        return {"sessions": sessions_data}
    except Exception as e:
        logger.error(f"Failed to get sessions for agent '{agent_type}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get sessions.")

@router.get("/{agent_type}/sessions/{session_id}/messages")
async def get_session_messages(
    agent_type: str,
    session_id: str,
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
):
    """Get all messages for a specific session."""
    if agent_type not in AGENT_MAP:
        raise HTTPException(status_code=404, detail=f"Agent type '{agent_type}' not found.")

    try:
        # Use Database-First RPC function for schema routing
        # This retrieves messages from agency.agent_messages OR public.agent_messages
        result = db.rpc('get_conversation_history_routed', {
            'p_session_id': session_id,
            'p_limit': 1000  # Get all messages
        }).execute()

        messages = result.data or []

        # Verify session belongs to user (check first message's conversation metadata)
        if messages:
            # Get session details to verify ownership
            session_result = db.rpc('get_session_routed', {
                'p_session_id': session_id
            }).execute()

            session = session_result.data[0] if session_result.data else None
            if not session or session.get('user_id') != user['id']:
                logger.warning(f"User {user['id']} attempted to access session {session_id} owned by {session.get('user_id') if session else 'unknown'}")
                return {"messages": []}

        # Transform messages to match expected format
        transformed_messages = []
        for msg in messages:
            transformed_msg = {
                "id": msg["id"],
                "content": msg["content"],
                "sender_type": "user" if msg["role"] == "user" else "assistant",
                "created_at": msg["created_at"],
                "structured_data": msg["metadata"].get("structured_data") if msg.get("metadata") else None
            }
            transformed_messages.append(transformed_msg)

        return {"messages": transformed_messages}
    except Exception as e:
        logger.error(f"Failed to get messages for session '{session_id}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get session messages.")

@router.delete("/{agent_type}/sessions/{session_id}")
async def archive_session(
    agent_type: str,
    session_id: str,
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
):
    """Archive a specific session (soft delete)."""
    if agent_type not in AGENT_MAP:
        raise HTTPException(status_code=404, detail=f"Agent type '{agent_type}' not found.")
    
    try:
        # Find the conversation by id and verify it belongs to user
        conversation = db.table("agent_conversations").select("id").eq("id", session_id).eq("user_id", user["id"]).execute()
        
        if not conversation.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update the archived_at field to perform a soft delete
        db.table("agent_conversations").update({
            "archived_at": datetime.utcnow().isoformat(),
            "archived_by": user["id"]
        }).eq("id", session_id).execute()
        
        return {"message": "Session archived successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to archive session '{session_id}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to archive session.")

@router.post("/{agent_type}/sessions/{session_id}/restore")
async def restore_session(
    agent_type: str,
    session_id: str,
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
):
    """Restore an archived session."""
    if agent_type not in AGENT_MAP:
        raise HTTPException(status_code=404, detail=f"Agent type '{agent_type}' not found.")

    try:
        # Find the conversation by id and verify it belongs to user
        conversation = db.table("agent_conversations").select("id").eq("id", session_id).eq("user_id", user["id"]).execute()

        if not conversation.data:
            raise HTTPException(status_code=404, detail="Session not found")

        # Update the archived_at field to null to restore
        db.table("agent_conversations").update({
            "archived_at": None,
            "archived_by": None,
            "archive_reason": None
        }).eq("id", session_id).execute()

        return {"message": "Session restored successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to restore session '{session_id}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to restore session.")

@router.delete("/{agent_type}/sessions/{session_id}/permanent")
async def permanent_delete_session(
    agent_type: str,
    session_id: str,
    confirm: bool = False,
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
):
    """Permanently delete a specific session and all its messages (same as regular delete for now)."""
    if agent_type not in AGENT_MAP:
        raise HTTPException(status_code=404, detail=f"Agent type '{agent_type}' not found.")

    if not confirm:
        raise HTTPException(status_code=400, detail="Permanent deletion requires confirmation")

    try:
        # Find the conversation by id and verify it belongs to user
        conversation = db.table("agent_conversations").select("id").eq("id", session_id).eq("user_id", user["id"]).execute()

        if not conversation.data:
            raise HTTPException(status_code=404, detail="Session not found")

        conversation_id = conversation.data[0]["id"]

        # Delete all messages for this conversation
        db.table("agent_messages").delete().eq("conversation_id", conversation_id).execute()

        # Delete the conversation itself
        db.table("agent_conversations").delete().eq("id", conversation_id).execute()

        return {"message": "Session permanently deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to permanently delete session '{session_id}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to permanently delete session.")

@router.patch("/{agent_type}/sessions/{session_id}")
async def update_session(
    agent_type: str,
    session_id: str,
    request: SessionUpdateRequest,
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
):
    """Update a specific session (e.g., rename title)."""
    if agent_type not in AGENT_MAP:
        raise HTTPException(status_code=404, detail=f"Agent type '{agent_type}' not found.")

    try:
        # Find the conversation by id and verify it belongs to user
        conversation = db.table("agent_conversations").select("id, session_data").eq("id", session_id).eq("user_id", user["id"]).execute()

        if not conversation.data:
            raise HTTPException(status_code=404, detail="Session not found")

        conversation_id = conversation.data[0]["id"]
        existing_session_data = conversation.data[0].get("session_data") or {}

        # Update session_data with new title
        updated_session_data = {
            **existing_session_data,
            "title": request.session_title
        }

        # Update the conversation with new session_data
        db.table("agent_conversations").update({
            "session_data": updated_session_data,
            "updated_at": "now()"
        }).eq("id", conversation_id).execute()

        return {"message": "Session updated successfully", "session_title": request.session_title}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update session '{session_id}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update session.")

@router.post("/{agent_type}/sessions/{session_id}/export")
async def export_session(
    agent_type: str,
    session_id: str,
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
):
    """Export a specific session with all its messages."""
    if agent_type not in AGENT_MAP:
        raise HTTPException(status_code=404, detail=f"Agent type '{agent_type}' not found.")

    try:
        # Find the conversation by id and verify it belongs to user
        conversation = db.table("agent_conversations").select("*").eq("id", session_id).eq("user_id", user["id"]).execute()

        if not conversation.data:
            raise HTTPException(status_code=404, detail="Session not found")

        conversation_data = conversation.data[0]

        # Get all messages for this session
        messages = db.table("agent_messages").select("*").eq("conversation_id", session_id).order("created_at", desc=False).execute()

        # Format export data
        export_data = {
            "session_id": session_id,
            "agent_type": agent_type,
            "session_data": conversation_data.get("session_data"),
            "created_at": conversation_data["created_at"],
            "updated_at": conversation_data["updated_at"],
            "messages": [
                {
                    "id": msg["id"],
                    "content": msg["content"],
                    "role": msg["role"],
                    "created_at": msg["created_at"],
                    "metadata": msg.get("metadata")
                }
                for msg in messages.data
            ],
            "exported_at": "now()"
        }

        return export_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export session '{session_id}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to export session.")

@router.post("/{agent_type}/sessions/{session_id}/duplicate")
async def duplicate_session(
    agent_type: str,
    session_id: str,
    user: Dict[str, Any] = Depends(get_current_user_with_org),
    db: Client = Depends(get_supabase_client)
):
    """Duplicate a specific session (creates a new session with same metadata)."""
    if agent_type not in AGENT_MAP:
        raise HTTPException(status_code=404, detail=f"Agent type '{agent_type}' not found.")

    try:
        # get_current_user_with_org already provides org_id from JWT
        org_id = user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        # Find the conversation by id and verify it belongs to user
        conversation = db.table("agent_conversations").select("*").eq("id", session_id).eq("user_id", user["id"]).execute()

        if not conversation.data:
            raise HTTPException(status_code=404, detail="Session not found")

        original_conversation = conversation.data[0]
        session_data = original_conversation.get("session_data") or {}

        # Create session service for duplication
        session_service = SessionService(db)

        # Create duplicate session with modified name
        original_title = session_data.get("title", f"{agent_type.title()} Session")
        duplicate_title = f"{original_title} (Copy)"

        duplicate_session_id = await session_service.create_session(
            user_id=user["id"],
            org_id=org_id,
            agent_type=agent_type,
            session_name=duplicate_title,
            campaign_id=original_conversation.get("campaign_id"),
            client_id=original_conversation.get("client_id"),
            mode=original_conversation.get("mode")
        )

        # Update the new session with the original session_data (but with new title)
        updated_session_data = {
            **session_data,
            "title": duplicate_title
        }

        db.table("agent_conversations").update({
            "session_data": updated_session_data
        }).eq("id", duplicate_session_id).execute()

        return {"message": "Session duplicated successfully", "new_session_id": duplicate_session_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to duplicate session '{session_id}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to duplicate session.")

# ... (previous code)

# Supported agents for file upload
FILE_UPLOAD_ENABLED_AGENTS = [
    "strategy",
    "persona",
    "marketing_strategy",
    "content",
    "performance_intelligence",
    "campaign_planning",
    "competitive_intelligence",
    "client_success",
    "quick_start",
]

@router.post(
    "/{agent_type}/upload",
    response_model=FileUploadResponse,
    summary="Upload a file for chat context",
    description="Upload a PDF or TXT file to be used as context in chat. Files expire after 48 hours."
)
async def upload_file_for_chat(
    agent_type: str,
    file: UploadFile = File(..., description="PDF or TXT file to upload"),
    session_id: Optional[str] = Form(None, description="Optional session ID to associate file with"),
    user: Dict[str, Any] = Depends(verify_write_access)
):
    """
    Upload a document for use as context in agent chat.

    - Supports PDF and TXT files up to 50MB
    - Files are uploaded to Google Gemini Files API
    - Files automatically expire after 48 hours
    - Returns a Gemini file URI to include in chat messages
    """
    # Validate agent type
    if agent_type not in AGENT_MAP:
        raise HTTPException(status_code=404, detail=f"Agent type '{agent_type}' not found")

    if agent_type not in FILE_UPLOAD_ENABLED_AGENTS:
        raise HTTPException(
            status_code=400,
            detail=f"File upload not enabled for '{agent_type}' agent. "
                   f"Supported agents: {', '.join(FILE_UPLOAD_ENABLED_AGENTS)}"
        )

    # Validate file type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ["application/pdf", "text/plain"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Supported: PDF, TXT"
        )

    # Validate file size (read content to check)
    contents = await file.read()
    file_size = len(contents)

    if file_size > 50 * 1024 * 1024:  # 50 MB
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {file_size / (1024*1024):.1f}MB. Maximum: 50MB"
        )

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Empty file not allowed")

    # Apply rate limiting
    if not check_ai_rate_limit(user["id"]):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait before uploading more files."
        )

    try:
        # Get org context
        org_id = user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        # Get org_type for multi-tenant routing
        org_type = None
        db = get_supabase_client()
        try:
            org_result = db.table("organizations").select("type").eq("id", org_id).execute()
            if org_result.data:
                org_type = org_result.data[0].get("type")
        except Exception as e:
            logger.warning(f"Could not retrieve org_type for file upload: {e}")

        # Save to temp file
        suffix = ".pdf" if content_type == "application/pdf" else ".txt"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = temp_file.name
            temp_file.write(contents)

        try:
            # Initialize agent to get Gemini client
            agent_class = AGENT_MAP[agent_type]
            agent = agent_class()
            
            # Simplified initialization for upload
            from google import genai
            agent.client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))


            # Upload to Gemini
            file_info = await agent.upload_file_to_gemini(
                file_path=temp_path,
                mime_type=content_type,
                original_filename=file.filename or "uploaded_file"
            )

            # Add user context
            file_info["uploaded_by"] = user["id"]

            logger.info(
                f"User {user.get('email')} uploaded file '{file.filename}' "
                f"for {agent_type} agent -> {file_info['gemini_name']}"
            )

            return FileUploadResponse(
                success=True,
                file=UploadedFileInfo(**file_info)
            )

        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except ValueError as e:
        # Validation errors from agent
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"File upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload file")

async def sse_generator(agent_chat_generator):
    """Convert agent chat events to SSE format with enhanced error handling."""
    try:
        async for event_data in agent_chat_generator:
            yield {
                "event": event_data['event'],
                "data": json.dumps(event_data['data'])
            }
    except Exception as e:
        logger.error(f"SSE generator error: {e}")
        # Send error event to client before terminating
        yield {
            "event": "error",
            "data": json.dumps({
                "message": f"Stream processing error: {str(e)}",
                "error_type": "stream_processing_error"
            })
        }

class StreamChatRequest(BaseModel):
    """Request model for streaming chat with file support"""
    message: str = Field(..., min_length=1, max_length=50000)
    session_id: Optional[str] = None
    client_id: Optional[str] = None
    campaign_id: Optional[str] = None
    mode: Optional[str] = None
    # NEW: File Info
    file_info: Optional[List[UploadedFileInfo]] = Field(
        None,
        description="List of uploaded file info objects to include as context"
    )

@router.post("/{agent_type}/chat")
async def agent_chat(
    agent_type: str,
    request: StreamChatRequest,
    http_request: Request,
    user: Dict[str, Any] = Depends(verify_write_access),
):
    """Generic SSE chat endpoint for all tool-based agents with enhanced error handling."""
    if agent_type not in AGENT_MAP:
        raise HTTPException(status_code=404, detail=f"Agent type '{agent_type}' not found.")

    # Rate limiting: Prevent API abuse and control Gemini API costs
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User authentication required.")

    if not check_ai_rate_limit(user_id):
        logger.warning(f"Rate limit exceeded for user {user.get('email')} on agent '{agent_type}'")
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {AI_RATE_LIMIT_REQUESTS} requests per minute. Please try again later."
        )

    logger.info(f"User {user.get('email')} chatting with '{agent_type}' in session {request.session_id}")

    try:
        # Validate request parameters
        if not request.session_id or not request.message.strip():
            raise HTTPException(status_code=400, detail="Session ID and message are required.")

        agent_class = AGENT_MAP[agent_type]

        # All agents should have access to org_id for business context
        # get_current_user_with_org already provides org_id from JWT
        org_id = user.get("org_id")
        user_id = user.get("user_id") or user.get("id")

        # Load session scope through the routed RPC so Agency sessions resolve from
        # agency.agent_conversations instead of silently falling back to public.
        db = get_supabase_client()
        client_id = None
        campaign_id = None
        try:
            session_result = db.rpc("get_session_routed", {
                "p_session_id": request.session_id
            }).execute()
            if session_result.data:
                session_data = session_result.data[0]
                client_id = session_data.get("client_id")
                campaign_id = session_data.get("campaign_id")
        except Exception as e:
            logger.warning(f"Could not retrieve session data: {e}")

        # Frontend-provided scope stays authoritative when present, but the session
        # now provides a safe fallback for live chat continuation and notifications.
        if request.client_id:
            client_id = request.client_id
        if request.campaign_id:
            campaign_id = request.campaign_id

        # Week 4: Get org_type for schema routing
        org_type = None
        if org_id:
            try:
                org_result = db.table("organizations").select("type").eq("id", org_id).execute()
                if org_result.data:
                    org_type = org_result.data[0].get("type")
            except Exception as e:
                logger.warning(f"Could not retrieve org_type: {e}")

        # Create and initialize agent asynchronously
        # Get locale from request (set by LocaleMiddleware)
        locale = get_locale_from_request(http_request)

        agent = agent_class()
        if org_id:
            logger.info(f"Using org_id {org_id} from JWT for {agent_type} agent (org_type={org_type}, client_id={client_id[:8] if client_id else None}, campaign_id={campaign_id[:8] if campaign_id else None}, locale={locale})")
            await agent.__ainit__(
                org_id=org_id,
                user_id=user_id,
                campaign_id=campaign_id,  # Pass campaign_id for progressive learning context
                org_type=org_type,  # Week 4: Enable schema routing
                client_id=client_id,  # Week 4: Enable agency client scoping
                locale=locale  # Localization: Pass user's preferred language
            )
        else:
            logger.warning(f"No org_id found for {agent_type} agent")
            await agent.__ainit__(locale=locale)
        
        # The agent.chat method now yields SSE event dictionaries
        agent_chat_generator = agent.chat(
            session_id=request.session_id,
            message=request.message,
            user_id=user_id,
            file_info=[file.dict() for file in request.file_info] if request.file_info else None,
        )
        
        return EventSourceResponse(sse_generator(agent_chat_generator))
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error starting SSE stream for {agent_type} chat: {e}")
        # Return appropriate status codes based on error type
        if "rate limit" in str(e).lower():
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        elif "service unavailable" in str(e).lower():
            raise HTTPException(status_code=503, detail="Service temporarily unavailable. Please try again.")
        else:
            raise HTTPException(status_code=500, detail="Failed to start SSE stream. Please try again.")

@router.post("/quick-start/generate", response_model=QuickStartResponse)
async def generate_quick_start_intelligence(
    request: QuickStartRequest,
    user: Dict[str, Any] = Depends(verify_write_access),
    db: Client = Depends(get_supabase_client)
):
    """
    Generate strategy, persona, and marketing-strategy intelligence in one API call.
    This is the Quick Start flow for users who want to get started fast.
    """
    logger.info(f"User {user.get('email')} generating Quick Start intelligence")

    try:
        org_id = user.get("org_id")
        user_id = user.get("user_id") or user.get("id")

        if not org_id:
            raise HTTPException(status_code=403, detail="User not associated with an organization")

        if not check_ai_rate_limit(str(user_id)):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {AI_RATE_LIMIT_REQUESTS} requests per minute. Please try again later.",
            )

        # Create session service
        session_service = SessionService(db)

        # Prepare prompts for each agent
        strategy_prompt = f"""I need help with business strategy for my company. Here are the key details:

Company: {request.company}
Primary Goal: {request.goal}
Target Audience: {request.audience}
Monthly Budget: {request.budget}
Timeline: {request.timeline}

Please provide a comprehensive strategic analysis using relevant frameworks (SWOT, OKRs, etc.) based on this information."""

        persona_prompt = f"""I need to create detailed buyer personas for my business:

Target Audience: {request.audience}
Marketing Goal: {request.goal}
Budget: {request.budget}

Please create comprehensive buyer personas with demographics, psychographics, pain points, and buying behavior."""

        marketing_strategy_prompt = f"""I need a complete marketing strategy to achieve my goals:

Company: {request.company}
Goal: {request.goal}
Target Audience: {request.audience}
Budget: {request.budget}
Timeline: {request.timeline}

Please create a comprehensive marketing strategy with messaging frameworks, channel mix, and tactical recommendations."""

        # Week 4: Get org_type for schema routing (quick-start doesn't use client_id)
        org_type = None
        try:
            org_result = db.table("organizations").select("type").eq("id", org_id).execute()
            if org_result.data:
                org_type = org_result.data[0].get("type")
        except Exception as e:
            logger.warning(f"Could not retrieve org_type for quick-start: {e}")

        # STEP 1: Generate Strategy Intelligence
        logger.info("Step 1: Generating strategy intelligence...")
        strategy_session_id = await session_service.create_session(
            user_id=user_id,
            org_id=org_id,
            agent_type="strategy",
            session_name="Quick Start: Business Strategy"
        )

        strategy_agent = DirectStrategyAgent()
        await strategy_agent.__ainit__(org_id=org_id, user_id=user_id, org_type=org_type)

        # Consume the SSE stream to trigger intelligence generation
        strategy_output_id = None
        async for event in strategy_agent.chat(session_id=strategy_session_id, message=strategy_prompt, user_id=user_id):
            if event['event'] == 'output_created' and event['data'].get('output_id'):
                strategy_output_id = event['data']['output_id']
                break

        if not strategy_output_id:
            raise HTTPException(status_code=500, detail="Failed to generate strategy intelligence")

        logger.info(f"Strategy intelligence created: {strategy_output_id}")

        # STEP 2: Generate Persona Intelligence
        logger.info("Step 2: Generating persona intelligence...")
        persona_session_id = await session_service.create_session(
            user_id=user_id,
            org_id=org_id,
            agent_type="persona",
            session_name="Quick Start: Customer Personas"
        )

        persona_agent = DirectPersonaAgent()
        await persona_agent.__ainit__(org_id=org_id, user_id=user_id, org_type=org_type)

        persona_output_id = None
        async for event in persona_agent.chat(session_id=persona_session_id, message=persona_prompt, user_id=user_id):
            if event['event'] == 'output_created' and event['data'].get('output_id'):
                persona_output_id = event['data']['output_id']
                break

        if not persona_output_id:
            raise HTTPException(status_code=500, detail="Failed to generate persona intelligence")

        logger.info(f"Persona intelligence created: {persona_output_id}")

        # STEP 3: Generate Marketing Strategy Intelligence
        logger.info("Step 3: Generating marketing strategy intelligence...")
        marketing_session_id = await session_service.create_session(
            user_id=user_id,
            org_id=org_id,
            agent_type="marketing_strategy",
            session_name="Quick Start: Marketing Strategy"
        )

        marketing_agent = DirectMarketingStrategyAgent()
        await marketing_agent.__ainit__(org_id=org_id, user_id=user_id, org_type=org_type)

        marketing_output_id = None
        async for event in marketing_agent.chat(session_id=marketing_session_id, message=marketing_strategy_prompt, user_id=user_id):
            if event['event'] == 'output_created' and event['data'].get('output_id'):
                marketing_output_id = event['data']['output_id']
                break

        if not marketing_output_id:
            raise HTTPException(status_code=500, detail="Failed to generate marketing strategy intelligence")

        logger.info(f"Marketing strategy intelligence created: {marketing_output_id}")

        # Return all generated output IDs
        return QuickStartResponse(
            strategy_output_id=strategy_output_id,
            persona_output_id=persona_output_id,
            marketing_strategy_output_id=marketing_output_id,
            success=True,
            message="Successfully generated strategy, persona, and marketing strategy intelligence"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate Quick Start intelligence: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate intelligence: {str(e)}")
