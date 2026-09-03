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
  plugins: {
    // Without this, WKWebView has no managed keyboard-avoidance and
    // scrollEnabled:false (above) disables its native fallback too —
    // together they left fixed-position bottom sheets (Add to job,
    // rename dialogs, etc.) with an unreachable/unresponsive input
    // once the keyboard opened. 'native' resizes the WKWebView frame
    // itself so fixed-bottom content stays above the keyboard.
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
  server: {
    // `npm run ios:live` sets CAP_SERVER_URL to http://<mac-lan-ip>:5173, so the
    // native app on the phone loads live from Vite and hot-reloads on save.
    // `npm run ios:release` leaves it unset and falls back to the production URL
    // below — that's what TestFlight / App Store builds always ship with.
    //
    // setoutapp.com.au is the actual production domain for the "setout" Vercel
    // project — every push to main deploys here. setout-app.vercel.app was
    // used previously but is not a known alias under this Vercel account/project;
    // it was stuck serving a stale, disconnected build.
    url: process.env.CAP_SERVER_URL || 'https://setoutapp.com.au',
    cleartext: !!process.env.CAP_SERVER_URL,
    allowNavigation: ['setoutapp.com.au'],
  },
};

export default config;
