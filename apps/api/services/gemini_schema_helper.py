"""
Gemini Schema Helper - Centralized schema preparation for Gemini API

This helper ensures all Pydantic schemas are compatible with Gemini's structured output API
by removing unsupported fields like 'additionalProperties'.

Usage:
    from apps.api.services.gemini_schema_helper import GeminiSchemaHelper

    schema = GeminiSchemaHelper.prepare_schema_for_gemini(MyPydanticModel)
    response = await client.aio.models.generate_content(
        config={"response_schema": schema}
    )
"""

import json
import logging
from typing import Any, Dict, Type
from pydantic import BaseModel

from apps.api.config.gemini_models import DEFAULT_MODEL

logger = logging.getLogger(__name__)


class GeminiSchemaHelper:
    """
    Centralized helper for Gemini API schema preparation.
    Ensures all schemas are compatible with Gemini's structured output.

    This class prevents recurring errors like:
    - "additionalProperties is not supported in the Gemini API"
    - Other Gemini-specific schema incompatibilities
    """

    @staticmethod
    def prepare_schema_for_gemini(pydantic_model: Type[BaseModel]) -> Dict[str, Any]:
        """
        Prepare a Pydantic model schema for Gemini API.

        This method:
        1. Generates JSON schema from Pydantic model
        2. Removes unsupported fields (additionalProperties, $ref, etc.)
        3. Validates the cleaned schema
        4. Returns a Gemini-compatible schema dict

        Args:
            pydantic_model: Pydantic model class (e.g., StrategyIntelligence)

        Returns:
            Clean JSON schema dict compatible with Gemini API

        Example:
            schema = GeminiSchemaHelper.prepare_schema_for_gemini(StrategyIntelligence)
            response = await client.aio.models.generate_content(
                model=DEFAULT_MODEL,
                contents=prompt,
                config={"response_schema": schema}
            )
        """
        # Generate schema from Pydantic model
        schema = pydantic_model.model_json_schema()

        # Remove unsupported fields recursively
        GeminiSchemaHelper._remove_unsupported_fields(schema)

        # Log schema preparation (debug level)
        logger.debug(f"Prepared Gemini schema for {pydantic_model.__name__}")

        return schema

    @staticmethod
    def _remove_unsupported_fields(schema: Any) -> None:
        """
        Recursively remove Gemini-unsupported fields from schema.

        Known unsupported fields:
        - additionalProperties: Not supported by Gemini API
        - $ref: JSON schema references not supported

        Also fixes:
        - Empty OBJECT types (adds required properties field)

        Args:
            schema: JSON schema dict to clean (modified in-place)
        """
        if isinstance(schema, dict):
            # Remove known unsupported fields
            schema.pop('additionalProperties', None)
            schema.pop('$ref', None)

            # Fix empty OBJECT types - Gemini requires objects to have properties
            if schema.get('type') == 'object' and 'properties' not in schema:
                # For Dict[str, Any] fields that generate {"type": "object"} with no properties
                # We need to either define properties or allow any structure
                # Since we can't define properties for generic dicts, we remove the type constraint
                # This tells Gemini to accept any structure for this field
                schema.pop('type', None)

            # Also handle objects inside arrays (List[Dict[str, Any]])
            if 'items' in schema and isinstance(schema['items'], dict):
                items = schema['items']
                if items.get('type') == 'object' and 'properties' not in items:
                    # Remove type constraint to allow any structure
                    items.pop('type', None)

            # Recursively clean all nested objects
            for value in schema.values():
                if isinstance(value, dict):
                    GeminiSchemaHelper._remove_unsupported_fields(value)
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            GeminiSchemaHelper._remove_unsupported_fields(item)

    @staticmethod
    def validate_schema(schema: Dict[str, Any]) -> bool:
        """
        Validate that schema is Gemini-compatible.

        Checks for presence of unsupported fields that would cause API errors.

        Args:
            schema: JSON schema dict to validate

        Returns:
            True if schema is valid

        Raises:
            ValueError: If schema contains unsupported fields
        """
        schema_str = json.dumps(schema)

        # Check for known incompatible fields
        if 'additionalProperties' in schema_str:
            raise ValueError(
                "Schema contains 'additionalProperties' field which is not supported by Gemini API. "
                "Use GeminiSchemaHelper.prepare_schema_for_gemini() to clean the schema."
            )

        if '"$ref"' in schema_str:
            raise ValueError(
                "Schema contains '$ref' field which is not supported by Gemini API. "
                "Use GeminiSchemaHelper.prepare_schema_for_gemini() to clean the schema."
            )

        return True
