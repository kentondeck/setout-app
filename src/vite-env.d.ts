/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_REVENUECAT_IOS_KEY: string;
  readonly VITE_REVENUECAT_ANDROID_KEY: string;
  readonly VITE_SENTRY_DSN: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Injected by vite.config.ts's `define` from package.json — app version string
// for Sentry release tagging.
declare const __APP_VERSION__: string;
