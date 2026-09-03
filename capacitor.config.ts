import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.setout.app',
  appName: 'Setout',
  webDir: 'dist',
  ios: {
    backgroundColor: '#F5F5F3',
    contentInset: 'never',
    scrollEnabled: false,
    allowsLinkPreview: false,
    limitsNavigationsToAppBoundDomains: true,
  },
  server: {
    // Point the native shell at the live web app so /api/* calls are
    // same-origin and endpoints like /api/validate-code, /api/quote,
    // /api/price-cache work in TestFlight. Service worker keeps the
    // calculators available offline after first launch.
    url: 'https://setout-app.vercel.app',
    allowNavigation: ['setoutapp.com.au', 'setout-app.vercel.app'],
  },
};

export default config;
