"""
Base agent class for direct Gemini API integration with a model-led ReAct pattern.
This version uses the model's own reasoning to decide which tool to use (Google Search or custom functions),
working around the limitation of the standard API.
"""
from google import genai
from google.genai import types
from google.genai.errors import ClientError
from typing import List, Dict, Any, Optional, Callable, Literal, Tuple
import os
from datetime import datetime, UTC
import logging
import asyncio
import tempfile
import os
from datetime import datetime, timedelta, UTC
from typing import Optional, Dict, Any

from apps.api.exceptions import GeminiAPIError
from apps.api.services.session_service import SessionService
from apps.api.services.progressive_learning import progressive_learning_service
from apps.api.services.context_intelligence import context_intelligence
from apps.api.services.localization import (
    get_tool_display_name,
    format_analyzing_message,
    format_tool_complete_message,
    format_recommendation_intro
)
from apps.api.config.gemini_models import (
    ModelName, QueryComplexity, get_model_for_agent, get_model_config, calculate_cost,
    DEFAULT_MODEL
)
from apps.api.config.gemini_client import get_gemini_client
from apps.api.config.agent_config import get_safety_settings_for_marketing
from apps.api.services.query_complexity_classifier import classify_query
from apps.api.security.prompt_injection import prompt_injection_defense

logger = logging.getLogger(__name__)

__all__ = ['BaseGeminiAgent', 'genai', 'types']

# Tool name mapping for user-friendly display (Priority 3 Optimization)
TOOL_DISPLAY_NAMES = {
    # Strategy Agent Tools
    "get_swot_analysis": "SWOT Analysis",
    "get_porters_five_forces": "Porter's Five Forces Analysis",
    "get_jobs_to_be_done": "Jobs to Be Done Framework",
    "get_business_model_canvas": "Business Model Canvas",
    "get_ice_scoring": "ICE Prioritization Framework",
    "get_bcg_matrix": "BCG Growth-Share Matrix",
    "get_vrio_analysis": "VRIO Resource Analysis",
    "get_three_horizons": "Three Horizons of Growth",
    "get_blue_ocean_strategy": "Blue Ocean Strategy Canvas",
    "get_mckinsey_7s": "McKinsey 7S Framework",
    "get_okr_framework": "OKR (Objectives & Key Results)",
    # Persona Agent Tools
    "get_persona_context": "Persona Research",
    "analyze_buyer_journey": "Buyer Journey Analysis",
    # Content Agent Tools
    "generate_content_brief": "Content Brief Generation",
    "analyze_content_gaps": "Content Gap Analysis",
    # Marketing Strategy Agent Tools
    "generate_gtm_strategy": "Go-to-Market Strategy",
    "analyze_channel_mix": "Channel Mix Analysis",
    # Performance Agent Tools
    "analyze_metrics": "Performance Metrics Analysis",
    "calculate_roi": "ROI Calculation",
    # Campaign Agent Tools
    "plan_campaign": "Campaign Planning",
    "analyze_ab_tests": "A/B Test Analysis",
    # Competitive Agent Tools
    "analyze_competitors": "Competitive Analysis",
    "identify_market_gaps": "Market Gap Identification",
    # Client Success Agent Tools
    "calculate_health_score": "Client Health Score",
    "identify_retention_risks": "Retention Risk Analysis",
}

# Constants for file upload
ALLOWED_MIME_TYPES = ["application/pdf", "text/plain"]
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
GEMINI_FILE_TTL_HOURS = 48


def build_function_response_part(function_call, result) -> types.Part:
    """
    Build the function-result part sent back to the model.

    Gemini 3.8 Flash requires every function result to carry BOTH the call id and
    the function name. `types.Part.from_function_response()` cannot express the id
    (it accepts only name/response/parts), so the part is constructed directly.

    Omitting the id makes the tool-result turn fail in a way that reads as model
    flakiness rather than a configuration error, which is why this is a named,
    tested unit rather than an inline construction.
    """
    if function_call.id is None:
        # Do not raise: older models may omit the id. But say so loudly, because
        # on 3.8 Flash the following turn will fail without it.
        logger.warning(
            "[%s] function_call has no id; Gemini 3.8 Flash requires the call id "
            "on every function result",
            function_call.name,
        )

    return types.Part(
        function_response=types.FunctionResponse(
            name=function_call.name,
            response={"result": result},
            id=function_call.id,
        )
    )


