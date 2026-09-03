import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { ShareCalcButton } from '../components/ShareCalcButton';
import { ResultHero } from '../components/CalcResult';
import { calculateGradient } from '../calculators/gradient';
import { JobNameInput } from '../components/JobNameInput';
import type { GradientResult } from '../calculators/gradient';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { uuid } from '../lib/uuid';

import type { Region } from '../types';

import { useScrollToResult } from '../lib/useScrollToResult';
function getDrainPresets(region: Region) {
  return [
    { label: '1:40',  ratio: 40,  note: 'Downpipes, steep runs' },
    { label: '1:60',  ratio: 60,  note: region === 'NZ' ? 'Stormwater min (NZ)' : 'Sewer, DWV' },
    { label: '1:80',  ratio: 80,  note: 'Sewer drains' },
    { label: '1:100', ratio: 100, note: region === 'AU' ? 'Stormwater min (AU)' : 'Flat stormwater' },
    { label: '1:150', ratio: 150, note: 'Large bore mains' },
    { label: '1:200', ratio: 200, note: 'Very flat / large pipes' },
  ];
}

function getRampPresets(region: Region) {
  return [
    { label: '1:5',  ratio: 5,  note: 'Driveway max (steep)' },
    { label: '1:8',  ratio: 8,  note: 'Driveway typical' },
    { label: region === 'AU' ? '1:14' : '1:12', ratio: region === 'AU' ? 14 : 12, note: region === 'AU' ? 'Ramp max (AS 1428)' : 'Ramp max (NZS 4121)' },
    { label: '1:20', ratio: 20, note: 'Ramp preferred' },
    { label: '1:33', ratio: 33, note: 'Footpath / path max' },
  ];
}

