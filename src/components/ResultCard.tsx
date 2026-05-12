interface ResultCardProps {
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
}

export function ResultCard({ label, value, unit, accent }: ResultCardProps) {
  return (
    <div
      style={{
        background: accent ? 'var(--color-orange)' : 'var(--color-card)',
        border: accent ? 'none' : '0.5px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: accent ? 'rgba(255,255,255,0.75)' : 'var(--color-muted)',
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: accent ? '#ffffff' : 'var(--color-text)',
            letterSpacing: '-1px',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: 14,
              color: accent ? 'rgba(255,255,255,0.75)' : 'var(--color-muted)',
              fontWeight: 400,
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
