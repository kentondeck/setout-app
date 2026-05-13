import { useState, useEffect } from 'react';
import { detectCoastalZone } from '../lib/coastalZone';
import type { CoastalZone } from '../lib/coastalZone';

const STORAGE_KEY = 'setout_coastal_zone';

interface Stored {
  zone: CoastalZone;
  timestamp: number;
}

export function CoastalNote() {
  const [zone, setZone] = useState<CoastalZone | null>(null);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Stored;
      // Cache valid for 7 days — location doesn't change much
      if (Date.now() - stored.timestamp < 7 * 24 * 60 * 60 * 1000) {
        setZone(stored.zone);
      }
    } catch {}
  }, []);

  function detect() {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const z = detectCoastalZone(pos.coords.latitude, pos.coords.longitude);
        setZone(z);
        const stored: Stored = { zone: z, timestamp: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        setLoading(false);
      },
      () => {
        setDenied(true);
        setLoading(false);
      },
      { timeout: 10000, maximumAge: 300_000 },
    );
  }

  if (denied) return null;

  if (zone === null) {
    return (
      <button
        onClick={detect}
        disabled={loading}
        style={{
          background: 'none',
          border: '0.5px solid var(--color-border)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          color: 'var(--color-muted)',
          fontFamily: 'inherit',
          cursor: loading ? 'default' : 'pointer',
          textAlign: 'left' as const,
          width: '100%',
        }}
      >
        {loading ? 'Detecting location...' : 'Check coastal zone for this job'}
      </button>
    );
  }

  if (zone === 'none') return null;

  const isHigh = zone === 'high';

  return (
    <div style={{
      background: '#fffbeb',
      border: '0.5px solid #fbbf24',
      borderRadius: 8,
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#92400e' }}>
        {isHigh ? 'Coastal location' : 'Near coastal area'}
      </p>
      <p style={{ margin: 0, fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
        {isHigh
          ? 'Within ~5km of the coast — use stainless steel or hot-dip galvanised fixings. Verify AS 4312 / NZS 3404 corrosivity zone with your engineer.'
          : 'Within ~30km of the coast — confirm corrosivity zone (AS 4312 / NZS 3404). Stainless or galvanised fixings may apply.'}
      </p>
    </div>
  );
}
