import type { CalcMeta } from '../lib/calculators';

interface CalculatorTileProps {
  calc: CalcMeta;
  highlighted: boolean;
  pinned?: boolean;
  onPinToggle?: (id: string) => void;
  dragging?: boolean;
}

// Purely presentational — tap/hold/drag handling lives in the wrapper (ReorderableCalcGrid)
// so this component has no opinion on navigation vs. drag-to-reorder.
export function CalculatorTile({ calc, highlighted, pinned = false, onPinToggle, dragging = false }: CalculatorTileProps) {
  const bg = highlighted ? 'var(--color-orange)' : 'var(--color-card)';
  const iconBg = highlighted ? 'rgba(255,255,255,0.2)' : '#f5f5f3';
  const iconStroke = highlighted ? '#ffffff' : 'var(--color-text)';
  const labelColor = highlighted ? '#ffffff' : 'var(--color-text)';
  const subtitleColor = highlighted ? 'rgba(255,255,255,0.85)' : 'var(--color-muted)';

  return (
    <div
      style={{
        background: bg,
        borderRadius: 'var(--radius-tile)',
        border: 'none',
        minHeight: 130,
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: dragging
          ? '0 16px 32px rgba(0,0,0,0.2)'
          : highlighted
            ? '0 8px 20px -6px rgba(255,90,31,0.45)'
            : '0 2px 4px rgba(0,0,0,0.03), 0 8px 20px rgba(0,0,0,0.06)',
        transform: dragging ? 'scale(1.04)' : 'scale(1)',
        transition: dragging ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path d={calc.svgPath} stroke={iconStroke} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
            {calc.svgPathAccent && (
              <path d={calc.svgPathAccent} stroke={highlighted ? '#ffffff' : 'var(--color-text)'} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </div>
      </div>

      {onPinToggle && (
        <button
          onClick={e => { e.stopPropagation(); onPinToggle(calc.id); }}
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'none',
            border: 'none',
            padding: 8,
            cursor: 'pointer',
            opacity: pinned ? 1 : 0.3,
            lineHeight: 1,
          }}
          aria-label={pinned ? 'Unpin' : 'Pin to top'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={highlighted ? '#fff' : 'var(--color-orange)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.69l-1.78.9A2 2 0 0 0 5 15.24Z" fill={pinned ? (highlighted ? '#fff' : 'var(--color-orange)') : 'none'} />
            <line x1="12" y1="17" x2="12" y2="22" />
          </svg>
        </button>
      )}

      <div>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 500, color: labelColor, letterSpacing: '-0.5px', lineHeight: 1 }}>
          {calc.label}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: subtitleColor }}>
          {calc.subtitle}
        </p>
      </div>
    </div>
  );
}
