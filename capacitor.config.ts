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
    // resize:'native' actually shrinks the WKWebView's own frame when the
    // keyboard shows. That fought this app's fixed/sticky bottom UI: the
    // sticky BottomNav and fixed-position sheets both re-anchor to the new
    // (shrunk) viewport bottom independently, at different points because
    // BottomNav lives in-flow inside a scrolling container while sheets are
    // fixed to the true viewport — leaving BottomNav visibly stranded
    // between a sheet and the keyboard, and safe-area-inset-bottom no
    // longer meaningful once the WKWebView's bottom edge isn't the screen
    // edge. resize:'none' leaves the frame alone; useKeyboardInset (see
    // src/lib/useKeyboardInset.ts) reads the real keyboard height from
    // this plugin's own show/hide events and every fixed sheet + BottomNav
    // positions itself off that number directly, so there's one source of
    // truth instead of two resize mechanisms fighting each other.
    Keyboard: {
      resize: 'none',
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
