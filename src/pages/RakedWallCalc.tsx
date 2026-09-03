import { useState, useContext } from 'react';
import { hapticMedium } from '../lib/haptics';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { ShareCalcButton } from '../components/ShareCalcButton';
import { ResultHero, ShoppingList, AddToQuoteCTA, buildShoppingListShareBody } from '../components/CalcResult';
import { calculateRakedWall } from '../calculators/raked-wall';
import { JobNameInput } from '../components/JobNameInput';
import type { RakedWallOutputs } from '../calculators/raked-wall';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { uuid } from '../lib/uuid';

import { useScrollToResult } from '../lib/useScrollToResult';
type InputMode = 'heights' | 'pitch';

interface Inputs {
  wallLength: string;
  lowHeight: string;
  highHeight: string;
  pitch: string;
  studSpacing: string;
  customSpacing: string;
  timberThickness: string;
  nogginRows: string;
}

const DEFAULTS: Inputs = {
  wallLength: '',
  lowHeight: '',
  highHeight: '',
  pitch: '',
  studSpacing: '450',
  customSpacing: '',
  timberThickness: '45',
  nogginRows: '',
};

export function RakedWallCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [mode, setMode] = useState<InputMode>('heights');
  const [includeNoggins, setIncludeNoggins] = useState(true);
  const [result, setResult] = useState<{ outputs: RakedWallOutputs; studHeights: number[]; steps: WorkingStep[] } | null>(null);
  const resultRef = useScrollToResult(result);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');
  const [jobName, setJobName] = useState('');

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  const resolvedSpacing = inputs.studSpacing === 'custom'
    ? parseFloat(inputs.customSpacing) || 450
    : parseFloat(inputs.studSpacing);

  // Preview derived high height when in pitch mode (wall length now in mm)
  const derivedHighHeight = mode === 'pitch' && inputs.wallLength && inputs.lowHeight && inputs.pitch
    ? Math.round(parseFloat(inputs.lowHeight) + Math.tan(parseFloat(inputs.pitch) * Math.PI / 180) * parseFloat(inputs.wallLength))
    : null;

  function handleCalculate() {
    const wallLength = parseFloat(inputs.wallLength);
    const lowHeight = parseFloat(inputs.lowHeight);
    const studSpacing = resolvedSpacing;

    if (!wallLength || wallLength <= 0) { setError('Enter a wall length.'); return; }
    if (!lowHeight || lowHeight <= 0) { setError('Enter the low end height.'); return; }

    let highHeight: number;
    if (mode === 'heights') {
      highHeight = parseFloat(inputs.highHeight);
      if (!highHeight || highHeight <= lowHeight) { setError('High end height must be greater than the low end height.'); return; }
    } else {
      const pitch = parseFloat(inputs.pitch);
      if (!pitch || pitch <= 0 || pitch >= 90) { setError('Enter a valid roof pitch (0–90°).'); return; }
      highHeight = Math.round(lowHeight + Math.tan(pitch * Math.PI / 180) * wallLength);
    }

    setError('');

    const timberThickness = parseFloat(inputs.timberThickness) || 45;
    const nogginRows = parseInt(inputs.nogginRows) || 1;
    const calc = calculateRakedWall({ wallLength, lowHeight, highHeight, studSpacing, timberThickness, includeNoggins, nogginRows });
    setResult(calc);

    const id = uuid();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'raked',
      timestamp: Date.now(),
      inputs: { wallLength, lowHeight, highHeight, studSpacing, timberThickness, includeNoggins: includeNoggins ? 1 : 0, ...(includeNoggins ? { nogginRows } : {}) },
      outputs: calc.outputs,
    });

    hapticMedium();
  }

  const cardStyle = {
    background: 'var(--color-card)',
    border: '0.5px solid var(--color-border)',
    borderRadius: 'var(--radius-card)' as const,
    padding: '18px 16px',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 16,
  };

  const toggleStyle = (active: boolean) => ({
    flex: 1,
    padding: '10px 0',
    borderRadius: 10,
    border: '0.5px solid var(--color-border)',
    background: active ? 'var(--color-orange)' : 'var(--color-bg)',
    color: active ? '#fff' : 'var(--color-text)',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Raked Wall"
      />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={cardStyle}>
          {/* Input mode toggle */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>INPUT METHOD</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={toggleStyle(mode === 'heights')} onClick={() => setMode('heights')}>Two heights</button>
              <button style={toggleStyle(mode === 'pitch')} onClick={() => setMode('pitch')}>Roof pitch</button>
            </div>
          </div>

          {/* Wall length */}
          <NumberInput label="Wall length" value={inputs.wallLength} onChange={set('wallLength')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 4800', m: 'e.g. 4.8' }} />

          {/* Heights */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Low end height" value={inputs.lowHeight} onChange={set('lowHeight')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 2400', m: 'e.g. 2.4' }} hint="floor to top of rake plate" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {mode === 'heights' ? (
                <NumberInput label="High end height" value={inputs.highHeight} onChange={set('highHeight')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 3000', m: 'e.g. 3' }} hint="floor to top of rake plate" />
              ) : (
                <NumberInput
                  label="Roof pitch"
                  value={inputs.pitch}
                  onChange={set('pitch')}
                  unit="°"
                  placeholder="e.g. 15"
                  hint={derivedHighHeight ? `high end ≈ ${derivedHighHeight}mm` : undefined}
                />
              )}
            </div>
          </div>

          {/* Stud spacing */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>STUD SPACING</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['450', '600', 'custom'] as const).map(sp => (
                <button key={sp} onClick={() => setInputs(prev => ({ ...prev, studSpacing: sp }))} style={toggleStyle(inputs.studSpacing === sp)}>
                  {sp === 'custom' ? 'Custom' : `${sp}mm`}
                </button>
              ))}
            </div>
            {inputs.studSpacing === 'custom' && (
              <div style={{ marginTop: 10 }}>
                <NumberInput label="" value={inputs.customSpacing} onChange={v => setInputs(prev => ({ ...prev, customSpacing: v }))} units={['mm', 'm']} placeholders={{ mm: 'e.g. 500', m: 'e.g. 0.5' }} />
              </div>
            )}
          </div>

          {/* Timber thickness */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>TIMBER THICKNESS</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['35', '45', '70', '90', 'custom'] as const).map(t => (
                <button key={t} onClick={() => setInputs(prev => ({ ...prev, timberThickness: t === 'custom' ? '' : t }))} style={toggleStyle(t === 'custom' ? !['35','45','70','90'].includes(inputs.timberThickness) : inputs.timberThickness === t)}>
                  {t === 'custom' ? 'Custom' : `${t}mm`}
                </button>
              ))}
            </div>
            {!['35', '45', '70', '90'].includes(inputs.timberThickness) && (
              <div style={{ marginTop: 10 }}>
                <NumberInput label="" value={inputs.timberThickness} onChange={v => setInputs(prev => ({ ...prev, timberThickness: v }))} unit="mm" placeholder="e.g. 50" />
              </div>
            )}
          </div>

          {/* Noggins toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Include nogs</span>
            <button
              onClick={() => setIncludeNoggins(v => !v)}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                border: 'none',
                background: includeNoggins ? 'var(--color-orange)' : '#ccc',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: includeNoggins ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>

          {includeNoggins && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <NumberInput label="Nog rows" value={inputs.nogginRows} onChange={set('nogginRows')} unit="" placeholder="e.g. 1" hint="optional · default 1" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }} />
            </div>
          )}
        </div>

        {error && <p style={{ margin: 0, fontSize: 13, color: '#e53e3e' }}>{error}</p>}

        <button
          onClick={handleCalculate}
          style={{
            background: 'var(--color-orange)', color: '#fff', border: 'none',
            borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 500,
            fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '-0.3px',
          }}
          onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
          onPointerUp={e => (e.currentTarget.style.opacity = '1')}
          onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Calculate
        </button>

        {result && (() => {
          const nogMm = Math.round(resolvedSpacing - 90);
          const shopRows = [
            { qty: `${result.outputs.studCount}`, name: 'Studs (varying heights)', meta: `${result.outputs.lowStudHeight}–${result.outputs.highStudHeight}mm · cut top @ ${result.outputs.pitchAngle}°` },
            { qty: '1', name: 'Rake plate', meta: `${result.outputs.rakePlateLength}mm` },
            { qty: '1', name: 'Bottom plate', meta: `${Math.round(result.outputs.bottomPlateLineal * 1000)}mm` },
            ...(includeNoggins && result.outputs.nogginCount > 0 ? [{ qty: `${result.outputs.nogginCount}`, name: 'Noggins', meta: `${nogMm}mm each` }] : []),
          ];
          const quoteMaterials = [
            { item: 'Studs (varying)', quantity: result.outputs.studCount, unit: 'each', note: `${result.outputs.lowStudHeight}–${result.outputs.highStudHeight}mm` },
            { item: 'Rake plate', quantity: 1, unit: 'each', note: `${result.outputs.rakePlateLength}mm` },
            { item: 'Bottom plate', quantity: 1, unit: 'each', note: `${Math.round(result.outputs.bottomPlateLineal * 1000)}mm` },
            ...(includeNoggins && result.outputs.nogginCount > 0 ? [{ item: 'Noggins', quantity: result.outputs.nogginCount, unit: 'each', note: `${nogMm}mm each` }] : []),
          ];
          return (
          <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ResultHero
              label="You'll need"
              value={result.outputs.studCount}
              unit="studs"
              spec={`${result.outputs.lowStudHeight}–${result.outputs.highStudHeight}mm range · ${result.outputs.pitchAngle}° rake · ${resolvedSpacing}mm centres`}
              stats={[
                { label: `${result.outputs.totalLinealMetres} lm` },
                { label: `${result.outputs.rakePlateLength}mm rake plate` },
                ...(includeNoggins && result.outputs.nogginCount > 0 ? [{ label: `${result.outputs.nogginCount} nogs` }] : []),
              ]}
            />

            <ShoppingList rows={shopRows} />

            {/* Stud cut list */}
            <div style={{ ...cardStyle, gap: 12 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>
                  STUD LENGTHS — short side of top cut
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)' }}>
                  Cut top at {result.outputs.pitchAngle}° · add {result.outputs.studCutExtra}mm on high side · deducted {parseFloat(inputs.timberThickness) || 45}mm bottom plate + {result.outputs.rakePlateVertical}mm rake plate
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.studHeights.map((h, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--color-bg)', borderRadius: 8, padding: '7px 12px',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Stud {i + 1}</span>
                    <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{h}mm</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '0.5px solid var(--color-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Total</span>
                <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>{result.outputs.totalStudLineal}lm</span>
              </div>
            </div>

            <ApprenticeWorking
              steps={result.steps}
              finalAnswer={`${result.outputs.studCount} studs, ${result.outputs.pitchAngle}° pitch`}
              finalLabel="Raked wall layout"
              visible={settings.apprenticeMode}
              id="raked"
              glossary={[
                { term: 'Raked wall', definition: 'A wall where the top plate follows the slope of a roof rather than running level. Each stud is a different height.' },
                { term: 'Pitch / Rake', definition: 'The angle of the sloped top plate, expressed in degrees. Matches the roof pitch above the wall.' },
                { term: 'Low point / High point', definition: 'The shortest and tallest stud heights in the wall. All intermediate studs step between these two values.' },
                { term: 'Stud height', definition: 'The length of each individual stud in a raked wall, measured plumb (vertical). Changes incrementally across the wall.' },
                { term: 'Top plate rise', definition: 'The total vertical increase from one end of the top plate to the other, driven by the pitch and wall length.' },
                { term: 'Noggin / Nog', definition: 'Horizontal blocking fitted between studs mid-height. Braces the wall and provides a fixing point for sheets and linings.' },
              ]}
            />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.raked[settings.region]}
            </p>

            <AddToQuoteCTA
              scopeSummary={`Raked wall, ${inputs.wallLength}, ${result.outputs.lowStudHeight}–${result.outputs.highStudHeight}mm`}
              materials={quoteMaterials}
              jobName={jobName}
            />
            <div style={{
              background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Save</p>
              <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />
              <AddToJobPrompt calculationId={lastEntryId} />
              <ShareCalcButton
                calculationId={lastEntryId}
                shareTitle={jobName || 'Raked wall order'}
                shareBody={buildShoppingListShareBody({
                  jobName,
                  scopeSummary: `Raked wall, ${inputs.wallLength}, ${result.outputs.lowStudHeight}–${result.outputs.highStudHeight}mm`,
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
