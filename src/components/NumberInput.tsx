import { useState, useEffect, useRef, useContext } from 'react';
import { SettingsContext } from '../contexts';

// Multiply a value in `from` units by this factor to get `to` units
const TO: Record<string, Record<string, number>> = {
  mm: { mm: 1, m: 0.001, 'in': 1 / 25.4, ft: 1 / 304.8 },
  m:  { m: 1, mm: 1000, ft: 1 / 0.3048, 'in': 1 / 0.0254 },
  'in': { 'in': 1, ft: 1 / 12, mm: 25.4, m: 0.0254 },
  ft:  { ft: 1, 'in': 12, mm: 304.8, m: 0.3048 },
};

function cvt(val: number, from: string, to: string): number {
  return val * ((TO[from]?.[to]) ?? 1);
}

function fmt(val: number): string {
  return parseFloat(val.toFixed(3)).toString();
}

// Imperial display units for a given metric base unit
const IMP: Record<string, string[]> = {
  mm: ['in', 'ft'],
  m: ['ft', 'in'],
};

interface NumberInputProps {
  label: string;
  value: string;         // always in units[0] (canonical unit)
  onChange: (v: string) => void;  // always in units[0]
  unit?: string;         // static non-switchable unit badge
  units?: string[];      // [canonicalUnit, alternate] — enables tap-to-toggle
  placeholder?: string;
  placeholders?: Record<string, string>;
  hint?: string;
}

export function NumberInput({ label, value, onChange, unit, units, placeholder, placeholders, hint }: NumberInputProps) {
  const { settings } = useContext(SettingsContext);
  const imperial = settings.unit === 'imperial';

  // Canonical (base) unit — always what value/onChange use
  const base = units?.[0] ?? unit ?? '';

  function buildDisplayUnits(): string[] {
    if (units && units.length >= 1) {
      return imperial && IMP[base] ? IMP[base] : units;
    }
    return unit !== undefined ? [unit] : [];
  }

  const displayUnits = buildDisplayUnits();
  const canToggle = displayUnits.length > 1;

  const [activeIdx, setActiveIdx] = useState(0);
  const activeUnit = displayUnits[Math.min(activeIdx, displayUnits.length - 1)] ?? base;

  function toDisplay(v: string, toUnit: string): string {
    if (!v) return '';
    const n = parseFloat(v);
    if (isNaN(n)) return v;
    return toUnit === base ? v : fmt(cvt(n, base, toUnit));
  }

  function toBase(v: string, fromUnit: string): string {
    if (!v) return '';
    const n = parseFloat(v);
    if (isNaN(n)) return '';
    return fromUnit === base ? v : fmt(cvt(n, fromUnit, base));
  }

  const [local, setLocal] = useState(() => toDisplay(value, activeUnit));
  const lastPropVal = useRef(value);

  // Sync when value changes from outside (e.g. presets)
  useEffect(() => {
    if (value !== lastPropVal.current) {
      lastPropVal.current = value;
      setLocal(toDisplay(value, activeUnit));
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset display when metric/imperial mode changes
  const prevImperial = useRef(imperial);
  useEffect(() => {
    if (imperial !== prevImperial.current) {
      prevImperial.current = imperial;
      setActiveIdx(0);
      const newUnits = imperial && IMP[base] ? IMP[base] : (units ?? (unit !== undefined ? [unit] : []));
      setLocal(toDisplay(value, newUnits[0] ?? base));
    }
  }, [imperial]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(raw: string) {
    setLocal(raw);
    if (!raw) {
      lastPropVal.current = '';
      onChange('');
    } else {
      const n = parseFloat(raw);
      if (!isNaN(n)) {
        const inBase = toBase(raw, activeUnit);
        lastPropVal.current = inBase;
        onChange(inBase);
      }
    }
  }

  function cycleUnit() {
    if (!canToggle) return;
    const newIdx = (activeIdx + 1) % displayUnits.length;
    const newUnit = displayUnits[newIdx];
    if (local) {
      const n = parseFloat(local);
      if (!isNaN(n)) setLocal(fmt(cvt(n, activeUnit, newUnit)));
    }
    setActiveIdx(newIdx);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.1px' }}>
          {label}
        </label>
        <span style={{ fontSize: 11, color: 'var(--color-muted)', visibility: hint ? 'visible' : 'hidden' }}>
          {hint || ' '}
        </span>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--color-bg)',
        border: '0.5px solid rgba(0,0,0,0.12)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <input
          type="number"
          inputMode="decimal"
          value={local}
          placeholder={placeholders?.[activeUnit] ?? placeholder}
          onChange={e => handleChange(e.target.value)}
          style={{
            flex: 1,
            padding: '13px 12px',
            border: 'none',
            background: 'transparent',
            fontSize: 16,
            fontFamily: 'inherit',
            color: 'var(--color-text)',
            outline: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
            minWidth: 0,
          }}
        />
        {activeUnit && (
          <span
            onClick={canToggle ? cycleUnit : undefined}
            style={{
              padding: '0 14px',
              fontSize: 13,
              color: canToggle ? 'var(--color-orange)' : 'var(--color-muted)',
              fontWeight: 500,
              flexShrink: 0,
              borderLeft: '0.5px solid rgba(0,0,0,0.08)',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              cursor: canToggle ? 'pointer' : 'default',
              userSelect: 'none' as const,
            }}
          >
            {activeUnit}
          </span>
        )}
      </div>
    </div>
  );
}
