"""
Documents Router v2 - Using BaseRouter for standardized CRUD operations
Handles document uploads, RAG search, and document management
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import Depends, HTTPException, status, Query, UploadFile, File, Form
from uuid import UUID
from pydantic import BaseModel, Field
import json

from apps.api.routers.base import BaseRouter
from apps.api.auth.supabase_auth import get_current_user
from apps.api.utils.auth_database import get_service_role_client
from apps.api.models.standard_responses import StandardResponse
from apps.api.services.rag_service import rag_service
from apps.api.utils.database import (
    get_rag_documents,
    get_document_stats,
    get_search_analytics
)
import logging

logger = logging.getLogger(__name__)


# Pydantic Models for Documents
class DocumentMetadata(BaseModel):
    """Document metadata"""
    file_type: Optional[str] = Field(None, description="MIME type of the document")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    page_count: Optional[int] = Field(None, description="Number of pages (for PDFs)")
    word_count: Optional[int] = Field(None, description="Word count")
    language: Optional[str] = Field(None, description="Document language")
    encoding: Optional[str] = Field(None, description="Text encoding")


class Document(BaseModel):
    """Complete document model"""
    id: Optional[UUID] = None
    org_id: UUID
    client_id: Optional[UUID] = None
    campaign_id: Optional[UUID] = None
    persona_id: Optional[UUID] = None
    strategy_session_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    document_type: Optional[str] = None
    gcs_uri: Optional[str] = None
    file_name: Optional[str] = None
    metadata: Optional[DocumentMetadata] = Field(default_factory=DocumentMetadata)
    tags: List[str] = Field(default=[], description="Document tags")
    visibility: str = Field(default="organization", description="Visibility level")
    chunk_count: Optional[int] = Field(None, description="Number of chunks created")
    vector_count: Optional[int] = Field(None, description="Number of vectors indexed")
    processing_status: Optional[str] = Field(None, description="Processing status")
    processing_error: Optional[str] = Field(None, description="Processing error if any")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None


class DocumentCreate(BaseModel):
    """Model for creating a document (metadata only, file uploaded separately)"""
    client_id: Optional[UUID] = None
    campaign_id: Optional[UUID] = None
    persona_id: Optional[UUID] = None
    strategy_session_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    document_type: Optional[str] = None
    tags: Optional[List[str]] = None
    visibility: str = Field(default="organization")


class DocumentUpdate(BaseModel):
    """Model for updating a document"""
    title: Optional[str] = None
    description: Optional[str] = None
    document_type: Optional[str] = None
    tags: Optional[List[str]] = None
    visibility: Optional[str] = None
    client_id: Optional[UUID] = None
    campaign_id: Optional[UUID] = None
    persona_id: Optional[UUID] = None


class SearchRequest(BaseModel):
    """Search request model"""
    query: str = Field(..., description="Search query")
    document_type: Optional[str] = Field(None, description="Filter by document type")
    campaign_id: Optional[UUID] = Field(None, description="Filter by campaign")
    persona_id: Optional[UUID] = Field(None, description="Filter by persona")
    client_id: Optional[UUID] = Field(None, description="Filter by client")
    limit: int = Field(10, ge=1, le=50, description="Number of results to return")
    include_chunks: bool = Field(False, description="Include document chunks in results")


class SearchResult(BaseModel):
    """Search result model"""
    id: str
    uri: Optional[str] = None
    title: str
    snippet: str
    relevance_score: float
    document_type: Optional[str] = None
    campaign_name: Optional[str] = None
    chunks: Optional[List[Dict[str, Any]]] = None


class DocumentsRouter(BaseRouter):
    """
    Documents router with standard CRUD operations plus RAG search capabilities.
    Handles document uploads, processing, and semantic search.
    """

    def __init__(self):
        super().__init__(
            table_name="documents",
            resource_name="document",
            resource_name_plural="documents",
            response_model=Document,
            create_model=DocumentCreate,
            update_model=DocumentUpdate
        )

    def _setup_routes(self):
        """Override to register custom routes BEFORE standard CRUD routes."""
        # CRITICAL: Setup custom routes FIRST to avoid /{resource_id} catching them
        self._setup_custom_routes()

        # Now call parent to setup standard CRUD routes
        super()._setup_routes()

    def _setup_custom_routes(self):
        """Add document-specific custom endpoints."""

        @self.router.post("/upload", response_model=StandardResponse)
        async def upload_document(
            file: UploadFile = File(...),
            document_type: Optional[str] = Form(None),
            title: Optional[str] = Form(None),
            description: Optional[str] = Form(None),
            tags: Optional[str] = Form(None),  # JSON string of array
            visibility: str = Form("organization"),
            campaign_id: Optional[str] = Form(None),
            client_id: Optional[str] = Form(None),
            persona_id: Optional[str] = Form(None),
            strategy_session_id: Optional[str] = Form(None),
            current_user: Dict[str, Any] = Depends(get_current_user)
        ):
            """
            Upload a document for RAG processing.
            Supports PDF, DOCX, TXT, MD, HTML, CSV, JSON files up to 100MB.
            """
            try:
                # Parse tags if provided
                tags_list = None
                if tags:
                    try:
                        tags_list = json.loads(tags)
                    except json.JSONDecodeError:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid tags format. Expected JSON array."
                        )

                # Upload document using RAG service
                result = await rag_service.upload_document(
                    file=file,
                    org_id=current_user["org_id"],
                    user_id=current_user["id"],
                    document_type=document_type,
                    title=title or file.filename,
                    description=description,
                    tags=tags_list,
                    visibility=visibility,
                    campaign_id=campaign_id,
                    client_id=client_id,
                    persona_id=persona_id,
                    strategy_session_id=strategy_session_id
                )

                return StandardResponse(
                    success=True,
                    data=result,
                    message="Document uploaded successfully"
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error uploading document: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to upload document"
                )

        @self.router.post("/search", response_model=StandardResponse)
        async def search_documents(
            search_request: SearchRequest,
            current_user: Dict[str, Any] = Depends(get_current_user)
        ):
            """
            Perform semantic search across organization's documents.
            Uses Vertex AI for intelligent document retrieval with relevance scoring.
            """
            try:
                result = rag_service.search_documents(
                    query=search_request.query,
                    org_id=current_user["org_id"],
                    user_id=current_user["id"],
                    document_type=search_request.document_type,
                    campaign_id=str(search_request.campaign_id) if search_request.campaign_id else None,
                    limit=search_request.limit
                )

                return StandardResponse(
                    success=True,
                    data=result,
                    message=f"Found {len(result.get('results', []))} matching documents"
                )

            except Exception as e:
                logger.error(f"Error searching documents: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to search documents"
                )

        @self.router.get("/search", response_model=StandardResponse)
        async def search_documents_get(
            q: str = Query(..., description="Search query"),
            document_type: Optional[str] = Query(None),
            campaign_id: Optional[UUID] = Query(None),
            client_id: Optional[UUID] = Query(None),
            limit: int = Query(10, ge=1, le=50),
            current_user: Dict[str, Any] = Depends(get_current_user)
        ):
            """GET endpoint for document search (alternative to POST for simple queries)."""
            search_req = SearchRequest(
                query=q,
                document_type=document_type,
                campaign_id=campaign_id,
                client_id=client_id,
                limit=limit
            )
            return await search_documents(search_req, current_user)

        @self.router.get("/stats", response_model=StandardResponse)
        async def get_document_statistics(
            campaign_id: Optional[UUID] = Query(None),
            client_id: Optional[UUID] = Query(None),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Get document statistics for organization, campaign, or client."""
            try:
                # Base query
                query = db.table("documents")\
                    .select("*", count="exact")\
                    .eq("org_id", current_user["org_id"])\
                    .is_("archived_at", "null")

                # Apply filters
                if campaign_id:
                    query = query.eq("campaign_id", str(campaign_id))
                if client_id:
                    query = query.eq("client_id", str(client_id))

                # Get total documents
                total_result = query.execute()

                # Get documents by type
                type_stats = {}
                for doc in total_result.data:
                    doc_type = doc.get("document_type", "unknown")
                    if doc_type not in type_stats:
                        type_stats[doc_type] = 0
                    type_stats[doc_type] += 1

                # Get processing stats
                processing_stats = {
                    "completed": len([d for d in total_result.data if d.get("processing_status") == "completed"]),
                    "processing": len([d for d in total_result.data if d.get("processing_status") == "processing"]),
                    "failed": len([d for d in total_result.data if d.get("processing_status") == "failed"]),
                    "pending": len([d for d in total_result.data if d.get("processing_status") == "pending"])
                }

                # Calculate storage usage
                total_size = sum(
                    doc.get("metadata", {}).get("file_size", 0)
                    for doc in total_result.data
                    if isinstance(doc.get("metadata"), dict)
                )

                stats = {
                    "total_documents": total_result.count or 0,
                    "documents_by_type": type_stats,
                    "processing_status": processing_stats,
                    "total_storage_bytes": total_size,
                    "total_storage_mb": round(total_size / (1024 * 1024), 2),
                    "total_chunks": sum(doc.get("chunk_count", 0) for doc in total_result.data),
                    "total_vectors": sum(doc.get("vector_count", 0) for doc in total_result.data)
                }

                return StandardResponse(
                    success=True,
                    data=stats,
                    message="Document statistics retrieved"
                )

            except Exception as e:
                logger.error(f"Error getting document stats: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve document statistics"
                )

        @self.router.get("/recent", response_model=StandardResponse)
        async def get_recent_documents(
            limit: int = Query(10, ge=1, le=50),
            campaign_id: Optional[UUID] = Query(None),
            client_id: Optional[UUID] = Query(None),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Get recently uploaded documents."""
            try:
                query = db.table("documents")\
                    .select("*")\
                    .eq("org_id", current_user["org_id"])\
                    .is_("archived_at", "null")

                if campaign_id:
                    query = query.eq("campaign_id", str(campaign_id))
                if client_id:
                    query = query.eq("client_id", str(client_id))

                result = query.order("created_at", desc=True).limit(limit).execute()

                return StandardResponse(
                    success=True,
                    data=result.data,
                    message=f"Retrieved {len(result.data)} recent documents"
                )

            except Exception as e:
                logger.error(f"Error getting recent documents: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve recent documents"
                )

        @self.router.post("/{document_id}/reprocess", response_model=StandardResponse)
        async def reprocess_document(
            document_id: UUID,
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Reprocess a document (re-extract text, re-chunk, re-index)."""
            try:
                # Verify ownership
                doc_check = db.table("documents")\
                    .select("*")\
                    .eq("id", str(document_id))\
                    .eq("org_id", current_user["org_id"])\
                    .execute()

                if not doc_check.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Document not found"
                    )

                document = doc_check.data[0]

                # Update processing status
                db.table("documents")\
                    .update({
                        "processing_status": "reprocessing",
                        "processing_error": None,
                        "updated_at": datetime.utcnow().isoformat()
                    })\
                    .eq("id", str(document_id))\
                    .execute()

                # TODO: Trigger actual reprocessing via RAG service
                # This would typically be an async task

                return StandardResponse(
                    success=True,
                    data={"document_id": str(document_id), "status": "reprocessing"},
                    message="Document reprocessing initiated"
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error reprocessing document: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to reprocess document"
                )

        @self.router.get("/{document_id}/chunks", response_model=StandardResponse)
        async def get_document_chunks(
            document_id: UUID,
            limit: int = Query(100, ge=1, le=500),
            offset: int = Query(0, ge=0),
            current_user: Dict[str, Any] = Depends(get_current_user),
            db = Depends(get_service_role_client)
        ):
            """Get chunks for a specific document."""
            try:
                # Verify ownership
                doc_check = db.table("documents")\
                    .select("id")\
                    .eq("id", str(document_id))\
                    .eq("org_id", current_user["org_id"])\
                    .execute()

                if not doc_check.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Document not found"
                    )

                # Get chunks
                chunks_result = db.table("document_chunks")\
                    .select("*")\
                    .eq("document_id", str(document_id))\
                    .order("chunk_index")\
                    .range(offset, offset + limit - 1)\
                    .execute()

                return StandardResponse(
                    success=True,
                    data={
                        "chunks": chunks_result.data,
                        "total": len(chunks_result.data),
                        "limit": limit,
                        "offset": offset
                    },
                    message=f"Retrieved {len(chunks_result.data)} chunks"
                )

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error getting document chunks: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve document chunks"
                )


# Create router instance
documents_router = DocumentsRouter()