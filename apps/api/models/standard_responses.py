"""
Standard Response Models for Consistent API Responses
Provides unified response format across all endpoints.
"""
from typing import Optional, Any, Dict, List, Union
from pydantic import BaseModel, Field
from datetime import datetime


class StandardResponse(BaseModel):
    """Standard response format for single resource operations."""
    success: bool = Field(True, description="Whether the operation was successful")
    data: Optional[Any] = Field(None, description="Response data (single object or primitive)")
    message: Optional[str] = Field(None, description="User-friendly message about the operation")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class StandardListResponse(BaseModel):
    """Standard response format for list operations with pagination."""
    success: bool = Field(True, description="Whether the operation was successful")
    data: List[Any] = Field(default_factory=list, description="List of resources")
    message: Optional[str] = Field(None, description="User-friendly message about the operation")
    metadata: Dict[str, Any] = Field(
        default_factory=lambda: {
            "total": 0,
            "limit": 50,
            "offset": 0,
            "has_more": False
        },
        description="Pagination and list metadata"
    )


class StandardErrorResponse(BaseModel):
    """Standard error response format."""
    success: bool = Field(False, description="Always false for errors")
    error: Dict[str, Any] = Field(
        ...,
        description="Error details",
        example={
            "code": "RESOURCE_NOT_FOUND",
            "message": "The requested resource was not found",
            "details": {"resource_id": "123e4567-e89b-12d3-a456-426614174000"}
        }
    )


class BulkOperationResponse(BaseModel):
    """Response format for bulk operations."""
    success: bool = Field(True, description="Whether the operation was successful")
    data: Dict[str, Any] = Field(
        ...,
        description="Bulk operation results",
        example={
            "total": 10,
            "succeeded": 8,
            "failed": 2,
            "succeeded_ids": ["id1", "id2"],
            "failed_ids": ["id3", "id4"],
            "errors": [{"id": "id3", "error": "Permission denied"}]
        }
    )
    message: str = Field(..., description="Summary of the bulk operation")


class ExportResponse(BaseModel):
    """Response format for export operations."""
    success: bool = Field(True, description="Whether the export was successful")
    data: Union[List[Dict], str] = Field(
        ...,
        description="Exported data (JSON array or CSV string)"
    )
    message: str = Field(..., description="Export summary")
    metadata: Dict[str, Any] = Field(
        default_factory=lambda: {
            "format": "json",
            "count": 0,
            "exported_at": datetime.utcnow().isoformat()
        },
        description="Export metadata"
    )


class ArchiveResponse(BaseModel):
    """Response format for archive operations."""
    success: bool = Field(True, description="Whether the archive was successful")
    data: Dict[str, Any] = Field(
        ...,
        description="Archive details",
        example={
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "archived_at": "2025-09-14T10:00:00Z",
            "archived_by": "user-id",
            "archive_reason": "No longer needed"
        }
    )
    message: str = Field(
        default="Resource archived successfully",
        description="Archive confirmation message"
    )


class RestoreResponse(BaseModel):
    """Response format for restore operations."""
    success: bool = Field(True, description="Whether the restore was successful")
    data: Any = Field(..., description="The restored resource")
    message: str = Field(
        default="Resource restored successfully",
        description="Restore confirmation message"
    )


class DuplicateResponse(BaseModel):
    """Response format for duplicate operations."""
    success: bool = Field(True, description="Whether the duplication was successful")
    data: Any = Field(..., description="The newly created duplicate resource")
    message: str = Field(
        default="Resource duplicated successfully",
        description="Duplication confirmation message"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=lambda: {
            "original_id": None,
            "duplicate_id": None,
            "duplicated_at": datetime.utcnow().isoformat()
        },
        description="Duplication metadata"
    )


class HealthCheckResponse(BaseModel):
    """Response format for health check endpoints."""
    success: bool = Field(True, description="Service health status")
    data: Dict[str, Any] = Field(
        default_factory=lambda: {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0"
        },
        description="Health check data"
    )
    message: str = Field(
        default="Service is healthy",
        description="Health status message"
    )


# Error code constants for consistency
class ErrorCodes:
    """Standard error codes for consistent error handling."""

    # Authentication & Authorization
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"

    # Resource errors
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    RESOURCE_LOCKED = "RESOURCE_LOCKED"

    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    INVALID_FORMAT = "INVALID_FORMAT"

    # Business logic errors
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED"
    DEPENDENCY_ERROR = "DEPENDENCY_ERROR"

    # System errors
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"

    # Archive/Restore specific
    ALREADY_ARCHIVED = "ALREADY_ARCHIVED"
    NOT_ARCHIVED = "NOT_ARCHIVED"
    CANNOT_RESTORE = "CANNOT_RESTORE"

    # Bulk operation errors
    PARTIAL_FAILURE = "PARTIAL_FAILURE"
    BULK_OPERATION_FAILED = "BULK_OPERATION_FAILED"


def create_error_response(
    code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    status_code: int = 400
) -> Dict[str, Any]:
    """
    Helper function to create standardized error responses.

    Args:
        code: Error code from ErrorCodes
        message: User-friendly error message
        details: Additional error details
        status_code: HTTP status code

    Returns:
        Dictionary formatted for HTTPException detail
    """
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat()
        }
    }


def create_success_response(
    data: Any,
    message: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> StandardResponse:
    """
    Helper function to create standardized success responses.

    Args:
        data: Response data
        message: Optional success message
        metadata: Optional metadata

    Returns:
        StandardResponse object
    """
    return StandardResponse(
        success=True,
        data=data,
        message=message,
        metadata=metadata
    )