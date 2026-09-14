import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { EnabledLocale } from '@/lib/locales';
import { buildLocalizedLocation } from '@/lib/localePath';

export function useLocalizedRouteSwitch() {
  const location = useLocation();
  const navigate = useNavigate();

  return useCallback(
    async (locale: EnabledLocale) => {
      const nextPath = buildLocalizedLocation(locale, location);
      if (nextPath !== `${location.pathname}${location.search}${location.hash}`) {
        navigate(nextPath, { replace: true });
      }
    },
    [location, navigate]
  );
}

export default useLocalizedRouteSwitch;
