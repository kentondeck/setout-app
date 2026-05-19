import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { calculateFraming } from '../calculators/framing';
import type { FramingOutputs } from '../calculators/framing';
import { calculateCutlist } from '../calculators/cutlist';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { FramingDiagram } from '../components/FramingDiagram';

interface Inputs {
  wallLength: string;
  wallHeight: string;
  studSpacing: string;
  customSpacing: string;
  nogginRows: string;
}

const DEFAULTS: Inputs = {
  wallLength: '',
  wallHeight: '',
  studSpacing: '450',
  customSpacing: '',
  nogginRows: '',
};

export function FramingCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [includeNoggins, setIncludeNoggins] = useState(true);
  const [doubleStuds, setDoubleStuds] = useState(false);
  const [doubleTopPlate, setDoubleTopPlate] = useState(true);
  const [plateStock, setPlateStock] = useState(4800);
  const [result, setResult] = useState<{ outputs: FramingOutputs; steps: WorkingStep[] } | null>(null);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  function handleCalculate() {
    const wallLength = parseFloat(inputs.wallLength);
    const wallHeight = parseFloat(inputs.wallHeight);
    const studSpacing = inputs.studSpacing === 'custom'
      ? parseFloat(inputs.customSpacing)
      : parseFloat(inputs.studSpacing);
    const nogginRows = parseInt(inputs.nogginRows);

    if (!wallLength || wallLength <= 0) {
      setError('Enter a wall length to calculate.');
      return;
    }
    if (!wallHeight || wallHeight <= 0) {
      setError('Enter a valid wall height.');
      return;
    }

    setError('');

    const calc = calculateFraming({ wallLength, wallHeight, studSpacing, includeNoggins, nogginRows: nogginRows || 1, doubleStuds, doubleTopPlate });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'framing',
      timestamp: Date.now(),
      inputs: { wallLength, wallHeight, studSpacing, nogginRows, includeNoggins: includeNoggins ? 1 : 0, doubleStuds: doubleStuds ? 1 : 0 },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  // Derived values for material & cut list
  const wallLengthMm = result ? Math.round(parseFloat(inputs.wallLength) * 1000) : 0;
  const wallHeightMm = result ? Math.round(parseFloat(inputs.wallHeight) * 1000) : 0;
  const resolvedSpacingMm = inputs.studSpacing === 'custom'
    ? (parseFloat(inputs.customSpacing) || 450)
    : parseFloat(inputs.studSpacing);
  const nogginLengthMm = Math.round(resolvedSpacingMm - 90);
  const plateRuns = (doubleTopPlate ? 2 : 1) + 1;
  // Optimised: share tail cuts across all plate runs
  const totalPlateStocks = wallLengthMm > 0 ? Math.ceil((plateRuns * wallLengthMm) / plateStock) : 0;
  const plateWasteMm = totalPlateStocks * plateStock - plateRuns * wallLengthMm;
  const nogginCount = result?.outputs.nogginCount ?? 0;
  const studCutlist = result && wallHeightMm > 0
    ? calculateCutlist({ cuts: [{ length: wallHeightMm, qty: result.outputs.studCount }] })
    : null;
  // No fixed stock — let the cutlist optimizer pick the best lengths from defaults
  const nogginCutlist = result && includeNoggins && nogginCount > 0 && nogginLengthMm > 0
    ? calculateCutlist({ cuts: [{ length: nogginLengthMm, qty: nogginCount }] })
    : null;

  // Combined order list — merge all material lists into one grouped by stock length
  const orderMap = new Map<number, number>();
  studCutlist?.materialList.forEach(m => orderMap.set(m.stockLength, (orderMap.get(m.stockLength) ?? 0) + m.count));
  if (totalPlateStocks > 0) orderMap.set(plateStock, (orderMap.get(plateStock) ?? 0) + totalPlateStocks);
  nogginCutlist?.materialList.forEach(m => orderMap.set(m.stockLength, (orderMap.get(m.stockLength) ?? 0) + m.count));
  const orderList = [...orderMap.entries()].sort((a, b) => a[0] - b[0]).map(([stockLength, count]) => ({ stockLength, count }));

  // Build new-format working steps from actual calculator outputs
  const studSpacingMm = inputs.studSpacing === 'custom' ? (parseFloat(inputs.customSpacing) || 450) : parseFloat(inputs.studSpacing);
  const studsBefore = result ? result.outputs.studCount - 1 : 0;

  const framingSteps: WorkingStep[] = result ? [
    {
      label: 'Wall length',
      explanation: "The full length of the wall you're framing",
      result: `${wallLengthMm} mm`,
    },
    {
      label: 'Stud spacing',
      explanation: 'How far apart each stud goes, centre to centre',
      result: `${studSpacingMm} mm apart`,
    },
    {
      label: 'Studs in the span',
      explanation: 'Divide the wall length by the stud spacing',
      calculation: `${wallLengthMm} ÷ ${studSpacingMm} = ${(wallLengthMm / studSpacingMm).toFixed(1)}`,
      result: `Round up to ${studsBefore} studs`,
    },
    {
      label: 'Add the end stud',
      explanation: "One extra stud at the end of the wall so you have something to fix the sheet to",
      calculation: `${studsBefore} + 1`,
      result: `${result.outputs.studCount} studs`,
    },
  ] : [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Wall Framing"
      />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Inputs */}
        <div
          style={{
            background: 'var(--color-card)',
            border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Wall length" value={inputs.wallLength} onChange={set('wallLength')} units={['m', 'mm']} placeholders={{ m: 'e.g. 4.8', mm: 'e.g. 4800' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Wall height" value={inputs.wallHeight} onChange={set('wallHeight')} units={['m', 'mm']} placeholders={{ m: 'e.g. 2.4', mm: 'e.g. 2400' }} />
            </div>
          </div>

          {/* Stud spacing toggle */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>
              STUD SPACING
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['450', '600', 'custom'] as const).map(sp => (
                <button
                  key={sp}
                  onClick={() => setInputs(prev => ({ ...prev, studSpacing: sp }))}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 10,
                    border: '0.5px solid var(--color-border)',
                    background: inputs.studSpacing === sp ? 'var(--color-orange)' : 'var(--color-bg)',
                    color: inputs.studSpacing === sp ? '#fff' : 'var(--color-text)',
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  {sp === 'custom' ? 'Custom' : `${sp}mm`}
                </button>
              ))}
            </div>
            {inputs.studSpacing === 'custom' && (
              <div style={{ marginTop: 10 }}>
                <NumberInput
                  label=""
                  value={inputs.customSpacing}
                  onChange={v => setInputs(prev => ({ ...prev, customSpacing: v }))}
                  units={['mm', 'm']}
                  placeholders={{ mm: 'e.g. 500', m: 'e.g. 0.5' }}
                />
              </div>
            )}
          </div>

          {/* Double top plate toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Double top plate</span>
            <button
              onClick={() => setDoubleTopPlate(v => !v)}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                border: 'none',
                background: doubleTopPlate ? 'var(--color-orange)' : '#ccc',
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
                  left: doubleTopPlate ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>

          {/* Double studs toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Double studs</span>
            <button
              onClick={() => setDoubleStuds(v => !v)}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                border: 'none',
                background: doubleStuds ? 'var(--color-orange)' : '#ccc',
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
                  left: doubleStuds ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }}
              />
            </button>
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

        {result && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Studs" value={result.outputs.studCount} accent />
                <ResultCard label="Total lineal m" value={result.outputs.totalLinealMetres} unit="lm" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Top plate" value={result.outputs.topPlateLineal} unit="lm" />
                <ResultCard label="Bottom plate" value={result.outputs.bottomPlateLineal} unit="lm" />
              </div>
              {includeNoggins && (
                <ResultCard label="Nogs" value={result.outputs.nogginCount} />
              )}
            </div>

            <ApprenticeWorking
              steps={framingSteps}
              finalAnswer={`${result.outputs.studCount} studs`}
              finalLabel="Total studs needed"
              visible={settings.apprenticeMode}
              id="framing"
              glossary={[
                { term: 'Stud', definition: 'The vertical timber members that make up the body of a wall frame. They carry load from the top plate down to the bottom plate.' },
                { term: 'Top plate', definition: 'The horizontal timber running along the top of the wall frame. A double top plate is used when walls carry roof loads.' },
                { term: 'Bottom plate', definition: 'The horizontal timber at the base of the wall frame, sitting on the floor or slab. Also called a sole plate.' },
                { term: 'Noggin / Nog', definition: 'Horizontal blocking fitted between studs mid-height. Braces the wall and provides a fixing point for sheets and linings.' },
                { term: 'C/C (centre-to-centre)', definition: 'The distance measured from the centre of one stud to the centre of the next. Standard spacings are 450mm and 600mm.' },
              ]}
            />

            {/* Material & Cut List */}
            <div style={{
              background: 'var(--color-card)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>MATERIALS</p>
              {[
                { label: 'Studs', qty: result.outputs.studCount, mm: wallHeightMm },
                { label: `Top plate (${doubleTopPlate ? '2 runs' : '1 run'})`, qty: doubleTopPlate ? 2 : 1, mm: wallLengthMm },
                { label: 'Bottom plate', qty: 1, mm: wallLengthMm },
                ...(includeNoggins && nogginCount > 0 ? [{ label: 'Noggins', qty: nogginCount, mm: nogginLengthMm }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{row.label}</span>
                  <span style={{ fontSize: 14, color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {row.qty} × {row.mm}mm
                  </span>
                </div>
              ))}

              <div style={{ height: 0.5, background: 'var(--color-border)' }} />

              {/* Studs cut list */}
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>CUT LIST — STUDS</p>
              {studCutlist && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>
                    {result.outputs.studCount} × {wallHeightMm}mm
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{studCutlist.outputs.wastePercent}% waste</span>
                </div>
              )}

              <div style={{ height: 0.5, background: 'var(--color-border)' }} />

              {/* Plates cut list */}
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>CUT LIST — PLATES</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[4200, 4800, 6000].map(len => (
                  <button key={len} onClick={() => setPlateStock(len)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 10,
                    border: '0.5px solid var(--color-border)',
                    background: plateStock === len ? 'var(--color-orange)' : 'var(--color-bg)',
                    color: plateStock === len ? '#fff' : 'var(--color-text)',
                    fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                  }}>
                    {(len / 1000).toFixed(1)}m
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>
                  {plateRuns} × {wallLengthMm}mm
                </span>
                {plateWasteMm > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{plateWasteMm}mm waste</span>
                )}
              </div>

              {/* Noggins cut list */}
              {includeNoggins && nogginCount > 0 && (
                <>
                  <div style={{ height: 0.5, background: 'var(--color-border)' }} />
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>CUT LIST — NOGGINS</p>
                  {nogginCutlist && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>
                        {nogginCount} × {nogginLengthMm}mm
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{nogginCutlist.outputs.wastePercent}% waste</span>
                    </div>
                  )}
                </>
              )}

              <div style={{ height: 0.5, background: 'var(--color-border)' }} />

              {/* Combined order list */}
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>TIMBER TO ORDER</p>
              {orderList.map(m => (
                <div key={m.stockLength} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>
                    {m.count} × {(m.stockLength / 1000).toFixed(1).replace(/\.0$/, '')}m
                  </span>
                </div>
              ))}
            </div>

            <FramingDiagram
              wallLengthMm={wallLengthMm}
              wallHeightMm={wallHeightMm}
              studCount={result.outputs.studCount}
              studSpacingMm={resolvedSpacingMm}
              nogginRows={includeNoggins ? (parseInt(inputs.nogginRows) || 1) : 0}
              doubleTopPlate={doubleTopPlate}
              doubleStuds={doubleStuds}
            />

            <AddToJobPrompt calculationId={lastEntryId} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.framing[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
