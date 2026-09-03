import { useState, useCallback } from 'react';
import type { HistoryEntry } from '../types';

const KEY = 'setout_history';

function load(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(entries: HistoryEntry[]) {
  // Safari private browsing (a common iOS PWA case) and a full storage quota
  // both throw here — this runs inside a setState updater, so an uncaught
  // throw would propagate out of setHistory and break the update entirely.
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch { /* in-memory state still updates; persistence is best-effort */ }
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(load);

  const addEntry = useCallback((entry: HistoryEntry) => {
    setHistory(prev => {
      const next = [entry, ...prev];
      save(next);
      return next;
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setHistory(prev => {
      const next = prev.filter(e => e.id !== id);
      save(next);
      return next;
    });
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<HistoryEntry>) => {
    setHistory(prev => {
      const next = prev.map(e => e.id === id ? { ...e, ...patch } : e);
      save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(KEY); } catch { /* best-effort */ }
  }, []);

  return { history, addEntry, updateEntry, deleteEntry, clearAll };
}
