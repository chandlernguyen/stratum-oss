import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Organization } from './useOrganization';

// This interface should ideally be in a central types file (e.g., src/types/database.ts)
// and generated from the database schema for full type safety.
export interface UserProfile {
  id: string;
  org_id: string;
  full_name: string | null;
  avatar_url: string | null;
  // Add any other fields from your public.users table
}

async function fetchUserIdentity() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) {
    console.log('[useUserIdentity] No session or session error:', sessionError);
    throw new Error('Not authenticated');
  }

  const userId = session.user.id;
  console.log('[useUserIdentity] Fetching profile for user:', userId);

  // 1. Fetch the user profile from public.users to get the org_id
  // This is the single source of truth for organization membership.
  const { data: userProfile, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError) {
    console.error('[useUserIdentity] Error fetching user profile:', userError);
    throw new Error('Failed to fetch user profile.');
  }

  if (!userProfile || !userProfile.org_id) {
    console.error('[useUserIdentity] No profile or org_id:', { hasProfile: !!userProfile, orgId: userProfile?.org_id });
    throw new Error('User is not associated with an organization.');
  }

  const orgId = userProfile.org_id;
  console.log('[useUserIdentity] User profile found with org_id:', orgId);

  // 2. Fetch the organization details using the verified orgId
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (orgError) {
    console.error('[useUserIdentity] Error fetching organization:', orgError);
    throw new Error('Failed to fetch organization.');
  }

  console.log('[useUserIdentity] Organization found:', { id: organization.id, name: organization.name, type: organization.type });
  return { user: userProfile as UserProfile, organization: organization as Organization };
}

/**
 * The canonical hook for fetching the current user's identity and organization.
 * This is the SINGLE SOURCE OF TRUTH for user/org context in the frontend.
 * It directly queries the database to avoid stale JWT data.
 */
export function useUserIdentity() {
  return useQuery({
    queryKey: ['user-identity'],
    queryFn: fetchUserIdentity,
    staleTime: 10 * 60 * 1000, // 10 minutes - identity rarely changes mid-session
    retry: 1, // Retry once on failure
    refetchOnMount: false, // Don't refetch on every mount - use cached data
    refetchOnWindowFocus: false, // Identity doesn't change when switching tabs
  });
}
