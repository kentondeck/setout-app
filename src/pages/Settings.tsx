import { useContext, useState } from 'react';
import { SettingsContext } from '../contexts';
import { ApprenticeToggle } from '../components/ApprenticeToggle';
import { lookupMaterialPrice } from '../lib/materialPricing';
import { getRememberedMaterialPrice, rememberMaterialPrice } from '../lib/priceMemory';
import { lookupPrices, needsLiveSearch } from '../lib/priceLookup';
import { COMMON_MATERIALS } from '../lib/commonMaterials';

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
  const [updatingPriceList, setUpdatingPriceList] = useState(false);
  const [priceListStatus, setPriceListStatus] = useState(() => localStorage.getItem('setout_photoquote_pricelist_updated') ?? '');

  function handleSaveName() {
    updateSettings({ userName: nameInput.trim() });
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  async function handleUpdatePriceList() {
    if (updatingPriceList) return;
    setUpdatingPriceList(true);
    try {
      // Fixings/consumables come straight from the price book (fast, free) — only structural/
      // higher-value materials are worth a live search's time and cost.
      for (const m of COMMON_MATERIALS) {
        if (needsLiveSearch(m.item)) continue;
        const price = lookupMaterialPrice(m.item, settings.region);
        if (price) rememberMaterialPrice(m.item, settings.region, price);
      }
      await lookupPrices(COMMON_MATERIALS.filter(m => needsLiveSearch(m.item)), settings.region);
      // Chunk failures (e.g. running out of credits mid-run) don't throw — count what actually
      // landed instead of claiming a full update happened when it might have stopped partway.
      const pricedCount = COMMON_MATERIALS.filter(m => getRememberedMaterialPrice(m.item, settings.region)).length;
      const today = new Date().toISOString().slice(0, 10);
      const label = pricedCount === COMMON_MATERIALS.length
        ? `Common prices updated ${today}`
        : `${pricedCount}/${COMMON_MATERIALS.length} priced — stopped partway (ran out of credits?), tap Update to finish`;
      setPriceListStatus(label);
      localStorage.setItem('setout_photoquote_pricelist_updated', label);
    } finally {
      setUpdatingPriceList(false);
    }
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
                <span style={{ fontSize: 11, opacity: 0.7 }}>{r === 'AU' ? 'NCC 2022' : 'NZBC 2022'}</span>
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
        <SectionLabel>Photo Quote pricing</SectionLabel>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-card)', padding: '14px 16px',
        }}>
          <span style={{ fontSize: 12.5, color: 'var(--color-muted)', lineHeight: 1.4 }}>
            {priceListStatus || 'Common material prices not set up yet'}
          </span>
          <button
            onClick={handleUpdatePriceList}
            disabled={updatingPriceList}
            style={{
              fontSize: 13, fontWeight: 500, color: updatingPriceList ? 'var(--color-muted)' : 'var(--color-orange)',
              background: 'none', border: 'none', fontFamily: 'inherit', cursor: updatingPriceList ? 'default' : 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {updatingPriceList ? 'Updating…' : priceListStatus ? 'Update' : 'Set up'}
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
