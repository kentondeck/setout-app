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
  localStorage.setItem(KEY, JSON.stringify(entries));
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
    localStorage.removeItem(KEY);
  }, []);

  return { history, addEntry, updateEntry, deleteEntry, clearAll };
}
