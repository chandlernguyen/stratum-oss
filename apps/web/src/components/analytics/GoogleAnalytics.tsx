import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    // GA4 gtag expects the native Arguments object, not a typed array
    gtag: (...args: unknown[]) => void;
  }
}

interface GoogleAnalyticsProps {
  measurementId: string;
}

/**
 * Loads the gtag.js script and initializes GA4 with Consent Mode v2 defaults.
 * Renders outside <Router> — does NOT track route changes.
 * Pair with <RouteTracker> inside the Router for SPA page_view tracking.
 */
export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!measurementId || initialized.current) return;
    initialized.current = true;

    // Initialize dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    // Must use native `arguments` object — GA4 silently fails with spread/rest
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments as unknown as Record<string, unknown>);
    };

    // Consent Mode v2 defaults — must be set BEFORE config/script load.
    // Grants analytics by default (no cookie banner yet).
    // When a consent banner is added, change defaults to 'denied'
    // and call gtag('consent', 'update', {...}) on user choice.
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });

    window.gtag('js', new Date());
    // Disable automatic page_view — we fire them manually on route changes
    window.gtag('config', measurementId, { send_page_view: false });

    // Load the gtag.js script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);
  }, [measurementId]);

  return null;
}

/**
 * Tracks SPA route changes as GA4 page_view events.
 * Must be rendered inside <Router> to access useLocation().
 */
export function RouteTracker() {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!window.gtag) return;

    // Skip the initial render — GoogleAnalytics fires the first config hit
    // (even with send_page_view:false, we want to fire one for the landing page)
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }

    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);

  return null;
}
