import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { listPhotoManifests, readPhotoBase64, writePhotoBase64 } from './useJobPhotos';
import { listRecordFiles, readRecordPhotoBase64, writeRecordPhotoBase64, RECORD_DIR, type RecordKind } from './useRecords';

// Backup / restore for every piece of user data the app persists locally.
//
// User-generated content lives in two places:
//   - localStorage under a "setout_" or "sitehand_" prefix
//     (history, jobs, settings, remembered prices, business details,
//      per-job photo manifests)
//   - Capacitor Filesystem under Directory.Data / jobphotos / <jobId> /
//     (the actual JPEG bytes for job photos)
//
// If the app is uninstalled — or the WebView / PWA storage gets evicted
// by iOS after a few weeks of inactivity — that data is gone. This module
// lets the user roll a single JSON file that captures both stores, save
// it wherever they like (Files, iCloud, email to themselves), and restore
// it later on the same device or a new phone.
//
// Format is intentionally simple + versioned so a future migration can
// bump the version and know what shape it's reading.

const KEY_PREFIXES = ['setout_', 'sitehand_'] as const;

// Keys that hold onboarding checkpoints / rate-limit state, not user data.
// Restoring these would re-lock the user out or reset counters wrongly, so
// they're excluded from both export and import.
const EXCLUDED_KEYS = new Set<string>([
  'setout_install_seen',
  'setout_thankyou_seen',
  'setout_email_done',
  'sitehand_calc_gate',
]);

export interface Backup {
  version: 2;
  app: 'setout';
  createdAt: number;
  storage: Record<string, string>;
  // Job photos keyed by jobId → filename → raw base64 JPEG (no data: prefix)
  photos: Record<string, Record<string, string>>;
  // Record photos (receipts + tools) keyed by kind → filename → raw base64
  records?: Record<RecordKind, Record<string, string>>;
}

function isBackupKey(key: string): boolean {
  if (EXCLUDED_KEYS.has(key)) return false;
  return KEY_PREFIXES.some(p => key.startsWith(p));
}

function collectStorage(): Record<string, string> {
  const storage: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !isBackupKey(key)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) storage[key] = value;
  }
  return storage;
}

async function collectPhotos(): Promise<Record<string, Record<string, string>>> {
  const photos: Record<string, Record<string, string>> = {};
  for (const { jobId, records } of listPhotoManifests()) {
    if (records.length === 0) continue;
    photos[jobId] = {};
    for (const r of records) {
      const base64 = await readPhotoBase64(jobId, r.filename);
      if (base64) photos[jobId][r.filename] = base64;
    }
  }
  return photos;
}

async function collectRecordPhotos(): Promise<Record<RecordKind, Record<string, string>>> {
  const out: Record<RecordKind, Record<string, string>> = { receipts: {}, tools: {} };
  for (const kind of ['receipts', 'tools'] as RecordKind[]) {
    for (const { filename } of listRecordFiles(kind)) {
      const base64 = await readRecordPhotoBase64(kind, filename);
      if (base64) out[kind][filename] = base64;
    }
  }
  return out;
}

export async function collectBackup(): Promise<Backup> {
  const storage = collectStorage();
  const photos = await collectPhotos();
  const records = await collectRecordPhotos();
  return {
    version: 2,
    app: 'setout',
    createdAt: Date.now(),
    storage,
    photos,
    records,
  };
}

function backupFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `setout-backup-${yyyy}-${mm}-${dd}.json`;
}

