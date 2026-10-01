import { useCallback, useState } from 'react';

// Reusable quote line items — a tradie's common materials + labour roles saved
// once and inserted into any quote, so they're not re-typed every time. Stored
// locally (same as the rest of the app's data). Deduped by name, newest first,
// capped so the list stays tidy.

export interface SavedMaterial {
  item: string;
  unit: string;
  unitPrice: string; // cost per unit as entered (string, mirrors the editor field)
}

export interface SavedLabour {
  role: string;
  rate: string;
}

interface Store {
  materials: SavedMaterial[];
  labour: SavedLabour[];
}

const KEY = 'sitehand_saved_lineitems';
const MAX = 40;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { materials: [], labour: [] };
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      labour: Array.isArray(parsed.labour) ? parsed.labour : [],
    };
  } catch {
    return { materials: [], labour: [] };
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // storage full / disabled — degrade gracefully
  }
}

export function useSavedLineItems() {
  const [store, setStore] = useState<Store>(() => read());

  const saveMaterial = useCallback((m: SavedMaterial) => {
    const item = m.item.trim();
    if (!item) return;
    setStore(prev => {
      const materials = [
        { ...m, item },
        ...prev.materials.filter(x => x.item.toLowerCase() !== item.toLowerCase()),
      ].slice(0, MAX);
      const next = { ...prev, materials };
      write(next);
      return next;
    });
  }, []);

  const removeMaterial = useCallback((item: string) => {
    setStore(prev => {
      const next = { ...prev, materials: prev.materials.filter(x => x.item !== item) };
      write(next);
      return next;
    });
  }, []);

  const saveLabour = useCallback((l: SavedLabour) => {
    const role = l.role.trim();
    if (!role) return;
    setStore(prev => {
      const labour = [
        { ...l, role },
        ...prev.labour.filter(x => x.role.toLowerCase() !== role.toLowerCase()),
      ].slice(0, MAX);
      const next = { ...prev, labour };
      write(next);
      return next;
    });
  }, []);

  const removeLabour = useCallback((role: string) => {
    setStore(prev => {
      const next = { ...prev, labour: prev.labour.filter(x => x.role !== role) };
      write(next);
      return next;
    });
  }, []);

  return {
    savedMaterials: store.materials,
    savedLabour: store.labour,
    saveMaterial,
    removeMaterial,
    saveLabour,
    removeLabour,
  };
}
