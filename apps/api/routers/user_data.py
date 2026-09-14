"""
User Data Management Router
Handles GDPR-compliant data export and account deletion
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, Any
import logging
from datetime import datetime

from ..auth.supabase_auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/users", tags=["user-data"])


@router.get("/export-data")
async def export_user_data(user: Dict[str, Any] = Depends(get_current_user)) -> JSONResponse:
    """
    Export all user data in GDPR-compliant format.
    Returns a comprehensive JSON file with all user-related data across all tables.
    """
    try:
        from supabase import create_client
        import os

        user_id = user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found in token")

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise HTTPException(status_code=500, detail="Database configuration error")

        supabase = create_client(supabase_url, supabase_key)

        # Initialize export data structure
        export_data = {
            "export_date": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "data": {}
        }

        # 1. User Profile Data
        user_response = supabase.table("users").select("*").eq("id", user_id).execute()
        if user_response.data:
            export_data["data"]["profile"] = user_response.data[0]

        # 2. Organization Data
        org_response = supabase.table("organizations").select("*").eq("created_by", user_id).execute()
        export_data["data"]["organizations"] = org_response.data

        # 3. Campaigns
        campaigns_response = supabase.table("campaigns").select("*").eq("created_by", user_id).execute()
        export_data["data"]["campaigns"] = campaigns_response.data

        # 4. Agent Conversations
        conversations_response = supabase.table("agent_conversations").select("*").eq("user_id", user_id).execute()
        export_data["data"]["agent_conversations"] = conversations_response.data

        # 5. Agent Messages
        messages_response = supabase.table("agent_messages").select("*").eq("created_by", user_id).execute()
        export_data["data"]["agent_messages"] = messages_response.data

        # 6. Agent Outputs
        outputs_response = supabase.table("agent_outputs").select("*").eq("created_by", user_id).execute()
        export_data["data"]["agent_outputs"] = outputs_response.data

        # 7. Documents
        documents_response = supabase.table("documents").select("*").eq("user_id", user_id).execute()
        export_data["data"]["documents"] = documents_response.data

        # 8. Personas (nuclear migration: from agent_outputs table)
        personas_response = supabase.table("agent_outputs").select("*")\
            .eq("created_by", user_id)\
            .eq("agent_type", "persona")\
            .eq("output_type", "persona")\
            .execute()

        # Extract persona data from JSONB for user export
        personas = []
        if personas_response.data:
            for item in personas_response.data:
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
                    'jobs_to_be_done': content.get('jobs_to_be_done', []),
                    'decision_criteria': content.get('decision_criteria', {}),
                    'objections': content.get('objections', []),
                    'customer_status': content.get('customer_status'),
                    'background_story': content.get('background_story'),
                    'key_quote': content.get('key_quote'),
                    'is_primary': metadata.get('is_primary', False),
                    'created_at': item.get('created_at'),
                    'updated_at': item.get('updated_at'),
                }
                personas.append(persona)
        export_data["data"]["personas"] = personas

        # 9. Marketing Strategies
        strategies_response = supabase.table("marketing_strategies").select("*").eq("created_by", user_id).execute()
        export_data["data"]["marketing_strategies"] = strategies_response.data

        # 10. Brand Guidelines
        brand_response = supabase.table("brand_guidelines").select("*").eq("created_by", user_id).execute()
        export_data["data"]["brand_guidelines"] = brand_response.data

        # 11. Core Business Data
        business_response = supabase.table("core_business_data").select("*").eq("created_by", user_id).execute()
        export_data["data"]["business_data"] = business_response.data

        # 12. Usage Tracking
        usage_response = supabase.table("usage_tracking").select("*").eq("user_id", user_id).execute()
        export_data["data"]["usage_tracking"] = usage_response.data

        # 13. User Role Assignments
        roles_response = supabase.table("user_role_assignments").select("*").eq("user_id", user_id).execute()
        export_data["data"]["role_assignments"] = roles_response.data

        # 14. Clients (for agency users)
        clients_response = supabase.table("clients").select("*").eq("created_by", user_id).execute()
        export_data["data"]["clients"] = clients_response.data

        # Add metadata
        export_data["metadata"] = {
            "total_campaigns": len(export_data["data"]["campaigns"]),
            "total_conversations": len(export_data["data"]["agent_conversations"]),
            "total_messages": len(export_data["data"]["agent_messages"]),
            "total_outputs": len(export_data["data"]["agent_outputs"]),
            "total_documents": len(export_data["data"]["documents"]),
            "total_personas": len(export_data["data"]["personas"]),
        }

        logger.info(f"Data export completed for user {user_id}")

        # Return as downloadable JSON
        return JSONResponse(
            content=export_data,
            headers={
                "Content-Disposition": f"attachment; filename=user_data_export_{user_id}_{datetime.utcnow().strftime('%Y%m%d')}.json"
            }
        )

    except Exception as e:
        logger.error(f"Error exporting user data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to export user data: {str(e)}")


@router.delete("/account")
async def delete_user_account(
    confirmation: Dict[str, str],
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Soft delete user account.
    Requires confirmation with reason.
    Sets archived_at timestamp and archived_by user_id.
    """
    try:
        from supabase import create_client
        import os

        user_id = user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found in token")

        # Validate confirmation
        if not confirmation.get("confirm") == "DELETE":
            raise HTTPException(
                status_code=400,
                detail="Confirmation required. Send {'confirm': 'DELETE', 'reason': 'your reason'}"
            )

        reason = confirmation.get("reason", "User requested account deletion")

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise HTTPException(status_code=500, detail="Database configuration error")

        supabase = create_client(supabase_url, supabase_key)

        # Soft delete user by setting archived fields
        update_response = supabase.table("users").update({
            "archived_at": datetime.utcnow().isoformat(),
            "archived_by": user_id,
            "archive_reason": reason
        }).eq("id", user_id).execute()

        if not update_response.data:
            raise HTTPException(status_code=404, detail="User not found")

        logger.info(f"User account soft deleted: {user_id}, reason: {reason}")

        return {
            "success": True,
            "message": "Account scheduled for deletion",
            "archived_at": datetime.utcnow().isoformat(),
            "note": "Your account has been archived and will be permanently deleted after 30 days. Contact support to restore your account during this period."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user account: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")
