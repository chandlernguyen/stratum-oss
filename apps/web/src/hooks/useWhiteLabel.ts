import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useParams } from 'react-router-dom';
import { useUserIdentity } from './data/useUserIdentity';

interface BrandKit {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_family?: string;
}

interface WhiteLabelData {
  clientName: string;
  brandKit: BrandKit;
}

/**
 * Hook to fetch white-label branding for a specific client
 * Used in guest dashboards to apply client-specific branding
 *
 * Returns:
 * - clientName: The client's name
 * - brandKit: JSONB object with branding configuration
 *   - logo_url: URL to client logo
 *   - primary_color: Hex color for primary brand color
 *   - secondary_color: Hex color for secondary brand color
 *   - accent_color: Hex color for accent/CTA color
 *   - font_family: Custom font family name
 *
 * Usage:
 * - Guest dashboard applies these via CSS custom properties
 * - Logo replaces default header logo
 * - Colors override default theme
 * - Font family changes typography
 *
 * @returns React Query result with white-label data
 */
export function useWhiteLabel() {
  const { clientId } = useParams<{ clientId: string }>();
  // Get org_id from user identity (required for schema routing)
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['whiteLabel', clientId, orgId],
    queryFn: async () => {
      if (!clientId || !orgId) {
        return null;
      }

      // Use schema-aware router function (migration 166-167)
      const { data, error } = await supabase.rpc('get_client_branding_routed', {
        p_org_id: orgId,
        p_client_id: clientId
      });

      if (error) {
        console.error('[useWhiteLabel] Error fetching white-label branding:', error);
        throw error;
      }

      // Router function returns JSONB with clientName and brandKit
      return {
        clientName: data?.clientName || 'Unknown',
        brandKit: (data?.brandKit as BrandKit) || {},
      } as WhiteLabelData;
    },
    enabled: !!clientId && !!orgId,
    staleTime: 60 * 60 * 1000, // 1 hour - branding rarely changes
    refetchOnWindowFocus: false, // No need to refetch on focus
    retry: 1, // Retry once on failure
  });
}
