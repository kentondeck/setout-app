import { useContext, useMemo, useState } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { SettingsContext } from '../contexts';
import {
  NZ_FLOOR_JOISTS, NZ_FLOOR_BEARERS, NZ_RAFTERS, NZ_WALL_STUDS,
  AU_FLOOR_JOISTS, AU_WALL_STUDS,
  type SpanEntry,
} from '../lib/spanTables';

type MemberKey = 'joist' | 'bearer' | 'rafter' | 'stud';
type Region = 'AU' | 'NZ';

interface MemberMeta {
  key: MemberKey;
  label: string;
  outputLabel: string;       // e.g. "Max span" vs "Max stud height"
  spacingLabel: string;      // e.g. "Joist spacing" vs "Load width"
  supported: Record<Region, boolean>;
}

const MEMBERS: MemberMeta[] = [
  { key: 'joist',  label: 'Floor joist',  outputLabel: 'Max span',        spacingLabel: 'Joist spacing (mm c/c)', supported: { NZ: true, AU: true } },
  { key: 'bearer', label: 'Floor bearer', outputLabel: 'Max span',        spacingLabel: 'Load width',              supported: { NZ: true, AU: false } },
  { key: 'rafter', label: 'Rafter',       outputLabel: 'Max span',        spacingLabel: 'Rafter spacing (mm c/c)', supported: { NZ: true, AU: false } },
  { key: 'stud',   label: 'Wall stud',    outputLabel: 'Max stud height', spacingLabel: 'Stud spacing (mm c/c)',   supported: { NZ: true, AU: true } },
];

