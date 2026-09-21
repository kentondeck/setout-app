import { useCallback, useEffect, useRef, useState } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Photos + comments attached to a saved job. Bytes live as real JPEG files
// on disk (Capacitor Filesystem in native, IndexedDB via the Filesystem
// web shim in PWAs) and only the metadata — id, timestamp, comment, filename
// — sits in localStorage. That gets us three things over the earlier
// "base64 in localStorage" layout:
//
//   1. iOS backs up Directory.Data by default, so photos ride along with
//      an iCloud device backup and survive uninstall / new-phone.
//   2. Per-file writes can't fail all-or-nothing the way a 5 MB localStorage
//      blob can — one huge photo won't wipe out the rest of the album.
//   3. localStorage quota pressure stops kicking in around photo #20; jobs
//      can hold hundreds if the tradie wants.
//
// The public shape of `JobPhoto` still carries `dataUrl` so callers (the
// job detail UI, the PDF export) don't change — the hook just repopulates
// it asynchronously by reading the file off disk.

export interface JobPhoto {
  id: string;
  timestamp: number;
  dataUrl: string; // compressed JPEG data URL (loaded from disk on demand)
  comment: string;
}

// Manifest entry stored in localStorage. `filename` points at the JPEG on
// disk under PHOTO_DIR/<jobId>/. The old format stored the whole `dataUrl`
// inline — see loadPhotos() for the migration read-path.
interface PhotoRecord {
  id: string;
  timestamp: number;
  filename: string;
  comment: string;
}

const MANIFEST_PREFIX = 'sitehand_jobphotos_';
const PHOTO_DIR = 'jobphotos';
const MAX_IMAGE_DIMENSION = 1400;
const JPEG_QUALITY = 0.72;

function manifestKey(jobId: string): string {
  return `${MANIFEST_PREFIX}${jobId}`;
}

function photoPath(jobId: string, filename: string): string {
  return `${PHOTO_DIR}/${jobId}/${filename}`;
}

function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function base64ToDataUrl(base64: string): string {
  return `data:image/jpeg;base64,${base64}`;
}

async function ensureJobDir(jobId: string): Promise<void> {
  try {
    await Filesystem.mkdir({
      path: `${PHOTO_DIR}/${jobId}`,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    // mkdir throws "already exists" — that's fine.
  }
}

async function writePhotoFile(jobId: string, filename: string, dataUrl: string): Promise<void> {
  await ensureJobDir(jobId);
  await Filesystem.writeFile({
    path: photoPath(jobId, filename),
    data: dataUrlToBase64(dataUrl),
    directory: Directory.Data,
  });
}

async function readPhotoFile(jobId: string, filename: string): Promise<string | null> {
  try {
    const res = await Filesystem.readFile({
      path: photoPath(jobId, filename),
      directory: Directory.Data,
    });
    const data = typeof res.data === 'string' ? res.data : await blobToBase64(res.data as Blob);
    return base64ToDataUrl(data);
  } catch {
    return null;
  }
}

async function deletePhotoFile(jobId: string, filename: string): Promise<void> {
  try {
    await Filesystem.deleteFile({
      path: photoPath(jobId, filename),
      directory: Directory.Data,
    });
  } catch {
    // Nothing to delete — that's fine.
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') { reject(new Error('bad reader result')); return; }
      resolve(dataUrlToBase64(result));
    };
    reader.readAsDataURL(blob);
  });
}

function loadManifest(jobId: string): PhotoRecord[] {
  try {
    const raw = localStorage.getItem(manifestKey(jobId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter to records that look valid — legacy entries with `dataUrl` and no
    // `filename` are handled during migration in loadPhotos().
    return parsed
      .filter((p): p is PhotoRecord =>
        p && typeof p === 'object' &&
        typeof p.id === 'string' &&
        typeof p.timestamp === 'number' &&
        typeof p.filename === 'string' &&
        typeof p.comment === 'string')
      .map(p => ({ id: p.id, timestamp: p.timestamp, filename: p.filename, comment: p.comment }));
  } catch {
    return [];
  }
}

function saveManifest(jobId: string, records: PhotoRecord[]): void {
  localStorage.setItem(manifestKey(jobId), JSON.stringify(records));
}

// Legacy: older builds stored the full dataUrl inline in the manifest. On
// first read for such a job, extract the bytes onto disk and rewrite the
// manifest with just filename references so future reads follow the new path.
async function migrateLegacyIfPresent(jobId: string): Promise<PhotoRecord[]> {
  const raw = localStorage.getItem(manifestKey(jobId));
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(parsed)) return [];

  const migrated: PhotoRecord[] = [];
  let anyLegacy = false;
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== 'string' || typeof e.timestamp !== 'number') continue;
    const comment = typeof e.comment === 'string' ? e.comment : '';
    if (typeof e.filename === 'string') {
      migrated.push({ id: e.id, timestamp: e.timestamp, filename: e.filename, comment });
      continue;
    }
    if (typeof e.dataUrl === 'string' && e.dataUrl.startsWith('data:')) {
      anyLegacy = true;
      const filename = `${e.id}.jpg`;
      try {
        await writePhotoFile(jobId, filename, e.dataUrl);
        migrated.push({ id: e.id, timestamp: e.timestamp, filename, comment });
      } catch (err) {
        console.warn('[jobphotos] failed to migrate legacy photo', err);
      }
    }
  }
  if (anyLegacy) saveManifest(jobId, migrated);
  return migrated;
}

