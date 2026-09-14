"""
Common dependencies for FastAPI endpoints.
"""
from typing import Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from apps.api.auth.supabase_auth import get_current_user as auth_get_current_user
from apps.api.utils.database import get_supabase_client
from apps.api.models.auth import User

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Dependency to get the current authenticated user.
    Wraps the auth module's get_current_user function.
    """
    user_dict = await auth_get_current_user(token)
    
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Convert dict to User model
    return User(
        id=user_dict.get("id"),
        email=user_dict.get("email"),
        role=user_dict.get("role"),
        org_id=user_dict.get("org_id")
    )

def get_supabase_client_dependency():
    """
    Dependency to get Supabase client.
    """
    return get_supabase_client()