class BaseGeminiAgent:
    def __deepcopy__(self, memo):
        # google-genai 2.x deep-copies the request config, which carries the tool
        # callables. Those are bound methods of this agent, so a deep copy walks
        # into the genai client and its threading lock and raises
        # "cannot pickle '_thread.RLock' object" on the first model turn. The
        # agent is stateful and shared; a copy is never what the SDK wants.
        return self

    def __init__(self, agent_type: str, tools: List[types.Tool] = None, enable_dynamic_routing: bool = True):
        """
        Initialize base agent with a model-led ReAct architecture.

        Args:
            agent_type: Agent identifier (e.g., "strategy", "persona")
            tools: Optional list of custom tools for this agent
            enable_dynamic_routing: If True, use query complexity to select optimal model
        """
        self.agent_type = agent_type  # Store agent type for context enhancement
        self.enable_dynamic_routing = enable_dynamic_routing

        # Get default model (can be overridden per-query)
        env_key = f"GEMINI_MODEL_{agent_type.upper()}"
        self.model_name = os.getenv(env_key, os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL))

        self.temperature = float(os.getenv("GEMINI_TEMPERATURE", 1.0))  # Gemini 3: Google recommends 1.0
        self.max_output_tokens = int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", 8192))
        self.thinking_level = os.getenv("GEMINI_THINKING_LEVEL", "medium")

        # Configure Gemini safety settings for marketing intelligence applications
        # Production-grade filtering optimized for brand-safe, professional marketing content
        # Settings centralized in agent_config.py for consistency across all agents
        self.safety_settings = get_safety_settings_for_marketing()

        # Generation config to be used in API calls
        # CRITICAL: Disable AFC globally - we handle function calling manually
        self.generation_config = types.GenerateContentConfig(
            temperature=self.temperature,
            max_output_tokens=self.max_output_tokens,
            thinking_config=types.ThinkingConfig(thinking_level=self.thinking_level),
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            safety_settings=self.safety_settings  # Enable Gemini's built-in safety filters
        )
        
        self.system_prompt = getattr(self, 'system_prompt', None)
        self.agent_tools = tools or []
        self.session_service = SessionService()
        self.enable_grounding = os.getenv("GEMINI_ENABLE_GROUNDING", "true").lower() == "true"

        # Shared, cached accessor so DEMO_MODE works with no API key. The
        # per-agent genai.retry.RetryConfig is dropped: the accessor takes no
        # parameters and is cached process-wide, so a custom retry config cannot
        # be threaded through it; the shared client keeps the SDK retry defaults.
        self.client = get_gemini_client()
        
        # Track streaming fallback state
        self._streaming_enabled = True
        self._consecutive_stream_failures = 0
        self.max_stream_failures = 3  # Fallback to non-streaming after 3 consecutive failures

        tool_names = []
        if self.agent_tools:
            for tool in self.agent_tools:
                if tool and hasattr(tool, 'function_declarations') and tool.function_declarations:
                    try:
                        tool_names.extend([fd.name for fd in tool.function_declarations])
                    except Exception as e:
                        logger.warning(f"Error processing tool declarations: {e}")
        
        logger.info(f"Initialized {agent_type} agent with model: {self.model_name}, grounding: {self.enable_grounding}, tools: {tool_names}, retry: shared-client-defaults")

    async def upload_file_to_gemini(
        self,
        file_path: str,
        mime_type: str,
        original_filename: str
    ) -> Dict[str, Any]:
        """
        Upload a file to Gemini Files API for use in chat context.

        Args:
            file_path: Path to the file on local filesystem
            mime_type: MIME type of the file
            original_filename: Original filename for display

        Returns:
            Dict with gemini_uri, gemini_name, expires_at, etc.

        Raises:
            ValueError: If file type not supported or file too large
        """
        # Validate MIME type
        if mime_type not in ALLOWED_MIME_TYPES:
            raise ValueError(
                f"Unsupported file type: {mime_type}. "
                f"Supported types: {', '.join(ALLOWED_MIME_TYPES)}"
            )

        # Validate file size
        file_size = os.path.getsize(file_path)
        if file_size > MAX_FILE_SIZE_BYTES:
            raise ValueError(
                f"File too large: {file_size / (1024*1024):.1f}MB. "
                f"Maximum size: {MAX_FILE_SIZE_BYTES / (1024*1024):.0f}MB"
            )

        try:
            # Upload to Gemini Files API
            uploaded_file = self.client.files.upload(
                file=file_path,
                config={"mime_type": mime_type}
            )

            now = datetime.now(UTC)
            expires_at = now + timedelta(hours=GEMINI_FILE_TTL_HOURS)

            logger.info(
                f"Uploaded file to Gemini: {original_filename} -> {uploaded_file.name}"
            )

            return {
                "gemini_uri": uploaded_file.uri,
                "gemini_name": uploaded_file.name,
                "original_filename": original_filename,
                "mime_type": mime_type,
                "size_bytes": file_size,
                "uploaded_at": now.isoformat(),
                "expires_at": expires_at.isoformat()
            }

        except Exception as e:
            logger.error(f"Failed to upload file to Gemini: {e}")
            raise

    def _get_security_enhanced_system_prompt(self) -> str:
        """
        Get system prompt with security reinforcement prepended.

        Implements OWASP LLM01:2025 defense: "Security Thought Reinforcement"
        Google's technique: Add security instructions to remind the LLM to ignore
        adversarial instructions and stay focused on the user-directed task.

        Returns:
            System prompt with security instructions prepended
        """
        base_prompt = getattr(self, 'system_prompt', '')
        security_instructions = prompt_injection_defense.get_security_reinforcement_prompt()

        # Prepend security instructions to base prompt
        # Security rules take precedence over functional instructions
        enhanced_prompt = security_instructions + "\n\n" + base_prompt if base_prompt else security_instructions

        return enhanced_prompt

    async def _save_validated_assistant_message(
        self,
        session_id: str,
        response_text: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, str]:
        """
        Validate AI output for prompt leakage and save if safe.

        Implements OWASP LLM01:2025 defense: "Output Validation"
        Prevents system prompt leakage, credential exposure, and information disclosure.

        Args:
            session_id: Conversation session ID
            response_text: AI-generated response text
            metadata: Optional metadata to save with message

        Returns:
            Tuple of (success: bool, sanitized_response: str)
        """
        # SECURITY: Validate output for prompt leakage
        output_check = prompt_injection_defense.validate_output(response_text, session_id)

        if not output_check.is_safe:
            # Credential leakage detected - use sanitized response
            logger.error(
                f"SECURITY ALERT: Blocked credential leakage in AI response for session {session_id}. "
                f"Patterns detected: {len(output_check.detected_patterns)}"
            )

            # Save the sanitized (safe) response instead
            safe_response = output_check.sanitized_content
            await self.session_service.save_message(
                session_id, "assistant", safe_response, metadata=metadata, agent_type=self.agent_type
            )
            return (False, safe_response)

        # Response is safe (no credential leakage detected) - save as-is
        await self.session_service.save_message(
            session_id, "assistant", response_text, metadata=metadata, agent_type=self.agent_type
        )
        return (True, response_text)

    def _is_streaming_error(self, error: Exception) -> bool:
        """Check if an error is related to streaming functionality."""
        error_str = str(error).lower()
        streaming_indicators = [
            'stream', 'generator', 'async', 'timeout', 'connection', 'chunk',
            'resource_exhausted', 'unavailable', 'deadline_exceeded'
        ]
        return any(indicator in error_str for indicator in streaming_indicators)

    def _select_model_for_query(self, query: str) -> str:
        """
        Select the optimal Gemini model based on query complexity.

        Phase 2: Multi-Model Strategy
        - Simple queries → Flash-Lite ($0.10/$0.40)
        - Standard queries → Flash ($0.30/$2.50)
        - Complex queries → Flash-Preview ($0.75/$3.00)
        - Enterprise queries → Pro ($1.25/$10.00)

        Args:
            query: User's input query

        Returns:
            Model name string for Gemini API
        """
        if not self.enable_dynamic_routing:
            return self.model_name  # Use default model if routing disabled

        # Classify query complexity
        complexity = classify_query(query, agent_type=self.agent_type)

        # Get recommended model for this agent + complexity
        model_enum = get_model_for_agent(self.agent_type, complexity)

        # Get model config to retrieve actual API name
        model_config = get_model_config(model_enum)

        logger.info(
            f"[{self.agent_type}] Query complexity: {complexity.value}, "
            f"Selected model: {model_config.display_name} "
            f"(input: ${model_config.input_cost_per_million}/M, "
            f"cached: ${model_config.cached_input_cost_per_million}/M)"
        )

        return model_config.name

    def _get_generation_config_with_cache(self, base_config: types.GenerateContentConfig) -> types.GenerateContentConfig:
        """
        Get generation config with cached context if available.
        Implements graceful degradation: falls back to non-cached on error.

        IMPORTANT: When using cached content, we CANNOT pass system_instruction, tools, or tool_config
        in the generation request. These must be defined in the cache itself.
        """
        cached_content_name = getattr(self, '_cached_context_name', None)

        if cached_content_name:
            # Return config with cached content (75% cost savings on input tokens)
            # NOTE: Do NOT include tools/system_instruction - they're in the cache
            # Always pass thinking_config (model handles -1/0/positive values correctly)
            return types.GenerateContentConfig(
                cached_content=cached_content_name,
                temperature=self.temperature,
                max_output_tokens=self.max_output_tokens,
                thinking_config=types.ThinkingConfig(thinking_level=self.thinking_level),
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
            )
        else:
            # No cache available, use base config with tools
            return base_config

    async def chat(self, session_id: str, message: str, user_id: str, file_info: Optional[List[Dict[str, Any]]] = None):
        """Main chat method implementing the model-led ReAct pattern with dynamic model selection."""
        # Store original model name at the start (before any errors can occur)
        original_model = self.model_name

        # Track overall timing
        chat_start_time = asyncio.get_event_loop().time()
        logger.info(f"[TIMING] Chat started for session {session_id}")

        try:
            # SECURITY NOTE: Input validation removed - Gemini 2.5 has built-in prompt injection hardening
            # (47% attack reduction via model fine-tuning on adversarial datasets)
            # We only add security reinforcement to system prompts and validate outputs

            save_msg_start = asyncio.get_event_loop().time()
            await self.session_service.save_message(session_id, "user", message, agent_type=self.agent_type)
            save_msg_time = asyncio.get_event_loop().time() - save_msg_start
            logger.info(f"[TIMING] Save message: {save_msg_time:.2f}s")

            history_start = asyncio.get_event_loop().time()
            history = await self.session_service.get_conversation_history(session_id)
            history_time = asyncio.get_event_loop().time() - history_start
            logger.info(f"[TIMING] Get history: {history_time:.2f}s")

            # Phase 2: Select optimal model based on query complexity
            model_select_start = asyncio.get_event_loop().time()
            selected_model = self._select_model_for_query(message)
            model_select_time = asyncio.get_event_loop().time() - model_select_start
            logger.info(f"[TIMING] Model selection: {model_select_time:.2f}s, Selected: {selected_model}")
            # Use selected model for this request
            self.model_name = selected_model

            # Store user message for progressive learning
            self._current_user_message = message
            self._current_user_id = user_id

            # Get session metadata for context (org_id needed for progressive learning and tools)
            try:
                # Use routed function for schema-aware session lookup
                session_result = self.session_service.supabase.rpc('get_session_routed', {
                    'p_session_id': session_id
                }).execute()

                if session_result.data and len(session_result.data) > 0:
                    session_data = session_result.data[0]
                    self.current_org_id = session_data.get("org_id")
                    self.current_user_id = session_data.get("user_id") or user_id
                    self.current_session_id = session_id
                    logger.info(f"Set context early in chat: org_id={self.current_org_id}, user_id={self.current_user_id}")
            except Exception as e:
                logger.warning(f"Failed to get session context: {e}")
                self.current_org_id = None

            # Optimized: Skip separate tool decision (was 16s latency!)
            # Instead, use mode="AUTO" and let model decide during streaming
            # This reduces time-to-first-token from ~25s to <5s
            async for event in self._execute_multi_turn_streaming(session_id, message, history, file_info):
                yield event

            # Restore original model after successful request
            self.model_name = original_model

        except Exception as e:
            logger.error(f"Chat failed for session {session_id}: {str(e)}")
            # Restore original model even on error
            self.model_name = original_model
            
            # Check if this is a streaming-related error
            if self._is_streaming_error(e):
                self._consecutive_stream_failures += 1
                logger.warning(f"Streaming failure #{self._consecutive_stream_failures} for session {session_id}: {str(e)}")
                
                # Disable streaming after consecutive failures
                if self._consecutive_stream_failures >= self.max_stream_failures:
                    self._streaming_enabled = False
                    logger.warning(f"Disabled streaming for {self.agent_type} agent after {self._consecutive_stream_failures} failures")
                    
            yield {"event": "error", "data": {"message": f"An error occurred: {str(e)}"}}


    async def _execute_with_search(self, session_id: str, message: str, history: List[Dict]):
        """Execute the request using only the Google Search tool."""
        logger.info(f"Executing with Google Search for session {session_id}")
        config = self.generation_config
        config.tools = [types.Tool(google_search=types.GoogleSearch())]

        # Get security-enhanced system prompt
        system_prompt = self._get_security_enhanced_system_prompt()

        # Add current date context for ALL agents
        today_date = datetime.now(UTC).strftime("%B %d, %Y")
        date_context = f"IMPORTANT: Today's date is {today_date}. When creating plans, timelines, or dates, always use this as your reference point and ensure all dates are in the future or present, never in the past."

        chat_contents = []

        # Add system message with security reinforcement
        if system_prompt:
            chat_contents.append({"role": "user", "parts": [{"text": f"[SYSTEM CONTEXT]\n{date_context}\n\n{system_prompt}"}]})
            chat_contents.append({"role": "model", "parts": [{"text": "Understood. I'll incorporate this business context into my analysis and responses."}]})
        else:
            # Even without system prompt, always include date context
            chat_contents.append({"role": "user", "parts": [{"text": f"[SYSTEM CONTEXT]\n{date_context}"}]})
            chat_contents.append({"role": "model", "parts": [{"text": "Understood. I'll use today's date as my reference point."}]})

        # Add conversation history
        chat_contents.extend([self._to_content(m) for m in history])
        chat_contents.append({"role": "user", "parts": [{"text": message}]})

        full_response_text = ""

        # Try streaming first, fallback to non-streaming if needed
        if self._streaming_enabled:
            try:
                # Use cached context if available (graceful degradation on failure)
                cached_content_name = getattr(self, '_cached_context_name', None)
                if cached_content_name:
                    try:
                        config_with_cache = self._get_generation_config_with_cache(config)
                        response_stream = await self.client.aio.models.generate_content_stream(model=self.model_name, contents=chat_contents, config=config_with_cache)
                        logger.info(f"[{self.agent_type}] Using cached context: {cached_content_name}")
                    except Exception as cache_error:
                        logger.warning(f"[{self.agent_type}] Cache generation failed, falling back to non-cached: {cache_error}")
                        response_stream = await self.client.aio.models.generate_content_stream(model=self.model_name, contents=chat_contents, config=config)
                else:
                    response_stream = await self.client.aio.models.generate_content_stream(model=self.model_name, contents=chat_contents, config=config)
                first_chunk_received = False
                last_chunk = None
                start_time = asyncio.get_event_loop().time()
                async for chunk in response_stream:
                    last_chunk = chunk
                    if not first_chunk_received and chunk.text and chunk.text.strip():
                        first_chunk_received = True
                        end_time = asyncio.get_event_loop().time()
                        logger.info(f"Time to first token: {end_time - start_time:.4f}s")

                    if chunk.text:
                        yield {"event": "text_chunk", "data": {"token": chunk.text}}
                        full_response_text += chunk.text

                # Reset failure count on successful streaming
                self._consecutive_stream_failures = 0

                # Track cost from last chunk's usage metadata
                if last_chunk and hasattr(last_chunk, 'usage_metadata'):
                    asyncio.create_task(self._track_cost_to_db(session_id, last_chunk.usage_metadata))
                        
            except Exception as stream_error:
                logger.warning(f"Streaming failed for session {session_id}, falling back to non-streaming: {str(stream_error)}")
                self._consecutive_stream_failures += 1

                # Fallback to non-streaming mode
                response = await self.client.aio.models.generate_content(model=self.model_name, contents=chat_contents, config=config)
                full_response_text = response.text or ""
                yield {"event": "text_chunk", "data": {"token": full_response_text}}
                if hasattr(response, 'usage_metadata'):
                    asyncio.create_task(self._track_cost_to_db(session_id, response.usage_metadata))
        else:
            # Non-streaming mode
            response = await self.client.aio.models.generate_content(model=self.model_name, contents=chat_contents, config=config)
            full_response_text = response.text or ""
            yield {"event": "text_chunk", "data": {"token": full_response_text}}
            if hasattr(response, 'usage_metadata'):
                asyncio.create_task(self._track_cost_to_db(session_id, response.usage_metadata))

        # Save the response with security validation (only if non-empty)
        if full_response_text and full_response_text.strip():
            success, validated_text = await self._save_validated_assistant_message(session_id, full_response_text)
            if not success:
                # Output was sanitized due to security concerns
                logger.warning(f"AI response sanitized for security reasons in session {session_id}")
        else:
            logger.error(f"Refusing to save empty assistant message for session {session_id} (Google Search path)")
            yield {"event": "error", "data": {"message": "Failed to generate response. Please try again."}}

        # Trigger progressive learning for search responses
        if hasattr(self, '_current_user_message') and hasattr(self, '_current_user_id'):
            await self._trigger_progressive_learning(
                session_id, self._current_user_message, full_response_text, self._current_user_id
            )
        
        yield {"event": "stream_end", "data": {"session_id": session_id}}

    async def _execute_with_tools(self, session_id: str, message: str, history: List[Dict]):
        """Execute the request using only custom function calling tools."""
        logger.info(f"Executing with custom tools for session {session_id}")
        config = self.generation_config
        config.tools = self.agent_tools

        # Configure function calling to ensure the model actually calls functions
        # Without this, the model defaults to "AUTO" and may describe tools as text instead
        config.tool_config = types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(
                mode="ANY"  # Force the model to call at least one function
            )
        )

        # Get security-enhanced system prompt (includes business intelligence + security rules)
        system_prompt = self._get_security_enhanced_system_prompt()

        # Add current date context for ALL agents
        today_date = datetime.now(UTC).strftime("%B %d, %Y")
        date_context = f"IMPORTANT: Today's date is {today_date}. When creating plans, timelines, or dates, always use this as your reference point and ensure all dates are in the future or present, never in the past."

        chat_contents = []

        # Add system prompt with security reinforcement (ALWAYS)
        if system_prompt:
            logger.info(f"[{self.agent_type}] Adding security-enhanced system prompt ({len(system_prompt)} chars)")
            chat_contents.append({"role": "user", "parts": [{"text": f"[SYSTEM CONTEXT]\n{date_context}\n\n{system_prompt}"}]})
            chat_contents.append({"role": "model", "parts": [{"text": "Understood. I'll incorporate this business context into my analysis and responses."}]})
        else:
            # Even without system prompt, always include date context
            logger.info(f"[{self.agent_type}] Adding date context")
            chat_contents.append({"role": "user", "parts": [{"text": f"[SYSTEM CONTEXT]\n{date_context}"}]})
            chat_contents.append({"role": "model", "parts": [{"text": "Understood. I'll use today's date as my reference point."}]})

        # Add conversation history
        chat_contents.extend([self._to_content(m) for m in history])
        chat_contents.append({"role": "user", "parts": [{"text": message}]})

        response = await self.client.aio.models.generate_content(model=self.model_name, contents=chat_contents, config=config)
        candidate = response.candidates[0] if response.candidates else None
        if candidate and candidate.content and candidate.content.parts:
            tool_calls = [part.function_call for part in candidate.content.parts if part.function_call]
            if tool_calls:
                logger.info(f"Found {len(tool_calls)} tool calls to execute")
                # Stream the tool execution and final response
                async for event in self._handle_tool_calls_streaming(tool_calls, session_id, message, history):
                    yield event
                return
            else:
                # Log why no tool calls were found
                logger.warning(f"No tool calls found in response. Parts: {[type(part).__name__ for part in candidate.content.parts]}")
                if candidate.content.parts and candidate.content.parts[0].text:
                    logger.warning(f"Response text instead of tool call: {candidate.content.parts[0].text[:200]}")

        # Fallback to streaming text if no tool call was made
        logger.info("Falling back to text-only response (no tool calls detected)")
        async for event in self._execute_without_tools(session_id, message, history):
            yield event

    async def _execute_without_tools(self, session_id: str, message: str, history: List[Dict]):
        """Execute the request without any tools."""
        config = self.generation_config

        # Get security-enhanced system prompt (includes business intelligence + security rules)
        system_prompt = self._get_security_enhanced_system_prompt()

        # Add current date context for ALL agents
        today_date = datetime.now(UTC).strftime("%B %d, %Y")
        date_context = f"IMPORTANT: Today's date is {today_date}. When creating plans, timelines, or dates, always use this as your reference point and ensure all dates are in the future or present, never in the past."

        chat_contents = []

        # Add system prompt with security reinforcement (ALWAYS)
        if system_prompt:
            logger.info(f"[{self.agent_type}] Adding security-enhanced system prompt ({len(system_prompt)} chars)")
            chat_contents.append({"role": "user", "parts": [{"text": f"[SYSTEM CONTEXT]\n{date_context}\n\n{system_prompt}"}]})
            chat_contents.append({"role": "model", "parts": [{"text": "Understood. I'll incorporate this business context into my analysis and responses."}]})
        else:
            # Even without system prompt, always include date context
            logger.info(f"[{self.agent_type}] Adding date context")
            chat_contents.append({"role": "user", "parts": [{"text": f"[SYSTEM CONTEXT]\n{date_context}"}]})
            chat_contents.append({"role": "model", "parts": [{"text": "Understood. I'll use today's date as my reference point."}]})

        # Add conversation history
        chat_contents.extend([self._to_content(m) for m in history])
        chat_contents.append({"role": "user", "parts": [{"text": message}]})

        full_response_text = ""
        
        # Try streaming first, fallback to non-streaming if needed
        if self._streaming_enabled:
            try:
                response_stream = await self.client.aio.models.generate_content_stream(model=self.model_name, contents=chat_contents, config=config)
                first_chunk_received = False
                last_chunk = None
                start_time = asyncio.get_event_loop().time()
                async for chunk in response_stream:
                    last_chunk = chunk
                    if not first_chunk_received and chunk.text and chunk.text.strip():
                        first_chunk_received = True
                        end_time = asyncio.get_event_loop().time()
                        logger.info(f"Time to first token: {end_time - start_time:.4f}s")

                    if chunk.text:
                        yield {"event": "text_chunk", "data": {"token": chunk.text}}
                        full_response_text += chunk.text

                # Reset failure count on successful streaming
                self._consecutive_stream_failures = 0

                # Track cost from last chunk's usage metadata
                if last_chunk and hasattr(last_chunk, 'usage_metadata'):
                    asyncio.create_task(self._track_cost_to_db(session_id, last_chunk.usage_metadata))

            except Exception as stream_error:
                logger.warning(f"Streaming failed for session {session_id}, falling back to non-streaming: {str(stream_error)}")
                self._consecutive_stream_failures += 1

                # Fallback to non-streaming mode
                response = await self.client.aio.models.generate_content(model=self.model_name, contents=chat_contents, config=config)
                full_response_text = response.text or ""
                yield {"event": "text_chunk", "data": {"token": full_response_text}}
                if hasattr(response, 'usage_metadata'):
                    asyncio.create_task(self._track_cost_to_db(session_id, response.usage_metadata))
        else:
            # Non-streaming mode
            response = await self.client.aio.models.generate_content(model=self.model_name, contents=chat_contents, config=config)
            full_response_text = response.text or ""
            yield {"event": "text_chunk", "data": {"token": full_response_text}}
            if hasattr(response, 'usage_metadata'):
                asyncio.create_task(self._track_cost_to_db(session_id, response.usage_metadata))

        # Save the response with security validation (only if non-empty)
        if full_response_text and full_response_text.strip():
            success, validated_text = await self._save_validated_assistant_message(session_id, full_response_text)
            if not success:
                # Output was sanitized due to security concerns
                logger.warning(f"AI response sanitized for security reasons in session {session_id}")
        else:
            logger.error(f"Refusing to save empty assistant message for session {session_id} (no-tools path)")
            yield {"event": "error", "data": {"message": "Failed to generate response. Please try again."}}

        # Trigger progressive learning for no-tool responses
        if hasattr(self, '_current_user_message') and hasattr(self, '_current_user_id'):
            await self._trigger_progressive_learning(
                session_id, self._current_user_message, full_response_text, self._current_user_id
            )
        
        yield {"event": "stream_end", "data": {"session_id": session_id}}

    async def _execute_multi_turn_streaming(self, session_id: str, message: str, history: List[Dict], file_info: Optional[List[Dict[str, Any]]] = None):
        """
        Hybrid approach: Raw callables + Manual multi-turn + Streaming

        Combines best of both worlds:
        - Raw Python callables (simpler than FunctionDeclaration)
        - AFC DISABLED (we control orchestration for better UX)
        - Streaming (immediate feedback, never block UI)
        - Manual multi-turn (show progress in real-time)

        Expected performance: ~2-3s to first token (vs 28s with AFC)
        """
        MAX_TURNS = 10  # Reduced from 15 to improve tool execution reliability
        logger.info(f"Starting hybrid multi-turn streaming (max {MAX_TURNS} turns)")

        # Configure tools with raw callables BUT disable AFC for manual control
        if self.agent_tools:
            # Raw callables with AFC DISABLED for streaming control
            config = types.GenerateContentConfig(
                temperature=self.temperature,
                max_output_tokens=self.max_output_tokens,
                thinking_config=types.ThinkingConfig(thinking_level=self.thinking_level),
                tools=self.agent_tools,  # Raw Python callables (simpler!)
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True  # CRITICAL: Disable AFC for manual streaming control
                )
            )
            logger.info(f"[HYBRID] Providing {len(self.agent_tools)} tools (manual streaming control)")
        elif self.enable_grounding:
            # Google Search with manual control
            config = types.GenerateContentConfig(
                temperature=self.temperature,
                max_output_tokens=self.max_output_tokens,
                thinking_config=types.ThinkingConfig(thinking_level=self.thinking_level),
                tools=[types.Tool(google_search=types.GoogleSearch())],
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
            )
            logger.info("[HYBRID] Providing Google Search (manual streaming control)")
        else:
            # No tools - stream text only
            logger.info("[HYBRID] No tools configured, streaming text-only")
            async for event in self._execute_unified_streaming(session_id, message, history, file_info):
                yield event
            return

        # Build initial chat contents with security-enhanced system prompt
        system_prompt = self._get_security_enhanced_system_prompt()
        chat_contents = []

        if system_prompt:
            chat_contents.append({"role": "user", "parts": [{"text": f"[SYSTEM CONTEXT]\n{system_prompt}"}]})
            chat_contents.append({"role": "model", "parts": [{"text": "Understood. I'll incorporate this business context into my analysis and responses."}]})

        chat_contents.extend([self._to_content(m) for m in history])
        
        # Build content parts - files FIRST per Gemini best practices
        content_parts = []
        if file_info:
            for file in file_info:
                content_parts.append(types.Part.from_uri(file_uri=file['gemini_uri'], mime_type=file['mime_type']))
            logger.info(f"Including {len(file_info)} files in chat context")
        
        # Add user message text
        content_parts.append(types.Part.from_text(text=message))
        chat_contents.append({"role": "user", "parts": content_parts})

        first_token_sent = False
        first_token_time = asyncio.get_event_loop().time()

        # Manual multi-turn loop with streaming (hybrid approach)
        for turn in range(MAX_TURNS):
            logger.info(f"[HYBRID] Turn {turn + 1}/{MAX_TURNS}")

            # Make STREAMING request (not blocking AFC call)
            response_stream = await self.client.aio.models.generate_content_stream(
                model=self.model_name,
                contents=chat_contents,
                config=config
            )

            # Collect response parts and stream to user in real-time
            function_calls = []
            response_text = ""
            model_parts = []
            last_chunk = None

            async for chunk in response_stream:
                last_chunk = chunk
                if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
                    for part in chunk.candidates[0].content.parts:
                        model_parts.append(part)

                        if part.function_call:
                            # Function call detected - stream notification immediately
                            function_calls.append(part.function_call)
                            tool_name = TOOL_DISPLAY_NAMES.get(part.function_call.name, part.function_call.name)

                            if not first_token_sent:
                                elapsed = asyncio.get_event_loop().time() - first_token_time
                                logger.info(f"[TIMING] ⭐ FIRST TOKEN (function call: {tool_name}) in {elapsed:.3f}s")
                                first_token_sent = True

                            logger.info(f"[HYBRID] Function call: {part.function_call.name}")

                        elif part.text:
                            # Text response - stream immediately
                            if not first_token_sent:
                                elapsed = asyncio.get_event_loop().time() - first_token_time
                                logger.info(f"[TIMING] ⭐ FIRST TOKEN (text) in {elapsed:.3f}s")
                                first_token_sent = True

                            yield {"event": "text_chunk", "data": {"token": part.text}}
                            response_text += part.text

            # Check if we're done (no function calls = final answer)
            if not function_calls:
                logger.info(f"[HYBRID] Model stopped calling functions after turn {turn + 1}")

                # Save final response with security validation
                if response_text and response_text.strip():
                    success, validated_text = await self._save_validated_assistant_message(session_id, response_text)
                    if not success:
                        logger.warning(f"AI response sanitized for security reasons in session {session_id}")
                else:
                    # Model returned no text after tool execution - this is a bug!
                    logger.error(f"[HYBRID] Model returned NO TEXT after tool execution in turn {turn + 1} (session {session_id})")

                    # Save and stream fallback message so user isn't left confused
                    fallback_text = "I've completed the requested analysis. The results have been saved and you can view them in the outputs section."
                    yield {"event": "text_chunk", "data": {"token": fallback_text}}
                    response_text = fallback_text

                    success, validated_text = await self._save_validated_assistant_message(session_id, fallback_text)
                    if not success:
                        logger.error(f"Failed to save fallback message for session {session_id}")

                # Track cost from last chunk
                if last_chunk and hasattr(last_chunk, 'usage_metadata'):
                    asyncio.create_task(self._track_cost_to_db(session_id, last_chunk.usage_metadata))

                # Trigger progressive learning
                if hasattr(self, '_current_user_message') and hasattr(self, '_current_user_id'):
                    await self._trigger_progressive_learning(
                        session_id, self._current_user_message, response_text, self._current_user_id
                    )

                yield {"event": "stream_end", "data": {"session_id": session_id}}
                return

            # Execute function calls manually (parallel execution)
            logger.info(f"[HYBRID] Executing {len(function_calls)} function(s)")

            # Append model's response with function calls
            chat_contents.append(types.Content(role="model", parts=model_parts))

            # Execute functions and create response parts
            function_response_parts = []
            for fc in function_calls:
                result = await self._execute_single_tool(fc, session_id)
                function_response_parts.append(
                    build_function_response_part(fc, result)
                )

            # Append function responses as user message
            chat_contents.append(types.Content(role="user", parts=function_response_parts))

            # Continue to next turn

        # If we hit max turns, force final response
        logger.warning(f"[HYBRID] Hit max turns ({MAX_TURNS}), forcing final response")
        final_text = "I've completed the analysis using the available tools. Please let me know if you need any clarification."
        yield {"event": "text_chunk", "data": {"token": final_text}}
        success, validated_text = await self._save_validated_assistant_message(session_id, final_text)
        yield {"event": "stream_end", "data": {"session_id": session_id}}


    async def _execute_unified_streaming(self, session_id: str, message: str, history: List[Dict], file_info: Optional[List[Dict[str, Any]]] = None):
        """
        Unified text-only streaming (no tools).
        Used when agent has no custom functions and no grounding enabled.
        """
        # Configure for text-only response
        config = types.GenerateContentConfig(
            temperature=self.temperature,
            max_output_tokens=self.max_output_tokens,
            thinking_config=types.ThinkingConfig(thinking_level=self.thinking_level),
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
        )

        logger.info("[STREAMING] Text-only mode (no tools)")

        # Build chat contents with security-enhanced system prompt
        system_prompt = self._get_security_enhanced_system_prompt()
        chat_contents = []

        if system_prompt:
            chat_contents.append({"role": "user", "parts": [{"text": f"[SYSTEM CONTEXT]\n{system_prompt}"}]})
            chat_contents.append({"role": "model", "parts": [{"text": "Understood. I'll incorporate this business context into my analysis and responses."}]})

        chat_contents.extend([self._to_content(m) for m in history])
        
        # Build content parts - files FIRST per Gemini best practices
        content_parts = []
        if file_info:
            for file in file_info:
                content_parts.append(types.Part.from_uri(file_uri=file['gemini_uri'], mime_type=file['mime_type']))
            logger.info(f"Including {len(file_info)} files in chat context")
        
        # Add user message text
        content_parts.append(types.Part.from_text(text=message))
        chat_contents.append({"role": "user", "parts": content_parts})


        full_response_text = ""
        function_calls_made = []
        first_chunk_time = asyncio.get_event_loop().time()
        first_token_sent = False

        # Start streaming - first token should appear in <1s
        if self._streaming_enabled:
            try:
                response_stream = await self.client.aio.models.generate_content_stream(
                    model=self.model_name,
                    contents=chat_contents,
                    config=config
                )

                async for chunk in response_stream:
                    # Check for function calls in this chunk
                    if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
                        for part in chunk.candidates[0].content.parts:
                            # Handle function call
                            if part.function_call:
                                function_calls_made.append(part.function_call)
                                logger.info(f"Function call detected during streaming: {part.function_call.name}")

                            # Handle text content
                            elif part.text:
                                if not first_token_sent:
                                    elapsed = asyncio.get_event_loop().time() - first_chunk_time
                                    logger.info(f"[TIMING] ⭐ FIRST TOKEN TO USER in {elapsed:.3f}s")
                                    first_token_sent = True

                                yield {"event": "text_chunk", "data": {"token": part.text}}
                                full_response_text += part.text

                # Reset failure count on successful streaming
                self._consecutive_stream_failures = 0

                # If function calls were made, execute them and generate follow-up response
                if function_calls_made:
                    logger.info(f"Executing {len(function_calls_made)} function(s) after initial streaming")
                    # Execute tools and stream the synthesis
                    async for event in self._handle_tool_calls_streaming(function_calls_made, session_id, message, history):
                        yield event
                    return  # Tool handler manages final message saving

            except Exception as stream_error:
                logger.warning(f"Streaming failed for session {session_id}: {str(stream_error)}")
                self._consecutive_stream_failures += 1

                # Fallback to non-streaming
                response = await self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=chat_contents,
                    config=config
                )

                # Check for function calls in non-streaming response
                if response.candidates and response.candidates[0].content:
                    for part in response.candidates[0].content.parts:
                        if part.function_call:
                            function_calls_made.append(part.function_call)
                        elif part.text:
                            full_response_text += part.text

                if function_calls_made:
                    yield {"event": "text_chunk", "data": {"token": full_response_text}}
                    async for event in self._handle_tool_calls_streaming(function_calls_made, session_id, message, history):
                        yield event
                    return
                else:
                    yield {"event": "text_chunk", "data": {"token": full_response_text}}
        else:
            # Non-streaming mode
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=chat_contents,
                config=config
            )
            full_response_text = response.text or ""
            yield {"event": "text_chunk", "data": {"token": full_response_text}}

        # Save the response with security validation (only if non-empty and no functions were called)
        if full_response_text and full_response_text.strip():
            success, validated_text = await self._save_validated_assistant_message(session_id, full_response_text)
            if not success:
                logger.warning(f"AI response sanitized for security reasons in session {session_id}")
        elif not function_calls_made:
            logger.error(f"Refusing to save empty assistant message for session {session_id}")
            yield {"event": "error", "data": {"message": "Failed to generate response. Please try again."}}

        # Trigger progressive learning
        logger.info(f"[PROGRESSIVE_LEARNING] Checking attributes for session {session_id}: _current_user_message={hasattr(self, '_current_user_message')}, _current_user_id={hasattr(self, '_current_user_id')}")
        if hasattr(self, '_current_user_message') and hasattr(self, '_current_user_id'):
            logger.info(f"[PROGRESSIVE_LEARNING] Triggering progressive learning for session {session_id}")
            await self._trigger_progressive_learning(
                session_id, self._current_user_message, full_response_text, self._current_user_id
            )
        else:
            logger.warning(f"[PROGRESSIVE_LEARNING] Skipping progressive learning for session {session_id} - attributes not found")

        yield {"event": "stream_end", "data": {"session_id": session_id}}

    async def _handle_tool_calls_streaming(self, tool_calls: List, session_id: str, original_message: str, history: List[Dict]):
        """
        Priority 3 Optimization: Start streaming BEFORE tool execution (-10.3s user-perceived latency)
        Shows progress updates with friendly tool names while tools execute in parallel.
        """
        logger.info(f"Handling {len(tool_calls)} tool calls for session {session_id}")

        # Get friendly names for tools being called
        tool_names = [fc.name for fc in tool_calls]
        # Use localized tool display names based on user's locale
        locale = getattr(self, 'locale', 'en')
        friendly_names = [get_tool_display_name(name, locale) for name in tool_names]

        # IMMEDIATE STREAMING: Tell user what we're analyzing (first token appears instantly!)
        first_token_time = asyncio.get_event_loop().time()
        intro_text = format_analyzing_message(tool_names, locale)
        yield {"event": "text_chunk", "data": {"token": intro_text}}
        logger.info(f"[TIMING] ⭐ FIRST TOKEN TO USER at {first_token_time:.3f}s")
        logger.info(f"Started streaming immediately with tool preview: {friendly_names}")

        # Execute tools in parallel WHILE streaming progress
        tool_results = []
        for i, tool_call in enumerate(tool_calls):
            tool_name = tool_call.name
            friendly_name = get_tool_display_name(tool_name, locale)

            # Execute the tool
            tool_result = await self._execute_single_tool(tool_call, session_id)
            tool_results.append(tool_result)

            # Stream progress update after each tool completes (localized)
            progress_text = format_tool_complete_message(tool_name, locale)
            yield {"event": "text_chunk", "data": {"token": progress_text}}
            logger.info(f"Tool {i+1}/{len(tool_calls)} completed: {friendly_name}")

            # Yield tool_result SSE event for framework visualizations (iOS/web)
            if tool_result is not None:
                result_data = tool_result if isinstance(tool_result, dict) else {"result": tool_result}
                yield {
                    "event": "tool_result",
                    "data": {
                        "tool_name": tool_name,
                        **result_data
                    }
                }

        # Now stream the final AI analysis with all tool results in context (localized)
        completion_text = format_recommendation_intro(locale)
        yield {"event": "text_chunk", "data": {"token": completion_text}}

        # Stream the final response with tool results in context
        async for event in self._generate_final_response_streaming(session_id, original_message, history):
            yield event

    async def _execute_single_tool(self, function_call, session_id: str):
        """
        Execute a single tool and save results to database.
        Used by the parallel streaming implementation.
        """
        # Ensure session context is set (needed for tools to access org_id, user_id)
        if not hasattr(self, 'current_org_id') or not self.current_org_id:
            try:
                # Use routed function for schema-aware session lookup
                session_result = self.session_service.supabase.rpc('get_session_routed', {
                    'p_session_id': session_id
                }).execute()

                if session_result.data and len(session_result.data) > 0:
                    session_data = session_result.data[0]
                    self.current_org_id = session_data.get("org_id")
                    self.current_user_id = session_data.get("user_id") or getattr(self, '_current_user_id', None)
                    self.current_client_id = session_data.get("client_id")
                    # Extract campaign_id from session_data/session_metadata JSONB
                    session_metadata = session_data.get("session_data") or session_data.get("session_metadata", {})
                    self.current_campaign_id = session_metadata.get("campaign_id") if isinstance(session_metadata, dict) else None
                    self.current_session_id = session_id
            except Exception as e:
                logger.warning(f"Failed to get session context for tool execution: {e}")

        # Execute the tool
        tool_name = function_call.name
        tool_args = {key: value for key, value in function_call.args.items()}
        logger.info(f"Executing tool: {tool_name} with args: {tool_args}")

        tool_function = getattr(self, tool_name, None)
        if tool_function and callable(tool_function):
            if asyncio.iscoroutinefunction(tool_function):
                result = await tool_function(**tool_args)
            else:
                result = tool_function(**tool_args)

            if hasattr(result, 'model_dump'):
                result = result.model_dump()

            # Save function call and result to database
            await self.session_service.save_message(session_id, "assistant", "", metadata={"function_call": {"name": tool_name, "args": tool_args}}, agent_type=self.agent_type)
            await self.session_service.save_message(session_id, "tool", "", metadata={"tool_result": {"name": tool_name, "result": result}}, agent_type=self.agent_type)

            return result

        return None

    async def _execute_tool_calls(self, tool_calls: List, session_id: str):
        """Execute the tool calls and save results."""
        # Get session metadata for tool context
        try:
            # Use routed function for schema-aware session lookup
            session_result = self.session_service.supabase.rpc('get_session_routed', {
                'p_session_id': session_id
            }).execute()

            if session_result.data and len(session_result.data) > 0:
                session_data = session_result.data[0]
                # Set context attributes for tools to access
                self.current_org_id = session_data.get("org_id")
                self.current_user_id = session_data.get("user_id") or getattr(self, '_current_user_id', None)
                self.current_client_id = session_data.get("client_id")
                # Extract campaign_id from session_data/session_metadata JSONB
                session_metadata = session_data.get("session_data") or session_data.get("session_metadata", {})
                self.current_campaign_id = session_metadata.get("campaign_id") if isinstance(session_metadata, dict) else None
                self.current_session_id = session_id
                logger.info(f"Set tool context: org_id={self.current_org_id}, user_id={self.current_user_id}, client_id={self.current_client_id}, campaign_id={self.current_campaign_id}, session_id={session_id}")
        except Exception as e:
            logger.warning(f"Failed to get session context: {e}")
            self.current_org_id = None
            self.current_user_id = getattr(self, '_current_user_id', None)
            self.current_client_id = None
            self.current_campaign_id = None
            self.current_session_id = session_id
            
        async def execute_tool(function_call):
            tool_name = function_call.name
            tool_args = {key: value for key, value in function_call.args.items()}
            logger.info(f"Executing tool: {tool_name} with args: {tool_args}")
            tool_function = getattr(self, tool_name, None)
            if tool_function and callable(tool_function):
                if asyncio.iscoroutinefunction(tool_function):
                    result = await tool_function(**tool_args)
                else:
                    result = tool_function(**tool_args)
                if hasattr(result, 'model_dump'):
                    result = result.model_dump()
                await self.session_service.save_message(session_id, "assistant", "", metadata={"function_call": {"name": tool_name, "args": tool_args}}, agent_type=self.agent_type)
                await self.session_service.save_message(session_id, "tool", "", metadata={"tool_result": {"name": tool_name, "result": result}}, agent_type=self.agent_type)
                return result
            return None
        
        tasks = [execute_tool(fc) for fc in tool_calls]
        results = await asyncio.gather(*tasks)
        return [res for res in results if res is not None]
    
    async def _generate_final_response_streaming(self, session_id: str, message: str, history: List[Dict], retry_count: int = 0):
        """Generate the final response after tools have been executed with retry logic."""
        MAX_RETRIES = 2
        logger.info(f"Generating final response with tools for session {session_id} (attempt {retry_count + 1}/{MAX_RETRIES + 1})")

        # Get updated conversation history (now includes tool calls and results)
        updated_history = await self.session_service.get_conversation_history(session_id)

        # Get security-enhanced system prompt for final response
        system_prompt = self._get_security_enhanced_system_prompt()
        chat_contents = []

        # Add system message with security reinforcement
        if system_prompt:
            chat_contents.append({"role": "user", "parts": [{"text": f"[SYSTEM CONTEXT]\n{system_prompt}"}]})
            chat_contents.append({"role": "model", "parts": [{"text": "Understood. I'll incorporate this business context into my analysis and responses."}]})

        # Add full conversation history including tool calls and results
        chat_contents.extend([self._to_content(m) for m in updated_history])

        # Create a clean config WITHOUT tool_config for natural language response
        # Per Google documentation: After tool execution, use AUTO mode (or no tool_config)
        # to allow the model to generate natural language explanations
        config = types.GenerateContentConfig(
            temperature=self.temperature,
            max_output_tokens=self.max_output_tokens,
            thinking_config=types.ThinkingConfig(thinking_level=self.thinking_level),
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
        )

        # Log token limit for debugging
        logger.info(f"[{self.agent_type}] Final response generation config: max_output_tokens={self.max_output_tokens}, temperature={self.temperature}")

        full_response_text = ""

        # Try streaming first, fallback to non-streaming if needed
        if self._streaming_enabled:
            try:
                # Use cached context if available (graceful degradation on failure)
                cached_content_name = getattr(self, '_cached_context_name', None)
                if cached_content_name:
                    try:
                        config_with_cache = self._get_generation_config_with_cache(config)
                        response_stream = await self.client.aio.models.generate_content_stream(model=self.model_name, contents=chat_contents, config=config_with_cache)
                        logger.info(f"[{self.agent_type}] Using cached context: {cached_content_name}")
                    except Exception as cache_error:
                        logger.warning(f"[{self.agent_type}] Cache generation failed, falling back to non-cached: {cache_error}")
                        response_stream = await self.client.aio.models.generate_content_stream(model=self.model_name, contents=chat_contents, config=config)
                else:
                    response_stream = await self.client.aio.models.generate_content_stream(model=self.model_name, contents=chat_contents, config=config)

                first_chunk_received = False
                start_time = asyncio.get_event_loop().time()
                has_text_content = False

                async for chunk in response_stream:
                    if not first_chunk_received and chunk.text and chunk.text.strip():
                        first_chunk_received = True
                        end_time = asyncio.get_event_loop().time()
                        logger.info(f"Time to first token: {end_time - start_time:.4f}s")

                    if chunk.text:
                        yield {"event": "text_chunk", "data": {"token": chunk.text}}
                        full_response_text += chunk.text
                        has_text_content = True

                # If no text content was received, generate a fallback response
                if not has_text_content:
                    logger.warning(f"No text content received in streaming response for session {session_id}, generating fallback")
                    fallback_text = "I've processed your request and executed the necessary tools. The results have been saved to your workspace."
                    yield {"event": "text_chunk", "data": {"token": fallback_text}}
                    full_response_text = fallback_text

                # Reset failure count on successful streaming
                self._consecutive_stream_failures = 0
                        
            except Exception as stream_error:
                logger.warning(f"Streaming failed for session {session_id} (attempt {retry_count + 1}): {str(stream_error)}")
                self._consecutive_stream_failures += 1

                # Check if this is a retryable error and we have retries left
                is_retryable = (
                    "503" in str(stream_error) or  # Service unavailable
                    "500" in str(stream_error) or  # Server error
                    "timeout" in str(stream_error).lower() or
                    "network" in str(stream_error).lower()
                )

                if is_retryable and retry_count < MAX_RETRIES:
                    delay = 1 * (retry_count + 1)  # Exponential backoff: 1s, 2s
                    logger.info(f"Retrying final response generation in {delay}s (attempt {retry_count + 2}/{MAX_RETRIES + 1})")
                    await asyncio.sleep(delay)
                    # Retry the entire method
                    async for event in self._generate_final_response_streaming(session_id, message, history, retry_count + 1):
                        yield event
                    return  # Exit after retry completes

                # Fallback to non-streaming mode (no retries left or non-retryable error)
                try:
                    response = await self.client.aio.models.generate_content(model=self.model_name, contents=chat_contents, config=config)
                    full_response_text = response.text or ""
                    if not full_response_text.strip():
                        logger.warning(f"Empty response text in non-streaming fallback for session {session_id}, generating fallback")
                        full_response_text = "I've processed your request and executed the necessary tools. The results have been saved to your workspace."
                    yield {"event": "text_chunk", "data": {"token": full_response_text}}
                except Exception as fallback_error:
                    logger.error(f"Non-streaming fallback also failed for session {session_id}: {fallback_error}")
                    fallback_text = "I apologize, but I'm experiencing technical difficulties. The tool results have been saved. Please try asking your question again."
                    yield {"event": "text_chunk", "data": {"token": fallback_text}}
                    full_response_text = fallback_text
        else:
            # Non-streaming mode
            response = await self.client.aio.models.generate_content(model=self.model_name, contents=chat_contents, config=config)
            full_response_text = response.text or ""
            if not full_response_text.strip():
                logger.warning(f"Empty response text in non-streaming mode for session {session_id}, generating fallback")
                full_response_text = "I've processed your request and executed the necessary tools. The results have been saved to your workspace."
            yield {"event": "text_chunk", "data": {"token": full_response_text}}

        # Save the final response with security validation (only if non-empty)
        if full_response_text and full_response_text.strip():
            success, validated_text = await self._save_validated_assistant_message(session_id, full_response_text)
            if not success:
                logger.warning(f"AI response sanitized for security reasons in session {session_id}")
        else:
            logger.error(f"Refusing to save empty assistant message for session {session_id}. This indicates a streaming failure.")
            # Send error event to client
            yield {"event": "error", "data": {"message": "Failed to generate response. Please try again."}}
        
        # Trigger progressive learning for tool-based responses
        if hasattr(self, '_current_user_message') and hasattr(self, '_current_user_id'):
            await self._trigger_progressive_learning(
                session_id, self._current_user_message, full_response_text, self._current_user_id
            )
        
        yield {"event": "stream_end", "data": {"session_id": session_id}}



    def _to_content(self, message: Dict[str, Any]):
        """Converts a database message to a Gemini API content object."""
        role = message['role']
        metadata = message.get('metadata', {})
        if role == 'assistant' and metadata and 'function_call' in metadata:
            fc = metadata['function_call']
            return {"role": "model", "parts": [{"function_call": {"name": fc['name'], "args": fc['args']}}]}
        elif role == 'tool':
            tr = metadata['tool_result']
            return {"role": "tool", "parts": [{"function_response": {"name": tr['name'], "response": {"result": tr['result']}}}]}
        return {"role": "user" if role == "user" else "model", "parts": [{"text": message['content']}]}
    
    async def _trigger_progressive_learning(self, session_id: str, user_message: str, assistant_response: str, user_id: str):
        """
        Trigger progressive learning context extraction if organization info is available.
        This method can be overridden by specific agents that have access to organization_id.
        """
        try:
            # Use routed function for schema-aware session lookup
            session_result = self.session_service.supabase.rpc('get_session_routed', {
                'p_session_id': session_id
            }).execute()

            if session_result.data and len(session_result.data) > 0:
                session_data = session_result.data[0]
                organization_id = session_data.get("org_id")
                agent_type = session_data.get("agent_type")
                client_id = session_data.get("client_id")

                # Extract campaign_id from session_data/session_metadata JSONB
                session_metadata = session_data.get("session_data") or session_data.get("session_metadata", {})
                campaign_id = session_metadata.get("campaign_id") if isinstance(session_metadata, dict) else None

                if organization_id:
                    # Trigger progressive learning in background (non-blocking)
                    async def _run_progressive_learning():
                        try:
                            await progressive_learning_service.process_conversation_update(
                                session_id=session_id,
                                agent_type=agent_type,
                                user_message=user_message,
                                assistant_response=assistant_response,
                                user_id=user_id,
                                organization_id=organization_id,
                                client_id=client_id,  # Pass client_id for agency schema routing
                                campaign_id=campaign_id
                            )
                        except Exception as e:
                            logger.error(f"Progressive learning failed for session {session_id}: {e}", exc_info=True)

                    asyncio.create_task(_run_progressive_learning())
                    logger.info(f"✅ Triggered progressive learning for session {session_id} (client_id: {client_id}, campaign_id: {campaign_id})")
                else:
                    logger.warning(f"⚠️ No organization_id found for session {session_id}, skipping progressive learning")
            else:
                logger.warning(f"⚠️ Session data not found for {session_id}, skipping progressive learning")
                
        except Exception as e:
            logger.error(f"Error triggering progressive learning for session {session_id}: {str(e)}")

    async def _track_cost_to_db(self, session_id: str, usage_metadata, model_name: str = None):
        """
        Record Gemini API usage cost to gemini_cost_tracking table.
        Called after each response completes (streaming or non-streaming).
        Runs in background to avoid blocking the response stream.
        """
        try:
            if not usage_metadata:
                return

            input_tokens = getattr(usage_metadata, 'prompt_token_count', 0) or 0
            output_tokens = getattr(usage_metadata, 'candidates_token_count', 0) or 0
            cached_tokens = getattr(usage_metadata, 'cached_content_token_count', 0) or 0

            if input_tokens == 0 and output_tokens == 0:
                return

            # Use the model that was actually used for this request
            used_model = model_name or self.model_name
            # Map model string to ModelName enum for cost calculation
            model_enum = None
            for mn in ModelName:
                if mn.value == used_model or used_model.startswith(mn.value):
                    model_enum = mn
                    break
            if not model_enum:
                model_enum = ModelName.FLASH  # fallback

            cost_data = calculate_cost(model_enum, input_tokens, output_tokens, cached_tokens)

            # Look up org_id from session
            session_result = self.session_service.supabase.rpc('get_session_routed', {
                'p_session_id': session_id
            }).execute()

            org_id = None
            if session_result.data and len(session_result.data) > 0:
                org_id = session_result.data[0].get("org_id")

            if not org_id:
                logger.debug(f"No org_id for session {session_id}, skipping cost tracking")
                return

            from apps.api.utils.database import get_service_role_client
            supabase = get_service_role_client()
            supabase.table("gemini_cost_tracking").insert({
                "org_id": org_id,
                "agent_type": self.agent_type,
                "model_name": used_model,
                "session_id": session_id,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cached_tokens": cached_tokens,
                "input_cost_usd": cost_data["uncached_input_cost_usd"] + cost_data["cached_input_cost_usd"],
                "cache_cost_usd": cost_data["cached_input_cost_usd"],
                "output_cost_usd": cost_data["output_cost_usd"],
                "total_cost_usd": cost_data["total_cost_usd"],
                "cache_savings_usd": cost_data["cache_savings_usd"],
            }).execute()

            logger.debug(
                f"Cost tracked: session={session_id}, model={used_model}, "
                f"tokens={input_tokens}in/{output_tokens}out, cost=${cost_data['total_cost_usd']}"
            )
        except Exception as e:
            # Never let cost tracking break the chat flow
            logger.error(f"Failed to track cost for session {session_id}: {e}")