export function GradientCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  // Primary mode: know gradient + distance → find fall
  // Reverse mode: know fall + distance → find gradient
  const [reverse, setReverse] = useState(false);

  const [selectedRatio, setSelectedRatio] = useState<number | null>(null);
  const [customRatio, setCustomRatio] = useState('');
  const [distance, setDistance] = useState('');
  const [fall, setFall] = useState('');

  const [result, setResult] = useState<GradientResult | null>(null);
  const resultRef = useScrollToResult(result);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');
  const [jobName, setJobName] = useState('');

  // The active ratio: selected preset or custom input
  const activeRatio = selectedRatio ?? (customRatio ? parseFloat(customRatio) : null);

  function reset() {
    setResult(null);
    setError('');
  }

  function handlePreset(ratio: number) {
    setSelectedRatio(ratio);
    setCustomRatio('');
    reset();
  }

  function handleCustomRatio(v: string) {
    setCustomRatio(v);
    setSelectedRatio(null);
    reset();
  }

  function handleCalculate() {
    const distVal = parseFloat(distance);
    const fallVal = parseFloat(fall);

    if (!distVal || distVal <= 0) { setError('Enter a distance.'); return; }

    if (!reverse) {
      if (!activeRatio || activeRatio <= 0) { setError('Select or enter a gradient.'); return; }
      setError('');
      const calc = calculateGradient({ mode: 'findRise', run: distVal, rise: 0, gradientRatio: activeRatio });
      setResult(calc);
      const id = uuid();
      setLastEntryId(id);
      addEntry({ id, calculatorId: 'gradient', timestamp: Date.now(), inputs: { mode: 'findRise', run: distVal, gradientRatio: activeRatio }, outputs: calc.outputs });
    } else {
      if (!fallVal || fallVal <= 0) { setError('Enter the fall.'); return; }
      setError('');
      const calc = calculateGradient({ mode: 'findGradient', run: distVal, rise: fallVal, gradientRatio: 0 });
      setResult(calc);
      const id = uuid();
      setLastEntryId(id);
      addEntry({ id, calculatorId: 'gradient', timestamp: Date.now(), inputs: { mode: 'findGradient', run: distVal, rise: fallVal }, outputs: calc.outputs });
    }

    if (navigator.vibrate) navigator.vibrate(30);
  }

  const drainPresets = getDrainPresets(settings.region);
  const rampPresets = getRampPresets(settings.region);

  const cardStyle = {
    background: 'var(--color-card)',
    border: '0.5px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    padding: '18px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 14,
  };

  const o = result?.outputs;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Gradient" />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'Find fall', val: false }, { label: 'Find gradient', val: true }].map(m => {
            const active = reverse === m.val;
            return (
              <button
                key={m.label}
                onClick={() => { setReverse(m.val); reset(); }}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: 'var(--radius-card)',
                  border: active ? '1.5px solid var(--color-orange)' : '0.5px solid var(--color-border)',
                  background: active ? 'rgba(255,90,31,0.06)' : 'var(--color-card)',
                  color: active ? 'var(--color-orange)' : 'var(--color-muted)',
                  fontWeight: active ? 500 : 400,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Gradient presets — only in primary mode */}
        {!reverse && (
          <div style={cardStyle}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Drainage
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {drainPresets.map(p => {
                const active = selectedRatio === p.ratio;
                return (
                  <button
                    key={p.label}
                    onClick={() => handlePreset(p.ratio)}
                    style={{
                      padding: '9px 10px',
                      borderRadius: 'var(--radius-card)',
                      border: active ? '1.5px solid var(--color-orange)' : '0.5px solid var(--color-border)',
                      background: active ? 'rgba(255,90,31,0.06)' : 'var(--color-bg)',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                      display: 'flex',
                      flexDirection: 'column' as const,
                      gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: active ? 'var(--color-orange)' : 'var(--color-text)' }}>{p.label}</span>
                    <span style={{ fontSize: 10, color: active ? 'var(--color-orange)' : 'var(--color-muted)', lineHeight: 1.3 }}>{p.note}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ height: 1, background: 'var(--color-border)', margin: '0 -2px' }} />

            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Ramps, Access & Driveways
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {rampPresets.map(p => {
                const active = selectedRatio === p.ratio;
                return (
                  <button
                    key={p.label}
                    onClick={() => handlePreset(p.ratio)}
                    style={{
                      padding: '9px 10px',
                      borderRadius: 'var(--radius-card)',
                      border: active ? '1.5px solid var(--color-orange)' : '0.5px solid var(--color-border)',
                      background: active ? 'rgba(255,90,31,0.06)' : 'var(--color-bg)',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                      display: 'flex',
                      flexDirection: 'column' as const,
                      gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: active ? 'var(--color-orange)' : 'var(--color-text)' }}>{p.label}</span>
                    <span style={{ fontSize: 10, color: active ? 'var(--color-orange)' : 'var(--color-muted)', lineHeight: 1.3 }}>{p.note}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ height: 1, background: 'var(--color-border)', margin: '0 -2px' }} />

            <NumberInput
              label="Custom gradient (X in 1:X)"
              value={customRatio}
              onChange={handleCustomRatio}
              units={['']}
              placeholder="e.g. 120"
            />
          </div>
        )}

        {/* Distance + fall inputs */}
        <div style={cardStyle}>
          <NumberInput
            label="Distance"
            value={distance}
            onChange={v => { setDistance(v); reset(); }}
            units={['m', 'mm']}
            placeholder="e.g. 24"
          />
          {reverse && (
            <NumberInput
              label="Fall"
              value={fall}
              onChange={v => { setFall(v); reset(); }}
              units={['mm']}
              placeholder="e.g. 240"
            />
          )}
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 13, color: '#e53e3e' }}>{error}</p>
        )}

        <button
          onClick={handleCalculate}
          style={{
            background: 'var(--color-orange)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            padding: '16px',
            fontSize: 16,
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
            letterSpacing: '-0.3px',
          }}
          onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
          onPointerUp={e => (e.currentTarget.style.opacity = '1')}
          onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Calculate
        </button>

        {result && o && (
          <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ResultHero
              label={!reverse ? 'Fall required' : 'Gradient'}
              value={!reverse ? o.rise : `1:${o.gradientRatio}`}
              unit={!reverse ? 'mm' : ''}
              spec={`${distance} distance${reverse ? ` · ${fall}mm fall` : ` · 1:${activeRatio}`}`}
              stats={[
                { label: `${o.percentage}% grade` },
                { label: `${o.angle}° angle` },
                { label: `${o.risePerMetre}mm/m` },
              ]}
            />

            <ApprenticeWorking
              steps={result.steps}
              finalAnswer={!reverse ? `${o.rise}mm fall` : `1:${o.gradientRatio}`}
              finalLabel={`${o.risePerMetre}mm per metre`}
              visible={settings.apprenticeMode}
              id="gradient"
            />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.gradient[settings.region]}
            </p>

            <div style={{
              background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Save</p>
              <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />
              <AddToJobPrompt calculationId={lastEntryId} />
              <ShareCalcButton calculationId={lastEntryId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
