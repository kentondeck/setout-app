/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_REVENUECAT_IOS_KEY: string;
  readonly VITE_REVENUECAT_ANDROID_KEY: string;
  readonly VITE_SENTRY_DSN: string;
  // Optional cloud backup (Settings → Cloud backup) — email sign-in, Supabase
  // storage, Resend for the sign-in code email. Unset = feature not live yet.
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Injected by vite.config.ts's `define` from package.json — app version string
// for Sentry release tagging.
declare const __APP_VERSION__: string;
