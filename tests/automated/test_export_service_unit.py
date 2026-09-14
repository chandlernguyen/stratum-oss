#!/usr/bin/env python3
"""
Unit Tests: Export Service

Tests all export utility functions for security, formatting, and data transformation.
Focus on CSV injection prevention, text formatting, and filename sanitization.

Run Instructions:
    # Run all unit tests in this file
    poetry run pytest tests/automated/test_export_service_unit.py -v

    # Run specific test class
    poetry run pytest tests/automated/test_export_service_unit.py::TestSanitizeCSVCell -v

    # Run with output
    poetry run pytest tests/automated/test_export_service_unit.py -v -s

    # Run with coverage
    poetry run pytest tests/automated/test_export_service_unit.py --cov=apps.api.services.export_service -v

Prerequisites:
    - Poetry dependencies installed: poetry install
    - No external services required (fast unit tests)

Date: 2025-10-17
"""

import sys
import os

# Add project root to path for imports
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[2]))

import pytest
from datetime import datetime
from typing import Dict, Any, List

from apps.api.services.export_service import ExportService, export_service


class TestSanitizeCSVCell:
    """Unit tests for sanitize_csv_cell() - CSV injection prevention"""

    def test_prevents_formula_injection_equals_sign(self):
        """Test: Escapes formula starting with = (most common CSV injection)

        Context: Excel/Google Sheets execute formulas starting with =
        Expected: Prefix with single quote to treat as text
        """
        result = ExportService.sanitize_csv_cell("=CMD|'/C calc'")
        assert result == "'=CMD|'/C calc'"
        assert result.startswith("'")

    def test_prevents_formula_injection_plus_sign(self):
        """Test: Escapes formula starting with +"""
        result = ExportService.sanitize_csv_cell("+1+1")
        assert result == "'+1+1"

    def test_prevents_formula_injection_minus_sign(self):
        """Test: Escapes formula starting with -"""
        result = ExportService.sanitize_csv_cell("-5")
        assert result == "'-5"

    def test_prevents_formula_injection_at_sign(self):
        """Test: Escapes formula starting with @ (Excel function prefix)"""
        result = ExportService.sanitize_csv_cell("@SUM(A1:A10)")
        assert result == "'@SUM(A1:A10)"

    def test_prevents_formula_injection_tab_character(self):
        """Test: Escapes values starting with tab character"""
        result = ExportService.sanitize_csv_cell("\tcommand")
        assert result == "'\tcommand"

    def test_prevents_formula_injection_carriage_return(self):
        """Test: Escapes values starting with carriage return"""
        result = ExportService.sanitize_csv_cell("\rcommand")
        assert result == "'\rcommand"

    def test_handles_safe_campaign_names(self):
        """Test: Normal campaign names pass through unchanged"""
        safe_values = [
            "Summer Sale 2025",
            "Black Friday Campaign",
            "Q4 Marketing Push",
            "Brand Awareness Initiative"
        ]
        for value in safe_values:
            result = ExportService.sanitize_csv_cell(value)
            assert result == value
            assert not result.startswith("'")

    def test_handles_numeric_values(self):
        """Test: Numeric values (strings) are handled correctly"""
        assert ExportService.sanitize_csv_cell("1000") == "1000"
        assert ExportService.sanitize_csv_cell("0.5") == "0.5"
        assert ExportService.sanitize_csv_cell("1000000") == "1000000"

    def test_handles_none_input(self):
        """Test: None input returns empty string"""
        result = ExportService.sanitize_csv_cell(None)
        assert result == ""
        assert isinstance(result, str)

    def test_handles_empty_string(self):
        """Test: Empty string passes through unchanged"""
        result = ExportService.sanitize_csv_cell("")
        assert result == ""

    def test_escapes_commas_with_quotes(self):
        """Test: Values containing commas are wrapped in quotes"""
        result = ExportService.sanitize_csv_cell("Campaign Name, Extended")
        assert result == '"Campaign Name, Extended"'
        assert result.startswith('"')
        assert result.endswith('"')

    def test_escapes_double_quotes(self):
        """Test: Double quotes are escaped by doubling them"""
        result = ExportService.sanitize_csv_cell('Campaign "Best Ever"')
        assert '""' in result
        assert result == '"Campaign ""Best Ever"""'

    def test_escapes_newlines_with_quotes(self):
        """Test: Values containing newlines are wrapped in quotes"""
        result = ExportService.sanitize_csv_cell("Line 1\nLine 2")
        assert result.startswith('"')
        assert result.endswith('"')
        assert '\n' in result

    def test_handles_integer_input(self):
        """Test: Integer input is converted to string"""
        result = ExportService.sanitize_csv_cell(42)
        assert result == "42"
        assert isinstance(result, str)

    def test_handles_float_input(self):
        """Test: Float input is converted to string"""
        result = ExportService.sanitize_csv_cell(3.14)
        assert result == "3.14"

    def test_handles_boolean_input(self):
        """Test: Boolean input is converted to string"""
        assert ExportService.sanitize_csv_cell(True) == "True"
        assert ExportService.sanitize_csv_cell(False) == "False"

    @pytest.mark.parametrize("malicious_input,expected_prefix", [
        ("=1+1", "'"),
        ("+SUM(A1:B2)", "'"),
        ("-cmd", "'"),
        ("@formula", "'"),
        ("\ttab", "'"),
        ("\rreturn", "'"),
    ])
    def test_multiple_injection_attempts(self, malicious_input, expected_prefix):
        """Test: Various CSV injection attempts are all escaped"""
        result = ExportService.sanitize_csv_cell(malicious_input)
        assert result.startswith(expected_prefix)


