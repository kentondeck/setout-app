import { useCallback, useEffect, useState } from 'react';

// Photos + comments attached to a saved job (a real job in the Jobs list).
// Kept in a per-job localStorage key rather than inside the SavedJob record
// so many-photo jobs don't bloat the main sitehand_jobs blob.
//
// Photos are compressed on capture (canvas-resize + JPEG-encode) — a phone
// photo that comes in at 3–5 MB shrinks to ~100–300 KB, so 15–30+ photos
// fit inside the 5 MB per-key localStorage budget.

export interface JobPhoto {
  id: string;
  timestamp: number;
  dataUrl: string; // compressed JPEG data URL
  comment: string;
}

const STORAGE_PREFIX = 'sitehand_jobphotos_';
const MAX_IMAGE_DIMENSION = 1400;
const JPEG_QUALITY = 0.72;

function storageKey(jobId: string): string {
  return `${STORAGE_PREFIX}${jobId}`;
}

function loadPhotos(jobId: string): JobPhoto[] {
  try {
    const raw = localStorage.getItem(storageKey(jobId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePhotos(jobId: string, photos: JobPhoto[]): void {
  localStorage.setItem(storageKey(jobId), JSON.stringify(photos));
}

// Read the file, draw into a canvas at capped dimensions, re-encode as
// JPEG. Returns a data URL small enough to sit in localStorage next to
// dozens of other photos.
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
  const [photos, setPhotos] = useState<JobPhoto[]>(() => (jobId ? loadPhotos(jobId) : []));

  useEffect(() => {
    setPhotos(jobId ? loadPhotos(jobId) : []);
  }, [jobId]);

  const addPhoto = useCallback((dataUrl: string, comment: string) => {
    if (!jobId) return;
    const photo: JobPhoto = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      dataUrl,
      comment,
    };
    const next = [photo, ...photos];
    savePhotos(jobId, next);
    setPhotos(next);
  }, [jobId, photos]);

  const updateComment = useCallback((photoId: string, comment: string) => {
    if (!jobId) return;
    const next = photos.map(p => p.id === photoId ? { ...p, comment } : p);
    savePhotos(jobId, next);
    setPhotos(next);
  }, [jobId, photos]);

  const removePhoto = useCallback((photoId: string) => {
    if (!jobId) return;
    const next = photos.filter(p => p.id !== photoId);
    savePhotos(jobId, next);
    setPhotos(next);
  }, [jobId, photos]);

  return { photos, addPhoto, updateComment, removePhoto };
}
