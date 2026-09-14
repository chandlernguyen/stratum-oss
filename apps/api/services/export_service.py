"""
Export Service

Centralized service for generating exports in various formats (PDF, Text, JSON).
Provides backend export functionality with proper security and formatting.

Features:
- JSON export with structured data
- Plain text generation with formatting
- CSV sanitization for secure exports
- Custom branding support
- Agent-specific formatting

Date: 2025-10-17
Security: All exports require authentication
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import json
import re


class ExportService:
    """Service for exporting agent outputs in various formats"""

    @staticmethod
    def sanitize_csv_cell(value: Any) -> str:
        """
        Sanitize a single CSV cell value to prevent formula injection.

        Prevents CSV injection attacks by escaping dangerous characters
        that can trigger formula execution: = + - @ \\t \\r

        Args:
            value: Any value to be written to a CSV cell

        Returns:
            Sanitized string safe for CSV export
        """
        if value is None:
            return ''

        str_value = str(value)

        # Prevent formula injection by escaping dangerous characters
        if re.match(r'^[=+\-@\t\r]', str_value):
            return f"'{str_value}"  # Prefix with single quote to treat as text

        # Escape special CSV characters (quotes, commas, newlines)
        if ',' in str_value or '"' in str_value or '\n' in str_value:
            return f'"{str_value.replace(chr(34), chr(34) + chr(34))}"'

        return str_value

    @staticmethod
    def generate_safe_csv(data: List[Dict[str, Any]], headers: Optional[List[str]] = None) -> str:
        """
        Generate a safe CSV string from array of objects.

        Args:
            data: Array of objects to export
            headers: Optional array of header names (uses object keys if not provided)

        Returns:
            CSV string with sanitized values
        """
        if not data:
            return ''

        # Use provided headers or extract from first object
        csv_headers = headers or list(data[0].keys())

        # Create header row
        header_row = ','.join(ExportService.sanitize_csv_cell(h) for h in csv_headers)

        # Create data rows
        data_rows = []
        for row in data:
            sanitized_values = [ExportService.sanitize_csv_cell(row.get(header, '')) for header in csv_headers]
            data_rows.append(','.join(sanitized_values))

        return '\n'.join([header_row] + data_rows)

    @staticmethod
    def format_key(key: str) -> str:
        """
        Format object keys for human-readable display.

        Converts snake_case and camelCase to Title Case.

        Args:
            key: The key to format

        Returns:
            Formatted key string
        """
        # Replace underscores with spaces
        formatted = key.replace('_', ' ')
        # Add space before capital letters (for camelCase)
        formatted = re.sub(r'([A-Z])', r' \1', formatted)
        # Capitalize first letter of each word
        formatted = formatted.title()
        return formatted.strip()

    @staticmethod
    def format_content_for_text(content: Any, indent: int = 0) -> str:
        """
        Format content for plain text display.

        Recursively formats nested objects, arrays, and primitive values
        into a readable plain text structure.

        Args:
            content: The content to format
            indent: Current indentation level

        Returns:
            Formatted text string
        """
        indent_str = '  ' * indent

        if isinstance(content, str):
            return content

        if isinstance(content, dict):
            lines = []
            for key, value in content.items():
                formatted_key = ExportService.format_key(key)

                if isinstance(value, dict):
                    lines.append(f"\n{indent_str}{formatted_key}:")
                    lines.append('-' * (len(formatted_key) + len(indent_str)))
                    lines.append(ExportService.format_content_for_text(value, indent + 1))
                elif isinstance(value, list):
                    lines.append(f"\n{indent_str}{formatted_key}:")
                    for i, item in enumerate(value, 1):
                        item_str = json.dumps(item) if isinstance(item, dict) else str(item)
                        lines.append(f"{indent_str}  {i}. {item_str}")
                else:
                    lines.append(f"{indent_str}{formatted_key}: {value}")

            return '\n'.join(lines)

        if isinstance(content, list):
            lines = []
            for i, item in enumerate(content, 1):
                item_str = json.dumps(item, indent=2) if isinstance(item, dict) else str(item)
                lines.append(f"{indent_str}{i}. {item_str}")
            return '\n'.join(lines)

        return str(content)

    @staticmethod
    def generate_text_export(
        title: str,
        agent_name: str,
        content: Any,
        created_at: datetime,
        organization_name: Optional[str] = None,
        include_metadata: bool = True
    ) -> str:
        """
        Generate a formatted plain text export.

        Args:
            title: Output title
            agent_name: Name of the agent that generated the content
            content: The content to export
            created_at: Creation timestamp
            organization_name: Optional organization name for branding
            include_metadata: Whether to include metadata header

        Returns:
            Formatted text content
        """
        header_line = '=' * 70
        lines = []

        # Organization branding
        if organization_name:
            lines.append(organization_name)
            lines.append(header_line)
            lines.append('')

        # Title and metadata
        lines.append(title)
        lines.append(header_line)
        lines.append('')

        if include_metadata:
            lines.append(f"Agent: {agent_name}")
            lines.append(f"Generated: {created_at.strftime('%B %d, %Y at %I:%M %p')}")
            lines.append('')
            lines.append(header_line)
            lines.append('')

        # Content
        lines.append(ExportService.format_content_for_text(content))
        lines.append('')
        lines.append(header_line)
        lines.append('Generated with STRAŦUM - Marketing Intelligence Platform')

        return '\n'.join(lines)

    @staticmethod
    def generate_json_export(
        output_data: Dict[str, Any],
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """
        Generate a structured JSON export.

        Args:
            output_data: The output data to export
            include_metadata: Whether to include metadata fields

        Returns:
            Structured JSON object ready for export
        """
        export_data = {
            'title': output_data.get('title'),
            'agent_type': output_data.get('agent_type'),
            'content': output_data.get('content'),
            'created_at': output_data.get('created_at'),
            'exported_at': datetime.utcnow().isoformat()
        }

        if include_metadata:
            export_data['metadata'] = output_data.get('metadata', {})
            export_data['structured_data'] = output_data.get('structured_data')

        return export_data

    @staticmethod
    def get_export_filename(
        title: str,
        format: str,
        timestamp: Optional[datetime] = None
    ) -> str:
        """
        Generate a safe filename for exports.

        Args:
            title: The output title
            format: File format extension (pdf, txt, json, csv)
            timestamp: Optional timestamp (uses current time if not provided)

        Returns:
            Safe filename string
        """
        if timestamp is None:
            timestamp = datetime.utcnow()

        # Sanitize title for filename
        safe_title = re.sub(r'[^\w\s-]', '', title.lower())
        safe_title = re.sub(r'[\s_-]+', '-', safe_title)
        safe_title = safe_title.strip('-')

        # Add timestamp
        timestamp_str = timestamp.strftime('%Y-%m-%d')

        return f"{safe_title}-{timestamp_str}.{format}"


# Singleton instance for easy imports
export_service = ExportService()
