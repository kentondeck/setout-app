import { useNavigate } from 'react-router-dom';
import type { CalcMeta } from '../lib/calculators';

interface CalculatorTileProps {
  calc: CalcMeta;
  highlighted: boolean;
}

export function CalculatorTile({ calc, highlighted }: CalculatorTileProps) {
  const navigate = useNavigate();

  const bg = highlighted ? 'var(--color-orange)' : 'var(--color-card)';
  const iconBg = highlighted ? '#ffffff' : '#f5f5f3';
  const iconStroke = highlighted ? 'var(--color-orange)' : 'var(--color-text)';
  const numColor = highlighted ? 'rgba(255,255,255,0.7)' : '#cccccc';
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
      }}
      onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
      onPointerUp={e => (e.currentTarget.style.opacity = '1')}
      onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
          </svg>
        </div>
        <span style={{ fontSize: 11, fontWeight: 500, color: numColor, letterSpacing: '0.5px' }}>
          {calc.number}
        </span>
      </div>

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
