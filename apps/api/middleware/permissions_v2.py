"""
Modern Permission Middleware for Multi-tenant RBAC.
Uses the comprehensive role & permission system with granular permissions.
"""
from typing import Optional, List, Callable
from functools import wraps
from fastapi import HTTPException, status
from supabase import Client
from uuid import UUID

from apps.api.dependencies import get_current_user, get_supabase_client
from apps.api.utils.auth_database import get_service_role_client


class PermissionService:
    """Service for checking user permissions using the new granular system"""
    
    def __init__(self, supabase: Client = None):
        # Use service role client for permission checks
        self.supabase = supabase if supabase else get_service_role_client()
    
    async def has_permission(
        self, 
        user_id: str, 
        org_id: str, 
        permission: str, 
        client_id: Optional[str] = None
    ) -> bool:
        """Check if user has a specific permission using the database function"""
        try:
            # Call the database function user_has_permission
            response = self.supabase.rpc(
                'user_has_permission', 
                {
                    'p_user_id': user_id,
                    'p_org_id': org_id,
                    'p_permission_name': permission,  # Fixed: was p_permission
                    'p_client_id': client_id
                }
            ).execute()
            
            return response.data if response.data else False
        except Exception as e:
            print(f"Permission check failed: {e}")
            return False
    
    async def get_user_permissions(
        self, 
        user_id: str, 
        org_id: str, 
        client_id: Optional[str] = None
    ) -> List[str]:
        """Get all permissions for a user in a specific context"""
        try:
            # Get from cache first
            cache_response = self.supabase.table("user_permission_cache").select(
                "permissions"
            ).eq("user_id", user_id).eq("org_id", org_id).eq("client_id", client_id).execute()
            
            if cache_response.data and len(cache_response.data) > 0:
                cache_entry = cache_response.data[0]
                return cache_entry.get("permissions", [])
            
            # If not in cache, compute permissions
            roles_response = self.supabase.table("user_role_assignments").select(
                "role_id, roles(name), client_id"
            ).eq("user_id", user_id).eq("org_id", org_id).execute()
            
            if not roles_response.data:
                return []
            
            all_permissions = set()
            for role_assignment in roles_response.data:
                # Get permissions for this role
                role_id = role_assignment["role_id"]
                perms_response = self.supabase.table("role_permissions").select(
                    "permissions(name)"
                ).eq("role_id", role_id).execute()
                
                if perms_response.data:
                    for perm in perms_response.data:
                        if perm.get("permissions"):
                            all_permissions.add(perm["permissions"]["name"])
            
            return list(all_permissions)
            
        except Exception as e:
            print(f"Error getting user permissions: {e}")
            return []
    
    async def get_user_roles(
        self, 
        user_id: str, 
        org_id: str, 
        client_id: Optional[str] = None
    ) -> List[dict]:
        """Get all role assignments for a user in a specific context"""
        try:
            query = self.supabase.table("user_role_assignments").select(
                "*, roles(name, description, org_type)"
            ).eq("user_id", user_id).eq("org_id", org_id)
            
            if client_id:
                query = query.eq("client_id", client_id)
            else:
                query = query.is_("client_id", "null")
                
            response = query.execute()
            return response.data if response.data else []
            
        except Exception as e:
            print(f"Error getting user roles: {e}")
            return []


def require_permission(permission: str):
    """
    Decorator to check if user has a specific permission.
    
    Usage:
        @router.get("/campaigns")
        @require_permission("campaigns.campaign.read")
        async def list_campaigns():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get dependencies from kwargs
            current_user = kwargs.get("current_user")
            supabase = kwargs.get("supabase")
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated"
                )
            
            if not supabase:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database connection not available"
                )
            
            # Get user's organization
            # Handle both dict and object formats for current_user
            user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
            user_response = supabase.table("users").select("org_id").eq(
                "id", user_id
            ).single().execute()
            
            if not user_response.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User organization not found"
                )
            
            org_id = user_response.data.get("org_id")
            client_id = kwargs.get("client_id")  # Optional client context
            
            # Check permission
            permission_service = PermissionService(supabase)
            has_access = await permission_service.has_permission(
                user_id,
                org_id,
                permission,
                client_id
            )
            
            if not has_access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing permission: {permission}"
                )
            
            # Don't inject extra kwargs - causes FastAPI schema issues
            # Endpoints should fetch org_id themselves if needed
            # kwargs["user_org_id"] = org_id
            # kwargs["user_permissions"] = await permission_service.get_user_permissions(
            #     user_id, org_id, client_id
            # )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_any_permission(*permissions: str):
    """
    Decorator to check if user has ANY of the specified permissions.
    
    Usage:
        @router.get("/campaigns")
        @require_any_permission("campaigns.campaign.read", "campaigns.campaign.edit")
        async def list_campaigns():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            supabase = kwargs.get("supabase")
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated"
                )
            
            # Get user's organization
            # Handle both dict and object formats for current_user
            user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
            user_response = supabase.table("users").select("org_id").eq(
                "id", user_id
            ).single().execute()
            
            if not user_response.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User organization not found"
                )
            
            org_id = user_response.data.get("org_id")
            client_id = kwargs.get("client_id")
            
            # Check if user has any of the required permissions
            permission_service = PermissionService(supabase)
            has_any_permission = False
            
            for permission in permissions:
                user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
                if await permission_service.has_permission(
                    user_id, org_id, permission, client_id
                ):
                    has_any_permission = True
                    break
            
            if not has_any_permission:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing any of permissions: {', '.join(permissions)}"
                )
            
            # Don't inject user_org_id - causes FastAPI schema issues
            # kwargs["user_org_id"] = org_id
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_client_permission(permission: str):
    """
    Decorator for client-specific permission checks.
    Expects client_id in the path parameters.
    
    Usage:
        @router.get("/clients/{client_id}/campaigns")
        @require_client_permission("campaigns.campaign.read")
        async def list_client_campaigns(client_id: str):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            supabase = kwargs.get("supabase")
            client_id = kwargs.get("client_id")
            
            if not all([current_user, supabase, client_id]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing required parameters"
                )
            
            # Get user's organization
            # Handle both dict and object formats for current_user
            user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
            user_response = supabase.table("users").select("org_id").eq(
                "id", user_id
            ).single().execute()
            
            if not user_response.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User organization not found"
                )
            
            org_id = user_response.data.get("org_id")
            
            # Check client-specific permission
            permission_service = PermissionService(supabase)
            has_access = await permission_service.has_permission(
                user_id,
                org_id,
                permission,
                client_id
            )
            
            if not has_access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"No access to client or missing permission: {permission}"
                )
            
            # Don't inject user_org_id - causes FastAPI schema issues
            # kwargs["user_org_id"] = org_id
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


# Convenience decorators for common permission patterns
def require_campaign_read():
    return require_permission("campaigns.campaign.read")

def require_campaign_write():
    return require_any_permission("campaigns.campaign.create", "campaigns.campaign.edit")

def require_admin():
    return require_any_permission("organization.settings.write", "team.manage")

def require_agent_access(agent_name: str):
    return require_permission(f"agents.{agent_name}.execute")