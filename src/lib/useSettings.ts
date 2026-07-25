import { useState, useCallback } from 'react';
import type { Settings } from '../types';

const KEY = 'setout_settings';

const defaults: Settings = {
  unit: 'metric',
  apprenticeMode: false,
  userName: '',
  region: 'AU',
  pinnedCalcs: [],
  employees: [],
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings>(load);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return [settings, update];
}
