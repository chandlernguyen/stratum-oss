"""
Schema Router Service - Routes database queries to correct schema based on org_type

This service provides a thin routing layer to direct queries to either the `public` schema
(for SME organizations) or the `agency` schema (for Agency organizations), enabling
independent evolution of features for different audiences while maintaining DRY code.

Key Design Principles:
- Zero changes to SME functionality (stays in public schema)
- Clean separation for agency features (new agency schema)
- DRY code - same business logic, different data sources
- Simple routing based on org_type enum ('SME' | 'AGENCY')

Related Documentation:
- /docs/SEPARATE_SCHEMA_ARCHITECTURE_DECISION_2025_10_27.md
- Migration 153: create_agency_schema
- Migration 154: agency_client_management_functions

Created: 2025-10-27
"""

from typing import Literal, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class OrgType(str, Enum):
    """Organization type enum - determines schema routing"""
    SME = "SME"
    AGENCY = "AGENCY"


class SchemaRouter:
    """
    Routes database queries to the correct schema based on organization type.

    Usage:
        router = SchemaRouter(org_type="AGENCY")
        schema = router.get_schema()  # Returns "agency"
        table = router.get_table_name("clients")  # Returns "agency.clients"

        # Check if client scoping should be used
        if router.should_use_client_scoping():
            # Agency queries need client_id filtering
            query += " WHERE client_id = ?"
    """

    def __init__(self, org_type: str):
        """
        Initialize router with organization type.

        Args:
            org_type: Organization type enum value ('SME' or 'AGENCY')

        Raises:
            ValueError: If org_type is not valid
        """
        try:
            self.org_type = OrgType(org_type)
        except ValueError:
            logger.error(f"Invalid org_type: {org_type}. Must be 'SME' or 'AGENCY'")
            raise ValueError(f"Invalid org_type: {org_type}. Must be 'SME' or 'AGENCY'")

    def get_schema(self) -> str:
        """
        Get the schema name for this organization type.

        Returns:
            "agency" for AGENCY orgs, "public" for SME orgs

        Examples:
            >>> router = SchemaRouter("AGENCY")
            >>> router.get_schema()
            'agency'

            >>> router = SchemaRouter("SME")
            >>> router.get_schema()
            'public'
        """
        if self.org_type == OrgType.AGENCY:
            return "agency"
        return "public"

    def get_table_name(self, base_table: str) -> str:
        """
        Get the fully qualified table name (schema.table).

        Args:
            base_table: Base table name without schema prefix (e.g., "clients")

        Returns:
            Fully qualified table name (e.g., "agency.clients" or "public.clients")

        Examples:
            >>> router = SchemaRouter("AGENCY")
            >>> router.get_table_name("clients")
            'agency.clients'

            >>> router.get_table_name("client_intelligence")
            'agency.client_intelligence'

            >>> router = SchemaRouter("SME")
            >>> router.get_table_name("campaigns")
            'public.campaigns'
        """
        schema = self.get_schema()
        return f"{schema}.{base_table}"

    def should_use_client_scoping(self) -> bool:
        """
        Determine if queries should be scoped by client_id.

        Agency organizations manage multiple clients, so queries need client_id filtering.
        SME organizations have a single implicit client (themselves), so no client_id needed.

        Returns:
            True for AGENCY orgs (requires client_id filtering)
            False for SME orgs (no client_id filtering)

        Examples:
            >>> router = SchemaRouter("AGENCY")
            >>> router.should_use_client_scoping()
            True

            >>> router = SchemaRouter("SME")
            >>> router.should_use_client_scoping()
            False
        """
        return self.org_type == OrgType.AGENCY

    def get_function_name(self, base_function: str) -> str:
        """
        Get the fully qualified function name (schema.function).

        Args:
            base_function: Base function name without schema prefix (e.g., "update_client")

        Returns:
            Fully qualified function name (e.g., "agency.update_client" or "public.update_client")

        Examples:
            >>> router = SchemaRouter("AGENCY")
            >>> router.get_function_name("update_client")
            'agency.update_client'

            >>> router.get_function_name("restore_client")
            'agency.restore_client'

            >>> router = SchemaRouter("SME")
            >>> router.get_function_name("update_client")
            'public.update_client'
        """
        schema = self.get_schema()

        # For public schema, functions are in the default namespace
        # So we can omit the schema prefix (backward compatible)
        if schema == "public":
            return base_function

        return f"{schema}.{base_function}"

    @staticmethod
    def from_org_dict(org_data: dict) -> "SchemaRouter":
        """
        Create SchemaRouter from organization data dictionary.

        Args:
            org_data: Dictionary containing organization data with 'type' field

        Returns:
            SchemaRouter instance

        Raises:
            ValueError: If org_data is missing or has invalid 'type' field

        Examples:
            >>> org_data = {"id": "123", "type": "AGENCY", "name": "Test Agency"}
            >>> router = SchemaRouter.from_org_dict(org_data)
            >>> router.get_schema()
            'agency'
        """
        if not org_data or 'type' not in org_data:
            raise ValueError("org_data must contain 'type' field")

        return SchemaRouter(org_type=org_data['type'])

    def log_routing_info(self, operation: str, table: Optional[str] = None):
        """
        Log routing information for debugging.

        Args:
            operation: Description of the operation being routed
            table: Optional table name being accessed
        """
        schema = self.get_schema()
        client_scoping = "with client scoping" if self.should_use_client_scoping() else "without client scoping"

        if table:
            full_table = self.get_table_name(table)
            logger.info(
                f"[SchemaRouter] {operation} → {full_table} ({client_scoping})"
            )
        else:
            logger.info(
                f"[SchemaRouter] {operation} → {schema} schema ({client_scoping})"
            )


