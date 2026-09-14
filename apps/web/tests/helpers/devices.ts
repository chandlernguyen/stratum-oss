/**
 * Device configurations for mobile testing
 * Based on mobile-first checklist (2018-2025+)
 */

export const DEVICES = {
  // iOS Smartphones
  'iphone-se': {
    name: 'iPhone SE',
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'iphone-15': {
    name: 'iPhone 15',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'iphone-15-pro-max': {
    name: 'iPhone 15 Pro Max',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  },

  // Android Smartphones
  'android-360': {
    name: 'Android Standard (360px)',
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36'
  },
  'pixel-7': {
    name: 'Google Pixel 7',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36'
  },

  // Tablets
  'ipad-mini': {
    name: 'iPad mini',
    viewport: { width: 744, height: 1133 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'ipad-pro-11': {
    name: 'iPad Pro 11"',
    viewport: { width: 834, height: 1194 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'ipad-pro-13': {
    name: 'iPad Pro 13"',
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  }
} as const;

export const BREAKPOINTS = {
  'mobile-small': 360,      // Android standard
  'mobile-iphone': 393,     // iPhone 15
  'mobile-large': 430,      // iPhone Pro Max
  'tablet-portrait': 768,   // iPad portrait
  'tablet-ipad': 834,       // iPad Pro 11"
  'tablet-landscape': 1024, // iPad landscape
  'desktop': 1366           // Desktop standard
} as const;
