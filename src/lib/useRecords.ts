import { useCallback, useEffect, useRef, useState } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Records = receipts + tool inventory. Same storage pattern as job photos:
// JPEG bytes on disk (Filesystem, Directory.Data), metadata in localStorage.
// Wins the same three things:
//   1. iOS backs up Directory.Data → records ride along with an iCloud device
//      restore (loss of tool records / receipts before an insurance claim is
//      exactly what you don't want).
//   2. Per-file writes can't fail all-or-nothing the way a big base64 blob can.
//   3. localStorage quota stops being a per-record photo ceiling.
//
// One shared hook covers both types — receipts and tools have different
// metadata shapes but the same photo + list + edit + delete plumbing.

// ── Data types ──────────────────────────────────────────────────────────────

export interface Receipt {
  id: string;
  timestamp: number;             // when the receipt was captured
  filename: string;              // JPEG on disk under Directory.Data / receiptphotos
  supplier?: string;             // "Bunnings", "PlaceMakers", etc.
  amount?: number;               // total on the receipt, dollars
  date?: string;                 // ISO date on the receipt itself (may differ from timestamp)
  category?: string;             // Materials / Tools / Fuel / Vehicle / Subcontractor / Plant hire / Other
  jobId?: string;                // optional link back to a saved job
  notes?: string;
}

export interface Tool {
  id: string;
  timestamp: number;             // when added to inventory
  filename: string;              // JPEG on disk under Directory.Data / toolphotos
  name?: string;                 // "18V Impact Driver"
  brand?: string;                // "Makita"
  model?: string;                // "DTD154"
  serial?: string;               // serial number for insurance
  purchaseDate?: string;         // ISO date
  replacementValue?: number;     // dollars — for insurance quotes
  category?: string;             // Power / Hand / Plant / Vehicle / Other
  notes?: string;
}

export type RecordKind = 'receipts' | 'tools';

export const RECEIPT_CATEGORIES = ['Materials', 'Tools', 'Fuel', 'Vehicle', 'Subcontractor', 'Plant hire', 'Other'];
export const TOOL_CATEGORIES = ['Power tools', 'Hand tools', 'Plant', 'Vehicle', 'Other'];

// ── Storage keys + paths ────────────────────────────────────────────────────

const KEY: Record<RecordKind, string> = {
  receipts: 'setout_receipts_v1',
  tools:    'setout_tools_v1',
};
const DIR: Record<RecordKind, string> = {
  receipts: 'receiptphotos',
  tools:    'toolphotos',
};

// ── Filesystem helpers (mirror useJobPhotos) ────────────────────────────────

