import { useState } from 'react';

interface JobNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
}

export function JobNameInput({ value, onChange, onSave }: JobNameInputProps) {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (onSave && value.trim()) {
      onSave(value.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function handleChange(v: string) {
    setSaved(false);
    onChange(v);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text)',
          letterSpacing: '-0.1px',
        }}
      >
        Job name
        <span style={{ fontWeight: 400, color: 'var(--color-muted)', marginLeft: 6 }}>
          optional
        </span>
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={value}
          placeholder="e.g. Smith deck reno"
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          style={{
            flex: 1,
            padding: '13px 14px',
            borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.12)',
            background: 'var(--color-bg)',
            fontSize: 15,
            fontFamily: 'inherit',
            color: 'var(--color-text)',
            outline: 'none',
            WebkitAppearance: 'none',
            minWidth: 0,
          }}
        />
        {onSave && (
          <button
            onClick={handleSave}
            disabled={!value.trim() || saved}
            style={{
              padding: '0 18px',
              borderRadius: 12,
              border: 'none',
              background: saved ? '#22c55e' : value.trim() ? 'var(--color-orange)' : 'var(--color-border)',
              color: value.trim() ? '#fff' : 'var(--color-muted)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: value.trim() && !saved ? 'pointer' : 'default',
              flexShrink: 0,
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
}
