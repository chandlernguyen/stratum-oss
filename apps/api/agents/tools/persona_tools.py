#!/usr/bin/env python3
"""
PersonaTools - Phase 3 Implementation
Standardized CRUD operations for Persona Agent using BaseResourceTools
Date: 2025-09-21
"""

from typing import Dict, Any, Optional, List
from apps.api.agents.tools.base_resource_tools import BaseResourceTools
from apps.api.utils.database import get_supabase_client
import logging

logger = logging.getLogger(__name__)


class PersonaTools(BaseResourceTools):
    """
    Persona-specific resource tools inheriting from BaseResourceTools.
    Provides all standard CRUD+ operations for synthetic personas.
    """

    def __init__(self, org_id: Optional[str] = None, user_id: Optional[str] = None):
        """
        Initialize PersonaTools with persona-specific configuration.
        
        Args:
            org_id: Organization ID for filtering
            user_id: User ID for audit trails
        """
        super().__init__(
            resource_name="persona",
            resource_plural="personas",
            api_base_path="/api/v1/personas/",  # Include trailing slash to avoid redirects
            org_id=org_id,
            user_id=user_id
        )
        logger.info(f"PersonaTools initialized for org {org_id}")

    async def list_resources(
        self,
        limit: int = 25,
        offset: int = 0,
        include_archived: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Lists personas from agent_outputs table (nuclear migration).

        Args:
            limit: Number of items to return
            offset: Number of items to skip
            include_archived: Whether to include archived items
            filters: Additional filter criteria

        Returns:
            Dictionary with personas list and metadata
        """
        logger.info(f"Listing personas: limit={limit}, offset={offset}, org_id={self.org_id}")

        try:
            supabase = get_supabase_client()

            # Build query for agent_outputs table
            query = supabase.table('agent_outputs').select('*') \
                .eq('agent_type', 'persona') \
                .eq('output_type', 'persona')

            # Apply org filter if available
            if self.org_id:
                query = query.eq('org_id', self.org_id)

            # Apply archived filter
            if not include_archived:
                query = query.is_('archived_at', 'null')

            # Apply additional filters (note: these now apply to metadata/content fields)
            if filters:
                for key, value in filters.items():
                    if value is not None:
                        # Try to filter on metadata first, then content
                        query = query.contains('metadata', {key: value})

            # Apply sorting and pagination
            query = query.order('created_at', desc=True)
            query = query.range(offset, offset + limit - 1)

            # Execute query
            response = query.execute()

            # Extract persona data from JSONB content field
            personas = []
            if response.data:
                for item in response.data:
                    content = item.get('content', {})
                    metadata = item.get('metadata', {})
                    persona = {
                        'id': item['id'],
                        'org_id': item['org_id'],
                        'campaign_id': item.get('campaign_id'),
                        'name': content.get('name'),
                        'title': content.get('title'),
                        'role': content.get('title'),  # Map title to role for backward compatibility
                        'company_name': content.get('company_name'),
                        'industry': content.get('industry'),
                        'company_size': content.get('company_size'),
                        'demographics': content.get('demographics', {}),
                        'personality_traits': content.get('personality_traits', {}),
                        'goals': content.get('goals', []),
                        'pain_points': content.get('pain_points', []),
                        'is_primary': metadata.get('is_primary', False),
                        'created_at': item.get('created_at'),
                        'updated_at': item.get('updated_at'),
                        'archived_at': item.get('archived_at'),
                    }
                    personas.append(persona)

            if personas:
                return {
                    "success": True,
                    "resources": personas,
                    "total": len(personas),
                    "has_more": len(personas) == limit,
                    "message": f"Retrieved {len(personas)} personas"
                }
            else:
                return {
                    "success": True,
                    "resources": [],
                    "total": 0,
                    "has_more": False,
                    "message": "No personas found"
                }

        except Exception as e:
            logger.error(f"Error listing personas: {str(e)}")
            return {
                "success": False,
                "resources": [],
                "error": str(e),
                "message": "Failed to list personas"
            }

    async def get_resource_details(self, resource_id: str) -> Dict[str, Any]:
        """
        Override to use direct database access instead of HTTP API.
        Gets a specific persona by ID from agent_outputs (nuclear migration).

        Args:
            resource_id: The persona ID

        Returns:
            Dictionary with persona details
        """
        logger.info(f"Getting persona details: {resource_id}")

        try:
            supabase = get_supabase_client()

            # Query for the specific persona in agent_outputs
            query = supabase.table('agent_outputs').select('*') \
                .eq('id', resource_id) \
                .eq('agent_type', 'persona') \
                .eq('output_type', 'persona')

            # Apply org filter if available
            if self.org_id:
                query = query.eq('org_id', self.org_id)

            response = query.single().execute()

            if response.data:
                # Extract persona data from JSONB content
                item = response.data
                content = item.get('content', {})
                metadata = item.get('metadata', {})

                persona = {
                    'id': item['id'],
                    'org_id': item['org_id'],
                    'campaign_id': item.get('campaign_id'),
                    'name': content.get('name'),
                    'title': content.get('title'),
                    'role': content.get('title'),  # Map title to role for backward compatibility
                    'company_name': content.get('company_name'),
                    'industry': content.get('industry'),
                    'company_size': content.get('company_size'),
                    'demographics': content.get('demographics', {}),
                    'personality_traits': content.get('personality_traits', {}),
                    'goals': content.get('goals', []),
                    'pain_points': content.get('pain_points', []),
                    'jobs_to_be_done': content.get('jobs_to_be_done', []),
                    'decision_criteria': content.get('decision_criteria', {}),
                    'objections': content.get('objections', []),
                    'customer_status': content.get('customer_status'),
                    'background_story': content.get('background_story'),
                    'key_quote': content.get('key_quote'),
                    'is_primary': metadata.get('is_primary', False),
                    'created_at': item.get('created_at'),
                    'updated_at': item.get('updated_at'),
                    'archived_at': item.get('archived_at'),
                }

                return {
                    "success": True,
                    "resource": persona,
                    "message": f"Retrieved persona {resource_id}"
                }
            else:
                return {
                    "success": False,
                    "resource": None,
                    "error": "Persona not found",
                    "message": f"No persona found with ID {resource_id}"
                }

        except Exception as e:
            logger.error(f"Error getting persona details: {str(e)}")
            return {
                "success": False,
                "resource": None,
                "error": str(e),
                "message": f"Failed to get persona {resource_id}"
            }

    async def create_persona_with_validation(
        self,
        persona_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new persona with additional validation specific to personas.
        
        Args:
            persona_data: Persona information including name, role, demographics, etc.
            
        Returns:
            Dictionary with created persona or error
        """
        # Ensure required fields are present
        required_fields = ["name", "role"]
        missing_fields = [f for f in required_fields if f not in persona_data]
        
        if missing_fields:
            return {
                "success": False,
                "resource": None,
                "error": f"Missing required fields: {', '.join(missing_fields)}",
                "message": "Failed to create persona - missing required fields"
            }
        
        # Add default values for optional fields if not present
        defaults = {
            "age_range": "25-44",
            "location": "United States",
            "industry": "Technology",
            "company_size": "SME",
            "psychographics": {},
            "pain_points": [],
            "goals": [],
            "preferred_channels": []
        }
        
        for field, default_value in defaults.items():
            if field not in persona_data:
                persona_data[field] = default_value
        
        # Use base class create method
        return await self.create_resource(persona_data)

    async def find_similar_personas(
        self,
        criteria: Dict[str, Any],
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Find personas similar to given criteria.
        
        Args:
            criteria: Attributes to match (role, industry, company_size, etc.)
            limit: Maximum number of similar personas to return
            
        Returns:
            Dictionary with similar personas
        """
        logger.info(f"Finding personas similar to: {criteria}")
        
        # Build search query from criteria
        search_parts = []
        if "role" in criteria:
            search_parts.append(criteria["role"])
        if "industry" in criteria:
            search_parts.append(criteria["industry"])
        if "company_size" in criteria:
            search_parts.append(criteria["company_size"])
        
        if not search_parts:
            return {
                "success": False,
                "resources": [],
                "message": "No search criteria provided"
            }
        
        query = " ".join(search_parts)
        
        # Use base class search with specific fields
        return await self.search_resources(
            query=query,
            search_fields=["name", "role", "industry", "company_size", "demographics"],
            limit=limit
        )

    async def get_personas_by_segment(
        self,
        segment: str,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        Get personas filtered by market segment.
        
        Args:
            segment: Market segment (e.g., "enterprise", "sme", "startup")
            limit: Maximum number of personas to return
            
        Returns:
            Dictionary with personas in the segment
        """
        logger.info(f"Getting personas for segment: {segment}")
        
        # Map segment to company_size values
        segment_mapping = {
            "enterprise": ["Enterprise", "Large"],
            "sme": ["SME", "Medium"],
            "startup": ["Startup", "Small"]
        }
        
        company_sizes = segment_mapping.get(segment.lower(), [segment])
        
        # Use base list with filters
        filters = {
            "company_size": company_sizes[0] if company_sizes else segment
        }
        
        return await self.list_resources(
            limit=limit,
            filters=filters
        )

    async def bulk_update_personas(
        self,
        persona_ids: list[str],
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update multiple personas with the same changes.
        
        Args:
            persona_ids: List of persona UUIDs to update
            updates: Changes to apply to all personas
            
        Returns:
            Dictionary with update results
        """
        logger.info(f"Bulk updating {len(persona_ids)} personas")
        
        success_count = 0
        failed_ids = []
        
        for persona_id in persona_ids:
            result = await self.update_resource(persona_id, updates)
            if result["success"]:
                success_count += 1
            else:
                failed_ids.append(persona_id)
        
        return {
            "success": len(failed_ids) == 0,
            "updated_count": success_count,
            "failed_ids": failed_ids,
            "message": f"Updated {success_count}/{len(persona_ids)} personas"
        }

    async def get_persona_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about personas in the organization.
        
        Returns:
            Dictionary with persona statistics
        """
        logger.info("Getting persona statistics")
        
        try:
            # Get all personas (including archived for stats)
            all_result = await self.list_resources(
                limit=1000,
                include_archived=True
            )
            
            if not all_result["success"]:
                return {
                    "success": False,
                    "statistics": None,
                    "message": "Failed to retrieve personas for statistics"
                }
            
            personas = all_result["resources"]
            
            # Calculate statistics
            stats = {
                "total_count": len(personas),
                "active_count": sum(1 for p in personas if not p.get("archived_at")),
                "archived_count": sum(1 for p in personas if p.get("archived_at")),
                "by_industry": {},
                "by_role": {},
                "by_company_size": {}
            }
            
            # Group by categories
            for persona in personas:
                if not persona.get("archived_at"):
                    # Industry
                    industry = persona.get("industry", "Unknown")
                    stats["by_industry"][industry] = stats["by_industry"].get(industry, 0) + 1
                    
                    # Role
                    role = persona.get("role", "Unknown")
                    stats["by_role"][role] = stats["by_role"].get(role, 0) + 1
                    
                    # Company size
                    size = persona.get("company_size", "Unknown")
                    stats["by_company_size"][size] = stats["by_company_size"].get(size, 0) + 1
            
            return {
                "success": True,
                "statistics": stats,
                "message": "Persona statistics retrieved successfully"
            }
            
        except Exception as e:
            logger.error(f"Error getting persona statistics: {str(e)}")
            return {
                "success": False,
                "statistics": None,
                "error": str(e),
                "message": "Failed to calculate persona statistics"
            }