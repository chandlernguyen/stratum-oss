"""RAG Service for document upload, processing, and search using Vertex AI."""

import os
import uuid
import time
from functools import cached_property
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import json

from google.cloud import storage
from google.cloud import discoveryengine_v1 as discoveryengine
from google.api_core import exceptions as gcp_exceptions
from fastapi import UploadFile, HTTPException

from apps.api.utils.database import (
    create_rag_document,
    get_rag_documents,
    update_rag_document_processing_status,
    get_rag_document_by_id,
    record_search_history,
    TEST_USER_ID,
    TEST_ORG_ID
)

class RAGService:
    """Service for managing RAG documents and search using Vertex AI."""

    # Google Cloud clients are built on first use rather than in __init__.
    #
    # This module instantiates a module-level singleton at the bottom of the
    # file, so constructing clients eagerly made `import apps.api.main` require
    # Application Default Credentials. Importing the application must not need
    # provider credentials: it broke the documented key-free DEMO_MODE setup for
    # anyone without gcloud configured, and it failed CI with
    # "DefaultCredentialsError: Your default credentials were not found".
    #
    # Same defect class as the earlier fixes in context_intelligence.py and
    # action_plan_detector.py; this module was missed.

    @cached_property
    def storage_client(self) -> storage.Client:
        return storage.Client()

    @cached_property
    def document_client(self) -> discoveryengine.DocumentServiceClient:
        return discoveryengine.DocumentServiceClient()

    @cached_property
    def search_client(self) -> discoveryengine.SearchServiceClient:
        return discoveryengine.SearchServiceClient()

    def __init__(self):
        # Configuration from environment.
        #
        # These previously defaulted to the author's own GCP project and bucket
        # names ("marketing-suite-2025" and friends). That is both a
        # confidentiality leak and a footgun: a self-hoster who forgot to set the
        # variable would silently address someone else's project. Vertex AI is an
        # optional integration, so the defaults are now empty and the absence is
        # detectable rather than quietly wrong.
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT_ID", "")
        self.location = os.getenv("VERTEX_AI_LOCATION", "global")
        self.data_store_id = os.getenv("VERTEX_AI_DATA_STORE_ID", "")
        self.collection_id = os.getenv("VERTEX_AI_COLLECTION_ID", "")
        self.bucket_name = os.getenv("GCS_BUCKET_PREFIX", "")
        self.temp_bucket_name = os.getenv("GCS_TEMP_BUCKET", "")
        
        # Supported file types and size limits
        self.supported_types = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.html': 'text/html',
            '.csv': 'text/csv',
            '.json': 'application/json'
        }
        self.max_file_size = 100 * 1024 * 1024  # 100MB
        
        # Vertex AI paths
        self.parent = f"projects/{self.project_id}/locations/{self.location}/collections/{self.collection_id}/dataStores/{self.data_store_id}"
        
    def _validate_file(self, file: UploadFile) -> Tuple[bool, str]:
        """Validate uploaded file type and size."""
        # Check file extension
        file_ext = os.path.splitext(file.filename.lower())[1]
        if file_ext not in self.supported_types:
            return False, f"Unsupported file type: {file_ext}. Supported types: {list(self.supported_types.keys())}"
        
        # Check file size (approximate, since we can't get exact size without reading)
        if hasattr(file.file, 'tell') and hasattr(file.file, 'seek'):
            current_pos = file.file.tell()
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()
            file.file.seek(current_pos)  # Restore position
            
            if file_size > self.max_file_size:
                return False, f"File too large: {file_size} bytes. Max size: {self.max_file_size} bytes"
        
        return True, "Valid"
    
    def _generate_gcs_path(self, org_id: str, filename: str) -> str:
        """Generate a unique GCS path for the file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = "".join(c for c in filename if c.isalnum() or c in ".-_")
        return f"organizations/{org_id}/documents/{timestamp}_{unique_id}_{safe_filename}"
    
    async def upload_document(
        self,
        file: UploadFile,
        org_id: str = TEST_ORG_ID,
        user_id: str = TEST_USER_ID,
        document_type: str = None,
        title: str = None,
        description: str = None,
        tags: List[str] = None,
        visibility: str = "organization",
        campaign_id: str = None,
        persona_id: str = None,
        strategy_session_id: str = None
    ) -> Dict[str, Any]:
        """Upload a document to GCS and create a database record."""
        try:
            # Validate file
            is_valid, validation_message = self._validate_file(file)
            if not is_valid:
                raise HTTPException(status_code=400, detail=validation_message)
            
            # Generate paths
            gcs_path = self._generate_gcs_path(org_id, file.filename)
            gcs_uri = f"gs://{self.bucket_name}/{gcs_path}"
            
            # Get file metadata
            file_ext = os.path.splitext(file.filename.lower())[1]
            mime_type = self.supported_types.get(file_ext, 'application/octet-stream')
            
            # Read file content
            content = await file.read()
            file_size = len(content)
            
            # Upload to GCS
            bucket = self.storage_client.bucket(self.bucket_name)
            blob = bucket.blob(gcs_path)
            blob.upload_from_string(content, content_type=mime_type)
            
            # Create database record
            db_result = create_rag_document(
                user_id=user_id,
                org_id=org_id,
                filename=file.filename,
                file_type=file_ext,
                gcs_uri=gcs_uri,
                file_size_bytes=file_size,
                mime_type=mime_type,
                document_type=document_type,
                title=title or file.filename,
                description=description,
                tags=tags,
                visibility=visibility,
                campaign_id=campaign_id,
                persona_id=persona_id,
                strategy_session_id=strategy_session_id
            )
            
            if db_result["status"] == "success":
                document_id = db_result["data"]["id"]
                
                # Start async processing (in a real implementation, this would be a background task)
                await self._process_document_for_search(document_id, gcs_uri)
                
                return {
                    "status": "success",
                    "document_id": document_id,
                    "message": "Document uploaded successfully and processing started",
                    "gcs_uri": gcs_uri,
                    "file_size": file_size
                }
            else:
                # Clean up uploaded file if database insert failed
                blob.delete()
                raise HTTPException(status_code=500, detail="Failed to create document record")
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    async def _process_document_for_search(self, document_id: str, gcs_uri: str) -> None:
        """Process document for Vertex AI search (background task)."""
        try:
            # Update status to processing
            update_rag_document_processing_status(document_id, "processing")
            
            # Create Vertex AI document
            vertex_document_id = f"doc_{document_id.replace('-', '_')}"
            
            # Create the document in Vertex AI
            document = discoveryengine.Document(
                id=vertex_document_id,
                content=discoveryengine.Document.Content(
                    uri=gcs_uri,
                    mime_type="application/pdf"  # Vertex AI will auto-detect
                )
            )
            
            request = discoveryengine.CreateDocumentRequest(
                parent=f"{self.parent}/branches/default_branch/",
                document=document,
                document_id=vertex_document_id
            )
            
            # Create the document
            operation = self.document_client.create_document(request=request)
            
            # Update status to indexed
            update_rag_document_processing_status(
                document_id, 
                "indexed", 
                vertex_document_id=vertex_document_id
            )
            
        except Exception as e:
            # Update status to failed
            update_rag_document_processing_status(
                document_id, 
                "failed", 
                processing_error=str(e)
            )
    
    def search_documents(
        self,
        query: str,
        org_id: str = TEST_ORG_ID,
        user_id: str = TEST_USER_ID,
        document_type: str = None,
        campaign_id: str = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """Search documents using Vertex AI and return results."""
        start_time = time.time()
        
        try:
            # Build search request
            serving_config = f"{self.parent}/servingConfigs/default_config"
            
            # Create search request
            request = discoveryengine.SearchRequest(
                serving_config=serving_config,
                query=query,
                page_size=limit,
                query_expansion_spec=discoveryengine.SearchRequest.QueryExpansionSpec(
                    condition=discoveryengine.SearchRequest.QueryExpansionSpec.Condition.AUTO
                ),
                spell_correction_spec=discoveryengine.SearchRequest.SpellCorrectionSpec(
                    mode=discoveryengine.SearchRequest.SpellCorrectionSpec.Mode.AUTO
                )
            )
            
            # Execute search
            response = self.search_client.search(request=request)
            
            # Process results
            results = []
            for result in response.results:
                doc_data = {
                    "id": result.id,
                    "uri": result.document.content.uri if result.document.content else None,
                    "title": getattr(result.document, 'title', 'Untitled'),
                    "snippet": getattr(result, 'snippet', ''),
                    "relevance_score": getattr(result, 'relevance_score', 0.0)
                }
                results.append(doc_data)
            
            # Calculate response time
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Record search for analytics
            filters = {}
            if document_type:
                filters["document_type"] = document_type
            if campaign_id:
                filters["campaign_id"] = campaign_id
            
            record_search_history(
                user_id=user_id,
                org_id=org_id,
                query=query,
                filters=filters,
                results_count=len(results),
                response_time_ms=response_time_ms
            )
            
            return {
                "status": "success",
                "query": query,
                "results": results,
                "total_results": len(results),
                "response_time_ms": response_time_ms
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Search failed: {str(e)}",
                "results": [],
                "total_results": 0
            }
    
    def get_documents(
        self,
        org_id: str = TEST_ORG_ID,
        user_id: str = TEST_USER_ID,
        **filters
    ) -> Dict[str, Any]:
        """Get documents from database with filtering."""
        try:
            documents = get_rag_documents(user_id, org_id, **filters)
            return {
                "status": "success",
                "documents": documents,
                "total": len(documents)
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to retrieve documents: {str(e)}",
                "documents": [],
                "total": 0
            }
    
    def delete_document(
        self,
        document_id: str,
        org_id: str = TEST_ORG_ID,
        user_id: str = TEST_USER_ID
    ) -> Dict[str, Any]:
        """Delete a document from both database and Vertex AI."""
        try:
            # Get document details
            document = get_rag_document_by_id(document_id, org_id)
            if not document:
                raise HTTPException(status_code=404, detail="Document not found")
            
            # Delete from Vertex AI if it was indexed
            if document.get("vertex_document_id"):
                try:
                    vertex_doc_name = f"{self.parent}/branches/default_branch/documents/{document['vertex_document_id']}"
                    request = discoveryengine.DeleteDocumentRequest(name=vertex_doc_name)
                    self.document_client.delete_document(request=request)
                except Exception as vertex_error:
                    print(f"Warning: Failed to delete from Vertex AI: {vertex_error}")
            
            # Delete from GCS
            if document.get("gcs_uri"):
                try:
                    gcs_path = document["gcs_uri"].replace(f"gs://{self.bucket_name}/", "")
                    bucket = self.storage_client.bucket(self.bucket_name)
                    blob = bucket.blob(gcs_path)
                    blob.delete()
                except Exception as gcs_error:
                    print(f"Warning: Failed to delete from GCS: {gcs_error}")
            
            # Soft delete from database
            from apps.api.utils.database import delete_rag_document
            result = delete_rag_document(document_id, user_id)
            
            return {
                "status": "success",
                "message": "Document deleted successfully"
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

# Global instance
rag_service = RAGService()