"""
Authentication and user models.
"""
from typing import Optional
from pydantic import BaseModel
from uuid import UUID


class User(BaseModel):
    """User model for authenticated users"""
    id: str
    email: str
    org_id: Optional[str] = None
    role: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True