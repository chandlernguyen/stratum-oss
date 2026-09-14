"""
Business Context API Router
Handles CRUD operations for organization and campaign context
"""
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime
import uuid

from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.database import get_supabase_client
from apps.api.utils.enum_mappings import normalize_company_size, normalize_industry, normalize_business_model
from apps.api.services.context_intelligence import context_intelligence

router = APIRouter(
    prefix="/api/v1/business-context",
    tags=["business-context"]
)

# Request/Response Models
class OrganizationContextInput(BaseModel):
    """Input model for organization context"""
    companyName: str
    industry: str
    companySize: str
    description: Optional[str] = None
    targetMarket: Optional[str] = None
    competitors: Optional[list[str]] = None
    priceRange: Optional[str] = None
    technologyStack: Optional[list[str]] = None
    revenue: Optional[str] = None
    businessModel: Optional[str] = None
    uniqueValue: Optional[str] = None

class OrganizationContextResponse(BaseModel):
    """Response model for organization context"""
    id: str
    org_id: str
    business_info: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

class CampaignContextUpdate(BaseModel):
    """Model for updating campaign-specific context"""
    campaign_id: str
    campaign_context: Optional[Dict[str, Any]] = None
    agent_learnings: Optional[Dict[str, Any]] = None

class ContextHistoryInput(BaseModel):
    """Model for saving extracted context history"""
    session_id: str
    agent_type: str
    extracted_context: Dict[str, Any]
    confidence_score: float
    user_approved: bool = False

class ContextExtractionInput(BaseModel):
    """Model for triggering context extraction from conversations"""
    session_id: str
    agent_type: str
    conversation_text: str

