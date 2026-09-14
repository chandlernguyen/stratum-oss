/**
 * Runtime brand and site identity.
 *
 * These are deliberately configurable so that a self-hosted deployment does not
 * inherit the original author's branding — in particular the contact address,
 * which would otherwise route other people's support mail to them.
 *
 * Override via Vite env vars (see .env.example).
 */

const env = import.meta.env;

export const BRAND_NAME = env.VITE_BRAND_NAME || 'STRATUM';

export const CONTACT_EMAIL = env.VITE_CONTACT_EMAIL || 'support@example.com';

/**
 * Domain shown in the signup workspace-URL preview, e.g. `acme` + `.example.com`.
 * Configurable for the same reason as the rest: a self-hosted deployment should
 * not advertise the original author's domain to its own users.
 */
export const BRAND_DOMAIN = env.VITE_BRAND_DOMAIN || 'example.com';

/** Canonical site origin, no trailing slash. Used for SEO and canonical URLs. */
export const SITE_URL = (env.VITE_SITE_URL || 'http://localhost:56310').replace(/\/+$/, '');

/** Optional attribution. Leave unset to omit author metadata entirely. */
export const AUTHOR_NAME = env.VITE_AUTHOR_NAME || '';

export const AUTHOR_URL = env.VITE_AUTHOR_URL || '';

/** Optional. When unset, author-specific contact cards are hidden. */
export const AUTHOR_LINKEDIN = env.VITE_AUTHOR_LINKEDIN || '';