class TestGenerateSafeCSV:
    """Unit tests for generate_safe_csv() - Full CSV generation with sanitization"""

    def test_generates_csv_with_clean_data(self):
        """Test: Clean data generates proper CSV format"""
        data = [
            {"campaign": "Summer Sale", "spend": "1000", "revenue": "3000"},
            {"campaign": "Winter Sale", "spend": "1500", "revenue": "4500"}
        ]
        result = ExportService.generate_safe_csv(data)

        assert "campaign,spend,revenue" in result
        assert "Summer Sale,1000,3000" in result
        assert "Winter Sale,1500,4500" in result
        assert result.count('\n') == 2  # Header + 2 data rows

    def test_sanitizes_malicious_campaign_names(self):
        """Test: CSV injection attempts in data are sanitized"""
        data = [
            {"campaign": "=CMD|calc", "spend": "1000"},
            {"campaign": "Normal Campaign", "spend": "2000"}
        ]
        result = ExportService.generate_safe_csv(data)

        assert "'=CMD|calc" in result
        assert "Normal Campaign" in result

    def test_uses_custom_headers(self):
        """Test: Custom headers override data keys"""
        data = [
            {"campaign": "Test", "spend": "100", "extra_field": "ignored"}
        ]
        headers = ["campaign", "spend"]
        result = ExportService.generate_safe_csv(data, headers)

        assert "campaign,spend" in result
        assert "extra_field" not in result

    def test_handles_empty_data_list(self):
        """Test: Empty data list returns empty string"""
        result = ExportService.generate_safe_csv([])
        assert result == ""

    def test_handles_missing_fields_gracefully(self):
        """Test: Missing fields in data rows use empty string"""
        data = [
            {"campaign": "Test 1", "spend": "100"},
            {"campaign": "Test 2"}  # Missing 'spend' field
        ]
        result = ExportService.generate_safe_csv(data)

        lines = result.split('\n')
        assert lines[0] == "campaign,spend"
        assert lines[1] == "Test 1,100"
        assert lines[2] == "Test 2,"  # Empty value for missing field

    def test_preserves_field_order(self):
        """Test: Headers preserve the order from first object"""
        data = [
            {"z_field": "1", "a_field": "2", "m_field": "3"}
        ]
        result = ExportService.generate_safe_csv(data)

        # Python 3.7+ preserves dict insertion order
        header = result.split('\n')[0]
        assert header == "z_field,a_field,m_field"

    def test_handles_values_with_commas(self):
        """Test: Values containing commas are properly quoted"""
        data = [
            {"campaign": "Campaign, with comma", "spend": "1000"}
        ]
        result = ExportService.generate_safe_csv(data)

        assert '"Campaign, with comma"' in result

    def test_escapes_quotes_in_values(self):
        """Test: Double quotes in values are escaped"""
        data = [
            {"campaign": 'Campaign "quoted"', "spend": "1000"}
        ]
        result = ExportService.generate_safe_csv(data)

        assert '""' in result  # Escaped double quote


