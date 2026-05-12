interface ApprenticeToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
}

export function ApprenticeToggle({ enabled, onChange }: ApprenticeToggleProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        background: 'var(--color-card)',
        borderRadius: 'var(--radius-card)',
        border: '0.5px solid var(--color-border)',
      }}
    >
      <div>
        <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--color-text)', letterSpacing: '-0.2px' }}>
          Apprentice mode
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
          Shows working and formulas
        </div>
      </div>

      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          background: enabled ? 'var(--color-orange)' : 'rgba(0,0,0,0.12)',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s ease',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: enabled ? 23 : 3,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  );
}
