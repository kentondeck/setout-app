import { useCallback, useEffect, useState } from 'react';

// Personal photo + text notes attached to a Sequencer job (e.g. "the way I
// nailed off this brace panel on the Smith job"). Persisted to localStorage
// per Sequencer job id so a tradie can build up their own field library
// over time.
//
// Photos are compressed on capture (canvas-resize + JPEG-encode) so a
// phone photo that comes in at 3–5 MB shrinks to ~100–300 KB before it
// hits storage — keeps us comfortably inside the 5 MB localStorage budget
// for typical usage.

export interface JobNote {
  id: string;
  timestamp: number;
  text: string;
  photo?: string; // data URL (image/jpeg), already compressed
}

const STORAGE_PREFIX = 'sitehand_jobnotes_';
const MAX_IMAGE_DIMENSION = 1400;
const JPEG_QUALITY = 0.72;

function storageKey(jobId: string): string {
  return `${STORAGE_PREFIX}${jobId}`;
}

function loadNotes(jobId: string): JobNote[] {
  try {
    const raw = localStorage.getItem(storageKey(jobId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotes(jobId: string, notes: JobNote[]): void {
  localStorage.setItem(storageKey(jobId), JSON.stringify(notes));
}

// Read the file, draw into a canvas at capped dimensions, re-encode as
// JPEG. Returns a data URL small enough to sit in localStorage next to
// dozens of other notes.
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

export function useJobNotes(jobId: string | null) {
  const [notes, setNotes] = useState<JobNote[]>(() => (jobId ? loadNotes(jobId) : []));

  useEffect(() => {
    setNotes(jobId ? loadNotes(jobId) : []);
  }, [jobId]);

  const addNote = useCallback((text: string, photo?: string) => {
    if (!jobId) return;
    const note: JobNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      text,
      photo,
    };
    const next = [note, ...notes];
    saveNotes(jobId, next);
    setNotes(next);
  }, [jobId, notes]);

  const removeNote = useCallback((noteId: string) => {
    if (!jobId) return;
    const next = notes.filter(n => n.id !== noteId);
    saveNotes(jobId, next);
    setNotes(next);
  }, [jobId, notes]);

  return { notes, addNote, removeNote };
}