# Convenience functions for common operations

def get_schema_for_org_type(org_type: str) -> str:
    """
    Convenience function to get schema for an org_type.

    Args:
        org_type: Organization type ('SME' or 'AGENCY')

    Returns:
        Schema name ('public' or 'agency')
    """
    router = SchemaRouter(org_type)
    return router.get_schema()


def get_table_name_for_org(org_type: str, table: str) -> str:
    """
    Convenience function to get fully qualified table name.

    Args:
        org_type: Organization type ('SME' or 'AGENCY')
        table: Base table name

    Returns:
        Fully qualified table name (e.g., 'agency.clients')
    """
    router = SchemaRouter(org_type)
    return router.get_table_name(table)


def should_use_client_scoping_for_org(org_type: str) -> bool:
    """
    Convenience function to check if client scoping is needed.

    Args:
        org_type: Organization type ('SME' or 'AGENCY')

    Returns:
        True if client scoping should be used, False otherwise
    """
    router = SchemaRouter(org_type)
    return router.should_use_client_scoping()


# Module-level constants for common use cases
SME_SCHEMA = "public"
AGENCY_SCHEMA = "agency"

# Table mappings for reference
TABLE_MAPPING = {
    "clients": {
        "SME": "public.clients",
        "AGENCY": "agency.clients"
    },
    "client_intelligence": {
        "SME": None,  # SME doesn't use client_intelligence (single implicit client)
        "AGENCY": "agency.client_intelligence"
    },
    "campaigns": {
        "SME": "public.campaigns",  # Shared table, filtered by org_id
        "AGENCY": "public.campaigns"  # Shared table, filtered by org_id + client_id
    },
    "marketing_strategies": {
        "SME": "public.marketing_strategies",  # Shared table
        "AGENCY": "public.marketing_strategies"  # Shared table
    },
    "agent_outputs": {
        "SME": "public.agent_outputs",  # Shared table
        "AGENCY": "public.agent_outputs"  # Shared table
    }
}


if __name__ == "__main__":
    # Quick test / example usage
    print("=== SchemaRouter Examples ===\n")

    # Example 1: Agency organization
    print("Example 1: Agency Organization")
    agency_router = SchemaRouter("AGENCY")
    print(f"  Schema: {agency_router.get_schema()}")
    print(f"  Clients table: {agency_router.get_table_name('clients')}")
    print(f"  Intelligence table: {agency_router.get_table_name('client_intelligence')}")
    print(f"  Update function: {agency_router.get_function_name('update_client')}")
    print(f"  Client scoping: {agency_router.should_use_client_scoping()}")

    print("\nExample 2: SME Organization")
    sme_router = SchemaRouter("SME")
    print(f"  Schema: {sme_router.get_schema()}")
    print(f"  Clients table: {sme_router.get_table_name('clients')}")
    print(f"  Update function: {sme_router.get_function_name('update_client')}")
    print(f"  Client scoping: {sme_router.should_use_client_scoping()}")

    print("\nExample 3: From Organization Dictionary")
    org_data = {"id": "123", "type": "AGENCY", "name": "Test Agency"}
    router = SchemaRouter.from_org_dict(org_data)
    print(f"  Schema: {router.get_schema()}")
    print(f"  Campaigns table: {router.get_table_name('campaigns')}")

    print("\nExample 4: Logging")
    router.log_routing_info("Fetching client data", "clients")
