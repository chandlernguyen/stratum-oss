#!/usr/bin/env python3
"""
Unit tests for locale middleware normalization.

Focus on header parsing behavior that will matter for multilingual rollout,
especially regional aliases and fallback handling.
"""

import sys
from pathlib import Path
from types import SimpleNamespace

# Add project root to path for imports
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.append(str(PROJECT_ROOT))

from apps.api.middleware.locale import get_locale_from_request, parse_accept_language


class TestParseAcceptLanguage:
    def test_prefers_explicit_regional_match(self):
        assert parse_accept_language("zh-HK,zh;q=0.9,en;q=0.8") == "zh-HK"

    def test_maps_generic_chinese_to_zh_cn(self):
        assert parse_accept_language("zh,zh-TW;q=0.9,en;q=0.8") == "zh-CN"

    def test_maps_brazilian_portuguese(self):
        assert parse_accept_language("pt-BR,pt;q=0.9,en;q=0.8") == "pt-BR"

    def test_respects_quality_order(self):
        assert parse_accept_language("fr-FR;q=0.8,vi;q=0.9,en;q=0.7") == "vi"

    def test_returns_none_for_only_unsupported_locales(self):
        assert parse_accept_language("ru-RU,ar;q=0.9") is None

    def test_handles_invalid_quality_values(self):
        assert parse_accept_language("ko;q=bad,en;q=0.8") == "ko"

    def test_handles_empty_header(self):
        assert parse_accept_language("") is None


class TestGetLocaleFromRequest:
    def test_returns_state_locale_when_present(self):
        request = SimpleNamespace(state=SimpleNamespace(locale="es"))
        assert get_locale_from_request(request) == "es"

    def test_falls_back_to_default_locale(self):
        request = SimpleNamespace(state=SimpleNamespace())
        assert get_locale_from_request(request) == "en"