// Save + share the backup. On native we write to Cache and hand the file:// URI
// to the native share sheet (Save to Files, AirDrop, Messages, email). On the
// web we trigger a Blob download.
export async function exportBackup(): Promise<void> {
  const backup = await collectBackup();
  const json = JSON.stringify(backup);
  const filename = backupFilename();

  if (Capacitor.isNativePlatform()) {
    try {
      const written = await Filesystem.writeFile({
        path: filename,
        data: json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: 'Setout backup',
        url: written.uri,
        dialogTitle: 'Save Setout backup',
      });
      return;
    } catch (err) {
      if ((err as Error)?.message?.toLowerCase().includes('cancel')) return;
      console.warn('[backup] native share failed, falling back to web download', err);
    }
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Parse + validate a JSON string. Throws on any shape it can't recognise so
// the caller can surface a proper error to the user. Accepts both v1
// (storage-only, no photo bytes — that release stored photos inline in the
// manifest as data URLs, so restoring the storage is enough) and v2
// (storage + separate photos map after the Filesystem migration).
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file isn\'t a valid JSON backup.');
  }
  if (!raw || typeof raw !== 'object') throw new Error('Backup file is empty or corrupted.');
  const obj = raw as Record<string, unknown>;
  if (obj.app !== 'setout') throw new Error('This backup wasn\'t made by Setout.');
  if (obj.version !== 1 && obj.version !== 2) throw new Error(`Unsupported backup version: ${String(obj.version)}.`);
  if (!obj.storage || typeof obj.storage !== 'object') throw new Error('Backup is missing its storage payload.');

  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj.storage as Record<string, unknown>)) {
    if (!isBackupKey(key)) continue;
    if (typeof value !== 'string') continue;
    cleaned[key] = value;
  }

  const photos: Record<string, Record<string, string>> = {};
  if (obj.version === 2 && obj.photos && typeof obj.photos === 'object') {
    for (const [jobId, files] of Object.entries(obj.photos as Record<string, unknown>)) {
      if (!files || typeof files !== 'object') continue;
      const jobPhotos: Record<string, string> = {};
      for (const [filename, b64] of Object.entries(files as Record<string, unknown>)) {
        if (typeof b64 === 'string') jobPhotos[filename] = b64;
      }
      if (Object.keys(jobPhotos).length > 0) photos[jobId] = jobPhotos;
    }
  }

  const records: Record<RecordKind, Record<string, string>> = { receipts: {}, tools: {} };
  if (obj.version === 2 && obj.records && typeof obj.records === 'object') {
    for (const kind of ['receipts', 'tools'] as RecordKind[]) {
      const bucket = (obj.records as Record<string, unknown>)[kind];
      if (!bucket || typeof bucket !== 'object') continue;
      for (const [filename, b64] of Object.entries(bucket as Record<string, unknown>)) {
        if (typeof b64 === 'string') records[kind][filename] = b64;
      }
    }
  }

  return {
    version: 2,
    app: 'setout',
    createdAt: typeof obj.createdAt === 'number' ? obj.createdAt : Date.now(),
    storage: cleaned,
    photos,
    records,
  };
}

// Write everything back. Existing localStorage user data + Filesystem photos
// are cleared for keys present in the backup, then repopulated. Onboarding
// flags and other non-backup keys are left alone.
export async function applyBackup(backup: Backup): Promise<{ restored: number; photosRestored: number }> {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isBackupKey(key)) keysToRemove.push(key);
  }
  for (const key of keysToRemove) localStorage.removeItem(key);

  let restored = 0;
  for (const [key, value] of Object.entries(backup.storage)) {
    try {
      localStorage.setItem(key, value);
      restored++;
    } catch (err) {
      console.warn('[backup] failed to restore key', key, err);
    }
  }

  // Wipe the on-disk photo directories that we're about to overwrite, so
  // stale files from before the restore don't linger. Fire and forget — the
  // per-job restore below will (re)create the folders it needs.
  for (const jobId of Object.keys(backup.photos)) {
    try {
      await Filesystem.rmdir({
        path: `jobphotos/${jobId}`,
        directory: Directory.Data,
        recursive: true,
      });
    } catch { /* nothing to remove — fine */ }
  }

  let photosRestored = 0;
  for (const [jobId, files] of Object.entries(backup.photos)) {
    for (const [filename, base64] of Object.entries(files)) {
      try {
        await writePhotoBase64(jobId, filename, base64);
        photosRestored++;
      } catch (err) {
        console.warn('[backup] failed to restore photo', jobId, filename, err);
      }
    }
  }

  // Record photos (receipts + tools). Wipe each directory first so stale
  // files from before the restore don't linger alongside the fresh ones.
  if (backup.records) {
    for (const kind of ['receipts', 'tools'] as RecordKind[]) {
      const files = backup.records[kind];
      if (!files || Object.keys(files).length === 0) continue;
      try {
        await Filesystem.rmdir({
          path: RECORD_DIR[kind],
          directory: Directory.Data,
          recursive: true,
        });
      } catch { /* nothing to remove — fine */ }
      for (const [filename, base64] of Object.entries(files)) {
        try {
          await writeRecordPhotoBase64(kind, filename, base64);
          photosRestored++;
        } catch (err) {
          console.warn('[backup] failed to restore record photo', kind, filename, err);
        }
      }
    }
  }

  return { restored, photosRestored };
}
