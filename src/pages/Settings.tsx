import { useContext, useState } from 'react';
import { SettingsContext } from '../contexts';
import { ApprenticeToggle } from '../components/ApprenticeToggle';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--color-muted)',
        letterSpacing: '0.6px',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}


export function Settings() {
  const { settings, updateSettings } = useContext(SettingsContext);
  const [nameInput, setNameInput] = useState(settings.userName);
  const [nameSaved, setNameSaved] = useState(false);

  function handleSaveName() {
    updateSettings({ userName: nameInput.trim() });
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 20px',
        paddingBottom: 24,
        gap: 28,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontWeight: 500,
          fontSize: 28,
          letterSpacing: '-0.8px',
          color: 'var(--color-text)',
        }}
      >
        Settings
      </h1>

      <div>
        <SectionLabel>Your name</SectionLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Dave"
            value={nameInput}
            onChange={e => { setNameInput(e.target.value); setNameSaved(false); }}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
            style={{
              flex: 1,
              padding: '14px 16px',
              borderRadius: 'var(--radius-card)',
              border: '0.5px solid var(--color-border)',
              background: 'var(--color-card)',
              fontSize: 15,
              fontFamily: 'inherit',
              color: 'var(--color-text)',
              outline: 'none',
              minWidth: 0,
              WebkitAppearance: 'none',
            }}
          />
          <button
            onClick={handleSaveName}
            disabled={!nameInput.trim() || nameSaved}
            style={{
              padding: '0 18px',
              borderRadius: 'var(--radius-card)',
              border: 'none',
              background: nameSaved ? '#22c55e' : nameInput.trim() ? 'var(--color-orange)' : 'var(--color-border)',
              color: nameInput.trim() ? '#fff' : 'var(--color-muted)',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: nameInput.trim() && !nameSaved ? 'pointer' : 'default',
              flexShrink: 0,
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {nameSaved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div>
        <SectionLabel>Units</SectionLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          {(['metric', 'imperial'] as const).map(unit => {
            const active = settings.unit === unit;
            return (
              <button
                key={unit}
                onClick={() => updateSettings({ unit })}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-card)',
                  border: active
                    ? '1.5px solid var(--color-orange)'
                    : '0.5px solid var(--color-border)',
                  background: active ? 'rgba(255, 90, 31, 0.06)' : 'var(--color-card)',
                  color: active ? 'var(--color-orange)' : 'var(--color-text)',
                  fontWeight: active ? 500 : 400,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  letterSpacing: '-0.2px',
                }}
              >
                {unit === 'metric' ? 'Metric (m, mm)' : 'Imperial (ft, in)'}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Building compliance</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(['AU', 'NZ'] as const).map(r => {
            const active = settings.region === r;
            return (
              <button
                key={r}
                onClick={() => updateSettings({ region: r })}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-card)',
                  border: active ? '1.5px solid var(--color-orange)' : '0.5px solid var(--color-border)',
                  background: active ? 'rgba(255,90,31,0.06)' : 'var(--color-card)',
                  color: active ? 'var(--color-orange)' : 'var(--color-text)',
                  fontWeight: active ? 500 : 400,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  letterSpacing: '-0.2px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <span>{r === 'AU' ? '🇦🇺' : '🇳🇿'}</span>
                <span>{r === 'AU' ? 'Australia' : 'New Zealand'}</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{r === 'AU' ? 'AS 1684' : 'NZS 3604'}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Learning</SectionLabel>
        <ApprenticeToggle
          enabled={settings.apprenticeMode}
          onChange={val => updateSettings({ apprenticeMode: val })}
        />
      </div>

      <div>
        <SectionLabel>Voice input</SectionLabel>
        <div
          style={{
            background: 'var(--color-card)',
            border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>
              Speak your measurements
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-muted)' }}>
              Tap the mic on any calculator
            </p>
          </div>
          <button
            onClick={() => updateSettings({ voiceInput: !settings.voiceInput })}
            style={{
              width: 44, height: 26, borderRadius: 13, border: 'none',
              background: settings.voiceInput ? 'var(--color-orange)' : '#ccc',
              position: 'relative', cursor: 'pointer',
              transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute', top: 3,
              left: settings.voiceInput ? 21 : 3,
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 'auto', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>
          Setout v0.1.0 — built for builders
        </p>
      </div>
    </div>
  );
}
