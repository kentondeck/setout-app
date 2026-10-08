import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, isCloudConfigured } from './supabase';
import { pushCloud, pullCloud, getRemoteBackupInfo, getLocalLastSync, deleteCloudData, localSignature, localHasData } from './cloudSync';

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
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => getLocalLastSync());
  const [remoteBackupAt, setRemoteBackupAt] = useState<number | null>(null);
  const handledUidRef = useRef<string | null>(null);
  // Fingerprint of the data at our last push — the auto-sync loop pushes only
  // when this changes, so idle sessions never re-upload.
  const lastSigRef = useRef<string | null>(null);
  const signedIn = !!session?.user;

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

  // Reconcile once per signed-in user, on sign-in or app launch. Decides, safely:
  //   • no cloud copy yet            → seed it from this device
  //   • cloud exists, device empty   → pull it (land where you left off)
  //   • linked + cloud is newer      → pull the other device's changes
  //   • otherwise                    → in sync, or an ambiguous first sign-in
  //                                     (local data AND a cloud copy) — leave the
  //                                     Back up / Restore choice, never clobber.
  // Pulls reload so every context re-reads the restored localStorage.
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
        const localSynced = getLocalLastSync();
        setLastSyncAt(localSynced);

        if (!info) {
          setBusy(true); setStatus('Backing up…');
          await pushCloud();
          lastSigRef.current = localSignature();
          const now = getLocalLastSync();
          setLastSyncAt(now); setRemoteBackupAt(now); setStatus('Backed up');
          return;
        }

        if (!localHasData()) {
          setBusy(true); setStatus('Loading your data…');
          await pullCloud();
          window.location.reload();
          return;
        }

        if (localSynced != null && info.updatedAt > localSynced + 2000) {
          setBusy(true); setStatus('Syncing…');
          await pullCloud();
          window.location.reload();
          return;
        }

        // In sync, or ambiguous first sign-in — record a baseline for auto-push.
        lastSigRef.current = localSignature();
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setBusy(false);
      }
    })();
  }, [session]);

  // Auto-push loop: while signed in and linked, push whenever the data changes
  // (checked on a short interval, plus immediately when the app is backgrounded).
  // No-ops when nothing changed, so an idle app never re-uploads.
  useEffect(() => {
    if (!configured || !signedIn) return;
    let stopped = false;
    const maybePush = async () => {
      if (stopped || getLocalLastSync() == null) return; // not linked yet
      const sig = localSignature();
      if (sig === lastSigRef.current) return;
      try {
        await pushCloud();
        lastSigRef.current = sig;
        const now = getLocalLastSync();
        setLastSyncAt(now); setRemoteBackupAt(now);
      } catch { /* transient — retry next tick */ }
    };
    const interval = window.setInterval(() => { void maybePush(); }, 12000);
    const onVis = () => { if (document.visibilityState === 'hidden') void maybePush(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { stopped = true; window.clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
  }, [configured, signedIn]);

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
      lastSigRef.current = localSignature();
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
    signedIn,
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
