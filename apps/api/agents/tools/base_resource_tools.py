"""
BaseResourceTools - Phase 3 Implementation
Standardized CRUD operations for all agent resources
Date: 2025-09-21

This module provides a base class that all agents can use to perform
standard operations on their resources (list, get, create, update, archive, etc.)
"""

from typing import Dict, Any, List, Optional, TypeVar, Generic
from abc import ABC, abstractmethod
import logging
import httpx
import os
from datetime import datetime

logger = logging.getLogger(__name__)

# Type variable for resource types
T = TypeVar('T')


class BaseResourceTools(ABC, Generic[T]):
    """
    Base class providing standard CRUD+ operations for agent resources.

    Each agent-specific tool class should inherit from this and specify:
    - resource_name: singular name (e.g., "persona")
    - resource_plural: plural name (e.g., "personas")
    - api_base_path: API endpoint path (e.g., "/api/v1/personas")
    """

    def __init__(
        self,
        resource_name: str,
        resource_plural: str,
        api_base_path: str,
        org_id: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        """
        Initialize the resource tools.

        Args:
            resource_name: Singular name of the resource
            resource_plural: Plural name of the resource
            api_base_path: Base API path for this resource
            org_id: Organization ID for filtering
            user_id: User ID for audit trails
        """
        self.resource_name = resource_name
        self.resource_plural = resource_plural
        self.api_base_path = api_base_path
        self.org_id = org_id
        self.user_id = user_id

        # API client configuration
        self.api_base_url = os.getenv("VITE_API_URL", "http://127.0.0.1:56300")
        self.client = httpx.AsyncClient(
            base_url=self.api_base_url,
            follow_redirects=True  # Follow 307 redirects automatically
        )

        logger.info(f"Initialized {self.__class__.__name__} for {resource_plural}")

    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers for API calls."""
        token = os.getenv("AUTH_TOKEN")  # In production, get from auth store
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    # ===== Standard CRUD+ Operations =====

    async def list_resources(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        List resources with pagination and filtering.

        Args:
            limit: Number of items to return
            offset: Number of items to skip
            include_archived: Whether to include archived items
            filters: Additional filter criteria

        Returns:
            Dictionary with resources list and metadata
        """
        logger.info(f"Listing {self.resource_plural}: limit={limit}, offset={offset}")

        try:
            params = {
                "limit": limit,
                "offset": offset,
                "include_archived": include_archived
            }

            # Add org_id filter if available
            if self.org_id:
                params["org_id"] = self.org_id

            # Add additional filters
            if filters:
                params.update(filters)

            response = await self.client.get(
                self.api_base_path,
                params=params,
                headers=self._get_headers()
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "resources": data.get("data", []),
                    "total": data.get("total", 0),
                    "has_more": data.get("has_more", False),
                    "message": f"Retrieved {len(data.get('data', []))} {self.resource_plural}"
                }
            else:
                return {
                    "success": False,
                    "resources": [],
                    "error": f"API returned {response.status_code}",
                    "message": f"Failed to list {self.resource_plural}"
                }

        except Exception as e:
            logger.error(f"Error listing {self.resource_plural}: {str(e)}")
            return {
                "success": False,
                "resources": [],
                "error": str(e),
                "message": f"Failed to list {self.resource_plural}"
            }

    async def get_resource_details(self, resource_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific resource.

        Args:
            resource_id: UUID of the resource

        Returns:
            Dictionary with resource details
        """
        logger.info(f"Getting {self.resource_name} details: {resource_id}")

        try:
            response = await self.client.get(
                f"{self.api_base_path}/{resource_id}",
                headers=self._get_headers()
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "resource": data.get("data"),
                    "message": f"Retrieved {self.resource_name} details"
                }
            elif response.status_code == 404:
                return {
                    "success": False,
                    "resource": None,
                    "message": f"{self.resource_name.title()} not found"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": f"API returned {response.status_code}",
                    "message": f"Failed to get {self.resource_name}"
                }

        except Exception as e:
            logger.error(f"Error getting {self.resource_name}: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to get {self.resource_name}"
            }

    async def create_resource(self, resource_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new resource.

        Args:
            resource_data: Data for the new resource

        Returns:
            Dictionary with created resource
        """
        logger.info(f"Creating new {self.resource_name}")

        try:
            # Add org_id if not present
            if self.org_id and "org_id" not in resource_data:
                resource_data["org_id"] = self.org_id

            # Add created_by if user_id available
            if self.user_id and "created_by" not in resource_data:
                resource_data["created_by"] = self.user_id

            response = await self.client.post(
                self.api_base_path,
                json=resource_data,
                headers=self._get_headers()
            )

            if response.status_code in [200, 201]:
                data = response.json()
                return {
                    "success": True,
                    "resource": data.get("data"),
                    "message": f"Created new {self.resource_name}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": f"API returned {response.status_code}",
                    "message": f"Failed to create {self.resource_name}"
                }

        except Exception as e:
            logger.error(f"Error creating {self.resource_name}: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to create {self.resource_name}"
            }

    async def update_resource(
        self,
        resource_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update an existing resource.

        Args:
            resource_id: UUID of the resource to update
            updates: Fields to update

        Returns:
            Dictionary with updated resource
        """
        logger.info(f"Updating {self.resource_name}: {resource_id}")

        try:
            # Add updated_by if user_id available
            if self.user_id and "updated_by" not in updates:
                updates["updated_by"] = self.user_id

            response = await self.client.patch(
                f"{self.api_base_path}/{resource_id}",
                json=updates,
                headers=self._get_headers()
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "resource": data.get("data"),
                    "message": f"Updated {self.resource_name}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": f"API returned {response.status_code}",
                    "message": f"Failed to update {self.resource_name}"
                }

        except Exception as e:
            logger.error(f"Error updating {self.resource_name}: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to update {self.resource_name}"
            }

    async def archive_resource(
        self,
        resource_id: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Archive a resource (soft delete).

        Args:
            resource_id: UUID of the resource to archive
            reason: Optional reason for archiving

        Returns:
            Dictionary with operation result
        """
        logger.info(f"Archiving {self.resource_name}: {resource_id}")

        try:
            data = {}
            if reason:
                data["archive_reason"] = reason
            if self.user_id:
                data["archived_by"] = self.user_id

            response = await self.client.delete(
                f"{self.api_base_path}/{resource_id}",
                json=data if data else None,
                headers=self._get_headers()
            )

            if response.status_code in [200, 204]:
                return {
                    "success": True,
                    "message": f"Archived {self.resource_name}"
                }
            else:
                return {
                    "success": False,
                    "error": f"API returned {response.status_code}",
                    "message": f"Failed to archive {self.resource_name}"
                }

        except Exception as e:
            logger.error(f"Error archiving {self.resource_name}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to archive {self.resource_name}"
            }

    async def restore_resource(self, resource_id: str) -> Dict[str, Any]:
        """
        Restore an archived resource.

        Args:
            resource_id: UUID of the resource to restore

        Returns:
            Dictionary with restored resource
        """
        logger.info(f"Restoring {self.resource_name}: {resource_id}")

        try:
            response = await self.client.post(
                f"{self.api_base_path}/{resource_id}/restore",
                headers=self._get_headers()
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "resource": data.get("data"),
                    "message": f"Restored {self.resource_name}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": f"API returned {response.status_code}",
                    "message": f"Failed to restore {self.resource_name}"
                }

        except Exception as e:
            logger.error(f"Error restoring {self.resource_name}: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to restore {self.resource_name}"
            }

    async def duplicate_resource(
        self,
        resource_id: str,
        modifications: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a copy of an existing resource.

        Args:
            resource_id: UUID of the resource to duplicate
            modifications: Optional changes to apply to the copy

        Returns:
            Dictionary with duplicated resource
        """
        logger.info(f"Duplicating {self.resource_name}: {resource_id}")

        try:
            data = modifications if modifications else {}

            response = await self.client.post(
                f"{self.api_base_path}/{resource_id}/duplicate",
                json=data,
                headers=self._get_headers()
            )

            if response.status_code in [200, 201]:
                data = response.json()
                return {
                    "success": True,
                    "resource": data.get("data"),
                    "message": f"Duplicated {self.resource_name}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": f"API returned {response.status_code}",
                    "message": f"Failed to duplicate {self.resource_name}"
                }

        except Exception as e:
            logger.error(f"Error duplicating {self.resource_name}: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to duplicate {self.resource_name}"
            }

    async def search_resources(
        self,
        query: str,
        search_fields: Optional[List[str]] = None,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        Search for resources matching a query.

        Args:
            query: Search query string
            search_fields: Fields to search in
            limit: Maximum results to return

        Returns:
            Dictionary with search results
        """
        logger.info(f"Searching {self.resource_plural}: '{query}'")

        try:
            params = {
                "q": query,
                "limit": limit
            }

            if self.org_id:
                params["org_id"] = self.org_id

            if search_fields:
                params["fields"] = ",".join(search_fields)

            response = await self.client.get(
                f"{self.api_base_path}/search",
                params=params,
                headers=self._get_headers()
            )

            if response.status_code == 200:
                data = response.json()
                results = data.get("data", [])
                return {
                    "success": True,
                    "resources": results,
                    "count": len(results),
                    "message": f"Found {len(results)} matching {self.resource_plural}"
                }
            else:
                return {
                    "success": False,
                    "resources": [],
                    "error": f"API returned {response.status_code}",
                    "message": f"Search failed"
                }

        except Exception as e:
            logger.error(f"Error searching {self.resource_plural}: {str(e)}")
            return {
                "success": False,
                "resources": [],
                "error": str(e),
                "message": f"Search failed"
            }

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - close HTTP client."""
        await self.client.aclose()