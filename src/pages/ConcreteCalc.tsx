import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { JobNameInput } from '../components/JobNameInput';
import { VoiceInputButton } from '../components/VoiceInputButton';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { calculateSlab, calculatePostHoles } from '../calculators/concrete';
import type { SlabOutputs, PostHoleOutputs } from '../calculators/concrete';
import type { WorkingStep } from '../components/ApprenticeWorking';

type Tab = 'slab' | 'postholes';
type HoleType = 'round' | 'square';

interface SlabFields { length: string; width: string; thickness: string; }
interface PostFields { diameter: string; sideWidth: string; depth: string; numHoles: string; postSize: string; }

const WASTAGE_OPTIONS = [0.05, 0.10, 0.15, 0.20];

const SLAB_DEFAULTS: SlabFields = { length: '', width: '', thickness: '' };
const POST_DEFAULTS: PostFields = { diameter: '300', sideWidth: '300', depth: '600', numHoles: '1', postSize: '' };

export function ConcreteCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [tab, setTab] = useState<Tab>('slab');
  const [wastage, setWastage] = useState(0.10);

  const [slabFields, setSlabFields] = useState<SlabFields>(SLAB_DEFAULTS);
  const [slabResult, setSlabResult] = useState<{ outputs: SlabOutputs; steps: WorkingStep[] } | null>(null);
  const [lastSlabId, setLastSlabId] = useState('');

  const [holeType, setHoleType] = useState<HoleType>('round');
  const [postFields, setPostFields] = useState<PostFields>(POST_DEFAULTS);
  const [postDeductEnabled, setPostDeductEnabled] = useState(false);
  const [postDeductShape, setPostDeductShape] = useState<'round' | 'square'>('round');
  const [postResult, setPostResult] = useState<{ outputs: PostHoleOutputs; steps: WorkingStep[] } | null>(null);
  const [lastPostId, setLastPostId] = useState('');

  const [jobName, setJobName] = useState('');
  const [error, setError] = useState('');

  function setSlab(field: keyof SlabFields) {
    return (value: string) => setSlabFields(prev => ({ ...prev, [field]: value }));
  }

  function setPost(field: keyof PostFields) {
    return (value: string) => setPostFields(prev => ({ ...prev, [field]: value }));
  }

  function switchTab(t: Tab) {
    setTab(t);
    setError('');
    setJobName('');
  }

  function handleCalculate() {
    setError('');

    if (tab === 'slab') {
      const length = parseFloat(slabFields.length);
      const width = parseFloat(slabFields.width);
      const thickness = parseFloat(slabFields.thickness);
      if (!length || length <= 0) { setError('Enter a length to calculate.'); return; }
      if (!width || width <= 0) { setError('Enter a width to calculate.'); return; }
      if (!thickness || thickness <= 0) { setError('Enter a thickness to calculate.'); return; }

      const calc = calculateSlab({ length, width, thickness, wastage });
      setSlabResult(calc);
      const id = crypto.randomUUID();
      setLastSlabId(id);
      addEntry({
        id,
        calculatorId: 'concrete',
        timestamp: Date.now(),
        jobName: jobName || undefined,
        inputs: { type: 'slab', length, width, thickness, wastage },
        outputs: calc.outputs,
      });
    } else {
      const depth = parseFloat(postFields.depth);
      const numHoles = parseInt(postFields.numHoles);
      if (!depth || depth <= 0) { setError('Enter a depth to calculate.'); return; }
      if (!numHoles || numHoles <= 0) { setError('Enter a valid number of holes.'); return; }

      let diameter: number | undefined;
      let sideWidth: number | undefined;

      if (holeType === 'round') {
        diameter = parseFloat(postFields.diameter);
        if (!diameter || diameter <= 0) { setError('Enter a diameter to calculate.'); return; }
      } else {
        sideWidth = parseFloat(postFields.sideWidth);
        if (!sideWidth || sideWidth <= 0) { setError('Enter a side width to calculate.'); return; }
      }

      const postSize = postDeductEnabled ? parseFloat(postFields.postSize) || undefined : undefined;
      const calc = calculatePostHoles({
        holeType, diameter, sideWidth, depth, numHoles, wastage,
        ...(postDeductEnabled && postSize && { postShape: postDeductShape, postSize }),
      });
      setPostResult(calc);
      const id = crypto.randomUUID();
      setLastPostId(id);
      addEntry({
        id,
        calculatorId: 'concrete',
        timestamp: Date.now(),
        jobName: jobName || undefined,
        inputs: {
          type: 'postholes',
          holeType,
          diameter: diameter ?? sideWidth ?? 0,
          depth,
          numHoles,
          wastage,
        },
        outputs: calc.outputs,
      });
    }

    if (navigator.vibrate) navigator.vibrate(30);
  }

  // Slab working steps
  const slabL = slabResult ? parseFloat(slabFields.length) : 0;
  const slabW = slabResult ? parseFloat(slabFields.width) : 0;
  const slabT = slabResult ? parseFloat(slabFields.thickness) : 0;
  const slabVol = slabResult ? slabResult.outputs.exactVolume : 0;

  const slabWorkingSteps: WorkingStep[] = slabResult ? [
    { label: 'Slab dimensions', explanation: 'Length, width and thickness in millimetres', result: `${slabL} × ${slabW} × ${slabT} mm` },
    { label: 'Convert to metres', explanation: 'Divide each measurement by 1000 to get metres', calculation: `${slabL / 1000} × ${slabW / 1000} × ${slabT / 1000}`, result: `${slabL / 1000} m × ${slabW / 1000} m × ${slabT / 1000} m` },
    { label: 'Volume', explanation: 'Multiply the three dimensions together', calculation: `${slabL / 1000} × ${slabW / 1000} × ${slabT / 1000}`, result: `${slabVol.toFixed(2)} m³` },
    { label: 'Add wastage', explanation: `Add ${Math.round(wastage * 100)}% so you don't run short on the pour`, calculation: `${slabVol.toFixed(2)} × ${(1 + wastage).toFixed(2)}`, result: `${slabResult.outputs.orderVolume} m³ to order` },
  ] : [];

  // Post hole working steps
  const postD = postResult && holeType === 'round' ? parseFloat(postFields.diameter) : 0;
  const postSW = postResult && holeType === 'square' ? parseFloat(postFields.sideWidth) : 0;
  const postDep = postResult ? parseFloat(postFields.depth) : 0;
  const postN = postResult ? parseInt(postFields.numHoles) : 0;
  const postTotalVol = postResult ? postResult.outputs.totalVolume : 0;
  const postVolPerHole = postResult && postN > 0 ? postTotalVol / postN : 0;

  const postDeductM3 = postResult ? postResult.outputs.postVolumePerHole : 0;

  const postWorkingSteps: WorkingStep[] = postResult ? (holeType === 'round' ? [
    { label: 'Hole shape', explanation: 'Round hole with diameter and depth', result: `${postD} mm × ${postDep} mm` },
    { label: 'Radius', explanation: 'Half the diameter', calculation: `${postD} ÷ 2`, result: `${postD / 2} mm` },
    { label: 'Gross volume per hole', explanation: 'Pi times the radius squared, times the depth, all converted to metres', calculation: `π × ${(postD / 2 / 1000).toFixed(3)}² × ${postDep / 1000}`, result: `${(postVolPerHole + postDeductM3).toFixed(4)} m³ per hole` },
    ...(postDeductM3 > 0 ? [{ label: 'Deduct post', explanation: 'Subtract the post volume from each hole', calculation: `${(postVolPerHole + postDeductM3).toFixed(4)} − ${postDeductM3.toFixed(4)}`, result: `${postVolPerHole.toFixed(4)} m³ net per hole` }] as WorkingStep[] : []),
    { label: 'Total volume', explanation: 'Multiply net volume by the number of holes', calculation: `${postVolPerHole.toFixed(4)} × ${postN}`, result: `${postTotalVol.toFixed(3)} m³` },
    ...(postResult.outputs.useBagMix ? [{ label: 'Bags needed', explanation: 'Each 20kg bag yields about 0.009 m³ of mixed concrete', calculation: `${postTotalVol.toFixed(3)} ÷ 0.009`, result: `${postResult.outputs.bagCount} bags` }] : [{ label: 'Order ready-mix', explanation: 'Volume is over 0.2 m³ — order ready-mix concrete instead of bags', result: `${postResult.outputs.orderVolume} m³` }]) as WorkingStep[],
  ] : [
    { label: 'Hole shape', explanation: 'Square hole with side width and depth', result: `${postSW} mm × ${postDep} mm` },
    { label: 'Gross volume per hole', explanation: 'Side length squared, times the depth, all converted to metres', calculation: `${postSW / 1000}² × ${postDep / 1000}`, result: `${(postVolPerHole + postDeductM3).toFixed(4)} m³ per hole` },
    ...(postDeductM3 > 0 ? [{ label: 'Deduct post', explanation: 'Subtract the post volume from each hole', calculation: `${(postVolPerHole + postDeductM3).toFixed(4)} − ${postDeductM3.toFixed(4)}`, result: `${postVolPerHole.toFixed(4)} m³ net per hole` }] as WorkingStep[] : []),
    { label: 'Total volume', explanation: 'Multiply net volume by the number of holes', calculation: `${postVolPerHole.toFixed(4)} × ${postN}`, result: `${postTotalVol.toFixed(3)} m³` },
    ...(postResult.outputs.useBagMix ? [{ label: 'Bags needed', explanation: 'Each 20kg bag yields about 0.009 m³ of mixed concrete', calculation: `${postTotalVol.toFixed(3)} ÷ 0.009`, result: `${postResult.outputs.bagCount} bags` }] : [{ label: 'Order ready-mix', explanation: 'Volume is over 0.2 m³ — order ready-mix concrete instead of bags', result: `${postResult.outputs.orderVolume} m³` }]) as WorkingStep[],
  ]) : [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Concrete volume"
        right={
          <VoiceInputButton
            prompt={tab === 'slab' ? 'Say: length, width, thickness' : 'Say: diameter or width, depth, number of holes'}
            onValues={values => {
              if (tab === 'slab') {
                setSlabFields(prev => ({
                  ...prev,
                  ...(values[0] !== undefined && { length: String(values[0]) }),
                  ...(values[1] !== undefined && { width: String(values[1]) }),
                  ...(values[2] !== undefined && { thickness: String(values[2]) }),
                }));
              } else {
                setPostFields(prev => ({
                  ...prev,
                  ...(values[0] !== undefined && holeType === 'round' && { diameter: String(values[0]) }),
                  ...(values[0] !== undefined && holeType === 'square' && { sideWidth: String(values[0]) }),
                  ...(values[1] !== undefined && { depth: String(values[1]) }),
                  ...(values[2] !== undefined && { numHoles: String(values[2]) }),
                }));
              }
            }}
          />
        }
      />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--color-card)',
          borderRadius: 12,
          padding: 4,
          border: '0.5px solid var(--color-border)',
        }}>
          {(['slab', 'postholes'] as const).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 9,
                border: 'none',
                background: tab === t ? 'var(--color-orange)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--color-muted)',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {t === 'slab' ? 'Slab' : 'Post holes'}
            </button>
          ))}
        </div>

        {/* Inputs card */}
        <div style={{
          background: 'var(--color-card)',
          border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {tab === 'slab' ? (
            <>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <NumberInput label="Length" value={slabFields.length} onChange={setSlab('length')} units={['mm', 'm']} placeholder="4000" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <NumberInput label="Width" value={slabFields.width} onChange={setSlab('width')} units={['mm', 'm']} placeholder="3000" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <NumberInput label="Thickness" value={slabFields.thickness} onChange={setSlab('thickness')} units={['mm', 'm']} placeholder="100" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }} />
              </div>
            </>
          ) : (
            <>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>HOLE TYPE</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['round', 'square'] as const).map(ht => (
                    <button
                      key={ht}
                      onClick={() => setHoleType(ht)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 10,
                        border: '0.5px solid var(--color-border)',
                        background: holeType === ht ? 'var(--color-orange)' : 'var(--color-bg)',
                        color: holeType === ht ? '#fff' : 'var(--color-text)',
                        fontSize: 14,
                        fontWeight: 500,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      {ht === 'round' ? 'Round' : 'Square'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {holeType === 'round' ? (
                    <NumberInput label="Diameter" value={postFields.diameter} onChange={setPost('diameter')} units={['mm', 'm']} placeholder="300" />
                  ) : (
                    <NumberInput label="Side width" value={postFields.sideWidth} onChange={setPost('sideWidth')} units={['mm', 'm']} placeholder="300" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <NumberInput label="Depth" value={postFields.depth} onChange={setPost('depth')} units={['mm', 'm']} placeholder="600" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <NumberInput label="Number of holes" value={postFields.numHoles} onChange={setPost('numHoles')} unit="" placeholder="1" hint="default 1" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }} />
              </div>

              {/* Post deduction */}
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>SUBTRACT POST</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['off', 'on'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setPostDeductEnabled(v === 'on')}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 10,
                        border: '0.5px solid var(--color-border)',
                        background: (postDeductEnabled ? 'on' : 'off') === v ? 'var(--color-orange)' : 'var(--color-bg)',
                        color: (postDeductEnabled ? 'on' : 'off') === v ? '#fff' : 'var(--color-text)',
                        fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                      }}
                    >
                      {v === 'off' ? 'No post' : 'Deduct post'}
                    </button>
                  ))}
                </div>
              </div>

              {postDeductEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>POST SHAPE</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['round', 'square'] as const).map(ps => (
                        <button
                          key={ps}
                          onClick={() => setPostDeductShape(ps)}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 10,
                            border: '0.5px solid var(--color-border)',
                            background: postDeductShape === ps ? 'var(--color-orange)' : 'var(--color-bg)',
                            color: postDeductShape === ps ? '#fff' : 'var(--color-text)',
                            fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                          }}
                        >
                          {ps === 'round' ? 'Round' : 'Square'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <NumberInput
                    label={postDeductShape === 'round' ? 'Post diameter' : 'Post side width'}
                    value={postFields.postSize}
                    onChange={setPost('postSize')}
                    units={['mm', 'm']}
                    placeholder={postDeductShape === 'round' ? '100' : '90'}
                  />
                </div>
              )}
            </>
          )}

          {/* Wastage selector */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>WASTAGE</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {WASTAGE_OPTIONS.map(w => (
                <button
                  key={w}
                  onClick={() => setWastage(w)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 10,
                    border: '0.5px solid var(--color-border)',
                    background: wastage === w ? 'var(--color-orange)' : 'var(--color-bg)',
                    color: wastage === w ? '#fff' : 'var(--color-text)',
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  {Math.round(w * 100)}%
                </button>
              ))}
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

        {/* Slab results */}
        {tab === 'slab' && slabResult && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Volume" value={slabResult.outputs.exactVolume} unit="m³" accent />
                <ResultCard label="Order (incl. wastage)" value={slabResult.outputs.orderVolume} unit="m³" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: slabResult.outputs.exactVolume < 1 ? '1fr 1fr' : '1fr', gap: 10 }}>
                {slabResult.outputs.exactVolume < 1 && (
                  <ResultCard label="Volume in litres" value={slabResult.outputs.litres} unit="L" />
                )}
                <ResultCard label="Est. weight" value={slabResult.outputs.weightTonnes} unit="t" />
              </div>
            </div>

            <ApprenticeWorking
              steps={slabWorkingSteps}
              finalAnswer={`${slabResult.outputs.orderVolume} m³`}
              finalLabel="Concrete to order"
              visible={settings.apprenticeMode}
              id="concrete-slab"
            />

            <JobNameInput
              value={jobName}
              onChange={setJobName}
              onSave={name => updateEntry(lastSlabId, { jobName: name })}
            />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.concrete[settings.region]}
            </p>
          </>
        )}

        {/* Post hole results */}
        {tab === 'postholes' && postResult && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Per hole" value={postResult.outputs.volumePerHole} unit="m³" accent />
                <ResultCard label="Total" value={postResult.outputs.totalVolume} unit="m³" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Total volume" value={postResult.outputs.totalVolume} unit="m³" />
                <ResultCard label="Order (incl. wastage)" value={postResult.outputs.orderVolume} unit="m³" />
              </div>
            </div>

            {/* Bag / ready-mix recommendation */}
            <div style={{
              background: postResult.outputs.useBagMix ? '#f0fdf4' : '#eff6ff',
              border: `0.5px solid ${postResult.outputs.useBagMix ? '#22c55e' : '#3b82f6'}`,
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: postResult.outputs.useBagMix ? '#166534' : '#1e40af' }}>
                {postResult.outputs.useBagMix ? 'Bag mix recommended' : 'Ready-mix recommended'}
              </p>
              {postResult.outputs.useBagMix ? (
                <p style={{ margin: 0, fontSize: 12, color: '#166534' }}>
                  ~{postResult.outputs.bagCount} × 20 kg bags (incl. {Math.round(wastage * 100)}% wastage)
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: '#1e40af' }}>
                  Total volume is 0.2 m³ or more — order ready-mix.
                </p>
              )}
            </div>

            <ApprenticeWorking
              steps={postWorkingSteps}
              finalAnswer={postResult.outputs.useBagMix ? `${postResult.outputs.bagCount} bags` : `${postResult.outputs.orderVolume} m³`}
              finalLabel={postResult.outputs.useBagMix ? '20kg bags needed' : 'Ready-mix to order'}
              visible={settings.apprenticeMode}
              id="concrete-postholes"
            />

            <JobNameInput
              value={jobName}
              onChange={setJobName}
              onSave={name => updateEntry(lastPostId, { jobName: name })}
            />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.concrete[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
