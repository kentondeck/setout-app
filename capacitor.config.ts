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
    //
    // setoutapp.com.au is the actual production domain for the "setout"
    // Vercel project — every push to main deploys here. setout-app.vercel.app
    // (used previously) is not a known alias under this Vercel account/project
    // at all; it was stuck serving a stale, disconnected build.
    url: 'https://setoutapp.com.au',
    allowNavigation: ['setoutapp.com.au'],
  },
};

export default config;
