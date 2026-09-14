import axios from 'axios';
import { getValidToken } from '@/lib/authService';
import { getLocaleHeaderValue } from '@/lib/apiHeaders';
import { supabase } from '@/lib/supabase';
import { buildLocalizedPath, stripLocalePrefix } from '@/lib/localePath';
import { getCurrentLanguage } from '@/lib/i18n';

/**
 * Ensures API URL uses HTTPS in production environments
 * Prevents mixed content errors when site is loaded over HTTPS
 *
 * @param url - The URL to validate and potentially convert
 * @returns HTTPS URL for production, original URL for development
 */
function ensureHttpsInProduction(url: string): string {
  // Only convert in browser context when site is loaded over HTTPS
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    // Don't convert localhost/127.0.0.1 URLs (local development)
    if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      console.warn('[API] Converting HTTP to HTTPS for production:', url);
      const httpsUrl = url.replace('http://', 'https://');
      console.log('[API] Converted URL:', httpsUrl);
      return httpsUrl;
    }
  }
  return url;
}

// Get API URL from environment variable
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:56300';
export const API_BASE_URL = ensureHttpsInProduction(rawApiUrl);

// Export helper for direct fetch calls
export { ensureHttpsInProduction };

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests using centralized authService
api.interceptors.request.use(async (config) => {
  const headers = axios.AxiosHeaders.from(config.headers);
  headers.set('X-Locale', getLocaleHeaderValue());

  try {
    const token = await getValidToken();
    headers.set('Authorization', `Bearer ${token}`);
  } catch (error) {
    console.error('[API] Failed to get auth token:', error);
    // Continue without token - let the response interceptor handle 401
  }

  config.headers = headers;
  return config;
});

// Handle auth errors using centralized authService
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're on certain pages that handle auth differently
      const currentPath = stripLocalePrefix(window.location.pathname);
      const noRedirectPaths = [
        '/onboarding/business-context',
        '/signup',
        '/login'
      ];

      if (!noRedirectPaths.some(path => currentPath.startsWith(path))) {
        // Clear auth using Supabase and redirect to login
        await supabase.auth.signOut();
        window.location.href = buildLocalizedPath(getCurrentLanguage(), '/login');
      }
    }
    return Promise.reject(error);
  }
);