// Return the right span-table tree for (region, member) — or null if unsupported.
function tableFor(region: Region, member: MemberKey): Record<string, Record<string, Record<number, SpanEntry>>> | null {
  if (region === 'NZ') {
    if (member === 'joist')  return NZ_FLOOR_JOISTS;
    if (member === 'bearer') return NZ_FLOOR_BEARERS;
    if (member === 'rafter') return NZ_RAFTERS;
    if (member === 'stud')   return NZ_WALL_STUDS;
  } else {
    if (member === 'joist') return AU_FLOOR_JOISTS;
    if (member === 'stud')  return AU_WALL_STUDS;
  }
  return null;
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '9px 14px',
    borderRadius: 999,
    border: `0.5px solid ${active ? 'var(--color-orange)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-orange)' : 'var(--color-card)',
    color: active ? '#fff' : 'var(--color-text)',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '-0.1px',
    whiteSpace: 'nowrap',
  };
}

export function SpanCheckCalc() {
  const { settings } = useContext(SettingsContext);
  const region: Region = settings.region;

  // Default to the first supported member for this region.
  const defaultMember: MemberKey = MEMBERS.find(m => m.supported[region])?.key ?? 'joist';

  const [member, setMember] = useState<MemberKey>(defaultMember);
  const [grade, setGrade]   = useState<string | null>(null);
  const [size, setSize]     = useState<string | null>(null);
  const [spacing, setSpacing] = useState<number | null>(null);

  const table = tableFor(region, member);
  const memberMeta = MEMBERS.find(m => m.key === member)!;

  // Derived chip options — grades from the table, sizes from the selected
  // grade, spacings from the selected size. Each level narrows the next.
  const grades = useMemo(() => (table ? Object.keys(table) : []), [table]);
  const sizes = useMemo(
    () => (table && grade && table[grade] ? Object.keys(table[grade]) : []),
    [table, grade],
  );
  const spacings = useMemo(
    () => (table && grade && size && table[grade]?.[size]
      ? Object.keys(table[grade][size]).map(Number).sort((a, b) => a - b)
      : []),
    [table, grade, size],
  );

  // Keep the selection consistent when a parent changes (e.g. switch member
  // type → the previously-chosen grade may not exist in the new table).
  function switchMember(m: MemberKey) {
    setMember(m);
    setGrade(null);
    setSize(null);
    setSpacing(null);
  }
  function pickGrade(g: string) {
    setGrade(g);
    if (!table?.[g]?.[size ?? '']) { setSize(null); setSpacing(null); }
  }
  function pickSize(s: string) {
    setSize(s);
    if (!table?.[grade ?? '']?.[s]?.[spacing ?? 0]) setSpacing(null);
  }

  const entry: SpanEntry | undefined = (table && grade && size && spacing !== null)
    ? table[grade]?.[size]?.[spacing]
    : undefined;

  // Full table for the currently-selected grade + spacing — a reference view
  // so the tradie can see all sizes at once (great for "what's the next
  // size up for a longer span?" moments).
  const referenceRows = useMemo(() => {
    if (!table || !grade || spacing === null) return [];
    const gTable = table[grade];
    if (!gTable) return [];
    return Object.entries(gTable)
      .map(([s, spacingMap]) => {
        // For bearers the spacing dimension is always "1" (single load width),
        // so fall back to the first available spacing key.
        const key = spacingMap[spacing] ? spacing : Number(Object.keys(spacingMap)[0]);
        return { size: s, entry: spacingMap[key] };
      })
      .filter(r => !!r.entry);
  }, [table, grade, spacing]);

  const sectionCard: React.CSSProperties = {
    background: 'var(--color-card)',
    border: '0.5px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  const sectionLabel: React.CSSProperties = {
    margin: 0, fontSize: 11, fontWeight: 500, letterSpacing: '1.4px',
    color: 'var(--color-muted)', textTransform: 'uppercase',
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Span check" />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Region indicator — dictates which standard is used */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={sectionLabel}>Standard</span>
          <span style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 500 }}>
            {region === 'NZ' ? 'NZS 3604:2011' : 'AS 1684.2:2010'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
            (change in Settings)
          </span>
        </div>

        {/* Member type */}
        <div style={sectionCard}>
          <p style={sectionLabel}>Member type</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MEMBERS.filter(m => m.supported[region]).map(m => (
              <button key={m.key} onClick={() => switchMember(m.key)} style={chipStyle(member === m.key)}>
                {m.label}
              </button>
            ))}
          </div>
          {!table && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
              No embedded data for this member in {region}. Check the standard directly.
            </p>
          )}
        </div>

        {/* Grade */}
        {grades.length > 0 && (
          <div style={sectionCard}>
            <p style={sectionLabel}>Timber grade</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {grades.map(g => (
                <button key={g} onClick={() => pickGrade(g)} style={chipStyle(grade === g)}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Size */}
        {sizes.length > 0 && (
          <div style={sectionCard}>
            <p style={sectionLabel}>Section (mm)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {sizes.map(s => (
                <button key={s} onClick={() => pickSize(s)} style={chipStyle(size === s)}>
                  {s.replace('x', ' × ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Spacing (or load width for bearers) */}
        {spacings.length > 0 && (
          <div style={sectionCard}>
            <p style={sectionLabel}>{memberMeta.spacingLabel}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {spacings.map(sp => (
                <button key={sp} onClick={() => setSpacing(sp)} style={chipStyle(spacing === sp)}>
                  {member === 'bearer' ? '1.8 m load width' : `${sp} mm`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hero result */}
        {entry && (
          <div style={{
            background: 'linear-gradient(160deg, #FF5A1F 0%, #E64A10 100%)',
            color: '#fff',
            borderRadius: 'var(--radius-card)',
            padding: '22px 20px 20px',
            display: 'flex', flexDirection: 'column', gap: 8,
            fontVariantNumeric: 'tabular-nums',
          }}>
            <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.6px', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
              {memberMeta.outputLabel}
            </p>
            <p style={{ margin: 0, fontSize: 44, fontWeight: 500, letterSpacing: '-1.4px', lineHeight: 1 }}>
              {entry.maxSpanM} <span style={{ fontSize: 20, fontWeight: 400, color: 'rgba(255,255,255,0.85)' }}>m</span>
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
              {grade} · {size?.replace('x', ' × ')} · {member === 'bearer' ? '1.8 m load width' : `${spacing} mm centres`}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>
              {entry.tableRef}
            </p>
          </div>
        )}

        {/* Reference table — all sizes at selected grade + spacing */}
        {referenceRows.length > 1 && (
          <div style={sectionCard}>
            <p style={sectionLabel}>
              All sizes at {grade} · {member === 'bearer' ? '1.8 m load width' : `${spacing} mm`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {referenceRows.map(row => (
                <div key={row.size} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  padding: '8px 12px', borderRadius: 10,
                  background: size === row.size ? '#fff0e9' : 'var(--color-bg)',
                }}>
                  <span style={{ fontSize: 13.5, color: 'var(--color-text)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                    {row.size.replace('x', ' × ')} mm
                  </span>
                  <span style={{
                    fontSize: 14, fontWeight: 600,
                    color: size === row.size ? 'var(--color-orange)' : 'var(--color-text)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {row.entry.maxSpanM} m
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance / disclaimer */}
        <div style={{
          background: '#fff8e6', border: '0.5px solid #f5c542',
          borderRadius: 'var(--radius-card)', padding: '14px 16px',
        }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#7a5b00', letterSpacing: '-0.1px' }}>
            Reference only
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#7a5b00', lineHeight: 1.5 }}>
            Values are mid-range figures for single-span, standard residential loading{region === 'NZ' ? ' (0.75 kPa live load, 1.8 m load width for joists/bearers, sheet roof for rafters, standard wind zone for studs)' : ' (standard residential loading, N2 wind class default)'}.
            Actual spans depend on wind zone / snow zone / seismic zone,
            load width, cladding weight, end-fixity, continuous vs single span,
            and any concentrated loads. For consent-issue work or anything outside
            residential norms, verify against the current published {region === 'NZ' ? 'NZS 3604' : 'AS 1684.2'} or engage a structural engineer. Not a substitute for engineered design.
          </p>
        </div>
      </div>
    </div>
  );
}
