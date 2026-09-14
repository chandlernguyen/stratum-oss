/**
 * useResourceActivity Hook
 *
 * Fetches activity history for a specific resource (output, campaign, etc.)
 * Shows WHO did WHAT WHEN and WHY
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ResourceActivity {
  id: string;
  activity_type: string;
  actor_name: string | null;
  actor_role: string | null;
  comment: string | null;
  details: Record<string, any>;
  created_at: string;
}

/**
 * Fetch activity history for a resource
 */
export function useResourceActivity(
  resourceType: string,
  resourceId: string | undefined,
  options?: { limit?: number; enabled?: boolean }
) {
  const { limit = 50, enabled = true } = options || {};

  return useQuery({
    queryKey: ['resource-activity', resourceType, resourceId],
    queryFn: async (): Promise<ResourceActivity[]> => {
      if (!resourceId) return [];

      const { data, error } = await supabase.rpc('get_resource_activity', {
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_limit: limit,
      });

      if (error) {
        console.error('[useResourceActivity] Error fetching activity:', error);
        throw error;
      }

      return data || [];
    },
    enabled: enabled && !!resourceId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get human-readable label for activity type
 */
export function getActivityLabel(activityType: string): string {
  const labels: Record<string, string> = {
    created: 'created this',
    updated: 'updated this',
    archived: 'archived this',
    restored: 'restored this',
    deleted: 'deleted this',
    approval_requested: 'requested approval',
    approved: 'approved this',
    rejected: 'rejected this',
    changes_requested: 'requested changes',
    published: 'published this',
    unpublished: 'unpublished this',
    viewed: 'viewed this',
    exported: 'exported this',
    shared: 'shared this',
  };
  return labels[activityType] || activityType;
}

/**
 * Get icon name for activity type (for use with lucide icons)
 */
export function getActivityIcon(activityType: string): string {
  const icons: Record<string, string> = {
    created: 'Plus',
    updated: 'Pencil',
    archived: 'Archive',
    restored: 'ArchiveRestore',
    deleted: 'Trash2',
    approval_requested: 'Send',
    approved: 'Check',
    rejected: 'X',
    changes_requested: 'MessageSquare',
    published: 'Globe',
    unpublished: 'GlobeLock',
    viewed: 'Eye',
    exported: 'Download',
    shared: 'Share2',
  };
  return icons[activityType] || 'Activity';
}

/**
 * Get color class for activity type
 */
export function getActivityColor(activityType: string): string {
  const colors: Record<string, string> = {
    created: 'text-green-600',
    updated: 'text-blue-600',
    archived: 'text-amber-600',
    restored: 'text-emerald-600',
    deleted: 'text-red-600',
    approval_requested: 'text-purple-600',
    approved: 'text-green-600',
    rejected: 'text-red-600',
    changes_requested: 'text-amber-600',
    published: 'text-green-600',
    unpublished: 'text-gray-600',
    viewed: 'text-gray-500',
    exported: 'text-blue-600',
    shared: 'text-blue-600',
  };
  return colors[activityType] || 'text-gray-600';
}