# Endpoints
@router.get("/organization/{org_id}")
async def get_organization_context(
    org_id: str,
    current_user: dict = Depends(get_current_user)
) -> OrganizationContextResponse:
    """Get organization context"""
    supabase = get_supabase_client()
    
    # Verify user belongs to organization
    user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
    if not user_response.data or user_response.data.get("org_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied to this organization")
    
    # Fetch organization context from core_business_data table
    try:
        response = supabase.table("core_business_data").select("*").eq("org_id", org_id).single().execute()
        
        if response.data:
            # Convert database format to API response format
            # Database now uses the same values as frontend after migration
            return OrganizationContextResponse(
                id=response.data["id"],
                org_id=response.data["org_id"],
                business_info={
                    "companyName": response.data.get("company_name"),
                    "industry": response.data.get("industry"),
                    "companySize": response.data.get("company_size"),
                    "targetMarket": response.data.get("target_market"),
                    "competitors": response.data.get("key_competitors"),
                    "technologyStack": response.data.get("tech_stack"),
                    "revenue": response.data.get("annual_revenue"),
                    "businessModel": response.data.get("business_model"),
                    "priceRange": response.data.get("marketing_budget"),
                    "description": response.data.get("main_products", [None])[0] if response.data.get("main_products") else None,
                    "uniqueValue": response.data.get("main_products", [None, None])[1] if response.data.get("main_products") and len(response.data.get("main_products", [])) > 1 else None
                },
                created_at=response.data["created_at"],
                updated_at=response.data["updated_at"]
            )
    except Exception:
        # Context doesn't exist, return empty
        pass
    
    # Return empty context if none exists
    return OrganizationContextResponse(
        id="",
        org_id=org_id,
        business_info={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

@router.post("/organization/{org_id}")
async def create_or_update_organization_context(
    org_id: str,
    context: OrganizationContextInput,
    current_user: dict = Depends(get_current_user)
) -> OrganizationContextResponse:
    """Create or update organization context"""
    supabase = get_supabase_client()
    
    # Verify user belongs to organization
    user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
    if not user_response.data or user_response.data.get("org_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied to this organization")
    
    # Map fields from input model to database columns with enum normalization
    data = {
        "company_name": context.companyName,
        "industry": normalize_industry(context.industry) if context.industry else None,
        "company_size": normalize_company_size(context.companySize) if context.companySize else None,
        "target_market": context.targetMarket.split(",") if context.targetMarket and isinstance(context.targetMarket, str) else context.targetMarket,
        "key_competitors": context.competitors,
        "tech_stack": context.technologyStack,
        "annual_revenue": context.revenue,
        "business_model": normalize_business_model(context.businessModel) if context.businessModel else None,
        "updated_at": datetime.utcnow().isoformat(),
        "updated_by": current_user["id"]
    }
    
    # Add optional fields if provided
    if context.description:
        data["main_products"] = [context.description]
    if context.priceRange:
        data["marketing_budget"] = context.priceRange
    if context.uniqueValue:
        data["main_products"] = [context.uniqueValue]
    
    # Remove None values
    data = {k: v for k, v in data.items() if v is not None}
    
    # Check if context exists
    existing = supabase.table("core_business_data").select("id").eq("org_id", org_id).execute()
    
    if existing.data:
        # Update existing
        response = supabase.table("core_business_data").update(data).eq("org_id", org_id).execute()
    else:
        # Create new
        data["org_id"] = org_id
        response = supabase.table("core_business_data").insert(data).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to save context")
    
    # Return as expected format
    # Database now uses the same values as frontend after migration
    return OrganizationContextResponse(
        id=response.data[0]["id"],
        org_id=response.data[0]["org_id"],
        business_info={
            "companyName": response.data[0].get("company_name"),
            "industry": response.data[0].get("industry"),
            "companySize": response.data[0].get("company_size"),
            "targetMarket": response.data[0].get("target_market"),
            "competitors": response.data[0].get("key_competitors"),
            "technologyStack": response.data[0].get("tech_stack"),
            "revenue": response.data[0].get("annual_revenue"),
            "businessModel": response.data[0].get("business_model"),
            "priceRange": response.data[0].get("marketing_budget"),
            "description": response.data[0].get("main_products", [None])[0] if response.data[0].get("main_products") else None,
            "uniqueValue": response.data[0].get("main_products", [None, None])[1] if response.data[0].get("main_products") and len(response.data[0].get("main_products", [])) > 1 else None
        },
        created_at=response.data[0]["created_at"],
        updated_at=response.data[0]["updated_at"]
    )

@router.put("/campaign")
async def update_campaign_context(
    update: CampaignContextUpdate,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Update campaign-specific context or agent learnings"""
    supabase = get_supabase_client()
    
    # Verify user has access to campaign
    campaign = supabase.table("campaigns").select("id, org_id").eq("id", update.campaign_id).single().execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
    if not user_response.data or user_response.data.get("org_id") != campaign.data["org_id"]:
        raise HTTPException(status_code=403, detail="Access denied to this campaign")
    
    # Prepare update data
    update_data = {}
    if update.campaign_context is not None:
        update_data["campaign_context"] = update.campaign_context
    if update.agent_learnings is not None:
        update_data["agent_learnings"] = update.agent_learnings
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No context to update")
    
    # Update campaign
    response = supabase.table("campaigns").update(update_data).eq("id", update.campaign_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to update campaign context")
    
    return {"success": True, "campaign_id": update.campaign_id}

@router.post("/history")
async def save_context_history(
    history: ContextHistoryInput,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Save extracted context from agent sessions for later approval"""
    supabase = get_supabase_client()
    
    # Verify session belongs to user
    session = supabase.table("agent_conversations").select("user_id").eq("session_id", history.session_id).single().execute()
    if not session.data or session.data["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied to this session")
    
    # Save to history
    response = supabase.table("agent_conversations").insert({
        "session_id": history.session_id,
        "agent_type": history.agent_type,
        "extracted_context": history.extracted_context,
        "confidence_score": history.confidence_score,
        "user_approved": history.user_approved
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to save context history")
    
    return {"success": True, "history_id": response.data[0]["id"]}

@router.put("/history/{history_id}/approve")
async def approve_context_history(
    history_id: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Approve extracted context and merge into organization context"""
    supabase = get_supabase_client()
    
    # Get history entry
    history = supabase.table("agent_context_history").select("*, agent_sessions(user_id, campaign_id)").eq("id", history_id).single().execute()
    if not history.data:
        raise HTTPException(status_code=404, detail="Context history not found")
    
    # Verify access
    if history.data["agent_sessions"]["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update approval status
    supabase.table("agent_context_history").update({
        "user_approved": True
    }).eq("id", history_id).execute()
    
    # Get campaign and organization
    campaign_id = history.data["agent_sessions"]["campaign_id"]
    if campaign_id:
        campaign = supabase.table("campaigns").select("organization_id").eq("id", campaign_id).single().execute()
        if campaign.data:
            # Merge into organization context
            org_id = campaign.data["org_id"]
            org_context = supabase.table("organization_context").select("business_info").eq("organization_id", org_id).single().execute()
            
            if org_context.data:
                # Merge extracted context into existing
                merged_context = {**org_context.data["business_info"], **history.data["extracted_context"]}
                supabase.table("organization_context").update({
                    "business_info": merged_context,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("organization_id", org_id).execute()
            else:
                # Create new organization context
                supabase.table("organization_context").insert({
                    "organization_id": org_id,
                    "business_info": history.data["extracted_context"]
                }).execute()
    
    return {"success": True, "approved": True}

@router.get("/campaign/{campaign_id}/full-context")
async def get_full_campaign_context(
    campaign_id: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Get combined organization and campaign context for use in agent prompts"""
    supabase = get_supabase_client()
    
    # Get campaign with organization context
    campaign = supabase.table("campaigns").select(
        "id, name, campaign_context, agent_learnings, organization_id"
    ).eq("id", campaign_id).single().execute()
    
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Verify access
    user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
    if not user_response.data or user_response.data.get("org_id") != campaign.data["org_id"]:
        raise HTTPException(status_code=403, detail="Access denied to this campaign")
    
    # Get organization context
    org_context = supabase.table("organization_context").select("business_info").eq(
        "organization_id", campaign.data["org_id"]
    ).single().execute()
    
    # Combine contexts (campaign overrides org)
    full_context = {
        "organization": org_context.data["business_info"] if org_context.data else {},
        "campaign": campaign.data.get("campaign_context", {}),
        "agent_learnings": campaign.data.get("agent_learnings", {}),
        "campaign_name": campaign.data["name"]
    }
    
    return full_context

@router.post("/extract-from-conversation")
async def extract_context_from_conversation(
    extraction: ContextExtractionInput,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Extract business context from conversation text using LLM"""
    
    # Verify user has access to session
    supabase = get_supabase_client()
    session = supabase.table("agent_conversations").select("user_id").eq("id", extraction.session_id).single().execute()
    if not session.data or session.data["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied to this session")
    
    try:
        # Extract context using intelligence service
        history_id = await context_intelligence.update_context_from_session(
            extraction.session_id,
            extraction.agent_type,
            extraction.conversation_text
        )
        
        if history_id:
            return {
                "success": True,
                "history_id": history_id,
                "message": "Context extracted and saved for approval"
            }
        else:
            return {
                "success": False,
                "message": "No significant context extracted or confidence too low"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Context extraction failed: {str(e)}")

@router.get("/pending-approvals")
async def get_pending_context_approvals(
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """Get all pending context approvals for the user"""
    supabase = get_supabase_client()
    
    try:
        # Get pending context history for user's sessions
        # Note: agent_context_history might not have direct user association
        # For now, return empty array since this feature is not fully implemented
        return []
        
        # TODO: Implement proper pending approvals when agent_context_history is properly linked
        # response = supabase.table("agent_context_history").select(
        #     "id, agent_type, extracted_context, confidence_score, created_at"
        # ).eq("user_approved", False).execute()
        # return response.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pending approvals: {str(e)}")

@router.post("/enhance-prompt")
async def enhance_agent_prompt(
    request: dict,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Enhance an agent prompt with business context"""
    
    base_prompt = request.get("prompt", "")
    campaign_id = request.get("campaign_id")
    agent_type = request.get("agent_type", "strategy")
    
    if not campaign_id:
        raise HTTPException(status_code=400, detail="campaign_id is required")
    
    # Verify access to campaign
    supabase = get_supabase_client()
    campaign = supabase.table("campaigns").select("organization_id").eq("id", campaign_id).single().execute()
    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
    if not user_response.data or user_response.data.get("org_id") != campaign.data["org_id"]:
        raise HTTPException(status_code=403, detail="Access denied to this campaign")
    
    try:
        enhanced_prompt = await context_intelligence.enhance_cross_agent_prompt(
            base_prompt,
            campaign_id,
            agent_type
        )
        
        return {
            "original_prompt": base_prompt,
            "enhanced_prompt": enhanced_prompt,
            "context_applied": enhanced_prompt != base_prompt
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prompt enhancement failed: {str(e)}")