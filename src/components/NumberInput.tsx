interface NumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  placeholder?: string;
  hint?: string;
}

export function NumberInput({ label, value, onChange, unit, placeholder, hint }: NumberInputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <label
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text)',
            letterSpacing: '-0.1px',
          }}
        >
          {label}
        </label>
        <span style={{ fontSize: 11, color: 'var(--color-muted)', visibility: hint ? 'visible' : 'hidden' }}>
          {hint || ' '}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-bg)',
          border: '0.5px solid rgba(0,0,0,0.12)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <input
          type="number"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1,
            padding: '13px 16px',
            border: 'none',
            background: 'transparent',
            fontSize: 16,
            fontFamily: 'inherit',
            color: 'var(--color-text)',
            outline: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
            minWidth: 0,
          }}
        />
        {unit && (
          <span
            style={{
              padding: '0 14px',
              fontSize: 13,
              color: 'var(--color-muted)',
              fontWeight: 500,
              flexShrink: 0,
              borderLeft: '0.5px solid rgba(0,0,0,0.08)',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
