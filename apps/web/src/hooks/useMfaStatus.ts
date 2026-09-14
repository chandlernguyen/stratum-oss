
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

type MfaStatus = {
  isMfaEnrolled: boolean;
  isMfaVerified: boolean;
  isLoading: boolean;
};

export function useMfaStatus(): MfaStatus {
  const [status, setStatus] = useState<MfaStatus>({
    isMfaEnrolled: false,
    isMfaVerified: false,
    isLoading: true,
  });
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      setStatus({ isMfaEnrolled: false, isMfaVerified: false, isLoading: false });
      return;
    }

    const checkMfaStatus = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) throw error;

        const isMfaEnrolled = data.nextLevel === 'aal2';
        const isMfaVerified = data.currentLevel === 'aal2';

        setStatus({
          isMfaEnrolled,
          isMfaVerified,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error checking MFA status:', error);
        setStatus({ isMfaEnrolled: false, isMfaVerified: false, isLoading: false });
      }
    };

    checkMfaStatus();
  }, [user]);

  return status;
}
