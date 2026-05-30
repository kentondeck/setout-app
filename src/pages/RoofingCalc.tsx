import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { calculateRoofing, ROOFING_PROFILES } from '../calculators/roofing';
import { JobNameInput } from '../components/JobNameInput';
import type { RoofType, RoofProfile, RoofingResult } from '../calculators/roofing';

interface Fields {
  planLength: string;
  planWidth: string;
  pitch: string;
  eaveOverhang: string;
  purlinSpacing: string;
}

const DEFAULTS: Fields = {
  planLength: '',
  planWidth: '',
  pitch: '',
  eaveOverhang: '50',
  purlinSpacing: '900',
};

const ROOF_TYPE_LABELS: Record<RoofType, string> = {
  gable: 'Gable',
  hip: 'Hip',
  skillion: 'Skillion',
};

const PROFILE_KEYS = Object.keys(ROOFING_PROFILES) as RoofProfile[];

const btnBase: React.CSSProperties = {
  flex: 1,
  padding: '10px 0',
  borderRadius: 10,
  border: '0.5px solid var(--color-border)',
  fontSize: 14,
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

export function RoofingCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [roofType, setRoofType] = useState<RoofType>('gable');
  const [profile, setProfile] = useState<RoofProfile>('corrugate');
  const [fields, setFields] = useState<Fields>(DEFAULTS);
  const [result, setResult] = useState<RoofingResult | null>(null);
  const [lastId, setLastId] = useState('');
  const [error, setError] = useState('');
  const [jobName, setJobName] = useState('');

  function set(field: keyof Fields) {
    return (v: string) => setFields(prev => ({ ...prev, [field]: v }));
  }

  function handleCalculate() {
    setError('');

    const planLength = parseFloat(fields.planLength);
    const planWidth = parseFloat(fields.planWidth);
    const pitchDegrees = parseFloat(fields.pitch);
    const eaveOverhangMm = parseFloat(fields.eaveOverhang) || 0;
    const purlinSpacingMm = parseFloat(fields.purlinSpacing) || 900;

    if (!planLength || planLength <= 0) { setError('Enter a plan length.'); return; }
    if (!planWidth || planWidth <= 0) { setError('Enter a plan width.'); return; }
    if (!pitchDegrees || pitchDegrees <= 0 || pitchDegrees >= 90) { setError('Pitch must be between 1° and 89°.'); return; }
    if (purlinSpacingMm <= 0) { setError('Enter a valid purlin spacing.'); return; }
    if (roofType === 'hip' && planWidth >= planLength) { setError('Plan length must exceed plan width for a hip roof.'); return; }

    const calc = calculateRoofing({ roofType, planLength, planWidth, pitchDegrees, profile, eaveOverhangMm, purlinSpacingMm });
    setResult(calc);
    const id = crypto.randomUUID();
    setLastId(id);
    addEntry({
      id,
      calculatorId: 'roofing',
      timestamp: Date.now(),
      inputs: { roofType, profile, planLength, planWidth, pitchDegrees, eaveOverhangMm, purlinSpacingMm },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  const o = result?.outputs;
  const sheetLengthDisplay = o ? `${(o.sheetLengthMm / 1000).toFixed(1).replace(/\.0$/, '')}m` : '';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Roofing materials" />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Input card */}
        <div style={{
          background: 'var(--color-card)',
          border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>

          {/* Roof type */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>ROOF TYPE</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['gable', 'hip', 'skillion'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setRoofType(t); setResult(null); setError(''); }}
                  style={{
                    ...btnBase,
                    background: roofType === t ? 'var(--color-orange)' : 'var(--color-bg)',
                    color: roofType === t ? '#fff' : 'var(--color-text)',
                  }}
                >
                  {ROOF_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Profile */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>PROFILE</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {PROFILE_KEYS.map(p => (
                <button
                  key={p}
                  onClick={() => setProfile(p)}
                  style={{
                    ...btnBase,
                    background: profile === p ? 'var(--color-orange)' : 'var(--color-bg)',
                    color: profile === p ? '#fff' : 'var(--color-text)',
                  }}
                >
                  {ROOFING_PROFILES[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* Plan dimensions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput
                label="Plan length"
                value={fields.planLength}
                onChange={set('planLength')}
                units={['m']}
                placeholder="e.g. 10"
                hint={roofType === 'hip' ? 'longest dimension' : 'along ridge'}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput
                label="Plan width"
                value={fields.planWidth}
                onChange={set('planWidth')}
                units={['m']}
                placeholder="e.g. 6"
                hint={roofType === 'skillion' ? 'eave to high wall' : 'eave to eave'}
              />
            </div>
          </div>

          {/* Pitch */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput
                label="Pitch"
                value={fields.pitch}
                onChange={set('pitch')}
                unit="°"
                placeholder="e.g. 15"
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }} />
          </div>

          {/* Eave overhang + purlin spacing */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput
                label="Eave overhang"
                value={fields.eaveOverhang}
                onChange={set('eaveOverhang')}
                units={['mm', 'm']}
                placeholder="50"
                hint="default 50mm"
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput
                label="Purlin spacing"
                value={fields.purlinSpacing}
                onChange={set('purlinSpacing')}
                units={['mm', 'm']}
                placeholder="900"
                hint="default 900mm"
              />
            </div>
          </div>
        </div>

        {error && <p style={{ margin: 0, fontSize: 13, color: '#e53e3e' }}>{error}</p>}

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
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Sheets + length */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Sheets" value={o.sheetCount} accent />
                <ResultCard label="Sheet length" value={sheetLengthDisplay} />
              </div>

              {/* Slope area + purlins */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Slope area" value={o.slopeAreaM2} unit="m²" />
                <ResultCard label="Purlins / face" value={o.purlinCount} />
              </div>

              {/* Ridge cap — gable and hip */}
              {roofType !== 'skillion' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <ResultCard label="Ridge cap" value={o.ridgeCapM} unit="m" />
                  {roofType === 'hip'
                    ? <ResultCard label="Hip caps" value={o.hipCapM} unit="m" />
                    : <ResultCard label="Barge / rake" value={o.bargeM} unit="m" />
                  }
                </div>
              )}

              {/* Barge for skillion */}
              {roofType === 'skillion' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <ResultCard label="Barge flashing" value={o.bargeM} unit="m" />
                  <ResultCard label="Eave + head flashing" value={o.eaveFlashingM} unit="m" />
                </div>
              )}

              {/* Eave flashing — gable and hip */}
              {roofType !== 'skillion' && (
                <ResultCard label="Eave flashing" value={o.eaveFlashingM} unit="m" />
              )}

              {/* Screws */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Screws (incl. 10% waste)" value={o.screwCount} />
                <ResultCard label="Screw boxes (×250)" value={o.screwBoxes} />
              </div>

              {/* Profile cover info */}
              <div style={{
                background: 'var(--color-card)',
                border: '0.5px solid var(--color-border)',
                borderRadius: 10,
                padding: '12px 14px',
              }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                  {ROOFING_PROFILES[profile].label} — {ROOFING_PROFILES[profile].coverMm}mm cover width.
                  All flashing quantities include 10% for laps and joins.
                  {roofType === 'hip' ? ' Hip-end sheets include waste for diagonal cuts.' : ''}
                </p>
              </div>
            </div>

            <ApprenticeWorking
              steps={result.steps}
              finalAnswer={`${o.sheetCount} sheets × ${sheetLengthDisplay}`}
              finalLabel="Sheets to order"
              visible={settings.apprenticeMode}
              id="roofing"
            />

            <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastId, { jobName: name })} />
            <AddToJobPrompt calculationId={lastId} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.roofing[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
