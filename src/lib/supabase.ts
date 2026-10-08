import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Optional cloud backup backend. Dormant unless both env vars are set — same
// pattern as RevenueCat: ship the code, switch it on by providing keys. When
// unconfigured, isCloudConfigured() is false and the Settings "Cloud backup"
// section never renders, so nothing changes for a user who never signs in.
//
// The anon/publishable key is PUBLIC and safe to bundle — Row-Level Security on
// the Supabase side is what actually protects each user's data.

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isCloudConfigured(): boolean {
  return !!URL && !!KEY;
}

let client: SupabaseClient | null = null;

// Lazily create the singleton client. Returns null when unconfigured so callers
// can treat "no cloud" as a first-class state rather than crashing.
export function getSupabase(): SupabaseClient | null {
  if (!URL || !KEY) return null;
  if (!client) {
    client = createClient(URL, KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // No URL-based session detection — this runs inside a Capacitor WebView,
        // not a redirect flow. Sign-in is email-code (OTP) based.
        detectSessionInUrl: false,
        // Deliberately NOT prefixed with setout_/sitehand_ so the backup
        // collector never sweeps the auth session into a synced payload.
        storageKey: 'sb-setout-auth',
      },
    });
  }
  return client;
}