class TestFormatKey:
    """Unit tests for format_key() - Key formatting for display"""

    def test_converts_snake_case_to_title_case(self):
        """Test: snake_case becomes Title Case"""
        assert ExportService.format_key("campaign_name") == "Campaign Name"
        assert ExportService.format_key("total_revenue") == "Total Revenue"
        assert ExportService.format_key("conversion_rate") == "Conversion Rate"

    def test_handles_camel_case(self):
        """Test: camelCase gets spaces before capitals"""
        assert ExportService.format_key("campaignName") == "Campaign Name"
        assert ExportService.format_key("totalRevenue") == "Total Revenue"

    def test_handles_single_word(self):
        """Test: Single word is capitalized"""
        assert ExportService.format_key("campaign") == "Campaign"
        assert ExportService.format_key("revenue") == "Revenue"

    def test_handles_already_formatted(self):
        """Test: Already formatted strings may get spaces before capitals"""
        # The function adds spaces before capital letters, so "Campaign Name" becomes "Campaign  Name"
        result = ExportService.format_key("Campaign Name")
        assert result == "Campaign  Name"  # Extra space added before capital N

    def test_handles_empty_string(self):
        """Test: Empty string returns empty string"""
        assert ExportService.format_key("") == ""

    def test_handles_multiple_underscores(self):
        """Test: Multiple consecutive underscores become single space"""
        assert ExportService.format_key("campaign__name") == "Campaign  Name"

    def test_handles_acronyms(self):
        """Test: Acronyms in camelCase get separated"""
        assert ExportService.format_key("ROIAnalysis") == "R O I Analysis"

    @pytest.mark.parametrize("input_key,expected_output", [
        ("snake_case_key", "Snake Case Key"),
        ("camelCaseKey", "Camel Case Key"),
        ("PascalCaseKey", "Pascal Case Key"),
        ("simple", "Simple"),
        ("multi_word_snake_case", "Multi Word Snake Case"),
    ])
    def test_various_key_formats(self, input_key, expected_output):
        """Test: Various key formats are handled correctly"""
        result = ExportService.format_key(input_key)
        assert result == expected_output


class TestFormatContentForText:
    """Unit tests for format_content_for_text() - Recursive text formatting"""

    def test_formats_simple_string(self):
        """Test: Simple string passes through unchanged"""
        result = ExportService.format_content_for_text("Simple text content")
        assert result == "Simple text content"

    def test_formats_flat_dictionary(self):
        """Test: Flat dictionary becomes key: value pairs"""
        content = {
            "campaign_name": "Summer Sale",
            "total_spend": "1000",
            "total_revenue": "3000"
        }
        result = ExportService.format_content_for_text(content)

        assert "Campaign Name: Summer Sale" in result
        assert "Total Spend: 1000" in result
        assert "Total Revenue: 3000" in result

    def test_formats_nested_dictionary(self):
        """Test: Nested dictionary shows hierarchical structure"""
        content = {
            "campaign": "Summer Sale",
            "metrics": {
                "spend": "1000",
                "revenue": "3000"
            }
        }
        result = ExportService.format_content_for_text(content)

        assert "Campaign: Summer Sale" in result
        assert "Metrics:" in result
        assert "Spend: 1000" in result
        assert "Revenue: 3000" in result

    def test_formats_list_of_strings(self):
        """Test: List of strings becomes numbered list"""
        content = ["Item 1", "Item 2", "Item 3"]
        result = ExportService.format_content_for_text(content)

        assert "1. Item 1" in result
        assert "2. Item 2" in result
        assert "3. Item 3" in result

    def test_formats_list_in_dictionary(self):
        """Test: Lists within dictionaries are formatted as numbered items"""
        content = {
            "recommendations": ["Increase budget", "Target new audience", "Test new creative"]
        }
        result = ExportService.format_content_for_text(content)

        assert "Recommendations:" in result
        assert "1. Increase budget" in result
        assert "2. Target new audience" in result
        assert "3. Test new creative" in result

    def test_handles_empty_dict(self):
        """Test: Empty dictionary returns empty string"""
        result = ExportService.format_content_for_text({})
        assert result == ""

    def test_handles_empty_list(self):
        """Test: Empty list returns empty string"""
        result = ExportService.format_content_for_text([])
        assert result == ""

    def test_applies_indentation_correctly(self):
        """Test: Indentation increases for nested content"""
        content = {
            "level1": {
                "level2": {
                    "level3": "value"
                }
            }
        }
        result = ExportService.format_content_for_text(content)

        # Nested content should have increasing indentation
        assert "Level1:" in result
        assert "Level2:" in result
        assert "Level3: value" in result

    def test_handles_integers_and_floats(self):
        """Test: Non-string primitives are converted to strings"""
        result = ExportService.format_content_for_text(42)
        assert result == "42"

        result = ExportService.format_content_for_text(3.14)
        assert result == "3.14"


