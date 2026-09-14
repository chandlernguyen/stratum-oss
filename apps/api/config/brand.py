"""
Runtime brand and site identity.

These are deliberately configurable so that a self-hosted deployment does not
inherit the original author's branding — in particular the contact address,
which would otherwise route other people's support mail to them.

Override via environment variables (see .env.example).
"""

import os

BRAND_NAME = os.getenv("BRAND_NAME", "STRATUM")

CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "support@example.com")

# Canonical site origin, no trailing slash.
SITE_URL = os.getenv("SITE_URL", "http://localhost:56310").rstrip("/")
