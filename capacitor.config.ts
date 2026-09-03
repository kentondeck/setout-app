import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.setout.app',
  appName: 'Setout',
  webDir: 'dist',
  ios: {
    backgroundColor: '#F5F5F3',
    contentInset: 'always',
  },
  server: {
    // `npm run ios:live` sets CAP_SERVER_URL to http://<mac-lan-ip>:5173, so the
    // native app on the phone loads live from Vite and hot-reloads on save.
    // `npm run ios:release` leaves it unset and falls back to the deployed PWA,
    // which is what TestFlight / App Store builds should always ship with.
    url: process.env.CAP_SERVER_URL || 'https://setout-app.vercel.app',
    cleartext: !!process.env.CAP_SERVER_URL,
    allowNavigation: ['setoutapp.com.au', 'setout-app.vercel.app'],
  },
};

export default config;
