"""
Canonical locale registry for STRAŦUM backend localization.

Tracks all planned locales while keeping only finished locales enabled for UI/runtime rollout.
"""

from __future__ import annotations

from typing import Final, Literal, TypedDict

DEFAULT_LOCALE: Final = "en"

SUPPORTED_LOCALES = (
    "en",
    "vi",
    "es",
    "fr",
    "ja",
    "ko",
    "zh-CN",
    "de",
    "pt-BR",
    "zh-HK",
)

ENABLED_LOCALES = ("en", "vi", "es", "fr", "ja", "ko", "zh-CN", "de", "pt-BR", "zh-HK")

SupportedLocale = Literal[
    "en",
    "vi",
    "es",
    "fr",
    "ja",
    "ko",
    "zh-CN",
    "de",
    "pt-BR",
    "zh-HK",
]


class LocaleConfig(TypedDict):
    enabled: bool
    intl_locale: str
    fallback_locale: SupportedLocale
    aliases: tuple[str, ...]


LOCALE_REGISTRY: Final[dict[SupportedLocale, LocaleConfig]] = {
    "en": {
        "enabled": True,
        "intl_locale": "en-US",
        "fallback_locale": "en",
        "aliases": ("en-us", "en-gb", "en-au", "en-ca"),
    },
    "vi": {
        "enabled": True,
        "intl_locale": "vi-VN",
        "fallback_locale": "en",
        "aliases": ("vi-vn",),
    },
    "es": {
        "enabled": True,
        "intl_locale": "es-ES",
        "fallback_locale": "en",
        "aliases": ("es-es", "es-419", "es-mx"),
    },
    "fr": {
        "enabled": True,
        "intl_locale": "fr-FR",
        "fallback_locale": "en",
        "aliases": ("fr-fr", "fr-ca"),
    },
    "ja": {
        "enabled": True,
        "intl_locale": "ja-JP",
        "fallback_locale": "en",
        "aliases": ("ja-jp",),
    },
    "ko": {
        "enabled": True,
        "intl_locale": "ko-KR",
        "fallback_locale": "en",
        "aliases": ("ko-kr",),
    },
    "zh-CN": {
        "enabled": True,
        "intl_locale": "zh-CN",
        "fallback_locale": "en",
        "aliases": ("zh", "zh-cn", "zh-sg", "zh-hans", "zh-hans-cn"),
    },
    "de": {
        "enabled": True,
        "intl_locale": "de-DE",
        "fallback_locale": "en",
        "aliases": ("de-de",),
    },
    "pt-BR": {
        "enabled": True,
        "intl_locale": "pt-BR",
        "fallback_locale": "en",
        "aliases": ("pt", "pt-br"),
    },
    "zh-HK": {
        "enabled": True,
        "intl_locale": "zh-HK",
        "fallback_locale": "en",
        "aliases": ("zh-hk", "zh-mo"),
    },
}

LOCALE_ALIAS_MAP: Final[dict[str, SupportedLocale]] = {}
for locale_code, config in LOCALE_REGISTRY.items():
    LOCALE_ALIAS_MAP[locale_code.lower()] = locale_code
    for alias in config["aliases"]:
        LOCALE_ALIAS_MAP[alias.lower()] = locale_code


def normalize_locale(locale: str | None) -> SupportedLocale | None:
    """Return the canonical locale code for an input locale string."""
    if not locale:
        return None
    normalized = locale.replace("_", "-").strip().lower()
    return LOCALE_ALIAS_MAP.get(normalized)


def is_supported_locale(locale: str | None) -> bool:
    return normalize_locale(locale) is not None


def is_enabled_locale(locale: str | None) -> bool:
    normalized = normalize_locale(locale)
    return normalized in ENABLED_LOCALES if normalized else False


def get_fallback_locale(locale: str | None) -> SupportedLocale:
    normalized = normalize_locale(locale) or DEFAULT_LOCALE
    return LOCALE_REGISTRY[normalized]["fallback_locale"]
