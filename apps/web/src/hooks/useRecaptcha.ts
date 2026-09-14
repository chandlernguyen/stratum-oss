import { useEffect, useState } from 'react';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

interface RecaptchaHook {
  isReady: boolean;
  executeRecaptcha: (action: string) => Promise<string>;
  error: string | null;
}

/**
 * Hook to manage Google reCAPTCHA Enterprise integration
 *
 * @returns {RecaptchaHook} Object containing reCAPTCHA state and execution function
 *
 * @example
 * const { isReady, executeRecaptcha, error } = useRecaptcha();
 *
 * const handleSubmit = async () => {
 *   if (!isReady) return;
 *   const token = await executeRecaptcha('submit_form');
 *   // Use token to create assessment
 * }
 */
export function useRecaptcha(): RecaptchaHook {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    // Validate site key exists
    if (!siteKey || siteKey === 'your-recaptcha-site-key-here') {
      setError('reCAPTCHA site key not configured. Please add VITE_RECAPTCHA_SITE_KEY to your .env file.');
      console.warn('reCAPTCHA site key not configured. Skipping reCAPTCHA initialization.');
      return;
    }

    // Load reCAPTCHA Enterprise script dynamically
    const loadRecaptchaScript = () => {
      // Check if script already exists
      const existingScript = document.querySelector(
        `script[src*="recaptcha/enterprise.js"]`
      );

      if (existingScript) {
        // Script already loaded, check if ready
        checkRecaptchaReady();
        return;
      }

      // Create and load script
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('reCAPTCHA Enterprise script loaded');
        checkRecaptchaReady();
      };

      script.onerror = () => {
        console.error('Failed to load reCAPTCHA Enterprise script');
        setError('Failed to load reCAPTCHA. Please check your internet connection and refresh.');
      };

      document.head.appendChild(script);
    };

    // Wait for grecaptcha.enterprise to load
    const checkRecaptchaReady = () => {
      if (window.grecaptcha && window.grecaptcha.enterprise && window.grecaptcha.enterprise.ready) {
        window.grecaptcha.enterprise.ready(() => {
          console.log('reCAPTCHA Enterprise ready');
          setIsReady(true);
          setError(null);
        });
      } else {
        // Retry after 100ms if grecaptcha.enterprise not ready
        setTimeout(checkRecaptchaReady, 100);
      }
    };

    loadRecaptchaScript();

    // Cleanup is not needed as the script stays loaded
  }, [siteKey]);

  const executeRecaptcha = async (action: string): Promise<string> => {
    if (!isReady) {
      throw new Error('reCAPTCHA not ready. Please wait and try again.');
    }

    if (!window.grecaptcha || !window.grecaptcha.enterprise || !window.grecaptcha.enterprise.execute) {
      throw new Error('reCAPTCHA Enterprise SDK not loaded.');
    }

    try {
      // Execute reCAPTCHA Enterprise and get token
      const token = await window.grecaptcha.enterprise.execute(siteKey, { action });

      if (!token) {
        throw new Error('Failed to get reCAPTCHA token');
      }

      console.log('reCAPTCHA token generated for action:', action);
      return token;
    } catch (err: any) {
      console.error('reCAPTCHA execution error:', err);
      throw new Error('reCAPTCHA validation failed. Please try again.');
    }
  };

  return {
    isReady,
    executeRecaptcha,
    error
  };
}
