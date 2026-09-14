"""
Data transfer objects for chat API endpoints
"""
from pydantic import BaseModel, Field, constr
from typing import List, Dict, Any, Optional

class UploadedFileInfo(BaseModel):
    """Metadata for an uploaded file"""
    gemini_uri: str = Field(..., description="Gemini Files API URI")
    gemini_name: str = Field(..., description="Gemini file name (files/xxx)")
    original_filename: str = Field(..., description="Original filename")
    mime_type: str = Field(..., description="MIME type")
    size_bytes: int = Field(..., description="File size in bytes")
    uploaded_at: str = Field(..., description="ISO timestamp of upload")
    expires_at: str = Field(..., description="ISO timestamp when file expires (48h)")

class FileUploadResponse(BaseModel):
    """Response from file upload endpoint"""
    success: bool
    file: Optional[UploadedFileInfo] = None
    error: Optional[str] = None

class ChatRequest(BaseModel):
    """Request model for chat endpoints with input validation"""
    user_id: str = Field(..., max_length=100)
    session_id: Optional[str] = Field(None, max_length=100)
    message: str = Field(..., min_length=1, max_length=50000, description="User message (max 50,000 chars)")
    agent_type: str = Field(..., max_length=50, description="Agent type identifier")
    context: Optional[Dict[str, Any]] = None
    # Multi-tenant context (Nov 12, 2025: Added to support agency client scoping)
    client_id: Optional[str] = Field(None, max_length=100, description="Client ID for agency users")
    campaign_id: Optional[str] = Field(None, max_length=100, description="Campaign ID for campaign-specific context")
    # NEW: File info to include in this message
    file_info: Optional[List[UploadedFileInfo]] = Field(
        None,
        description="List of uploaded file info objects to include as context"
    )

class ChatResponse(BaseModel):
    """Response model for chat endpoints"""
    session_id: str
    message: str
    structured_data: Optional[Dict[str, Any]] = None
    function_calls: Optional[List[Dict[str, Any]]] = None
    context: Optional[Dict[str, Any]] = None
    timestamp: str
    error: Optional[str] = None