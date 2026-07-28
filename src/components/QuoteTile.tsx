import { useNavigate } from 'react-router-dom';
import type { CalcMeta } from '../lib/calculators';

// SmartQuote isn't a measuring calculator like the rest of the grid — it's an AI estimation tool,
// so it gets its own full-width tile up top rather than sitting in the reorderable grid.
export function QuoteTile({ calc }: { calc: CalcMeta }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/calc/${calc.id}`)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        borderRadius: 'var(--radius-tile)',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        background: 'linear-gradient(135deg, var(--color-orange) 0%, #ff7a45 100%)',
        boxShadow: '0 4px 14px rgba(255,90,31,0.28)',
      }}
      onPointerDown={e => (e.currentTarget.style.opacity = '0.9')}
      onPointerUp={e => (e.currentTarget.style.opacity = '1')}
      onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
          <path d={calc.svgPath} stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 16.5, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>
          {calc.label}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.88)' }}>
          {calc.subtitle}
        </p>
      </div>

      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="9 6 15 12 9 18" />
      </svg>
    </button>
  );
}