async function loadPhotos(jobId: string): Promise<JobPhoto[]> {
  const records = await migrateLegacyIfPresent(jobId);
  const hydrated: JobPhoto[] = [];
  for (const r of records) {
    const dataUrl = await readPhotoFile(jobId, r.filename);
    if (!dataUrl) continue; // File missing on disk — skip so the UI doesn't try to render a dead ref.
    hydrated.push({ id: r.id, timestamp: r.timestamp, comment: r.comment, dataUrl });
  }
  return hydrated;
}

// Read the file, draw into a canvas at capped dimensions, re-encode as
// JPEG. Returns a data URL — the hook takes care of writing it to disk.
export async function compressImageFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('image decode failed'));
    el.src = dataUrl;
  });

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
  const targetW = Math.round(img.width * scale);
  const targetH = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

export function useJobPhotos(jobId: string | null | undefined) {
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  // Tracks which job we're currently loading so a fast job-switch doesn't
  // land the previous job's photos in state after this render.
  const activeJobIdRef = useRef<string | null | undefined>(jobId);

  useEffect(() => {
    activeJobIdRef.current = jobId;
    if (!jobId) { setPhotos([]); return; }
    let cancelled = false;
    (async () => {
      const loaded = await loadPhotos(jobId);
      if (!cancelled && activeJobIdRef.current === jobId) setPhotos(loaded);
    })();
    return () => { cancelled = true; };
  }, [jobId]);

  const addPhoto = useCallback(async (dataUrl: string, comment: string) => {
    if (!jobId) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filename = `${id}.jpg`;
    try {
      await writePhotoFile(jobId, filename, dataUrl);
    } catch (err) {
      console.warn('[jobphotos] write failed', err);
      return;
    }
    const record: PhotoRecord = { id, timestamp: Date.now(), filename, comment };
    const nextRecords = [record, ...loadManifest(jobId)];
    saveManifest(jobId, nextRecords);
    setPhotos(prev => [{ id, timestamp: record.timestamp, comment, dataUrl }, ...prev]);
  }, [jobId]);

  const updateComment = useCallback((photoId: string, comment: string) => {
    if (!jobId) return;
    const records = loadManifest(jobId).map(r => r.id === photoId ? { ...r, comment } : r);
    saveManifest(jobId, records);
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, comment } : p));
  }, [jobId]);

  const removePhoto = useCallback(async (photoId: string) => {
    if (!jobId) return;
    const records = loadManifest(jobId);
    const target = records.find(r => r.id === photoId);
    const next = records.filter(r => r.id !== photoId);
    saveManifest(jobId, next);
    if (target) await deletePhotoFile(jobId, target.filename).catch(() => { /* best effort */ });
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  }, [jobId]);

  return { photos, addPhoto, updateComment, removePhoto };
}

// Helpers for backup / restore — read every stored photo out to a plain
// {jobId, photoId, base64} record set so the backup file can carry them,
// and write them back on restore.

export function listPhotoManifests(): { jobId: string; records: PhotoRecord[] }[] {
  const results: { jobId: string; records: PhotoRecord[] }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(MANIFEST_PREFIX)) continue;
    const jobId = key.slice(MANIFEST_PREFIX.length);
    results.push({ jobId, records: loadManifest(jobId) });
  }
  return results;
}

export async function readPhotoBase64(jobId: string, filename: string): Promise<string | null> {
  try {
    const res = await Filesystem.readFile({
      path: photoPath(jobId, filename),
      directory: Directory.Data,
    });
    return typeof res.data === 'string' ? res.data : await blobToBase64(res.data as Blob);
  } catch {
    return null;
  }
}

export async function writePhotoBase64(jobId: string, filename: string, base64: string): Promise<void> {
  await ensureJobDir(jobId);
  await Filesystem.writeFile({
    path: photoPath(jobId, filename),
    data: base64,
    directory: Directory.Data,
  });
}