function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function base64ToDataUrl(base64: string): string {
  return `data:image/jpeg;base64,${base64}`;
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

async function ensureDir(kind: RecordKind): Promise<void> {
  try {
    await Filesystem.mkdir({ path: DIR[kind], directory: Directory.Data, recursive: true });
  } catch { /* already exists */ }
}

async function writePhoto(kind: RecordKind, filename: string, dataUrl: string): Promise<void> {
  await ensureDir(kind);
  await Filesystem.writeFile({
    path: `${DIR[kind]}/${filename}`,
    data: dataUrlToBase64(dataUrl),
    directory: Directory.Data,
  });
}

async function readPhoto(kind: RecordKind, filename: string): Promise<string | null> {
  try {
    const res = await Filesystem.readFile({
      path: `${DIR[kind]}/${filename}`,
      directory: Directory.Data,
    });
    const data = typeof res.data === 'string' ? res.data : await blobToBase64(res.data as Blob);
    return base64ToDataUrl(data);
  } catch {
    return null;
  }
}

async function deletePhoto(kind: RecordKind, filename: string): Promise<void> {
  try {
    await Filesystem.deleteFile({
      path: `${DIR[kind]}/${filename}`,
      directory: Directory.Data,
    });
  } catch { /* nothing to delete */ }
}

// ── Image compression (same shape as useJobPhotos.compressImageFile) ────────

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.72;

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

// ── Metadata list (localStorage-backed) ─────────────────────────────────────

function loadList<T>(kind: RecordKind): T[] {
  try {
    const raw = localStorage.getItem(KEY[kind]);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function saveList<T>(kind: RecordKind, list: T[]): void {
  localStorage.setItem(KEY[kind], JSON.stringify(list));
}

// ── Public hooks ────────────────────────────────────────────────────────────

// Records carry a `filename` reference but the UI wants the image as a data URL.
// Same async-hydration pattern as useJobPhotos: keep the record list in state
// with a `dataUrl?` populated lazily as photos are read from disk.
export interface Hydrated<T> {
  record: T;
  dataUrl: string | null; // null while loading or if the file is missing
}

function useRecords<T extends { id: string; filename: string; timestamp: number }>(kind: RecordKind) {
  const [items, setItems] = useState<Hydrated<T>[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const list = loadList<T>(kind);
    // Newest first — matches how a shoebox works (most recent on top).
    const sorted = [...list].sort((a, b) => b.timestamp - a.timestamp);
    setItems(sorted.map(record => ({ record, dataUrl: null })));

    // Hydrate photos in the background so the list renders instantly.
    (async () => {
      for (let i = 0; i < sorted.length; i++) {
        const dataUrl = await readPhoto(kind, sorted[i].filename);
        if (!mountedRef.current) return;
        setItems(prev => prev.map(h =>
          h.record.id === sorted[i].id ? { ...h, dataUrl } : h,
        ));
      }
    })();
  }, [kind]);

  const add = useCallback(async (photoDataUrl: string, fields: Omit<T, 'id' | 'filename' | 'timestamp'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filename = `${id}.jpg`;
    try {
      await writePhoto(kind, filename, photoDataUrl);
    } catch (err) {
      console.warn('[records] write failed', err);
      return;
    }
    const record = { id, filename, timestamp: Date.now(), ...fields } as unknown as T;
    const next = [record, ...loadList<T>(kind)];
    saveList(kind, next);
    setItems(prev => [{ record, dataUrl: photoDataUrl }, ...prev]);
  }, [kind]);

  const update = useCallback((id: string, patch: Partial<T>) => {
    const list = loadList<T>(kind).map(r =>
      r.id === id ? { ...r, ...patch } as T : r,
    );
    saveList(kind, list);
    setItems(prev => prev.map(h =>
      h.record.id === id ? { ...h, record: { ...h.record, ...patch } as T } : h,
    ));
  }, [kind]);

  const remove = useCallback(async (id: string) => {
    const list = loadList<T>(kind);
    const target = list.find(r => r.id === id);
    const next = list.filter(r => r.id !== id);
    saveList(kind, next);
    if (target) await deletePhoto(kind, target.filename).catch(() => { /* best effort */ });
    setItems(prev => prev.filter(h => h.record.id !== id));
  }, [kind]);

  return { items, add, update, remove };
}

export function useReceipts() {
  return useRecords<Receipt>('receipts');
}

export function useTools() {
  return useRecords<Tool>('tools');
}

// ── Backup helpers ──────────────────────────────────────────────────────────
// Backup.ts needs to enumerate + read + write records + photos.

export function listRecordFiles(kind: RecordKind): { id: string; filename: string }[] {
  const list = loadList<{ id: string; filename: string }>(kind);
  return list.map(r => ({ id: r.id, filename: r.filename }));
}

export async function readRecordPhotoBase64(kind: RecordKind, filename: string): Promise<string | null> {
  try {
    const res = await Filesystem.readFile({
      path: `${DIR[kind]}/${filename}`,
      directory: Directory.Data,
    });
    return typeof res.data === 'string' ? res.data : await blobToBase64(res.data as Blob);
  } catch {
    return null;
  }
}

export async function writeRecordPhotoBase64(kind: RecordKind, filename: string, base64: string): Promise<void> {
  await ensureDir(kind);
  await Filesystem.writeFile({
    path: `${DIR[kind]}/${filename}`,
    data: base64,
    directory: Directory.Data,
  });
}

export const RECORD_DIR = DIR;
