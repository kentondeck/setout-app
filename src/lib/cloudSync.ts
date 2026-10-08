import { getSupabase } from './supabase';
import { collectStorage, applyStorageOnly } from './backup';
import { listPhotoManifests, readPhotoBase64, writePhotoBase64 } from './useJobPhotos';
import { listRecordFiles, readRecordPhotoBase64, writeRecordPhotoBase64, type RecordKind } from './useRecords';

// Cloud backup sync, Phase 1.
//
//   - Structured data (everything in localStorage under setout_/sitehand_) is
//     stored as a single JSONB row in `public.backups`, keyed by user_id.
//   - Photo/receipt/tool image bytes go to the `user-media` Storage bucket at
//     `<uid>/jobphotos/<jobId>/<file>` and `<uid>/records/<kind>/<file>`.
//
// Row-Level Security on both the table and the bucket guarantees a user can only
// ever read/write their own rows + their own folder.
//
// Image uploads are de-duplicated via a device-local manifest of paths already
// pushed, so re-syncing doesn't re-send bytes that are already in the cloud.

const BUCKET = 'user-media';
const UPLOADED_KEY = 'setout_cloud_uploaded';
const LAST_SYNC_KEY = 'setout_cloud_last_sync';

// ── device-local bookkeeping (never synced — excluded in backup.ts) ──────────

function loadUploaded(): Set<string> {
  try {
    const raw = localStorage.getItem(UPLOADED_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((p): p is string => typeof p === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveUploaded(set: Set<string>): void {
  try { localStorage.setItem(UPLOADED_KEY, JSON.stringify([...set])); } catch { /* best effort */ }
}

function markSyncedNow(): void {
  try { localStorage.setItem(LAST_SYNC_KEY, String(Date.now())); } catch { /* best effort */ }
}

export function getLocalLastSync(): number | null {
  const raw = localStorage.getItem(LAST_SYNC_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

// A cheap content fingerprint of the structured (localStorage) data — lets the
// auto-sync loop detect "something changed, push it" without diffing. Photo
// changes show up here too, since their manifests live in localStorage.
export function localSignature(): string {
  return JSON.stringify(collectStorage());
}

// Does this device actually hold user content yet? Guards the auto-pull on
// sign-in: an empty install should load the account, but a device with real
// work on it should never get silently overwritten.
export function localHasData(): boolean {
  const listKeys = ['setout_history', 'setout_jobs', 'setout_receipts_v1', 'setout_tools_v1'];
  for (const k of listKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) { const v = JSON.parse(raw) as unknown; if (Array.isArray(v) && v.length > 0) return true; }
    } catch { /* ignore */ }
  }
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('sitehand_jobphotos_')) continue;
    try {
      const raw = localStorage.getItem(key);
      if (raw) { const v = JSON.parse(raw) as unknown; if (Array.isArray(v) && v.length > 0) return true; }
    } catch { /* ignore */ }
  }
  return false;
}

// ── base64 <-> bytes / blob ──────────────────────────────────────────────────

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') { reject(new Error('bad reader result')); return; }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

// Enumerate every image the device holds as { path, read } pairs. `path` is the
// Storage object path under the user's folder; `read` lazily returns its base64.
function enumerateMedia(uid: string): { path: string; read: () => Promise<string | null> }[] {
  const out: { path: string; read: () => Promise<string | null> }[] = [];
  for (const { jobId, records } of listPhotoManifests()) {
    for (const r of records) {
      out.push({
        path: `${uid}/jobphotos/${jobId}/${r.filename}`,
        read: () => readPhotoBase64(jobId, r.filename),
      });
    }
  }
  for (const kind of ['receipts', 'tools'] as RecordKind[]) {
    for (const { filename } of listRecordFiles(kind)) {
      if (!filename) continue;
      out.push({
        path: `${uid}/records/${kind}/${filename}`,
        read: () => readRecordPhotoBase64(kind, filename),
      });
    }
  }
  return out;
}

async function requireUid(): Promise<{ sb: NonNullable<ReturnType<typeof getSupabase>>; uid: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error('Cloud backup is not configured.');
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) throw new Error('You need to be signed in.');
  return { sb, uid: data.user.id };
}

// ── public API ───────────────────────────────────────────────────────────────

export interface RemoteBackupInfo { updatedAt: number }

// Lightweight check: does this user already have a cloud backup, and when was it
// last written? Used to decide whether a fresh sign-in should auto-seed or offer
// a restore instead.
export async function getRemoteBackupInfo(): Promise<RemoteBackupInfo | null> {
  const { sb, uid } = await requireUid();
  const { data, error } = await sb.from('backups').select('updated_at').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  if (!data?.updated_at) return null;
  const t = Date.parse(data.updated_at as string);
  return { updatedAt: Number.isFinite(t) ? t : Date.now() };
}

// Push this device's data up: structured JSON + any images not already uploaded.
export async function pushCloud(): Promise<void> {
  const { sb, uid } = await requireUid();

  const payload = collectStorage();
  const { error } = await sb.from('backups').upsert(
    { user_id: uid, payload, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  if (error) throw error;

  const uploaded = loadUploaded();
  for (const { path, read } of enumerateMedia(uid)) {
    if (uploaded.has(path)) continue;
    const b64 = await read();
    if (!b64) continue;
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, base64ToBytes(b64), {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (!upErr) uploaded.add(path);
    else console.warn('[cloud] upload failed', path, upErr.message);
  }
  saveUploaded(uploaded);
  markSyncedNow();
}

// Pull the cloud copy down onto this device: apply structured data, then
// download each image the restored manifests reference. The caller should
// reload the app afterwards so the React contexts re-read localStorage.
export async function pullCloud(): Promise<void> {
  const { sb, uid } = await requireUid();

  const { data, error } = await sb.from('backups').select('payload').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  if (!data?.payload) return; // nothing stored yet — leave the device untouched

  applyStorageOnly(data.payload as Record<string, string>);

  const uploaded = new Set<string>();
  for (const { jobId, records } of listPhotoManifests()) {
    for (const r of records) {
      const path = `${uid}/jobphotos/${jobId}/${r.filename}`;
      const dl = await sb.storage.from(BUCKET).download(path);
      if (dl.data) { await writePhotoBase64(jobId, r.filename, await blobToBase64(dl.data)); uploaded.add(path); }
    }
  }
  for (const kind of ['receipts', 'tools'] as RecordKind[]) {
    for (const { filename } of listRecordFiles(kind)) {
      if (!filename) continue;
      const path = `${uid}/records/${kind}/${filename}`;
      const dl = await sb.storage.from(BUCKET).download(path);
      if (dl.data) { await writeRecordPhotoBase64(kind, filename, await blobToBase64(dl.data)); uploaded.add(path); }
    }
  }
  saveUploaded(uploaded); // these are now known-present in the cloud
  markSyncedNow();
}

// Remove this user's cloud copy (the backups row + their Storage folder). Does
// NOT delete the auth account itself — full account deletion needs a privileged
// server function and is handled separately before public launch.
export async function deleteCloudData(): Promise<void> {
  const { sb, uid } = await requireUid();

  const paths = enumerateMedia(uid).map(m => m.path);
  if (paths.length > 0) {
    const { error: rmErr } = await sb.storage.from(BUCKET).remove(paths);
    if (rmErr) console.warn('[cloud] storage remove failed', rmErr.message);
  }
  const { error } = await sb.from('backups').delete().eq('user_id', uid);
  if (error) throw error;

  try { localStorage.removeItem(UPLOADED_KEY); localStorage.removeItem(LAST_SYNC_KEY); } catch { /* best effort */ }
}
