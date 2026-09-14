import { QueryClient } from '@tanstack/react-query';

/**
 * React Query Client Configuration with Stale-While-Revalidate Pattern
 *
 * Performance Optimization (Phase 2 Task 2.2):
 * - Serve cached data instantly (0ms perceived latency)
 * - Refresh in background to maintain freshness
 * - Automatic refetch on mount, focus, and reconnect
 *
 * Energy Efficiency:
 * - Users see instant responses from cache
 * - Network requests happen in background without blocking UI
 * - No loading spinners for refetches
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache Configuration
      staleTime: 2 * 60 * 1000,      // Data considered fresh for 2 minutes
      gcTime: 10 * 60 * 1000,        // Keep unused data in cache for 10 minutes (renamed from cacheTime in v5)

      // Stale-While-Revalidate Pattern (Optimized Dec 2025)
      // Changed from 'always' to true - now respects staleTime instead of refetching every mount
      refetchOnMount: true,           // Refetch only if data is stale
      refetchOnWindowFocus: true,     // Refetch only if data is stale
      refetchOnReconnect: true,       // Refetch only if data is stale

      // Error Handling
      retry: 1,                       // Retry failed requests once
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Performance
      // notifyOnChangeProps: 'tracked', // Only re-render when tracked properties change (TypeScript issue - commented for now)
    },

    mutations: {
      // Mutations should be retried cautiously
      retry: 0, // Don't retry mutations by default (could cause duplicates)
    },
  },
});
