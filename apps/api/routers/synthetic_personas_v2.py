"""
Synthetic Personas Router v2 - Using BaseRouter for standardized CRUD operations
Migrates from is_active to archived_at pattern
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from uuid import UUID
from pydantic import BaseModel, Field
import json
import logging
import asyncio

from apps.api.routers.base import BaseRouter
from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.auth_database import get_service_role_client
from apps.api.models.standard_responses import StandardResponse
from apps.api.agents.base_gemini_agent import BaseGeminiAgent
from apps.api.config.gemini_models import DEFAULT_MODEL

logger = logging.getLogger(__name__)


# Pydantic Models for Synthetic Personas
class PersonaDemographics(BaseModel):
    """Demographic information for a persona"""
    age: Optional[str] = Field(None, description="Age or age range")
    education: Optional[str] = Field(None, description="Education level")
    tech_savviness: Optional[str] = Field(None, description="Technology proficiency")
    years_experience: Optional[str] = Field(None, description="Years of experience or range")
    income_range: Optional[str] = Field(None, description="Income bracket")
    location: Optional[Dict[str, Any]] = Field(default={}, description="Location details")


class PersonalityTraits(BaseModel):
    """Personality characteristics"""
    risk_tolerance: str = Field(default="medium", description="Risk tolerance level")
    innovation_appetite: str = Field(default="moderate", description="Openness to innovation")
    decision_speed: str = Field(default="deliberate", description="Decision-making speed")
    communication_style: Optional[str] = Field(None, description="Preferred communication style")
    work_style: Optional[str] = Field(None, description="Work approach and style")


class BuyerJourney(BaseModel):
    """Buyer journey stages and characteristics"""
    awareness_stage: Optional[Dict[str, Any]] = Field(default={}, description="Awareness stage details")
    consideration_stage: Optional[Dict[str, Any]] = Field(default={}, description="Consideration stage details")
    decision_stage: Optional[Dict[str, Any]] = Field(default={}, description="Decision stage details")
    retention_stage: Optional[Dict[str, Any]] = Field(default={}, description="Retention stage details")


class SyntheticPersona(BaseModel):
    """Complete synthetic persona model"""
    id: Optional[UUID] = None
    org_id: UUID
    campaign_id: Optional[UUID] = None
    name: str
    title: str
    company_name: str
    industry: str
    vertical: Optional[str] = None
    company_size: Optional[str] = None
    is_primary: bool = False
    demographics: Optional[PersonaDemographics] = Field(default_factory=PersonaDemographics)
    personality_traits: Optional[PersonalityTraits] = Field(default_factory=PersonalityTraits)
    goals: List[str] = Field(default=[], description="Primary goals and objectives")
    pain_points: List[str] = Field(default=[], description="Key pain points and challenges")
    jobs_to_be_done: List[str] = Field(default=[], description="Jobs to be done framework")
    current_tools: List[str] = Field(default=[], description="Currently used tools/solutions")
    objections: List[str] = Field(default=[], description="Common objections and concerns")
    preferred_channels: List[str] = Field(default=[], description="Preferred communication channels")
    decision_criteria: Optional[Dict[str, Any]] = Field(default={}, description="Decision-making criteria")
    buyer_journey: Optional[BuyerJourney] = Field(default_factory=BuyerJourney)
    domain_expertise: Optional[Dict[str, Any]] = Field(default={}, description="Domain knowledge and expertise")
    tags: List[str] = Field(default=[], description="Tags for categorization")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None


class PersonaCreate(BaseModel):
    """Model for creating a persona"""
    campaign_id: Optional[UUID] = None
    name: str
    title: str
    company_name: str
    industry: str
    vertical: Optional[str] = None
    company_size: Optional[str] = None
    is_primary: bool = False
    demographics: Optional[PersonaDemographics] = None
    personality_traits: Optional[PersonalityTraits] = None
    goals: Optional[List[str]] = None
    pain_points: Optional[List[str]] = None
    jobs_to_be_done: Optional[List[str]] = None
    current_tools: Optional[List[str]] = None
    objections: Optional[List[str]] = None
    preferred_channels: Optional[List[str]] = None
    decision_criteria: Optional[Dict[str, Any]] = None
    buyer_journey: Optional[BuyerJourney] = None
    domain_expertise: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None


class PersonaUpdate(BaseModel):
    """Model for updating a persona"""
    name: Optional[str] = None
    title: Optional[str] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None
    vertical: Optional[str] = None
    company_size: Optional[str] = None
    is_primary: Optional[bool] = None
    demographics: Optional[PersonaDemographics] = None
    personality_traits: Optional[PersonalityTraits] = None
    goals: Optional[List[str]] = None
    pain_points: Optional[List[str]] = None
    jobs_to_be_done: Optional[List[str]] = None
    current_tools: Optional[List[str]] = None
    objections: Optional[List[str]] = None
    preferred_channels: Optional[List[str]] = None
    decision_criteria: Optional[Dict[str, Any]] = None
    buyer_journey: Optional[BuyerJourney] = None
    domain_expertise: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None


class InterviewRequest(BaseModel):
    """Request model for persona interview"""
    questions: List[str]
    context: Optional[str] = None


def ensure_json_field(value, default=None):
    """
    Ensure a field is proper JSON, not a stringified JSON.
    Handles both string JSON and already-parsed objects.
    """
    if value is None:
        return default

    # If it's already a dict/list, return as-is
    if isinstance(value, (dict, list)):
        return value

    # If it's a string, try to parse it as JSON
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, ValueError):
            # If parsing fails, return as-is or default
            return default if default is not None else value

    return value


def process_persona_json_fields(data: dict) -> dict:
    """
    Process all JSON fields in persona data to ensure they're properly formatted.
    This centralizes the JSON field handling logic.
    """
    # Define JSON fields and their default values
    json_array_fields = [
        'goals', 'pain_points', 'jobs_to_be_done', 'current_tools',
        'objections', 'preferred_channels', 'tags'
    ]
    json_object_fields = [
        'demographics', 'decision_criteria', 'personality_traits', 'domain_expertise', 'buyer_journey', 'location'
    ]

    processed_data = data.copy()

    # Process array fields
    for field in json_array_fields:
        if field in processed_data:
            processed_data[field] = ensure_json_field(processed_data[field], [])

    # Process object fields
    for field in json_object_fields:
        if field in processed_data:
            processed_data[field] = ensure_json_field(processed_data[field], {})

    # Special handling for personality_traits to ensure string values
    if 'personality_traits' in processed_data and isinstance(processed_data['personality_traits'], dict):
        personality_traits = processed_data['personality_traits']
        # Ensure common personality trait fields have string values
        trait_defaults = {
            'risk_tolerance': 'medium',
            'innovation_appetite': 'moderate',
            'decision_speed': 'deliberate'
        }
        for trait_key, default_value in trait_defaults.items():
            if trait_key in personality_traits and personality_traits[trait_key] is None:
                personality_traits[trait_key] = default_value
        processed_data['personality_traits'] = personality_traits

    return processed_data


class SyntheticPersonasRouter(BaseRouter):
    """
    Synthetic Personas router with standard CRUD operations plus custom endpoints.
    Migrates from is_active to archived_at pattern.
    """

    def __init__(self):
        super().__init__(
            table_name="agent_outputs",  # Nuclear migration: personas stored in agent_outputs
            resource_name="persona",
            resource_name_plural="personas",
            response_model=SyntheticPersona,
            create_model=PersonaCreate,
            update_model=PersonaUpdate
        )

    def _setup_routes(self):
        """Override to register custom routes BEFORE standard CRUD routes."""
        # CRITICAL: Setup custom routes FIRST to avoid /{resource_id} catching them
        self._setup_custom_routes()

        # Now call parent to setup standard CRUD routes
        super()._setup_routes()

    def _setup_custom_routes(self):
        """Add persona-specific custom endpoints."""

        @self.router.get("/campaign/{campaign_id}", response_model=StandardResponse)
        async def get_campaign_personas(
            campaign_id: UUID,
            include_archived: bool = Query(False, description="Include archived personas"),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Get all personas for a specific campaign."""
            try:
                query = db.table("agent_outputs")\
                    .select("*")\
                    .eq("org_id", current_user["org_id"])\
                    .eq("campaign_id", str(campaign_id))\
                    .eq("agent_type", "persona")\
                    .eq("output_type", "persona")

                if not include_archived:
                    query = query.is_("archived_at", "null")

                result = query.execute()

                # Extract personas from JSONB content field
                personas = []
                for item in result.data:
                    content = item.get('content', {})
                    metadata = item.get('metadata', {})
                    persona = {
                        'id': item['id'],
                        'org_id': item['org_id'],
                        'campaign_id': item.get('campaign_id'),
                        'name': content.get('name'),
                        'title': content.get('title'),
                        'company_name': content.get('company_name'),
                        'industry': content.get('industry'),
                        'vertical': content.get('vertical'),
                        'company_size': content.get('company_size'),
                        'demographics': content.get('demographics', {}),
                        'goals': content.get('goals', []),
                        'pain_points': content.get('pain_points', []),
                        'is_primary': metadata.get('is_primary', False),
                        'created_at': item.get('created_at'),
                        'updated_at': item.get('updated_at'),
                        'archived_at': item.get('archived_at'),
                    }
                    personas.append(process_persona_json_fields(persona))

                return StandardResponse(
                    success=True,
                    data=personas,
                    message=f"Retrieved {len(personas)} personas for campaign"
                )

            except Exception as e:
                logger.error(f"Error getting campaign personas: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve campaign personas"
                )

        @self.router.get("/primary", response_model=StandardResponse)
        async def get_primary_personas(
            campaign_id: Optional[UUID] = Query(None),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Get primary personas for organization or campaign."""
            try:
                query = db.table("agent_outputs")\
                    .select("*")\
                    .eq("org_id", current_user["org_id"])\
                    .eq("agent_type", "persona")\
                    .eq("output_type", "persona")\
                    .is_("archived_at", "null")

                if campaign_id:
                    query = query.eq("campaign_id", str(campaign_id))

                result = query.execute()

                # Extract personas from JSONB and filter for is_primary
                personas = []
                for item in result.data:
                    metadata = item.get('metadata', {})
                    # Filter for primary personas
                    if not metadata.get('is_primary', False):
                        continue

                    content = item.get('content', {})
                    persona = {
                        'id': item['id'],
                        'org_id': item['org_id'],
                        'campaign_id': item.get('campaign_id'),
                        'name': content.get('name'),
                        'title': content.get('title'),
                        'company_name': content.get('company_name'),
                        'industry': content.get('industry'),
                        'is_primary': True,
                        'created_at': item.get('created_at'),
                        'updated_at': item.get('updated_at'),
                    }
                    personas.append(process_persona_json_fields(persona))

                return StandardResponse(
                    success=True,
                    data=personas,
                    message=f"Retrieved {len(personas)} primary personas"
                )

            except Exception as e:
                logger.error(f"Error getting primary personas: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve primary personas"
                )

        @self.router.patch("/{persona_id}/set-primary", response_model=StandardResponse)
        async def set_primary_persona(
            persona_id: UUID,
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Set a persona as primary for its campaign."""
            try:
                # Verify ownership and get persona
                result = db.table("agent_outputs")\
                    .select("*")\
                    .eq("id", str(persona_id))\
                    .eq("org_id", current_user["org_id"])\
                    .eq("agent_type", "persona")\
                    .eq("output_type", "persona")\
                    .execute()

                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Persona not found"
                    )

                persona = result.data[0]

                # Check if archived
                if persona.get("archived_at"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot set an archived persona as primary"
                    )

                # Unset other primary personas for the same campaign
                if persona.get("campaign_id"):
                    # Get all other personas in the campaign
                    campaign_personas = db.table("agent_outputs")\
                        .select("id, metadata")\
                        .eq("org_id", current_user["org_id"])\
                        .eq("campaign_id", persona["campaign_id"])\
                        .eq("agent_type", "persona")\
                        .eq("output_type", "persona")\
                        .neq("id", str(persona_id))\
                        .execute()

                    # Update each persona's metadata to set is_primary = false
                    for other_persona in campaign_personas.data:
                        other_metadata = other_persona.get("metadata", {})
                        other_metadata["is_primary"] = False
                        db.table("agent_outputs")\
                            .update({
                                "metadata": other_metadata,
                                "updated_at": datetime.utcnow().isoformat()
                            })\
                            .eq("id", other_persona["id"])\
                            .execute()

                # Set this persona as primary
                current_metadata = persona.get("metadata", {})
                current_metadata["is_primary"] = True

                update_result = db.table("agent_outputs")\
                    .update({
                        "metadata": current_metadata,
                        "updated_at": datetime.utcnow().isoformat(),
                        "updated_by": current_user["id"]
                    })\
                    .eq("id", str(persona_id))\
                    .execute()

                if not update_result.data:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to set primary persona"
                    )

                # Extract persona from updated result
                updated_item = update_result.data[0]
                content = updated_item.get('content', {})
                metadata = updated_item.get('metadata', {})
                updated_persona = {
                    'id': updated_item['id'],
                    'org_id': updated_item['org_id'],
                    'campaign_id': updated_item.get('campaign_id'),
                    'name': content.get('name'),
                    'title': content.get('title'),
                    'company_name': content.get('company_name'),
                    'industry': content.get('industry'),
                    'is_primary': metadata.get('is_primary', False),
                    'created_at': updated_item.get('created_at'),
                    'updated_at': updated_item.get('updated_at'),
                }
                updated_persona = process_persona_json_fields(updated_persona)

                return StandardResponse(
                    success=True,
                    data=updated_persona,
                    message="Persona set as primary"
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error setting primary persona: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to set primary persona"
                )

        @self.router.post("/{persona_id}/interview", response_model=StandardResponse)
        async def interview_persona(
            persona_id: UUID,
            request: InterviewRequest,
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Conduct an interview with a synthetic persona."""
            try:
                # Get persona from agent_outputs
                result = db.table("agent_outputs")\
                    .select("*")\
                    .eq("id", str(persona_id))\
                    .eq("org_id", current_user["org_id"])\
                    .eq("agent_type", "persona")\
                    .eq("output_type", "persona")\
                    .execute()

                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Persona not found"
                    )

                # Extract persona from JSONB content
                item = result.data[0]
                content = item.get('content', {})
                metadata = item.get('metadata', {})
                persona = {
                    'id': item['id'],
                    'name': content.get('name'),
                    'title': content.get('title'),
                    'company_name': content.get('company_name'),
                    'industry': content.get('industry'),
                    'demographics': content.get('demographics', {}),
                    'personality_traits': content.get('personality_traits', {}),
                    'goals': content.get('goals', []),
                    'pain_points': content.get('pain_points', []),
                    'customer_status': content.get('customer_status', 'prospect'),
                    'is_primary': metadata.get('is_primary', False),
                }
                persona = process_persona_json_fields(persona)

                # Initialize Gemini agent for persona response
                agent = BaseGeminiAgent()

                # Build persona context
                persona_context = f"""
                You are {persona['name']}, {persona['title']} at {persona['company_name']}.
                Industry: {persona['industry']}
                Company Size: {persona.get('company_size', 'Unknown')}

                Demographics: {json.dumps(persona.get('demographics', {}))}
                Personality: {json.dumps(persona.get('personality_traits', {}))}
                Goals: {json.dumps(persona.get('goals', []))}
                Pain Points: {json.dumps(persona.get('pain_points', []))}
                Current Tools: {json.dumps(persona.get('current_tools', []))}
                Decision Criteria: {json.dumps(persona.get('decision_criteria', {}))}

                Respond to questions as this persona would, maintaining their perspective,
                concerns, and communication style.
                """

                # Generate responses
                responses = []
                for question in request.questions:
                    prompt = f"{persona_context}\n\nQuestion: {question}\n\nProvide a realistic response as this persona:"
                    response = await agent.generate_response(prompt)
                    responses.append({
                        "question": question,
                        "response": response
                    })

                # Store interview session
                session_data = {
                    "persona_id": str(persona_id),
                    "org_id": current_user["org_id"],
                    "questions": request.questions,
                    "responses": responses,
                    "context": request.context,
                    "created_by": current_user["id"],
                    "created_at": datetime.utcnow().isoformat()
                }

                db.table("persona_interview_sessions").insert(session_data).execute()

                return StandardResponse(
                    success=True,
                    data={
                        "persona": persona,
                        "interview": responses
                    },
                    message="Interview completed successfully"
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error conducting interview: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to conduct interview"
                )

        # Add streaming interview endpoint for compatibility with v1
        @self.router.post("/{persona_id}/interview-stream")
        async def interview_persona_stream(
            persona_id: UUID,
            request: Dict[str, Any],  # Accept any JSON body for flexibility
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Stream an interview with a synthetic persona - responds in real-time."""
            from fastapi.responses import StreamingResponse
            import json
            import asyncio
            import os

            # Get persona using schema-aware RPC function (agency vs SME routing)
            result = db.rpc("get_persona_details_routed", {
                "p_persona_id": str(persona_id),
                "p_org_id": current_user["org_id"]
            }).execute()

            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Persona not found"
                )

            # RPC returns JSONB directly - extract persona data
            agent_output = result.data
            content = agent_output.get("content", {})
            metadata = agent_output.get("metadata", {})

            # Map to persona structure for compatibility
            persona = {
                "id": agent_output["id"],
                "org_id": agent_output["org_id"],
                "campaign_id": agent_output.get("campaign_id"),
                "name": content.get("name"),
                "title": content.get("title"),
                "company_name": content.get("company_name"),
                "industry": content.get("industry", "technology"),
                "company_size": content.get("company_size"),
                "goals": content.get("goals", []),
                "pain_points": content.get("pain_points", []),
                "current_tools": content.get("current_tools", []),
                "customer_status": content.get("customer_status", "prospect"),
                "demographics": content.get("demographics", {}),
                "personality_traits": content.get("personality_traits", {}),
                "decision_criteria": content.get("decision_criteria", {}),
                "is_primary": metadata.get("is_primary", False)
            }

            # Get the user's message from request
            user_message = request.get("message", "")
            if not user_message:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Message is required"
                )

            # Build persona context
            system_prompt = f"""You are {persona['name']}, {persona['title']} at {persona['company_name']}.
Industry: {persona.get('industry', 'technology')}
Company Size: {persona.get('company_size', 'Unknown')}

Key Information about you:
- Goals: {', '.join(persona.get('goals', [])) if persona.get('goals') else 'Achieving business growth'}
- Pain Points: {', '.join(persona.get('pain_points', [])) if persona.get('pain_points') else 'Resource constraints'}
- Current Tools: {', '.join(persona.get('current_tools', [])) if persona.get('current_tools') else 'Various software solutions'}
- Customer Status: {persona.get('customer_status', 'prospect')}

Be specific about your current tools, workflows, and decision-making process.
Stay in character and provide realistic, detailed responses based on your persona profile.
Speak in first person as {persona['name']}."""

            async def generate():
                """Stream the persona's response"""
                try:
                    from google import genai

                    # Get API key and model from environment
                    api_key = os.getenv("GOOGLE_API_KEY")
                    model_name = os.getenv("GEMINI_MODEL_DEFAULT", DEFAULT_MODEL)

                    if not api_key:
                        yield f"event: error\ndata: {json.dumps({'message': 'API key not configured'})}\n\n"
                        return

                    client = genai.Client(api_key=api_key)

                    # Generate response with streaming
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[
                            {"role": "user", "parts": [{"text": system_prompt}]},
                            {"role": "model", "parts": [{"text": f"I understand. I am {persona['name']}, {persona['title']} at {persona['company_name']}. I'll respond to your questions from my perspective and experience."}]},
                            {"role": "user", "parts": [{"text": user_message}]}
                        ],
                        config={
                            "temperature": 1.0,  # Gemini 3 recommended default
                            "max_output_tokens": 2048
                        }
                    )

                    # Send the complete response as chunks
                    if response and response.text:
                        # Split response into smaller chunks for better streaming experience
                        text = response.text
                        chunk_size = 20  # Characters per chunk
                        for i in range(0, len(text), chunk_size):
                            chunk = text[i:i+chunk_size]
                            # Use proper SSE format with event and data fields
                            yield f"event: text_chunk\ndata: {json.dumps({'token': chunk})}\n\n"
                            await asyncio.sleep(0.01)  # Small delay for smooth streaming
                    else:
                        yield f"event: text_chunk\ndata: {json.dumps({'token': 'I apologize, but I was unable to generate a response. Please try again.'})}\n\n"

                    yield f"event: stream_end\ndata: {json.dumps({})}\n\n"

                except Exception as e:
                    logger.error(f"Interview stream error for persona {persona_id}: {str(e)}")
                    yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"

            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no",
                    "Connection": "keep-alive"
                }
            )

        @self.router.post("/{persona_id}/duplicate", response_model=StandardResponse)
        async def duplicate_persona_custom(
            persona_id: UUID,
            name: str = Query(..., description="Name for the duplicate"),
            campaign_id: Optional[UUID] = Query(None, description="Campaign to assign duplicate to"),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Duplicate a persona with a new name and optional campaign assignment."""
            try:
                # Get original persona from agent_outputs
                original = db.table("agent_outputs")\
                    .select("*")\
                    .eq("id", str(persona_id))\
                    .eq("org_id", current_user["org_id"])\
                    .eq("agent_type", "persona")\
                    .eq("output_type", "persona")\
                    .execute()

                if not original.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Persona not found"
                    )

                original_item = original.data[0]
                original_content = original_item.get('content', {})
                original_metadata = original_item.get('metadata', {})

                # Prepare duplicate content (copy all persona fields)
                duplicate_content = original_content.copy()
                duplicate_content["name"] = name  # Update name in content

                # Prepare duplicate metadata
                duplicate_metadata = original_metadata.copy()
                duplicate_metadata["is_primary"] = False  # Duplicates are not primary by default
                duplicate_metadata["duplicated_from"] = str(persona_id)
                duplicate_metadata["duplicated_at"] = datetime.utcnow().isoformat()

                # Prepare duplicate data for agent_outputs
                duplicate_data = {
                    "org_id": current_user["org_id"],
                    "user_id": current_user["id"],
                    "campaign_id": str(campaign_id) if campaign_id else original_item.get("campaign_id"),
                    "agent_type": "persona",
                    "output_type": "persona",
                    "title": f"{name} - {duplicate_content.get('title', 'Persona')}",
                    "summary": f"Customer persona for {duplicate_content.get('company_name', 'company')} in {duplicate_content.get('industry', 'industry')}",
                    "content": duplicate_content,
                    "metadata": duplicate_metadata,
                    "status": "active",
                    "created_by": current_user["id"],
                    "updated_by": current_user["id"],
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }

                # Insert duplicate into agent_outputs
                result = db.table("agent_outputs").insert(duplicate_data).execute()

                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to duplicate persona"
                    )

                # Process JSON fields
                duplicated_persona = process_persona_json_fields(result.data[0])

                return StandardResponse(
                    success=True,
                    data=duplicated_persona,
                    message="Persona duplicated successfully"
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error duplicating persona: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to duplicate persona"
                )

    # Override the get method to process JSON fields
    async def get(self, db, user: Dict, resource_id: UUID) -> StandardResponse:
        """Get a single persona with properly processed JSON fields."""
        response = await super().get(db, user, resource_id)
        if response.success and response.data:
            response.data = process_persona_json_fields(response.data)
        return response

    # Override the list method to process JSON fields
    async def list(
        self, db, user: Dict, skip: int = 0, limit: int = 100,
        sort_by: str = "created_at", sort_order: str = "desc",
        filters: Optional[Dict] = None, include_archived: bool = False
    ) -> StandardResponse:
        """List personas with properly processed JSON fields."""
        response = await super().list(db, user, skip, limit, sort_by, sort_order, filters, include_archived)
        if response.success and response.data:
            response.data = [process_persona_json_fields(p) for p in response.data]
        return response


# Create router instance
synthetic_personas_router = SyntheticPersonasRouter()