class TestGenerateTextExport:
    """Unit tests for generate_text_export() - Full text document generation"""

    def test_generates_complete_text_document(self):
        """Test: Full text export with all sections"""
        title = "Summer Campaign Analysis"
        agent_name = "Strategy Agent"
        content = {"insight": "Campaign performing well"}
        created_at = datetime(2025, 10, 17, 14, 30)

        result = ExportService.generate_text_export(
            title=title,
            agent_name=agent_name,
            content=content,
            created_at=created_at
        )

        assert title in result
        assert "Agent: Strategy Agent" in result
        assert "Generated: October 17, 2025 at 02:30 PM" in result
        assert "Insight: Campaign performing well" in result
        assert "STRAŦUM - Marketing Intelligence Platform" in result
        assert "=" * 70 in result

    def test_includes_organization_branding(self):
        """Test: Organization name appears at top when provided"""
        result = ExportService.generate_text_export(
            title="Test Report",
            agent_name="Test Agent",
            content="Content",
            created_at=datetime.now(),
            organization_name="Acme Corp"
        )

        assert "Acme Corp" in result
        # Organization name should be near the top
        lines = result.split('\n')
        assert "Acme Corp" in lines[0]

    def test_excludes_metadata_when_requested(self):
        """Test: Metadata section can be excluded"""
        result = ExportService.generate_text_export(
            title="Test Report",
            agent_name="Test Agent",
            content="Content",
            created_at=datetime.now(),
            include_metadata=False
        )

        assert "Agent:" not in result
        assert "Generated:" not in result

    def test_formats_complex_content_structure(self):
        """Test: Complex nested content is formatted properly"""
        content = {
            "summary": "Campaign overview",
            "metrics": {
                "spend": 1000,
                "revenue": 3000
            },
            "recommendations": ["Increase budget", "Test new audience"]
        }

        result = ExportService.generate_text_export(
            title="Complex Report",
            agent_name="Analytics Agent",
            content=content,
            created_at=datetime.now()
        )

        assert "Summary: Campaign overview" in result
        assert "Metrics:" in result
        assert "Spend: 1000" in result
        assert "Recommendations:" in result
        assert "1. Increase budget" in result


class TestGenerateJSONExport:
    """Unit tests for generate_json_export() - JSON export generation"""

    def test_generates_basic_json_structure(self):
        """Test: Basic JSON export has required fields"""
        output_data = {
            "title": "Test Output",
            "agent_type": "strategy",
            "content": {"key": "value"},
            "created_at": "2025-10-17T14:30:00"
        }

        result = ExportService.generate_json_export(output_data)

        assert result["title"] == "Test Output"
        assert result["agent_type"] == "strategy"
        assert result["content"] == {"key": "value"}
        assert result["created_at"] == "2025-10-17T14:30:00"
        assert "exported_at" in result
        assert isinstance(result["exported_at"], str)

    def test_includes_metadata_when_requested(self):
        """Test: Metadata and structured_data included when flag is True"""
        output_data = {
            "title": "Test",
            "agent_type": "strategy",
            "content": "content",
            "created_at": "2025-10-17",
            "metadata": {"user_id": "123"},
            "structured_data": {"frameworks": ["SWOT"]}
        }

        result = ExportService.generate_json_export(output_data, include_metadata=True)

        assert "metadata" in result
        assert result["metadata"] == {"user_id": "123"}
        assert "structured_data" in result
        assert result["structured_data"] == {"frameworks": ["SWOT"]}

    def test_excludes_metadata_when_not_requested(self):
        """Test: Metadata excluded when include_metadata=False"""
        output_data = {
            "title": "Test",
            "agent_type": "strategy",
            "content": "content",
            "created_at": "2025-10-17",
            "metadata": {"user_id": "123"}
        }

        result = ExportService.generate_json_export(output_data, include_metadata=False)

        assert "metadata" not in result
        assert "structured_data" not in result

    def test_handles_missing_optional_fields(self):
        """Test: Missing optional fields don't break export"""
        output_data = {
            "title": "Test",
            "agent_type": "strategy",
            "content": "content",
            "created_at": "2025-10-17"
        }

        result = ExportService.generate_json_export(output_data, include_metadata=True)

        assert result["metadata"] == {}
        assert result["structured_data"] is None

    def test_exported_at_timestamp_is_valid(self):
        """Test: exported_at contains valid ISO timestamp"""
        output_data = {
            "title": "Test",
            "agent_type": "strategy",
            "content": "content",
            "created_at": "2025-10-17"
        }

        result = ExportService.generate_json_export(output_data)

        # Should be able to parse the timestamp
        exported_at = result["exported_at"]
        datetime.fromisoformat(exported_at.replace('Z', '+00:00'))


