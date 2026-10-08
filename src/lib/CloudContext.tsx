import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, isCloudConfigured } from './supabase';
import { pushCloud, pullCloud, getRemoteBackupInfo, getLocalLastSync, deleteCloudData } from './cloudSync';

// Optional cloud backup — the whole feature is opt-in from Settings. The app
// stays local-first and login-free; signing in just turns on safe off-device
// storage + restore-on-a-new-phone. All UI reads this context; when cloud isn't
// configured, `configured` is false and the Settings section hides itself.

type OtpPhase = 'idle' | 'code-sent';

interface CloudState {
  configured: boolean;
  email: string | null;
  signedIn: boolean;
  phase: OtpPhase;
  pendingEmail: string;
  busy: boolean;
  error: string | null;
  status: string | null;
  lastSyncAt: number | null;
  remoteBackupAt: number | null;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  cancelCode: () => void;
  signOut: () => Promise<void>;
  backupNow: () => Promise<void>;
  restore: () => Promise<void>;
  deleteData: () => Promise<void>;
  clearError: () => void;
}

const noop = async () => {};

const CloudContext = createContext<CloudState>({
  configured: false,
  email: null,
  signedIn: false,
  phase: 'idle',
  pendingEmail: '',
  busy: false,
  error: null,
  status: null,
  lastSyncAt: null,
  remoteBackupAt: null,
  sendCode: noop,
  verifyCode: noop,
  cancelCode: () => {},
  signOut: noop,
  backupNow: noop,
  restore: noop,
  deleteData: noop,
  clearError: () => {},
});

export function useCloud() {
  return useContext(CloudContext);
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong — try again.';
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const configured = isCloudConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<OtpPhase>('idle');
  const [pendingEmail, setPendingEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [remoteBackupAt, setRemoteBackupAt] = useState<number | null>(null);
  const handledUidRef = useRef<string | null>(null);

  // Subscribe to auth state (native WebView keeps the session in localStorage).
  useEffect(() => {
    if (!configured) return;
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    sb.auth.getSession().then(({ data }) => { if (active) setSession(data.session); });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [configured]);

  // First time we see a given signed-in user on this device: check whether a
  // cloud copy already exists. If none, seed it from this device automatically
  // (safe — nothing to overwrite). If one exists, stay hands-off and let the
  // user choose Back up (push) or Restore (pull) so we never clobber silently.
  useEffect(() => {
    const uid = session?.user?.id ?? null;
    if (!uid) { handledUidRef.current = null; return; }
    if (handledUidRef.current === uid) return;
    handledUidRef.current = uid;
    (async () => {
      setError(null);
      try {
        const info = await getRemoteBackupInfo();
        setRemoteBackupAt(info?.updatedAt ?? null);
        setLastSyncAt(getLocalLastSync());
        if (!info) {
          setBusy(true);
          setStatus('Backing up this device…');
          await pushCloud();
          const now = getLocalLastSync();
          setLastSyncAt(now);
          setRemoteBackupAt(now);
          setStatus('Backed up');
        }
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setBusy(false);
      }
    })();
  }, [session]);

  const sendCode = useCallback(async (email: string) => {
    const sb = getSupabase();
    if (!sb) return;
    const clean = email.trim();
    setBusy(true); setError(null); setStatus(null);
    try {
      const { error: e } = await sb.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
      if (e) throw e;
      setPendingEmail(clean);
      setPhase('code-sent');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const verifyCode = useCallback(async (code: string) => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true); setError(null);
    try {
      const { error: e } = await sb.auth.verifyOtp({ email: pendingEmail, token: code.trim(), type: 'email' });
      if (e) throw e;
      setPhase('idle');
      // Session arrives via onAuthStateChange → the effect above seeds the backup.
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }, [pendingEmail]);

  const cancelCode = useCallback(() => {
    setPhase('idle'); setPendingEmail(''); setError(null);
  }, []);

  const backupNow = useCallback(async () => {
    setBusy(true); setError(null); setStatus('Backing up…');
    try {
      await pushCloud();
      const now = getLocalLastSync();
      setLastSyncAt(now);
      setRemoteBackupAt(now);
      setStatus('Backed up');
    } catch (e) {
      setError(errMsg(e)); setStatus(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const restore = useCallback(async () => {
    setBusy(true); setError(null); setStatus('Restoring…');
    try {
      await pullCloud();
      // Reload so every context re-reads the freshly restored localStorage.
      window.location.reload();
    } catch (e) {
      setError(errMsg(e)); setStatus(null); setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true); setError(null);
    try {
      await sb.auth.signOut();
      setPhase('idle'); setStatus(null); setLastSyncAt(null); setRemoteBackupAt(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const deleteData = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true); setError(null); setStatus('Deleting…');
    try {
      await deleteCloudData();
      await sb.auth.signOut();
      setStatus(null); setLastSyncAt(null); setRemoteBackupAt(null);
    } catch (e) {
      setError(errMsg(e)); setStatus(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<CloudState>(() => ({
    configured,
    email: session?.user?.email ?? null,
    signedIn: !!session?.user,
    phase,
    pendingEmail,
    busy,
    error,
    status,
    lastSyncAt,
    remoteBackupAt,
    sendCode,
    verifyCode,
    cancelCode,
    signOut,
    backupNow,
    restore,
    deleteData,
    clearError,
  }), [configured, session, phase, pendingEmail, busy, error, status, lastSyncAt, remoteBackupAt, sendCode, verifyCode, cancelCode, signOut, backupNow, restore, deleteData, clearError]);

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}
