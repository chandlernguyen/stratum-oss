"""
Base Router for Standardized CRUD Operations
Provides consistent API patterns across all resources.
"""
from typing import Generic, TypeVar, List, Optional, Dict, Any, Type
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from supabase import Client as SupabaseClient

from apps.api.auth.supabase_auth import get_current_user, get_current_user_with_org
from apps.api.utils.auth_database import get_service_role_client
from apps.api.models.standard_responses import StandardResponse, StandardListResponse, StandardErrorResponse
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


class BaseRouter(Generic[T]):
    """
    Base router class that provides standardized CRUD operations for all resources.

    Features:
    - Consistent URL patterns
    - Standardized response formats
    - Unified soft-delete (archive) pattern
    - Built-in pagination and filtering
    - Automatic org_id scoping
    - Audit trail support
    """

    def __init__(
        self,
        table_name: str,
        resource_name: str,
        resource_name_plural: str,
        response_model: Type[T],
        create_model: Optional[Type[BaseModel]] = None,
        update_model: Optional[Type[BaseModel]] = None,
        custom_actions: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize the base router.

        Args:
            table_name: Database table name
            resource_name: Singular resource name (e.g., "campaign")
            resource_name_plural: Plural resource name for URLs (e.g., "campaigns")
            response_model: Pydantic model for responses
            create_model: Pydantic model for creation (optional)
            update_model: Pydantic model for updates (optional)
            custom_actions: Dictionary of custom action handlers (optional)
        """
        self.table_name = table_name
        self.resource_name = resource_name
        self.resource_name_plural = resource_name_plural
        self.response_model = response_model
        self.create_model = create_model or response_model
        self.update_model = update_model or response_model
        self.custom_actions = custom_actions or {}

        # Create router with standardized prefix
        self.router = APIRouter(
            prefix=f"/api/v1/{resource_name_plural}",
            tags=[resource_name_plural]
        )

        # Setup standard routes
        self._setup_routes()

    def _setup_routes(self):
        """Setup all standard CRUD routes."""

        # List resources
        @self.router.get("/", response_model=StandardListResponse)
        async def list_resources(
            archived: bool = Query(False, description="Include archived items"),
            limit: int = Query(50, ge=1, le=100, description="Items per page"),
            offset: int = Query(0, ge=0, description="Pagination offset"),
            search: Optional[str] = Query(None, description="Search query"),
            sort_by: Optional[str] = Query("created_at", description="Sort field"),
            sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)"),
            current_user: Dict[str, Any] = Depends(get_current_user_with_org),
            db: SupabaseClient = Depends(get_service_role_client)
        ):
            return await self.list(
                db, current_user, archived, limit, offset, search, sort_by, sort_order
            )

        # Create resource
        @self.router.post("/", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
        async def create_resource(
            data: self.create_model,
            current_user: Dict[str, Any] = Depends(get_current_user_with_org),
            db: SupabaseClient = Depends(get_service_role_client)
        ):
            return await self.create(db, current_user, data)

        # Get single resource
        @self.router.get("/{resource_id}", response_model=StandardResponse)
        async def get_resource(
            resource_id: UUID,
            current_user: Dict[str, Any] = Depends(get_current_user_with_org),
            db: SupabaseClient = Depends(get_service_role_client)
        ):
            return await self.get(db, current_user, resource_id)

        # Update resource (partial)
        @self.router.patch("/{resource_id}", response_model=StandardResponse)
        async def update_resource(
            resource_id: UUID,
            data: self.update_model,
            current_user: Dict[str, Any] = Depends(get_current_user_with_org),
            db: SupabaseClient = Depends(get_service_role_client)
        ):
            return await self.update(db, current_user, resource_id, data)

        # Archive resource (soft delete)
        @self.router.delete("/{resource_id}", response_model=StandardResponse)
        async def archive_resource(
            resource_id: UUID,
            reason: Optional[str] = Query(None, description="Reason for archiving"),
            current_user: Dict[str, Any] = Depends(get_current_user_with_org),
            db: SupabaseClient = Depends(get_service_role_client)
        ):
            return await self.archive(db, current_user, resource_id, reason)

        # Restore archived resource
        @self.router.post("/{resource_id}/restore", response_model=StandardResponse)
        async def restore_resource(
            resource_id: UUID,
            current_user: Dict[str, Any] = Depends(get_current_user_with_org),
            db: SupabaseClient = Depends(get_service_role_client)
        ):
            return await self.restore(db, current_user, resource_id)

        # Permanent delete resource (hard delete)
        @self.router.delete("/{resource_id}/permanent", response_model=StandardResponse)
        async def permanent_delete_resource(
            resource_id: UUID,
            confirm: bool = Query(False, description="Confirmation required for permanent delete"),
            current_user: Dict[str, Any] = Depends(get_current_user_with_org),
            db: SupabaseClient = Depends(get_service_role_client)
        ):
            if not confirm:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Permanent delete requires confirmation"
                )
            return await self.permanent_delete(db, current_user, resource_id)

        # Duplicate resource
        @self.router.post("/{resource_id}/duplicate", response_model=StandardResponse)
        async def duplicate_resource(
            resource_id: UUID,
            name: Optional[str] = Query(None, description="Name for the duplicate"),
            current_user: Dict[str, Any] = Depends(get_current_user_with_org),
            db: SupabaseClient = Depends(get_service_role_client)
        ):
            return await self.duplicate(db, current_user, resource_id, name)

        # Bulk operations
        @self.router.post("/bulk", response_model=StandardResponse)
        async def bulk_operations(
            operation: str = Query(..., description="Operation to perform (archive, restore, delete)"),
            ids: List[UUID] = Query(..., description="Resource IDs to operate on"),
            reason: Optional[str] = Query(None, description="Reason for operation"),
            current_user: Dict[str, Any] = Depends(get_current_user_with_org),
            db: SupabaseClient = Depends(get_service_role_client)
        ):
            return await self.bulk_operate(db, current_user, operation, ids, reason)

        # Export resources
        @self.router.get("/export", response_model=StandardResponse)
        async def export_resources(
            format: str = Query("json", description="Export format (json, csv)"),
            archived: bool = Query(False, description="Include archived items"),
            current_user: Dict[str, Any] = Depends(get_current_user_with_org),
            db: SupabaseClient = Depends(get_service_role_client)
        ):
            return await self.export(db, current_user, format, archived)

        # Add custom actions if provided
        for action_name, action_handler in self.custom_actions.items():
            self.router.add_api_route(
                f"/{{resource_id}}/{action_name}",
                action_handler,
                methods=["POST"],
                response_model=StandardResponse
            )

    async def list(
        self, db: SupabaseClient, user: Dict, archived: bool,
        limit: int, offset: int, search: Optional[str],
        sort_by: str, sort_order: str
    ) -> StandardListResponse:
        """List resources with pagination and filtering."""
        try:
            query = db.table(self.table_name).select("*")

            # Filter by organization
            query = query.eq("org_id", user["org_id"])

            # Handle archive filter
            if not archived:
                query = query.is_("archived_at", "null")

            # Apply search if provided
            if search:
                # This is a simple implementation - override for specific search logic
                query = query.ilike("name", f"%{search}%")

            # Apply sorting
            query = query.order(sort_by, desc=(sort_order == "desc"))

            # Get total count
            count_query = db.table(self.table_name).select("*", count="exact")
            count_query = count_query.eq("org_id", user["org_id"])
            if not archived:
                count_query = count_query.is_("archived_at", "null")
            count_result = count_query.execute()
            total = count_result.count or 0

            # Apply pagination
            query = query.limit(limit).offset(offset)

            # Execute query
            result = query.execute()

            return StandardListResponse(
                success=True,
                data=result.data,
                message=f"Retrieved {len(result.data)} {self.resource_name_plural}",
                metadata={
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                    "has_more": (offset + limit) < total
                }
            )

        except Exception as e:
            logger.error(f"Error listing {self.resource_name_plural}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to list {self.resource_name_plural}"
            )

    async def create(
        self, db: SupabaseClient, user: Dict, data: BaseModel
    ) -> StandardResponse:
        """Create a new resource."""
        try:
            # Prepare data with audit fields
            create_data = data.dict(exclude_unset=True)

            # Convert date objects to ISO strings
            from datetime import date
            for key, value in create_data.items():
                if isinstance(value, date):
                    create_data[key] = value.isoformat()

            create_data.update({
                "org_id": user["org_id"],
                "created_by": user["id"],
                "updated_by": user["id"],
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            })

            # Insert into database
            result = db.table(self.table_name).insert(create_data).execute()

            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create {self.resource_name}"
                )

            return StandardResponse(
                success=True,
                data=result.data[0],
                message=f"{self.resource_name.title()} created successfully"
            )

        except HTTPException:
            raise
        except Exception as e:
            error_str = str(e)
            logger.error(f"Error creating {self.resource_name}: {error_str}")

            # Handle unique constraint violations (duplicate records)
            if "duplicate key value violates unique constraint" in error_str.lower():
                # Extract a user-friendly message
                if "slug" in error_str.lower():
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"A {self.resource_name} with this name already exists in your organization. Please use a different name."
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"This {self.resource_name} already exists. Please modify your input and try again."
                    )

            # Generic error for other cases
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create {self.resource_name}"
            )

    async def get(
        self, db: SupabaseClient, user: Dict, resource_id: UUID
    ) -> StandardResponse:
        """Get a single resource by ID."""
        try:
            result = db.table(self.table_name)\
                .select("*")\
                .eq("id", str(resource_id))\
                .eq("org_id", user["org_id"])\
                .execute()

            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.resource_name.title()} not found"
                )

            return StandardResponse(
                success=True,
                data=result.data[0],
                message=f"{self.resource_name.title()} retrieved successfully"
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting {self.resource_name}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve {self.resource_name}"
            )

    async def update(
        self, db: SupabaseClient, user: Dict,
        resource_id: UUID, data: BaseModel
    ) -> StandardResponse:
        """Update a resource (partial update)."""
        try:
            # Verify ownership first
            existing = await self.get(db, user, resource_id)

            # Prepare update data
            update_data = data.dict(exclude_unset=True)

            # Convert date objects to ISO strings
            from datetime import date
            for key, value in update_data.items():
                if isinstance(value, date):
                    update_data[key] = value.isoformat()

            update_data.update({
                "updated_by": user["id"],
                "updated_at": datetime.utcnow().isoformat()
            })

            # Perform update
            result = db.table(self.table_name)\
                .update(update_data)\
                .eq("id", str(resource_id))\
                .eq("org_id", user["org_id"])\
                .execute()

            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to update {self.resource_name}"
                )

            return StandardResponse(
                success=True,
                data=result.data[0],
                message=f"{self.resource_name.title()} updated successfully"
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating {self.resource_name}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update {self.resource_name}"
            )

    async def archive(
        self, db: SupabaseClient, user: Dict,
        resource_id: UUID, reason: Optional[str]
    ) -> StandardResponse:
        """Archive a resource (soft delete)."""
        try:
            # Verify ownership first
            existing = await self.get(db, user, resource_id)

            # Perform soft delete
            archive_data = {
                "archived_at": datetime.utcnow().isoformat(),
                "archived_by": user["id"],
                "archive_reason": reason or "User requested deletion",
                "updated_at": datetime.utcnow().isoformat(),
                "updated_by": user["id"]
            }

            result = db.table(self.table_name)\
                .update(archive_data)\
                .eq("id", str(resource_id))\
                .eq("org_id", user["org_id"])\
                .is_("archived_at", "null")\
                .execute()

            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to archive {self.resource_name}"
                )

            return StandardResponse(
                success=True,
                data={"id": str(resource_id), "archived_at": archive_data["archived_at"]},
                message=f"{self.resource_name.title()} archived successfully"
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error archiving {self.resource_name}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to archive {self.resource_name}"
            )

    async def restore(
        self, db: SupabaseClient, user: Dict, resource_id: UUID
    ) -> StandardResponse:
        """Restore an archived resource."""
        try:
            # Check if resource exists and is archived
            result = db.table(self.table_name)\
                .select("*")\
                .eq("id", str(resource_id))\
                .eq("org_id", user["org_id"])\
                .not_.is_("archived_at", "null")\
                .execute()

            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Archived {self.resource_name} not found"
                )

            # Restore the resource
            restore_data = {
                "archived_at": None,
                "archived_by": None,
                "archive_reason": None,
                "updated_at": datetime.utcnow().isoformat(),
                "updated_by": user["id"]
            }

            result = db.table(self.table_name)\
                .update(restore_data)\
                .eq("id", str(resource_id))\
                .eq("org_id", user["org_id"])\
                .execute()

            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to restore {self.resource_name}"
                )

            return StandardResponse(
                success=True,
                data=result.data[0],
                message=f"{self.resource_name.title()} restored successfully"
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error restoring {self.resource_name}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to restore {self.resource_name}"
            )

    async def permanent_delete(
        self, db: SupabaseClient, user: Dict, resource_id: UUID
    ) -> StandardResponse:
        """Permanently delete a resource (hard delete)."""
        try:
            # Verify ownership first
            existing = db.table(self.table_name)\
                .select("*")\
                .eq("id", str(resource_id))\
                .eq("org_id", user["org_id"])\
                .execute()

            if not existing.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.resource_name.title()} not found"
                )

            # Perform hard delete
            result = db.table(self.table_name)\
                .delete()\
                .eq("id", str(resource_id))\
                .eq("org_id", user["org_id"])\
                .execute()

            return StandardResponse(
                success=True,
                data={"id": str(resource_id), "deleted_at": datetime.utcnow().isoformat()},
                message=f"{self.resource_name.title()} permanently deleted"
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error permanently deleting {self.resource_name}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to permanently delete {self.resource_name}"
            )

    async def duplicate(
        self, db: SupabaseClient, user: Dict,
        resource_id: UUID, name: Optional[str]
    ) -> StandardResponse:
        """Duplicate a resource."""
        try:
            # Get the original resource
            original = await self.get(db, user, resource_id)

            # Prepare duplicate data
            duplicate_data = original.data.copy()

            # Remove unique fields
            fields_to_remove = ["id", "created_at", "created_by", "updated_at", "updated_by",
                              "archived_at", "archived_by", "archive_reason"]
            for field in fields_to_remove:
                duplicate_data.pop(field, None)

            # Update name if provided
            if name and "name" in duplicate_data:
                duplicate_data["name"] = name
            elif "name" in duplicate_data:
                duplicate_data["name"] = f"{duplicate_data['name']} (Copy)"

            # Add audit fields
            duplicate_data.update({
                "created_by": user["id"],
                "updated_by": user["id"],
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            })

            # Insert duplicate
            result = db.table(self.table_name).insert(duplicate_data).execute()

            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to duplicate {self.resource_name}"
                )

            return StandardResponse(
                success=True,
                data=result.data[0],
                message=f"{self.resource_name.title()} duplicated successfully"
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error duplicating {self.resource_name}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to duplicate {self.resource_name}"
            )

    async def bulk_operate(
        self, db: SupabaseClient, user: Dict,
        operation: str, ids: List[UUID], reason: Optional[str]
    ) -> StandardResponse:
        """Perform bulk operations on multiple resources."""
        try:
            if operation not in ["archive", "restore", "delete"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid operation: {operation}"
                )

            # Convert UUIDs to strings
            id_strings = [str(id) for id in ids]

            if operation == "archive":
                update_data = {
                    "archived_at": datetime.utcnow().isoformat(),
                    "archived_by": user["id"],
                    "archive_reason": reason or "Bulk archive operation",
                    "updated_at": datetime.utcnow().isoformat(),
                    "updated_by": user["id"]
                }

                result = db.table(self.table_name)\
                    .update(update_data)\
                    .in_("id", id_strings)\
                    .eq("org_id", user["org_id"])\
                    .is_("archived_at", "null")\
                    .execute()

            elif operation == "restore":
                update_data = {
                    "archived_at": None,
                    "archived_by": None,
                    "archive_reason": None,
                    "updated_at": datetime.utcnow().isoformat(),
                    "updated_by": user["id"]
                }

                result = db.table(self.table_name)\
                    .update(update_data)\
                    .in_("id", id_strings)\
                    .eq("org_id", user["org_id"])\
                    .not_.is_("archived_at", "null")\
                    .execute()

            else:  # Hard delete (use with caution)
                result = db.table(self.table_name)\
                    .delete()\
                    .in_("id", id_strings)\
                    .eq("org_id", user["org_id"])\
                    .execute()

            affected_count = len(result.data) if result.data else 0

            return StandardResponse(
                success=True,
                data={"affected": affected_count, "ids": id_strings},
                message=f"Successfully performed {operation} on {affected_count} {self.resource_name_plural}"
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in bulk operation: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to perform bulk {operation}"
            )

    async def export(
        self, db: SupabaseClient, user: Dict,
        format: str, archived: bool
    ) -> StandardResponse:
        """Export resources in specified format."""
        try:
            # Get all resources
            query = db.table(self.table_name).select("*").eq("org_id", user["org_id"])

            if not archived:
                query = query.is_("archived_at", "null")

            result = query.execute()

            if format == "json":
                return StandardResponse(
                    success=True,
                    data=result.data,
                    message=f"Exported {len(result.data)} {self.resource_name_plural}"
                )

            elif format == "csv":
                # Simple CSV conversion (can be enhanced)
                import csv
                import io

                if not result.data:
                    return StandardResponse(
                        success=True,
                        data="",
                        message="No data to export"
                    )

                output = io.StringIO()
                writer = csv.DictWriter(output, fieldnames=result.data[0].keys())
                writer.writeheader()
                writer.writerows(result.data)

                return StandardResponse(
                    success=True,
                    data=output.getvalue(),
                    message=f"Exported {len(result.data)} {self.resource_name_plural} as CSV"
                )

            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported export format: {format}"
                )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error exporting {self.resource_name_plural}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to export {self.resource_name_plural}"
            )