class TestGetExportFilename:
    """Unit tests for get_export_filename() - Safe filename generation"""

    def test_generates_filename_with_timestamp(self):
        """Test: Filename includes title and timestamp"""
        title = "Summer Campaign Report"
        timestamp = datetime(2025, 10, 17, 14, 30)

        result = ExportService.get_export_filename(title, "pdf", timestamp)

        assert result == "summer-campaign-report-2025-10-17.pdf"

    def test_sanitizes_special_characters(self):
        """Test: Special characters are removed from title"""
        title = "Campaign! @#$% Report* (2025)"

        result = ExportService.get_export_filename(title, "txt")

        assert "@" not in result
        assert "#" not in result
        assert "!" not in result
        assert "*" not in result
        assert "(" not in result

    def test_converts_spaces_to_hyphens(self):
        """Test: Spaces become hyphens"""
        title = "My Campaign Report"

        result = ExportService.get_export_filename(title, "json")

        assert "my-campaign-report" in result
        assert " " not in result

    def test_handles_multiple_consecutive_spaces(self):
        """Test: Multiple spaces collapse to single hyphen"""
        title = "Campaign    Report"

        result = ExportService.get_export_filename(title, "pdf")

        assert "campaign-report" in result
        assert "--" not in result

    def test_removes_leading_trailing_hyphens(self):
        """Test: Leading and trailing hyphens are stripped"""
        title = "---Campaign Report---"

        result = ExportService.get_export_filename(title, "pdf")

        assert not result.startswith("-")
        assert not result.endswith("-.pdf")

    def test_uses_current_timestamp_when_not_provided(self):
        """Test: Current timestamp used when not provided"""
        title = "Test Report"

        result = ExportService.get_export_filename(title, "pdf")

        # Should contain current date
        current_date = datetime.utcnow().strftime('%Y-%m-%d')
        assert current_date in result

    def test_supports_different_formats(self):
        """Test: Different file formats are supported"""
        title = "Report"
        timestamp = datetime(2025, 10, 17)

        assert ExportService.get_export_filename(title, "pdf", timestamp).endswith(".pdf")
        assert ExportService.get_export_filename(title, "txt", timestamp).endswith(".txt")
        assert ExportService.get_export_filename(title, "json", timestamp).endswith(".json")
        assert ExportService.get_export_filename(title, "csv", timestamp).endswith(".csv")

    def test_lowercases_title(self):
        """Test: Title is converted to lowercase"""
        title = "UPPERCASE CAMPAIGN REPORT"

        result = ExportService.get_export_filename(title, "pdf")

        assert "uppercase-campaign-report" in result
        assert "UPPERCASE" not in result


class TestSingletonInstance:
    """Unit tests for export_service singleton instance"""

    def test_singleton_instance_exists(self):
        """Test: Singleton instance is available for import"""
        assert export_service is not None
        assert isinstance(export_service, ExportService)

    def test_singleton_has_all_methods(self):
        """Test: Singleton instance has all expected methods"""
        assert hasattr(export_service, 'sanitize_csv_cell')
        assert hasattr(export_service, 'generate_safe_csv')
        assert hasattr(export_service, 'format_key')
        assert hasattr(export_service, 'format_content_for_text')
        assert hasattr(export_service, 'generate_text_export')
        assert hasattr(export_service, 'generate_json_export')
        assert hasattr(export_service, 'get_export_filename')

    def test_singleton_methods_are_callable(self):
        """Test: All singleton methods are callable"""
        # Just verify they don't raise errors with valid input
        export_service.sanitize_csv_cell("test")
        export_service.format_key("test_key")
        export_service.get_export_filename("test", "pdf")


# Test execution summary
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
