import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';

// Types for user profile updates
export interface UserProfileUpdate {
  full_name?: string;
  phone?: string;
  bio?: string;
}

/**
 * Hook to update user profile with Database-First architecture
 * Uses direct Supabase mutations instead of API calls
 *
 * Note: The users table has full_name and phone columns directly.
 * Bio is stored in Supabase Auth user_metadata only.
 */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (updates: UserProfileUpdate) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Build database update object (only full_name and phone exist in users table)
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (updates.full_name !== undefined) {
        dbUpdates.full_name = updates.full_name;
      }
      if (updates.phone !== undefined) {
        dbUpdates.phone = updates.phone;
      }

      // Update users table - Database-First Architecture ✅
      const { data, error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', user.id)
        .select('*')
        .single();

      if (error) {
        console.error('[useUpdateUserProfile] Database error:', error);
        throw new Error(error.message || 'Failed to update profile');
      }

      // Update Supabase Auth metadata for bio and sync other fields
      const authUpdates: Record<string, any> = {};
      if (updates.full_name !== undefined) authUpdates.full_name = updates.full_name;
      if (updates.phone !== undefined) authUpdates.phone = updates.phone;
      if (updates.bio !== undefined) authUpdates.bio = updates.bio;

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser({
          data: authUpdates
        });

        if (authError) {
          console.error('[useUpdateUserProfile] Auth metadata update error:', authError);
          // Don't throw - database update succeeded
        }
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate user identity queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['user-identity'] });

      // Refresh auth session
      const refreshAuth = async () => {
        await supabase.auth.getSession();
      };
      refreshAuth();

      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      console.error('[useUpdateUserProfile] Mutation error:', error);
      toast.error('Failed to update profile', {
        description: error.message || 'Please try again later.'
      });
    },
  });
}
