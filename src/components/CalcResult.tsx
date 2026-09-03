import { useNavigate } from 'react-router-dom';
import type { CalcQuoteHandoff } from '../pages/PhotoQuoteCalc';

// Shared post-calculate result components — the "hero + shopping list + CTAs + save"
// pattern lives here so every calculator page can render the same look without
// each page hand-rolling styles that drift out of sync.

export interface HeroStat {
  label: string;
}

interface ResultHeroProps {
  label: string;          // e.g. "You'll need"
  value: string | number; // e.g. 44
  unit?: string;          // e.g. "boards"
  spec?: string;          // e.g. "140×22 H3.2 · mixed lengths"
  stats?: HeroStat[];
}

// The orange gradient answer card — the confident headline number every result opens with.
export function ResultHero({ label, value, unit, spec, stats }: ResultHeroProps) {
  return (
    <div style={{
      background: 'linear-gradient(160deg, #FF5A1F 0%, #E64A10 100%)',
      color: '#fff',
      borderRadius: 'var(--radius-card)',
      padding: '22px 20px 18px',
      fontVariantNumeric: 'tabular-nums',
    }}>
      <p style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.6px', color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>
        {label}
      </p>
      <p style={{ margin: '8px 0 6px', fontSize: 44, fontWeight: 500, letterSpacing: '-1.4px', lineHeight: 0.95 }}>
        {value}
        {unit && (
          <span style={{ fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.82)', marginLeft: 8, letterSpacing: '-0.4px' }}>
            {unit}
          </span>
        )}
      </p>
      {spec && (
        <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.2px' }}>
          {spec}
        </p>
      )}
      {stats && stats.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
          {stats.map(s => (
            <span key={s.label} style={{
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 999, padding: '5px 10px',
              fontSize: 11.5, fontWeight: 500, color: '#fff',
              letterSpacing: '-0.1px',
            }}>
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export interface ShoppingRow {
  qty: string;
  name: string;
  meta: string;
}

// Builds the plain-text body that Share uses when a shopping list is present.
// Strips any waste / buffer chatter from meta so the yard sees a clean order
// — the tradie's calc still shows waste %/mm on-screen for their own planning.
export function buildShoppingListShareBody({
  jobName,
  scopeSummary,
  rows,
}: {
  jobName?: string;
  scopeSummary: string;
  rows: ShoppingRow[];
}): string {
  const heading = jobName ? `${jobName} — ${scopeSummary}` : scopeSummary;
  // Keep only segments useful to the yard (product dimensions, stock lengths,
  // "N × Xm each" breakdowns). Drop the tradie-side telemetry: waste, buffer,
  // running totals (X lm / X m²), and secondary counts (N nails / ties / screws).
  const cleanMeta = (meta: string): string =>
    meta
      .split(/\s*·\s*/)
      .filter(seg => {
        const s = seg.trim();
        if (!s) return false;
        if (/waste|buffer|incl\.?/i.test(s)) return false;
        // Pure running totals: "70.4 lm", "12.5 m²", "1.2 m³"
        if (/^\d+(\.\d+)?\s*(lm|m²|m³)$/i.test(s)) return false;
        // Secondary tallies the yard doesn't need to see
        if (/^\d+\s+(nails|ties|screws|chairs|holes)(\s+needed)?$/i.test(s)) return false;
        return true;
      })
      .join(' · ');
  return [
    heading,
    '',
    ...rows.map(r => {
      const m = cleanMeta(r.meta);
      return m ? `${r.qty} × ${r.name} — ${m}` : `${r.qty} × ${r.name}`;
    }),
    '',
    'Sent from Setout',
  ].join('\n');
}

interface ShoppingListProps {
  rows: ShoppingRow[];
  rightSlot?: React.ReactNode;
  noteSlot?: React.ReactNode; // rendered inline next to the header title
}

// The "Shopping list" card — soft-orange qty chip + name + meta. Optional right slot
// lets a page put a Fixed/RLP toggle or similar switch in the header.
export function ShoppingList({ rows, rightSlot, noteSlot }: ShoppingListProps) {
  return (
    <div style={{
      background: 'var(--color-card)',
      border: '0.5px solid var(--color-border)',
      borderRadius: 'var(--radius-card)',
      padding: 4,
      display: 'flex', flexDirection: 'column',
      fontVariantNumeric: 'tabular-nums',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.6px', color: 'var(--color-muted)', fontWeight: 500 }}>
            Shopping list
          </span>
          {noteSlot}
        </div>
        {rightSlot}
      </div>

      {rows.map(row => (
        <div
          key={row.name}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px',
            borderTop: '0.5px solid var(--color-border)',
          }}
        >
          <div style={{
            minWidth: 48, textAlign: 'center',
            background: '#fff0e9', color: 'var(--color-orange)',
            borderRadius: 8, padding: '4px 8px',
            fontFamily: "'SF Pro Rounded', 'Nunito', system-ui, -apple-system, sans-serif",
            fontVariantNumeric: 'tabular-nums',
            fontSize: 16, fontWeight: 700,
            letterSpacing: '-0.5px',
          }}>
            {row.qty}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, color: 'var(--color-text)', letterSpacing: '-0.2px', fontWeight: 500 }}>
              {row.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>
              {row.meta}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface QuoteMaterial {
  item: string;
  quantity: number;
  unit: string;
  note?: string;
}

interface AddToQuoteCTAProps {
  scopeSummary: string;
  materials: QuoteMaterial[];
  jobName?: string;
  subtitle?: string;
}

// Primary orange CTA — hand off calculator materials to the quote/invoice flow.
// Replaces the old inline AddToQuoteButton pattern with the prominent bubble style.
export function AddToQuoteCTA({ scopeSummary, materials, jobName, subtitle = 'Send materials to a new or open quote' }: AddToQuoteCTAProps) {
  const navigate = useNavigate();
  if (materials.length === 0) return null;

  function handleClick() {
    const state: CalcQuoteHandoff = { fromCalculator: true, scopeSummary, materials, jobName };
    navigate('/calc/photoquote', { state });
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 18px', borderRadius: 14,
        background: 'var(--color-orange)', color: '#fff', border: 'none',
        fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
      }}
      onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
      onPointerUp={e => (e.currentTarget.style.opacity = '1')}
      onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.2px' }}>Add to Quote</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
            {subtitle}
          </div>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}
