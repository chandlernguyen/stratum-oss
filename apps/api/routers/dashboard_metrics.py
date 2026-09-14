from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional
from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.database import get_supabase_client
import logging
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

class UserMetrics(BaseModel):
    campaignCount: int
    documentCount: int
    strategySessionCount: int
    personaCount: int
    lastActiveDate: Optional[datetime]
    totalAIInteractions: int
    organizationType: str
    clientCount: int
    teamMemberCount: int

@router.get("/metrics", response_model=UserMetrics)
async def get_dashboard_metrics(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get dashboard metrics for the current user's organization"""
    try:
        supabase = get_supabase_client()
        
        # Get org_id from users table
        user_response = supabase.table("users").select("org_id").eq("id", current_user["id"]).single().execute()
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )
        
        org_id = user_response.data.get('org_id')
        if not org_id:
            # Return empty metrics for users without organization
            return UserMetrics(
                campaignCount=0,
                documentCount=0,
                strategySessionCount=0,
                personaCount=0,
                lastActiveDate=None,
                totalAIInteractions=0,
                organizationType='SME',
                clientCount=0,
                teamMemberCount=0,
            )

        # 1. campaignCount
        campaigns_response = supabase.table('campaigns').select('id', count='exact').eq('org_id', org_id).execute()
        campaignCount = campaigns_response.count

        # 2. documentCount
        documents_response = supabase.table('documents').select('id', count='exact').eq('org_id', org_id).execute()
        documentCount = documents_response.count

        # 🚀 NUCLEAR: 3. strategySessionCount from agent_outputs table
        strategy_sessions_response = supabase.table('agent_outputs').select('id', count='exact').eq('org_id', org_id).eq('agent_type', 'strategy').execute()
        strategySessionCount = strategy_sessions_response.count

        # 🚀 NUCLEAR: 4. personaCount from agent_outputs table with persona agent_type
        persona_response = supabase.table('agent_outputs').select('id', count='exact').eq('org_id', org_id).eq('agent_type', 'persona').execute()
        personaCount = persona_response.count

        # 5. lastActiveDate
        user_activity_response = supabase.table('users').select('updated_at').eq('id', current_user["id"]).single().execute()
        lastActiveDate = user_activity_response.data['updated_at'] if user_activity_response.data else None

        # 6. totalAIInteractions
        # This requires joining agent_conversations and agent_messages, which is complex with supabase-py.
        # A simpler approach is to count messages for conversations in the org.
        conversations_response = supabase.table('agent_conversations').select('id').eq('org_id', org_id).execute()
        conversation_ids = [conv['id'] for conv in conversations_response.data]
        if conversation_ids:
            messages_response = supabase.table('agent_messages').select('id', count='exact').in_('conversation_id', conversation_ids).execute()
            totalAIInteractions = messages_response.count
        else:
            totalAIInteractions = 0

        # 7. organizationType
        org_response = supabase.table('organizations').select('type').eq('id', org_id).single().execute()
        organizationType = org_response.data['type'] if org_response.data else 'SME'

        # 8. clientCount
        clientCount = 0
        if organizationType == 'AGENCY':
            clients_response = supabase.table('clients').select('id', count='exact').eq('org_id', org_id).execute()
            clientCount = clients_response.count

        # 9. teamMemberCount
        users_response = supabase.table('users').select('id', count='exact').eq('org_id', org_id).execute()
        teamMemberCount = users_response.count

        return UserMetrics(
            campaignCount=campaignCount,
            documentCount=documentCount,
            strategySessionCount=strategySessionCount,
            personaCount=personaCount,
            lastActiveDate=lastActiveDate,
            totalAIInteractions=totalAIInteractions,
            organizationType=organizationType,
            clientCount=clientCount,
            teamMemberCount=teamMemberCount,
        )

    except Exception as e:
        logger.error(f"Error fetching dashboard metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard metrics"
        )
