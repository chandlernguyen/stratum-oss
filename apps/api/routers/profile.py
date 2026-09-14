from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.database import get_supabase_client
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class ProfileUpdateRequest(BaseModel):
    """Request model for updating user profile"""
    display_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    notification_preferences: Optional[Dict[str, bool]] = None


class ProfileResponse(BaseModel):
    """Response model for user profile"""
    email: str
    user_id: str
    organization_id: str
    organization_name: str
    organization_type: str
    role: str
    display_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    created_at: str
    notification_preferences: Optional[Dict[str, bool]] = None
    metrics: Optional[Dict[str, Any]] = None


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user's profile information"""
    try:
        supabase = get_supabase_client()
        
        # Get organization details
        org_response = supabase.table('organizations').select('*').eq(
            'id', current_user.get('organization_id')
        ).single().execute()
        
        if not org_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        organization = org_response.data
        
        # Get user metadata
        user_metadata = current_user.get('user_metadata', {})
        
        # Get role-specific metrics
        metrics = await get_user_metrics(current_user, organization['type'])
        
        return ProfileResponse(
            email=current_user.get('email'),
            user_id=current_user.get('sub'),
            organization_id=current_user.get('organization_id'),
            organization_name=organization['name'],
            organization_type=organization['type'],
            role=current_user.get('user_role', 'sme_owner'),
            display_name=user_metadata.get('full_name'),
            phone=user_metadata.get('phone'),
            bio=user_metadata.get('bio'),
            website=organization.get('website'),
            created_at=current_user.get('iat', ''),
            notification_preferences=user_metadata.get('notification_preferences'),
            metrics=metrics
        )
    except Exception as e:
        logger.error(f"Error fetching profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch profile"
        )


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update current user's profile information"""
    try:
        supabase = get_supabase_client()
        
        # Build update metadata
        update_data = {}
        if request.display_name is not None:
            update_data['full_name'] = request.display_name
        if request.phone is not None:
            update_data['phone'] = request.phone
        if request.bio is not None:
            update_data['bio'] = request.bio
        if request.notification_preferences is not None:
            update_data['notification_preferences'] = request.notification_preferences
        
        # Update user metadata in auth
        if update_data:
            supabase.auth.update_user({
                'data': update_data
            })
        
        # Update organization website if provided and user has permission
        if request.website is not None and current_user.get('user_role') in ['sme_owner', 'agency_admin']:
            supabase.table('organizations').update({
                'website': request.website
            }).eq('id', current_user.get('organization_id')).execute()
        
        # Return updated profile
        return await get_profile(current_user)
        
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )


async def get_user_metrics(user: Dict[str, Any], org_type: str) -> Dict[str, Any]:
    """Get role and organization type specific metrics"""
    supabase = get_supabase_client()
    metrics = {}
    
    try:
        if org_type == 'agency':
            if user.get('user_role') in ['agency_admin', 'account_manager']:
                # Get agency-specific metrics
                clients_response = supabase.table('clients').select('id').eq(
                    'organization_id', user.get('organization_id')
                ).execute()
                
                campaigns_response = supabase.table('campaigns').select('id, status').eq(
                    'organization_id', user.get('organization_id')
                ).execute()
                
                metrics['active_clients'] = len(clients_response.data or [])
                metrics['total_campaigns'] = len(campaigns_response.data or [])
                metrics['active_campaigns'] = len([
                    c for c in (campaigns_response.data or []) 
                    if c.get('status') == 'active'
                ])
                # Placeholder for revenue - would need actual billing data
                metrics['monthly_revenue'] = 45000
                
        elif org_type == 'sme':
            # Get SME-specific metrics
            campaigns_response = supabase.table('campaigns').select('id, status').eq(
                'organization_id', user.get('organization_id')
            ).execute()
            
            metrics['total_campaigns'] = len(campaigns_response.data or [])
            metrics['active_campaigns'] = len([
                c for c in (campaigns_response.data or []) 
                if c.get('status') == 'active'
            ])
            # Placeholder metrics - would need actual analytics data
            metrics['campaign_roi'] = 87
            metrics['leads_generated'] = 2400
            metrics['conversion_rate'] = 15
            
    except Exception as e:
        logger.warning(f"Error fetching user metrics: {str(e)}")
        # Return empty metrics on error rather than failing the whole request
        
    return metrics


@router.post("/profile/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Change user's password"""
    try:
        supabase = get_supabase_client()
        
        # Verify old password first
        try:
            supabase.auth.sign_in_with_password({
                'email': current_user.get('email'),
                'password': old_password
            })
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Update password
        supabase.auth.update_user({
            'password': new_password
        })
        
        return {"message": "Password updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )