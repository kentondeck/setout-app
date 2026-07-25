import { useNavigate } from 'react-router-dom';
import type { CalcQuoteHandoff } from '../pages/PhotoQuoteCalc';

interface AddToQuoteButtonProps {
  scopeSummary: string;
  materials: { item: string; quantity: number; unit: string; note?: string }[];
  jobName?: string;
}

// Hands a calculator's exact-math materials straight to the pricing/editing/PDF quote flow — no
// photo, no AI takeoff step, since the calculator already computed real quantities.
export function AddToQuoteButton({ scopeSummary, materials, jobName }: AddToQuoteButtonProps) {
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
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '12px 16px', borderRadius: 12,
        border: '0.5px solid var(--color-border)', background: 'var(--color-bg)',
        color: 'var(--color-text)', fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
        cursor: 'pointer', letterSpacing: '-0.2px',
      }}
      onPointerDown={e => (e.currentTarget.style.opacity = '0.7')}
      onPointerUp={e => (e.currentTarget.style.opacity = '1')}
      onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M12 11v6M9 14h6" />
      </svg>
      Add to Quote
    </button>
  );
}
