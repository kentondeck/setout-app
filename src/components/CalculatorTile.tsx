import { useNavigate } from 'react-router-dom';
import type { CalcMeta } from '../lib/calculators';

interface CalculatorTileProps {
  calc: CalcMeta;
  highlighted: boolean;
  pinned?: boolean;
  onPinToggle?: (id: string) => void;
}

export function CalculatorTile({ calc, highlighted, pinned = false, onPinToggle }: CalculatorTileProps) {
  const navigate = useNavigate();

  const bg = highlighted ? 'var(--color-orange)' : 'var(--color-card)';
  const iconBg = highlighted ? '#ffffff' : '#f5f5f3';
  const iconStroke = highlighted ? 'var(--color-orange)' : 'var(--color-text)';
  const labelColor = highlighted ? '#ffffff' : 'var(--color-text)';
  const subtitleColor = highlighted ? 'rgba(255,255,255,0.85)' : 'var(--color-muted)';

  return (
    <button
      onClick={() => navigate(`/calc/${calc.id}`)}
      style={{
        background: bg,
        borderRadius: 'var(--radius-tile)',
        border: highlighted ? 'none' : '0.5px solid var(--color-border)',
        minHeight: 130,
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        position: 'relative',
      }}
      onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
      onPointerUp={e => (e.currentTarget.style.opacity = '1')}
      onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d={calc.svgPath} stroke={iconStroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {calc.svgPathAccent && (
              <path d={calc.svgPathAccent} stroke="var(--color-orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </div>
      </div>

      {onPinToggle && (
        <button
          onClick={e => { e.stopPropagation(); onPinToggle(calc.id); }}
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
    </button>
  );
}
