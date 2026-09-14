"""
Session management service for direct Gemini API integration
"""
from supabase import Client
from typing import Dict, Any, Optional, List
import uuid
from datetime import datetime, UTC
import os
import asyncio
from apps.api.exceptions import DatabaseError
from apps.api.utils.database import get_supabase_client
from apps.api.services.session_title_generator import get_session_title_generator
import logging

logger = logging.getLogger(__name__)

class SessionService:
    def __init__(self, supabase_client: Optional[Client] = None):
        self.db = supabase_client or get_supabase_client()
        # Alias for compatibility with existing code
        self.supabase = self.db
    
    async def create_session(self, user_id: str, org_id: str, agent_type: str,
                           session_name: str = None, campaign_id: str = None,
                           client_id: str = None, mode: str = None) -> str:
        """Create new agent session with optional context using Database-First routed function"""
        try:
            # Prepare session metadata
            session_metadata = {
                "metadata": {},
                "title_generated": False  # Track if we've generated an intelligent title
            }

            # Database-First: Use create_agent_session_routed() for schema routing
            # Routes to agency.agent_conversations for Agency (requires client_id)
            # Routes to public.agent_conversations for SME
            logger.info(f"[SessionService] Creating session - org_id={org_id}, client_id={client_id}, agent_type={agent_type}")

            result = self.db.rpc('create_agent_session_routed', {
                'p_org_id': org_id,
                'p_user_id': user_id,
                'p_agent_type': agent_type,
                'p_client_id': client_id,
                'p_campaign_id': campaign_id,
                'p_session_name': session_name or "New Session",
                'p_mode': mode,
                'p_session_metadata': session_metadata
            }).execute()

            if not result.data:
                raise DatabaseError("Failed to create session", "create_agent_session_routed")

            # Return the session ID from database function
            session_id = result.data
            logger.info(f"[SessionService] Created session {session_id} in correct schema")
            return session_id

        except Exception as e:
            logger.error(f"Session creation failed: {str(e)}")
            raise DatabaseError(f"Session creation failed: {str(e)}", "create_session")
    
    async def _detect_session_schema(self, session_id: str) -> str:
        """
        Detect which schema a session belongs to using database function.
        Returns 'agency' or 'public'.
        """
        try:
            # Use database function for schema detection
            result = self.db.rpc('detect_session_schema', {
                'p_session_id': session_id
            }).execute()

            if result.data:
                # Function returns 'agency', 'public', or NULL
                schema = result.data
                if schema == 'agency':
                    return 'agency'
                elif schema == 'public':
                    return 'public'

            # Default to public schema if not found
            logger.warning(f"Session {session_id} not found in any schema, defaulting to public")
            return 'public'
        except Exception as e:
            logger.warning(f"Error detecting session schema, defaulting to public: {e}")
            return 'public'

    async def get_conversation_history(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get conversation history for session using Database-First RPC function"""
        try:
            logger.info(f"[SessionService] Getting history for session {session_id}")

            # Use database function for schema-routed query
            result = self.db.rpc('get_conversation_history_routed', {
                'p_session_id': session_id,
                'p_limit': limit
            }).execute()

            # Extract function_calls from metadata if present
            messages = result.data or []
            for msg in messages:
                if msg.get("metadata") and "function_calls" in msg["metadata"]:
                    msg["function_calls"] = msg["metadata"]["function_calls"]

            return messages

        except Exception as e:
            raise DatabaseError(f"Failed to retrieve history: {str(e)}", "get_history")
    
    async def save_message(self, session_id: str, role: str, content: str, function_calls: Dict = None, metadata: Dict = None, agent_type: str = None):
        """Save message to conversation history using Database-First RPC function"""
        try:
            logger.info(f"[SessionService] Saving message for session {session_id}")

            # Combine function_calls into metadata since the column doesn't exist
            combined_metadata = metadata or {}
            if function_calls:
                combined_metadata["function_calls"] = function_calls

            # Ensure assistant/tool messages have non-empty content (database constraint)
            # Add placeholder for function calls/tool results
            if role in ("assistant", "tool") and (not content or not content.strip()):
                if metadata and "function_call" in metadata:
                    func_name = metadata["function_call"].get("name", "function")
                    content = f"[Executing {func_name}]"
                elif metadata and "tool_result" in metadata:
                    func_name = metadata["tool_result"].get("name", "tool")
                    content = f"[Tool result from {func_name}]"
                elif function_calls:
                    func_name = function_calls.get("name", "function")
                    content = f"[Executing {func_name}]"
                else:
                    content = "[Processing]"

            # Use database function for schema-routed insert
            result = self.db.rpc('save_agent_message_routed', {
                'p_session_id': session_id,
                'p_role': role,
                'p_content': content,
                'p_metadata': combined_metadata
            }).execute()

            if not result.data:
                raise DatabaseError("Failed to save message", "save_agent_message_routed")

            message_id = result.data

            # Trigger intelligent title generation for user messages (ASYNC - don't block response)
            # Priority 1 Optimization: Title generation now happens in background (-6.8s user-perceived latency)
            if role == "user" and agent_type and content.strip():
                # Fire and forget - title generates while user sees response streaming
                asyncio.create_task(self._update_session_title_async(session_id, agent_type))

            # Return the message ID
            return message_id

        except Exception as e:
            logger.error(f"Failed to save message: {str(e)}")
            raise DatabaseError(f"Failed to save message: {str(e)}", "save_message")
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session details using Database-First RPC function"""
        try:
            # Use database function for schema-routed query
            result = self.db.rpc('get_session_routed', {
                'p_session_id': session_id
            }).execute()

            return result.data[0] if result.data else None

        except Exception as e:
            raise DatabaseError(f"Failed to get session: {str(e)}", "get_session")

    async def update_session_title_if_needed(self, session_id: str, agent_type: str) -> bool:
        """
        Update session title based on conversation content if not already generated.
        Called after saving user messages to generate meaningful titles.
        """
        try:
            # Get session to check if title was already generated
            session = await self.get_session(session_id)
            if not session:
                return False

            # Check if title was already generated (unified format from database function)
            # Agency: title column is set (not "New Session")
            # SME: session_data.title_generated flag is true
            if session.get("title") and session.get("title") != "New Session":
                return False  # Already has an intelligent title

            if session.get("session_data"):
                session_data = session.get("session_data", {})
                if session_data.get("title_generated", False):
                    return False  # Already has an intelligent title

            # Get conversation messages to generate title from
            messages = await self.get_conversation_history(session_id, limit=10)
            if not messages:
                return False

            # Generate intelligent title
            title_generator = get_session_title_generator()
            new_title = await title_generator.generate_title_from_conversation(
                messages, agent_type
            )

            if not new_title:
                # Use fallback title generation with most meaningful user message
                user_messages = [msg["content"] for msg in messages if msg.get("role") == "user" and len(msg.get("content", "").strip()) > 10]
                # Use the longest/most meaningful user message for better context
                meaningful_msg = max(user_messages, key=len) if user_messages else None
                new_title = title_generator.generate_fallback_title(agent_type, meaningful_msg)

            # Update session with new title using Database-First RPC function
            result = self.db.rpc('update_session_title_routed', {
                'p_session_id': session_id,
                'p_new_title': new_title
            }).execute()

            if result.data:
                logger.info(f"Updated session {session_id} title to: {new_title}")
                return True

            return False

        except Exception as e:
            logger.error(f"Failed to update session title: {str(e)}")
            return False

    async def _update_session_title_async(self, session_id: str, agent_type: str):
        """
        Async wrapper for title generation that doesn't block the response.
        Runs in background while user sees streaming response.
        """
        try:
            await self.update_session_title_if_needed(session_id, agent_type)
        except Exception as e:
            # Log but don't raise - title generation failure shouldn't affect response
            logger.warning(f"Background title generation failed for session {session_id}: {str(e)}")

async def create_new_session(user_id: str, agent_type: str, org_id: str = None) -> str:
    """Convenience function to create a new session"""
    service = SessionService()
    # For now, use user_id as org_id if not provided (single-tenant approach)
    org_id = org_id or user_id
    return await service.create_session(user_id, org_id, agent_type)