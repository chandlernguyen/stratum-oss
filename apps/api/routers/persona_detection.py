"""
Persona Detection API using LLM with JSON mode
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID
import json
import logging
from google import genai
from google.genai import types

from ..auth.supabase_auth import get_current_user
from ..utils.database import get_supabase_client
from apps.api.config.gemini_models import DEFAULT_MODEL

logger = logging.getLogger(__name__)

router = APIRouter()

class PersonaLocationData(BaseModel):
    """Location structure for personas"""
    country: Optional[str] = None
    state_province: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    region: Optional[str] = None
    timezone: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None
    description: Optional[str] = None

class DetectedPersona(BaseModel):
    """Schema matching the synthetic_personas table with JSONB location"""
    name: str
    title: str
    company_name: str
    industry: str
    vertical: Optional[str] = None
    location: Optional[PersonaLocationData] = None  # Now structured location
    company_size: Optional[str] = None
    annual_revenue: Optional[str] = None
    persona_type: Optional[str] = None  # Frontend field, not stored in DB
    
    # JSONB fields
    demographics: Dict[str, Any] = Field(default_factory=dict)
    goals: List[str] = Field(default_factory=list)
    pain_points: List[str] = Field(default_factory=list)
    jobs_to_be_done: List[str] = Field(default_factory=list)
    current_tools: List[str] = Field(default_factory=list)
    decision_criteria: Dict[str, Any] = Field(default_factory=dict)
    objections: List[str] = Field(default_factory=list)
    preferred_channels: List[str] = Field(default_factory=list)
    
    # Behavioral
    personality_traits: Dict[str, Any] = Field(default_factory=dict)
    customer_status: Optional[str] = None
    satisfaction_score: Optional[int] = None
    
    # Context
    background_story: Optional[str] = None
    key_quote: Optional[str] = None

class PersonaDetectionRequest(BaseModel):
    content: str
    campaign_id: Optional[UUID] = None

class PersonaSaveRequest(BaseModel):
    """Request to save a detected persona"""
    # Persona data (flattened from DetectedPersona)
    name: str
    title: str
    company_name: str
    industry: str
    vertical: Optional[str] = None
    location: Optional[PersonaLocationData] = None
    company_size: Optional[str] = None
    annual_revenue: Optional[str] = None

    # JSONB fields
    demographics: Dict[str, Any] = Field(default_factory=dict)
    goals: List[str] = Field(default_factory=list)
    pain_points: List[str] = Field(default_factory=list)
    jobs_to_be_done: List[str] = Field(default_factory=list)
    current_tools: List[str] = Field(default_factory=list)
    decision_criteria: Dict[str, Any] = Field(default_factory=dict)
    objections: List[str] = Field(default_factory=list)
    preferred_channels: List[str] = Field(default_factory=list)
    personality_traits: Dict[str, Any] = Field(default_factory=dict)
    customer_status: Optional[str] = None
    satisfaction_score: Optional[int] = None
    background_story: Optional[str] = None
    key_quote: Optional[str] = None

    # Context fields
    campaign_id: Optional[UUID] = None
    client_id: Optional[UUID] = None  # Required for AGENCY organizations

class PersonaDetectionResponse(BaseModel):
    has_personas: bool
    confidence: float
    personas: List[DetectedPersona]
    extraction_method: str = "llm_json_mode"

@router.post("/api/v1/detect-personas", response_model=PersonaDetectionResponse)
async def detect_personas(
    request: PersonaDetectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Use LLM with JSON mode to detect and extract personas from content
    """
    try:
        import os
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Google API key not configured")
        
        client = genai.Client(api_key=api_key)
        
        # Create a structured prompt for persona extraction
        system_prompt = """You are a persona extraction expert. Analyze the provided text and extract any customer personas mentioned.

For each persona found, extract as much information as possible and return it in the following JSON structure:

{
  "has_personas": boolean,
  "confidence": number (0.0 to 1.0),
  "personas": [
    {
      "name": "string (required)",
      "title": "string (required)",
      "company_name": "string (required)",
      "industry": "string (required)",
      "vertical": "string or null",
      "location": {
        "country": "string or null",
        "state_province": "string or null",
        "city": "string or null",
        "postal_code": "string or null",
        "region": "string or null",
        "timezone": "string or null",
        "coordinates": null,
        "description": "string or null"
      },
      "company_size": "string or null",
      "annual_revenue": "string or null",
      "demographics": {
        "age": "number or string",
        "education": "string",
        "experience_years": "number",
        "tech_savviness": "string",
        "family_status": "string"
      },
      "goals": ["array of strings"],
      "pain_points": ["array of strings"],
      "jobs_to_be_done": ["array of strings"],
      "current_tools": ["array of strings"],
      "decision_criteria": {
        "price_sensitivity": "string",
        "key_factors": ["array of strings"]
      },
      "objections": ["array of strings"],
      "preferred_channels": ["array of strings"],
      "personality_traits": {
        "risk_tolerance": "string",
        "innovation_appetite": "string",
        "decision_style": "string"
      },
      "customer_status": "prospect|active|churned|competitor_user or null",
      "satisfaction_score": null or integer 0-10,
      "background_story": "string or null",
      "key_quote": "string or null"
    }
  ]
}

Extract information that is explicitly stated or clearly implied. For missing fields, use null or empty arrays/objects.
Focus on extracting actionable persona data that would be useful for marketing and sales teams."""

        user_prompt = f"""Extract all customer personas from the following content:

{request.content}

Return the result as valid JSON matching the schema described."""

        # Use Gemini with response_mime_type for JSON mode
        response = await client.aio.models.generate_content(
            model=DEFAULT_MODEL,
            contents=[
                {"role": "user", "parts": [{"text": system_prompt}]},
                {"role": "model", "parts": [{"text": "I understand. I will extract personas from the content and return them in the specified JSON format."}]},
                {"role": "user", "parts": [{"text": user_prompt}]}
            ],
            config=types.GenerateContentConfig(
                temperature=1.0,  # Gemini 3 recommended default
                response_mime_type="application/json",
                thinking_config=types.ThinkingConfig(thinking_level="low")  # was a 2048-token budget; latency-oriented route
            )
        )
        
        # Parse the JSON response
        try:
            result = json.loads(response.text)
            
            # Validate and clean the data
            personas = []
            for persona_data in result.get("personas", []):
                # Ensure required fields
                if not all([persona_data.get("name"), persona_data.get("title"), persona_data.get("company_name")]):
                    continue

                # Check persona completeness - ensure it has meaningful data beyond basic fields
                demographics = persona_data.get("demographics", {})
                goals = persona_data.get("goals", [])
                pain_points = persona_data.get("pain_points", [])
                jobs_to_be_done = persona_data.get("jobs_to_be_done", [])

                # Count how many demographic fields are filled (not null)
                filled_demographics = sum(1 for v in demographics.values() if v is not None and v != "null")

                # Count how many list fields have data
                has_goals = len(goals) > 0
                has_pain_points = len(pain_points) > 0
                has_jobs = len(jobs_to_be_done) > 0

                # Require at least 2 demographic fields OR at least 2 of (goals, pain_points, jobs_to_be_done)
                is_complete = filled_demographics >= 2 or sum([has_goals, has_pain_points, has_jobs]) >= 2

                if not is_complete:
                    logger.info(f"Skipping incomplete persona '{persona_data.get('name')}' - lacks sufficient data")
                    continue
                
                # Helper function to parse JSON strings from Gemini
                def parse_json_field(value, default):
                    if isinstance(value, str):
                        try:
                            return json.loads(value)
                        except (json.JSONDecodeError, ValueError):
                            return default
                    return value if value is not None else default
                
                # Handle location - should always be a dict from LLM
                location_raw = persona_data.get("location")
                if isinstance(location_raw, dict):
                    # Handle coordinates separately to ensure proper type
                    coords_raw = location_raw.get("coordinates")
                    coordinates = None
                    if coords_raw and isinstance(coords_raw, dict):
                        # Ensure lat/lng are floats if present
                        lat = coords_raw.get("lat")
                        lng = coords_raw.get("lng")
                        if lat is not None and lng is not None:
                            try:
                                coordinates = {"lat": float(lat), "lng": float(lng)}
                            except (ValueError, TypeError):
                                coordinates = None
                    
                    # Parse location data, handling None values
                    location_structured = PersonaLocationData(
                        country=location_raw.get("country"),
                        state_province=location_raw.get("state_province"),
                        city=location_raw.get("city"),
                        postal_code=location_raw.get("postal_code"),
                        region=location_raw.get("region"),
                        timezone=location_raw.get("timezone"),
                        coordinates=coordinates,  # Use properly typed coordinates
                        description=location_raw.get("description")
                    )
                else:
                    # If no location or invalid format, create empty structured location
                    location_structured = None
                
                # Create DetectedPersona instance with proper JSON parsing
                persona = DetectedPersona(
                    name=persona_data.get("name"),
                    title=persona_data.get("title"),
                    company_name=persona_data.get("company_name"),
                    industry=persona_data.get("industry", "Unknown"),
                    vertical=persona_data.get("vertical"),
                    location=location_structured,
                    company_size=persona_data.get("company_size"),
                    annual_revenue=persona_data.get("annual_revenue"),
                    demographics=parse_json_field(persona_data.get("demographics"), {}),
                    goals=parse_json_field(persona_data.get("goals"), []),
                    pain_points=parse_json_field(persona_data.get("pain_points"), []),
                    jobs_to_be_done=parse_json_field(persona_data.get("jobs_to_be_done"), []),
                    current_tools=parse_json_field(persona_data.get("current_tools"), []),
                    decision_criteria=parse_json_field(persona_data.get("decision_criteria"), {}),
                    objections=parse_json_field(persona_data.get("objections"), []),
                    preferred_channels=parse_json_field(persona_data.get("preferred_channels"), []),
                    personality_traits=parse_json_field(persona_data.get("personality_traits"), {}),
                    customer_status=persona_data.get("customer_status"),
                    satisfaction_score=persona_data.get("satisfaction_score"),
                    background_story=persona_data.get("background_story"),
                    key_quote=persona_data.get("key_quote")
                )
                personas.append(persona)
            
            return PersonaDetectionResponse(
                has_personas=len(personas) > 0,
                confidence=result.get("confidence", 0.8 if personas else 0.0),
                personas=personas,
                extraction_method="llm_json_mode"
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM JSON response: {e}")
            logger.error(f"Response text: {response.text}")
            
            # Fallback to empty result
            return PersonaDetectionResponse(
                has_personas=False,
                confidence=0.0,
                personas=[],
                extraction_method="llm_json_mode"
            )
            
    except Exception as e:
        logger.error(f"Error in persona detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/v1/save-detected-persona")
async def save_detected_persona(
    request: PersonaSaveRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Save a detected persona to agent_outputs table (nuclear migration).
    This ensures personas appear in the Outputs page.

    Args:
        request: Persona save request with persona data, campaign_id, and client_id
        current_user: Authenticated user from JWT
    """
    try:
        from ..utils.nuclear_agent_migration import save_persona_output

        supabase = get_supabase_client()

        # Get user's organization and type
        user_result = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
        org_id = user_result.data["org_id"]

        # Get org type to validate client_id requirement
        org_result = supabase.table("organizations").select("type").eq("id", org_id).single().execute()
        org_type = org_result.data["type"]

        # AGENCY organizations REQUIRE client_id for schema routing
        if org_type == "AGENCY" and not request.client_id:
            raise HTTPException(
                status_code=400,
                detail="client_id is required for AGENCY organizations"
            )

        # Prepare location data - convert Pydantic model to dict if needed
        if request.location:
            if isinstance(request.location, PersonaLocationData):
                location_data = request.location.model_dump(exclude_none=True)
                # Ensure at least an empty dict rather than None
                if not location_data:
                    location_data = {}
            elif isinstance(request.location, dict):
                location_data = request.location
            else:
                # Fallback - create empty dict
                location_data = {}
        else:
            # No location provided - use empty dict for JSONB
            location_data = {}

        # Prepare persona data for nuclear save
        persona_content = {
            "name": request.name,
            "title": request.title,
            "company_name": request.company_name,
            "industry": request.industry,
            "vertical": request.vertical,
            "location": location_data,
            "company_size": request.company_size,
            "annual_revenue": request.annual_revenue,
            "demographics": request.demographics if request.demographics else {},
            "goals": request.goals if request.goals else [],
            "pain_points": request.pain_points if request.pain_points else [],
            "jobs_to_be_done": request.jobs_to_be_done if request.jobs_to_be_done else [],
            "current_tools": request.current_tools if request.current_tools else [],
            "decision_criteria": request.decision_criteria if request.decision_criteria else {},
            "objections": request.objections if request.objections else [],
            "preferred_channels": request.preferred_channels if request.preferred_channels else [],
            "personality_traits": request.personality_traits if request.personality_traits else {},
            "customer_status": request.customer_status,
            "satisfaction_score": request.satisfaction_score,
            "background_story": request.background_story,
            "key_quote": request.key_quote
        }

        # Use nuclear migration to save to agent_outputs table
        persona_data = {
            "title": f"{request.name} - {request.title}",
            "summary": f"Customer persona for {request.company_name} in {request.industry}",
            "content": persona_content,
            "metadata": {
                "persona_type": "customer_persona",
                "created_by": current_user["id"],
                "tags": ["manually-saved", "persona-detection"],
                "original_table": "synthetic_personas"
            },
            "output_type": "persona"
        }

        # Save to agent_outputs table via nuclear migration
        result = await save_persona_output(
            persona_data=persona_data,
            org_id=org_id,
            user_id=current_user["id"],
            session_id=None,
            campaign_id=str(request.campaign_id) if request.campaign_id else None,
            client_id=str(request.client_id) if request.client_id else None  # Pass client_id for schema routing
        )

        logger.info(
            f"✅ Persona saved to agent_outputs: {result['id']} "
            f"(org_type: {org_type}, client_id: {request.client_id or 'N/A'})"
        )

        return {"success": True, "persona_id": result["id"]}

    except Exception as e:
        logger.error(f"Error saving persona: {e}")
        raise HTTPException(status_code=500, detail=str(e))