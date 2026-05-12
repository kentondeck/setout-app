import { useParams, useNavigate } from 'react-router-dom';
import { CALCULATORS } from '../lib/calculators';

export function CalcPlaceholder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const meta = CALCULATORS.find(c => c.id === id);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        paddingBottom: 24,
      }}
    >
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--color-muted)',
          fontSize: 14,
          fontFamily: 'inherit',
          padding: '8px 0',
          marginBottom: 20,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 52 }}>🔧</div>
        <div>
          <h1
            style={{
              margin: 0,
              fontWeight: 500,
              fontSize: 24,
              letterSpacing: '-0.6px',
              color: 'var(--color-text)',
            }}
          >
            {meta?.label ?? id}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--color-muted)' }}>
            Coming in Phase 2
          </p>
        </div>

        <div
          style={{
            background: 'var(--color-card)',
            border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: '16px 20px',
            maxWidth: 280,
            fontSize: 13,
            color: 'var(--color-muted)',
            lineHeight: 1.5,
          }}
        >
          The calculator logic is being built. Check back after Phase 2.
        </div>
      </div>
    </div>
  );
}
