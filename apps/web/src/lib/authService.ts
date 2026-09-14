/**
 * Centralized Authentication Service
 * Eliminates 5+ different auth patterns across the application
 * Provides consistent token management, automatic refresh, and error handling
 */

import { supabase } from '@/lib/supabase';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getLocaleHeaders } from '@/lib/apiHeaders';

interface AuthServiceConfig {
  maxRetries?: number;
  retryDelay?: number;
  tokenRefreshThreshold?: number; // seconds before expiry to refresh
}

interface AuthSSEOptions {
  method?: string;
  body?: string;
  onMessage: (data: any) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  signal?: AbortSignal;
}

class AuthServiceClass {
  private config: Required<AuthServiceConfig> = {
    maxRetries: 3,
    retryDelay: 1000,
    tokenRefreshThreshold: 300 // 5 minutes
  };

  constructor(config?: AuthServiceConfig) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Get a valid authentication token, refreshing if necessary
   */
  async getValidToken(): Promise<string> {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error('Authentication failed. Please refresh the page and try again.');
    }

    // Check if token is close to expiry and refresh if needed
    const tokenExp = this.getTokenExpiration(session.access_token);
    const now = Math.floor(Date.now() / 1000);

    if (tokenExp && (tokenExp - now) < this.config.tokenRefreshThreshold) {
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session?.access_token) {
          throw new Error('Failed to refresh authentication token.');
        }
        return refreshData.session.access_token;
      } catch (refreshErr) {
        console.warn('Token refresh failed, using current token:', refreshErr);
        return session.access_token;
      }
    }

    return session.access_token;
  }

  /**
   * Enhanced fetch with automatic authentication and retry logic
   */
  async authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const token = await this.getValidToken();
        const headers = getLocaleHeaders(options.headers);
        headers['Content-Type'] = 'application/json';
        headers.Authorization = `Bearer ${token}`;

        const response = await fetch(url, {
          ...options,
          headers,
        });

        // If auth error and we have retries left, try again with fresh token
        if ((response.status === 401 || response.status === 403) && attempt < this.config.maxRetries) {
          await this.forceTokenRefresh();
          await this.delay(this.config.retryDelay * (attempt + 1));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * (attempt + 1));
          continue;
        }
      }
    }

    throw this.enhanceError(lastError!);
  }

  /**
   * Server-Sent Events with authentication and reconnection logic
   */
  async authSSE(url: string, options: AuthSSEOptions): Promise<void> {
    const token = await this.getValidToken();
    const headers = getLocaleHeaders();
    headers['Content-Type'] = 'application/json';
    headers.Authorization = `Bearer ${token}`;

    return fetchEventSource(url, {
      method: options.method || 'POST',
      headers,
      body: options.body,
      signal: options.signal,
      onmessage: (event) => {
        if (event.data) {
          try {
            const data = JSON.parse(event.data);
            options.onMessage(data);
          } catch (parseErr) {
            options.onMessage({ text: event.data });
          }
        }
      },
      onerror: (error) => {
        console.error('SSE Error:', error);
        options.onError?.(error instanceof Error ? error : new Error(String(error)));
      },
      onclose: () => {
        options.onComplete?.();
      }
    });
  }

  /**
   * Force token refresh by clearing current session and getting new one
   */
  private async forceTokenRefresh(): Promise<void> {
    try {
      await supabase.auth.refreshSession();
    } catch (error) {
      console.warn('Force refresh failed:', error);
    }
  }

  /**
   * Extract expiration time from JWT token
   */
  private getTokenExpiration(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp;
    } catch {
      return null;
    }
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhance error messages for better user experience
   */
  private enhanceError(error: Error): Error {
    const message = error.message.toLowerCase();

    if (message.includes('authentication failed') || message.includes('invalid token')) {
      return new Error('Your session has expired. Please refresh the page and try again.');
    }

    if (message.includes('network') || message.includes('fetch')) {
      return new Error('Network error. Please check your connection and try again.');
    }

    return error;
  }
}

// Export singleton instance
export const authService = new AuthServiceClass();

// Export convenience functions
export const getValidToken = () => authService.getValidToken();
export const authFetch = (url: string, options?: RequestInit) => authService.authFetch(url, options);
export const authSSE = (url: string, options: AuthSSEOptions) => authService.authSSE(url, options);

// Export types for TypeScript consumers
export type { AuthSSEOptions };
