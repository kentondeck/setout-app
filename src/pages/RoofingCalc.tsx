import { useState, useContext } from 'react';
import { hapticMedium } from '../lib/haptics';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { ShareCalcButton } from '../components/ShareCalcButton';
import { ResultHero, ShoppingList, AddToQuoteCTA, buildShoppingListShareBody } from '../components/CalcResult';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { calculateRoofing, ROOFING_PROFILES } from '../calculators/roofing';
import { JobNameInput } from '../components/JobNameInput';
import type { RoofType, RoofProfile, RoofingResult } from '../calculators/roofing';
import { useScrollToResult } from '../lib/useScrollToResult';
import { uuid } from '../lib/uuid';

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
  const resultRef = useScrollToResult(result);
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
    const id = uuid();
    setLastId(id);
    addEntry({
      id,
      calculatorId: 'roofing',
      timestamp: Date.now(),
      inputs: { roofType, profile, planLength, planWidth, pitchDegrees, eaveOverhangMm, purlinSpacingMm },
      outputs: calc.outputs,
    });

    hapticMedium();
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

        {result && o && (() => {
          const shopRows = [
            { qty: `${o.sheetCount}`, name: `${ROOFING_PROFILES[profile].label} sheets`, meta: `${sheetLengthDisplay} each · ${ROOFING_PROFILES[profile].coverMm}mm cover · ${o.slopeAreaM2} m² total` },
            { qty: `${o.purlinCount * (roofType === 'gable' || roofType === 'hip' ? 2 : 1)}`, name: 'Purlins (per face × faces)', meta: `${o.purlinCount} per face · ${roofType === 'skillion' ? '1 face' : '2 faces'}` },
            ...(roofType !== 'skillion' ? [{ qty: `${o.ridgeCapM}`, name: 'Ridge cap (lm)', meta: 'incl. 10% for laps' }] : []),
            ...(roofType === 'hip' ? [{ qty: `${o.hipCapM}`, name: 'Hip caps (lm)', meta: 'incl. 10% for laps' }] : []),
            ...(o.bargeM > 0 ? [{ qty: `${o.bargeM}`, name: roofType === 'skillion' ? 'Barge flashing (lm)' : 'Barge / rake (lm)', meta: 'incl. 10% for laps' }] : []),
            { qty: `${o.eaveFlashingM}`, name: 'Eave flashing (lm)', meta: 'incl. 10% for laps' },
            { qty: `${o.screwBoxes}`, name: 'Roofing screw boxes (×250)', meta: `${o.screwCount} screws · incl. 10% waste` },
          ];
          const quoteMaterials = [
            { item: `${ROOFING_PROFILES[profile].label} roofing sheets`, quantity: o.sheetCount, unit: 'each', note: `${sheetLengthDisplay} each · ${ROOFING_PROFILES[profile].coverMm}mm cover` },
            { item: 'Purlins', quantity: o.purlinCount * (roofType === 'skillion' ? 1 : 2), unit: 'each', note: `${o.purlinCount} per face` },
            ...(roofType !== 'skillion' ? [{ item: 'Ridge cap', quantity: o.ridgeCapM, unit: 'lineal metre', note: 'incl. 10% for laps' }] : []),
            ...(roofType === 'hip' ? [{ item: 'Hip caps', quantity: o.hipCapM, unit: 'lineal metre', note: 'incl. 10% for laps' }] : []),
            ...(o.bargeM > 0 ? [{ item: 'Barge flashing', quantity: o.bargeM, unit: 'lineal metre', note: 'incl. 10% for laps' }] : []),
            { item: 'Eave flashing', quantity: o.eaveFlashingM, unit: 'lineal metre', note: 'incl. 10% for laps' },
            { item: 'Roofing screws (250-pk)', quantity: o.screwBoxes, unit: 'box', note: `${o.screwCount} screws` },
          ];

          return (
          <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ResultHero
              label="You'll need"
              value={o.sheetCount}
              unit={`${ROOFING_PROFILES[profile].label} sheets`}
              spec={`${ROOF_TYPE_LABELS[roofType]} roof · ${fields.planLength}m × ${fields.planWidth}m plan · ${fields.pitch}° pitch · ${sheetLengthDisplay} sheets`}
              stats={[
                { label: `${o.slopeAreaM2} m² slope` },
                { label: `${o.purlinCount} purlins/face` },
                { label: `${o.screwBoxes} screw boxes` },
                ...(roofType !== 'skillion' ? [{ label: `${o.ridgeCapM} m ridge` }] : []),
              ]}
            />

            <ShoppingList rows={shopRows} />

            <div style={{
              background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                {ROOFING_PROFILES[profile].label} — {ROOFING_PROFILES[profile].coverMm}mm cover width.
                All flashing quantities include 10% for laps and joins.
                {roofType === 'hip' ? ' Hip-end sheets include waste for diagonal cuts.' : ''}
              </p>
            </div>

            <ApprenticeWorking
              steps={result.steps}
              finalAnswer={`${o.sheetCount} sheets × ${sheetLengthDisplay}`}
              finalLabel="Sheets to order"
              visible={settings.apprenticeMode}
              id="roofing"
            />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.roofing[settings.region]}
            </p>

            <AddToQuoteCTA
              scopeSummary={`${ROOF_TYPE_LABELS[roofType]} roof, ${fields.planLength}m × ${fields.planWidth}m`}
              materials={quoteMaterials}
              jobName={jobName}
            />
            <div style={{
              background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Save</p>
              <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastId, { jobName: name })} />
              <AddToJobPrompt calculationId={lastId} />
              <ShareCalcButton
                calculationId={lastId}
                shareTitle={jobName || 'Roofing order'}
                shareBody={buildShoppingListShareBody({
                  jobName,
                  scopeSummary: `${ROOF_TYPE_LABELS[roofType]} roof, ${fields.planLength}m × ${fields.planWidth}m`,
                  rows: shopRows,
                })}
              />
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
