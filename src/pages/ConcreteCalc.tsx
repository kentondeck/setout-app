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
import { calculateSlab, calculatePostHoles, calculateConcreteMix, calculateSlabReo } from '../calculators/concrete';
import { JobNameInput } from '../components/JobNameInput';
import { useScrollToResult } from '../lib/useScrollToResult';
import type { SlabOutputs, PostHoleOutputs, MixOutputs, MixRatio, SlabReoOutputs } from '../calculators/concrete';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { uuid } from '../lib/uuid';

type Tab = 'slab' | 'postholes' | 'mix';
type HoleType = 'round' | 'square';

interface SlabFields { length: string; width: string; thickness: string; }
interface PostFields { diameter: string; sideWidth: string; depth: string; numHoles: string; postSize: string; }

const WASTAGE_OPTIONS = [0.05, 0.10, 0.15];

const SLAB_DEFAULTS: SlabFields = { length: '', width: '', thickness: '' };
const POST_DEFAULTS: PostFields = { diameter: '', sideWidth: '', depth: '', numHoles: '', postSize: '' };

const MIX_PRESETS: { label: string; ratio: MixRatio; hint: string }[] = [
  { label: '1:2:4', ratio: { cement: 1, sand: 2, aggregate: 4 }, hint: 'General purpose, ~20 MPa' },
  { label: '1:2:3', ratio: { cement: 1, sand: 2, aggregate: 3 }, hint: 'Slabs & paths, ~25 MPa' },
  { label: '1:1.5:3', ratio: { cement: 1, sand: 1.5, aggregate: 3 }, hint: 'Structural, ~32 MPa' },
];

export function ConcreteCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [tab, setTab] = useState<Tab>('slab');
  const [wastageMode, setWastageMode] = useState<number | 'custom'>(0.10);
  const [customWastage, setCustomWastage] = useState('');
  const wastage = wastageMode === 'custom'
    ? (parseFloat(customWastage) || 0) / 100
    : wastageMode;
  const [jobName, setJobName] = useState('');

  const [slabFields, setSlabFields] = useState<SlabFields>(SLAB_DEFAULTS);
  const [slabResult, setSlabResult] = useState<{ outputs: SlabOutputs; steps: WorkingStep[] } | null>(null);
  const [slabReoResult, setSlabReoResult] = useState<{ outputs: SlabReoOutputs; steps: WorkingStep[] } | null>(null);
  const [lastSlabId, setLastSlabId] = useState('');

  const [holeType, setHoleType] = useState<HoleType>('round');
  const [postFields, setPostFields] = useState<PostFields>(POST_DEFAULTS);
  const [postDeductEnabled, setPostDeductEnabled] = useState(false);
  const [postDeductShape, setPostDeductShape] = useState<'round' | 'square'>('round');
  const [postResult, setPostResult] = useState<{ outputs: PostHoleOutputs; steps: WorkingStep[] } | null>(null);
  const [lastPostId, setLastPostId] = useState('');

  const [mixVolume, setMixVolume] = useState('');
  const [mixPreset, setMixPreset] = useState<string>('1:2:4');
  const [customCement, setCustomCement] = useState('');
  const [customSand, setCustomSand] = useState('');
  const [customAggregate, setCustomAggregate] = useState('');
  const [mixResult, setMixResult] = useState<{ outputs: MixOutputs; steps: WorkingStep[] } | null>(null);
  const [lastMixId, setLastMixId] = useState('');

  const [error, setError] = useState('');
  const resultRef = useScrollToResult(tab === 'slab' ? slabResult : tab === 'postholes' ? postResult : mixResult);

  const resolvedMixRatio: MixRatio = mixPreset === 'custom'
    ? {
        cement: parseFloat(customCement) || 1,
        sand: parseFloat(customSand) || 2,
        aggregate: parseFloat(customAggregate) || 4,
      }
    : (MIX_PRESETS.find(p => p.label === mixPreset)?.ratio ?? MIX_PRESETS[0].ratio);

  function setSlab(field: keyof SlabFields) {
    return (value: string) => setSlabFields(prev => ({ ...prev, [field]: value }));
  }

  function setPost(field: keyof PostFields) {
    return (value: string) => setPostFields(prev => ({ ...prev, [field]: value }));
  }

  function switchTab(t: Tab) {
    setTab(t);
    setError('');
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
      const reoCalc = calculateSlabReo({ length, width });
      setSlabResult(calc);
      setSlabReoResult(reoCalc);
      const id = uuid();
      setLastSlabId(id);
      addEntry({
        id,
        calculatorId: 'concrete',
        timestamp: Date.now(),
        inputs: { type: 'slab', length, width, thickness, wastage },
        // Merge in the reinforcement outputs too (mesh/chairs/tape/ties/plastic), not just volume —
        // otherwise they're only ever in local state and never reach Share, Job order, or resuming.
        outputs: { ...calc.outputs, ...reoCalc.outputs },
      });
    } else if (tab === 'postholes') {
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

      const postSize = postDeductEnabled ? parseFloat(postFields.postSize) : undefined;
      if (postDeductEnabled && (!postSize || postSize <= 0)) {
        setError('Enter a post size to deduct, or turn off "Deduct post".');
        return;
      }
      const calc = calculatePostHoles({
        holeType, diameter, sideWidth, depth, numHoles, wastage,
        ...(postDeductEnabled && postSize && { postShape: postDeductShape, postSize }),
      });
      setPostResult(calc);
      const id = uuid();
      setLastPostId(id);
      addEntry({
        id,
        calculatorId: 'concrete',
        timestamp: Date.now(),
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
    } else {
      const volume = parseFloat(mixVolume);
      if (!volume || volume <= 0) { setError('Enter a concrete volume to calculate.'); return; }

      const calc = calculateConcreteMix({ volumeM3: volume, ratio: resolvedMixRatio });
      setMixResult(calc);
      const id = uuid();
      setLastMixId(id);
      addEntry({
        id,
        calculatorId: 'concrete',
        timestamp: Date.now(),
        inputs: {
          type: 'mix',
          volumeM3: volume,
          ratio: `${resolvedMixRatio.cement}:${resolvedMixRatio.sand}:${resolvedMixRatio.aggregate}`,
        },
        outputs: calc.outputs,
      });
    }

    hapticMedium();
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
    ...(slabReoResult ? slabReoResult.steps : []),
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

  const mixQuoteMaterials = mixResult ? [
    { item: 'GP cement', quantity: mixResult.outputs.cementBags, unit: 'bag', note: `${mixResult.outputs.cementKg} kg` },
    { item: 'Sand', quantity: mixResult.outputs.sandM3, unit: 'm3', note: `${mixResult.outputs.sandKg} kg` },
    { item: 'Aggregate', quantity: mixResult.outputs.aggregateM3, unit: 'm3', note: `${mixResult.outputs.aggregateKg} kg` },
  ] : [];

  const slabQuoteMaterials = slabResult ? [
    { item: 'Ready-mix concrete', quantity: slabResult.outputs.orderVolume, unit: 'm3', note: 'slab pour' },
    ...(slabReoResult ? [
      { item: 'Reinforcing mesh sheet', quantity: slabReoResult.outputs.meshSheets, unit: 'sheet', note: '6.0m × 2.4m sheets, 225mm lap' },
      { item: 'Bar chairs', quantity: slabReoResult.outputs.barChairPacks, unit: 'pack', note: `${slabReoResult.outputs.barChairs} chairs, ~1m centres` },
      { item: 'Plastic DPM sheeting', quantity: slabReoResult.outputs.plasticAreaM2, unit: 'm2', note: 'under-slab membrane' },
      { item: 'Tie wire', quantity: slabReoResult.outputs.tieWireRolls, unit: 'roll', note: `${slabReoResult.outputs.tieWireCount} ties — mesh laps + chairs` },
      ...(slabReoResult.outputs.tapeRolls > 0 ? [{ item: 'DPM join tape', quantity: slabReoResult.outputs.tapeRolls, unit: 'roll', note: `${slabReoResult.outputs.tapeLengthM}m of joins` }] : []),
    ] : []),
  ] : [];

  const slabShopRows = slabResult ? [
    { qty: `${slabResult.outputs.orderVolume}`, name: 'Ready-mix concrete (m³)', meta: `${slabResult.outputs.exactVolume} m³ + ${Math.round(wastage * 100)}% wastage` },
    ...(slabReoResult ? [
      { qty: `${slabReoResult.outputs.meshSheets}`, name: 'Reinforcing mesh sheets', meta: '6.0m × 2.4m sheets · 225mm lap' },
      { qty: `${slabReoResult.outputs.barChairPacks}`, name: 'Bar chair packs', meta: `${slabReoResult.outputs.barChairs} chairs · ~1m centres` },
      { qty: `${slabReoResult.outputs.plasticAreaM2}`, name: 'Plastic DPM (m²)', meta: 'under-slab membrane' },
      { qty: `${slabReoResult.outputs.tieWireRolls}`, name: 'Tie wire rolls', meta: `${slabReoResult.outputs.tieWireCount} ties needed` },
      ...(slabReoResult.outputs.tapeRolls > 0 ? [{ qty: `${slabReoResult.outputs.tapeRolls}`, name: 'DPM join tape rolls', meta: `${slabReoResult.outputs.tapeLengthM}m of joins` }] : []),
    ] : []),
  ] : [];

  const mixShopRows = mixResult ? [
    { qty: `${mixResult.outputs.cementBags}`, name: 'GP cement bags', meta: `${mixResult.outputs.cementKg} kg` },
    { qty: `${mixResult.outputs.sandM3}`, name: 'Sand (m³)', meta: `${mixResult.outputs.sandKg} kg` },
    { qty: `${mixResult.outputs.aggregateM3}`, name: 'Aggregate (m³)', meta: `${mixResult.outputs.aggregateKg} kg` },
  ] : [];

  const postShopRows = postResult ? (postResult.outputs.useBagMix
    ? [{ qty: `${postResult.outputs.bagCount}`, name: '20kg premix bags', meta: `${postFields.numHoles} holes · incl. ${Math.round(wastage * 100)}% wastage` }]
    : [{ qty: `${postResult.outputs.orderVolume}`, name: 'Ready-mix concrete (m³)', meta: `${postFields.numHoles} holes · incl. ${Math.round(wastage * 100)}% wastage` }]
  ) : [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Concrete volume"
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
          {(['slab', 'postholes', 'mix'] as const).map(t => (
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
              {t === 'slab' ? 'Slab' : t === 'postholes' ? 'Post holes' : 'Mix'}
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
                  <NumberInput label="Length" value={slabFields.length} onChange={setSlab('length')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 3000', m: 'e.g. 3' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <NumberInput label="Width" value={slabFields.width} onChange={setSlab('width')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 3000', m: 'e.g. 3' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <NumberInput label="Thickness" value={slabFields.thickness} onChange={setSlab('thickness')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 100', m: 'e.g. 0.1' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }} />
              </div>
            </>
          ) : tab === 'postholes' ? (
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
                    <NumberInput label="Diameter" value={postFields.diameter} onChange={setPost('diameter')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 300', m: 'e.g. 0.3' }} />
                  ) : (
                    <NumberInput label="Side width" value={postFields.sideWidth} onChange={setPost('sideWidth')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 300', m: 'e.g. 0.3' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <NumberInput label="Depth" value={postFields.depth} onChange={setPost('depth')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 600', m: 'e.g. 0.6' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <NumberInput label="Number of holes" value={postFields.numHoles} onChange={setPost('numHoles')} unit="" placeholder="e.g. 4" hint="default 1" />
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
                    placeholders={{ mm: 'e.g. 100', m: 'e.g. 0.1' }}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <NumberInput
                label="Concrete volume"
                value={mixVolume}
                onChange={setMixVolume}
                units={['m3']}
                placeholder="e.g. 1.2"
                hint="the volume you need to mix, wastage included"
              />

              {(slabResult || postResult) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {slabResult && (
                    <button
                      onClick={() => setMixVolume(String(slabResult.outputs.orderVolume))}
                      style={{
                        padding: '8px 12px', borderRadius: 10, border: '0.5px solid var(--color-border)',
                        background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 12.5,
                        fontFamily: 'inherit', cursor: 'pointer',
                      }}
                    >
                      Use slab volume ({slabResult.outputs.orderVolume} m³)
                    </button>
                  )}
                  {postResult && (
                    <button
                      onClick={() => setMixVolume(String(postResult.outputs.orderVolume))}
                      style={{
                        padding: '8px 12px', borderRadius: 10, border: '0.5px solid var(--color-border)',
                        background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 12.5,
                        fontFamily: 'inherit', cursor: 'pointer',
                      }}
                    >
                      Use post hole volume ({postResult.outputs.orderVolume} m³)
                    </button>
                  )}
                </div>
              )}

              <div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>MIX RATIO (CEMENT : SAND : AGGREGATE)</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {MIX_PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => setMixPreset(p.label)}
                      style={{
                        flex: '1 0 30%', padding: '8px 0', borderRadius: 10,
                        border: '0.5px solid var(--color-border)',
                        background: mixPreset === p.label ? 'var(--color-orange)' : 'var(--color-bg)',
                        color: mixPreset === p.label ? '#fff' : 'var(--color-text)',
                        fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      }}
                    >
                      <span>{p.label}</span>
                      <span style={{ fontSize: 10.5, color: mixPreset === p.label ? 'rgba(255,255,255,0.8)' : 'var(--color-muted)' }}>{p.hint}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setMixPreset('custom')}
                    style={{
                      flex: '1 0 30%', padding: '8px 0', borderRadius: 10,
                      border: '0.5px solid var(--color-border)',
                      background: mixPreset === 'custom' ? 'var(--color-orange)' : 'var(--color-bg)',
                      color: mixPreset === 'custom' ? '#fff' : 'var(--color-text)',
                      fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                    }}
                  >
                    Custom
                  </button>
                </div>
                {mixPreset === 'custom' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <NumberInput label="Cement" value={customCement} onChange={setCustomCement} unit="" placeholder="1" />
                    <NumberInput label="Sand" value={customSand} onChange={setCustomSand} unit="" placeholder="2" />
                    <NumberInput label="Aggregate" value={customAggregate} onChange={setCustomAggregate} unit="" placeholder="4" />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Wastage selector */}
          {tab !== 'mix' && (
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>WASTAGE</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {WASTAGE_OPTIONS.map(w => {
                const active = wastageMode === w;
                return (
                  <button
                    key={w}
                    onClick={() => setWastageMode(w)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 10,
                      border: '0.5px solid var(--color-border)',
                      background: active ? 'var(--color-orange)' : 'var(--color-bg)',
                      color: active ? '#fff' : 'var(--color-text)',
                      fontSize: 13,
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {Math.round(w * 100)}%
                  </button>
                );
              })}
              <button
                onClick={() => setWastageMode('custom')}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 10,
                  border: '0.5px solid var(--color-border)',
                  background: wastageMode === 'custom' ? 'var(--color-orange)' : 'var(--color-bg)',
                  color: wastageMode === 'custom' ? '#fff' : 'var(--color-text)',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                Custom
              </button>
            </div>
            {wastageMode === 'custom' && (
              <div style={{ marginTop: 10 }}>
                <NumberInput
                  label="Custom wastage"
                  value={customWastage}
                  onChange={setCustomWastage}
                  unit="%"
                  placeholder="e.g. 8"
                />
              </div>
            )}
          </div>
          )}
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
          <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ResultHero
              label="Order this much"
              value={slabResult.outputs.orderVolume}
              unit="m³ concrete"
              spec={`${slabFields.length}m × ${slabFields.width}m × ${slabFields.thickness}mm slab · incl. ${Math.round(wastage * 100)}% wastage`}
              stats={[
                { label: `${slabResult.outputs.exactVolume} m³ net` },
                { label: `${slabResult.outputs.weightTonnes} t` },
                ...(slabResult.outputs.exactVolume < 1 ? [{ label: `${slabResult.outputs.litres} L` }] : []),
                ...(slabReoResult ? [
                  { label: `${slabReoResult.outputs.meshSheets} mesh` },
                  { label: `${slabReoResult.outputs.barChairs} chairs` },
                ] : []),
              ]}
            />

            <ShoppingList rows={slabShopRows} />

            <ApprenticeWorking
              steps={slabWorkingSteps}
              finalAnswer={slabReoResult
                ? `${slabResult.outputs.orderVolume} m³, ${slabReoResult.outputs.meshSheets} mesh sheets, ${slabReoResult.outputs.barChairs} chairs, ${slabReoResult.outputs.tieWireRolls} tie wire, ${slabReoResult.outputs.tapeRolls} tape`
                : `${slabResult.outputs.orderVolume} m³`}
              finalLabel="Concrete & reinforcement to order"
              visible={settings.apprenticeMode}
              id="concrete-slab"
              glossary={[
                { term: 'Cubic metre (m³)', definition: 'The standard unit for ordering concrete. Volume = length × width × depth (all in metres).' },
                { term: 'Wastage', definition: 'Extra concrete ordered beyond the calculated volume to account for spillage, uneven sub-base, and form flex. Typically 10%.' },
                { term: 'Slab', definition: 'A flat, horizontal concrete pour — the floor or base. Thickness is determined by load and ground conditions.' },
                { term: 'MPa (megapascal)', definition: 'The strength rating of concrete mix. 20 MPa is standard residential, 25–32 MPa for structural or exposed slabs.' },
                { term: 'Ready-mix', definition: 'Concrete delivered pre-mixed by truck. More consistent than site-batched; required when volume exceeds about 0.2 m³.' },
                { term: 'Reinforcing mesh', definition: 'Welded steel mesh laid in the slab to control cracking and add tensile strength. Sheets overlap (lap) at joins so the reinforcement stays structurally continuous.' },
                { term: 'Bar chair', definition: 'A small plastic or wire support that holds the mesh up off the ground/plastic at the correct height, so it ends up in the middle (or correct position) of the finished slab instead of sitting on the bottom.' },
                { term: 'DPM (damp-proof membrane)', definition: 'Plastic sheeting laid under the slab before the pour to stop ground moisture rising up through the concrete.' },
                { term: 'Tie wire', definition: 'Wire used to tie mesh sheets together at the lap seams and to tie the mesh to the bar chairs, so it stays in place during the pour.' },
                { term: 'Join tape', definition: 'Tape used to seal the joins between strips of DPM plastic, keeping the membrane continuous and waterproof.' },
              ]}
            />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.concrete[settings.region]}
            </p>

            <AddToQuoteCTA
              scopeSummary={`Concrete slab, ${slabFields.length}m × ${slabFields.width}m × ${slabFields.thickness}mm`}
              materials={slabQuoteMaterials}
              jobName={jobName}
            />
            <div style={{
              background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Save</p>
              <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastSlabId, { jobName: name })} />
              <AddToJobPrompt calculationId={lastSlabId} />
              <ShareCalcButton
                calculationId={lastSlabId}
                shareTitle={jobName || 'Concrete slab order'}
                shareBody={buildShoppingListShareBody({
                  jobName,
                  scopeSummary: `Concrete slab, ${slabFields.length}m × ${slabFields.width}m × ${slabFields.thickness}mm`,
                  rows: slabShopRows,
                })}
              />
            </div>
          </div>
        )}

        {/* Post hole results */}
        {tab === 'postholes' && postResult && (
          <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ResultHero
              label={postResult.outputs.useBagMix ? 'Grab this many bags' : 'Order this much ready-mix'}
              value={postResult.outputs.useBagMix ? postResult.outputs.bagCount : postResult.outputs.orderVolume}
              unit={postResult.outputs.useBagMix ? '× 20kg' : 'm³'}
              spec={`${postFields.numHoles} holes · ${postResult.outputs.volumePerHole} m³ each · incl. ${Math.round(wastage * 100)}% wastage`}
              stats={[
                { label: `${postResult.outputs.totalVolume} m³ net` },
                { label: `${postResult.outputs.orderVolume} m³ order` },
                { label: postResult.outputs.useBagMix ? 'Bag mix' : 'Ready-mix' },
              ]}
            />

            <ShoppingList rows={postShopRows} />

            <ApprenticeWorking
              steps={postWorkingSteps}
              finalAnswer={postResult.outputs.useBagMix ? `${postResult.outputs.bagCount} bags` : `${postResult.outputs.orderVolume} m³`}
              finalLabel={postResult.outputs.useBagMix ? '20kg bags needed' : 'Ready-mix to order'}
              visible={settings.apprenticeMode}
              id="concrete-postholes"
              glossary={[
                { term: 'Post hole', definition: 'The excavated hole that a structural post sits in. Diameter and depth depend on post size and soil conditions.' },
                { term: 'Bag mix', definition: 'Pre-measured concrete in 20kg bags, mixed on site with water. Practical for small volumes like post holes.' },
                { term: 'Cubic metre (m³)', definition: 'The standard unit for ordering concrete. For a post hole: π × radius² × depth.' },
                { term: 'Wastage', definition: 'Extra concrete beyond the calculated volume for spillage and overdig. Allow 10% minimum.' },
              ]}
            />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.concrete[settings.region]}
            </p>

            <div style={{
              background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Save</p>
              <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastPostId, { jobName: name })} />
              <AddToJobPrompt calculationId={lastPostId} />
              <ShareCalcButton
                calculationId={lastPostId}
                shareTitle={jobName || 'Post hole concrete'}
                shareBody={buildShoppingListShareBody({
                  jobName,
                  scopeSummary: `${postFields.numHoles} post holes`,
                  rows: postShopRows,
                })}
              />
            </div>
          </div>
        )}

        {/* Mix results */}
        {tab === 'mix' && mixResult && (
          <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ResultHero
              label="You'll need"
              value={mixResult.outputs.cementBags}
              unit="cement bags"
              spec={`${mixResult.outputs.wetVolume} m³ concrete · ${mixPreset === 'custom'
                ? `${resolvedMixRatio.cement}:${resolvedMixRatio.sand}:${resolvedMixRatio.aggregate}`
                : mixPreset} mix`}
              stats={[
                { label: `${mixResult.outputs.cementKg} kg cement` },
                { label: `${mixResult.outputs.sandM3} m³ sand` },
                { label: `${mixResult.outputs.aggregateM3} m³ aggregate` },
                { label: `${mixResult.outputs.waterLitres} L water` },
              ]}
            />

            <ShoppingList rows={mixShopRows} />

            <div style={{
              background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                Rule-of-thumb batching, not a certified mix design — for structural
                work needing a specific MPa rating, use certified ready-mix.
              </p>
            </div>

            <ApprenticeWorking
              steps={mixResult.steps}
              finalAnswer={`${mixResult.outputs.cementBags} cement, ${mixResult.outputs.sandM3} m³ sand, ${mixResult.outputs.aggregateM3} m³ aggregate`}
              finalLabel="Raw materials to order"
              visible={settings.apprenticeMode}
              id="concrete-mix"
              glossary={[
                { term: 'Mix ratio', definition: 'Parts by volume of cement : sand : aggregate. A 1:2:4 mix means 1 part cement to 2 parts sand to 4 parts aggregate.' },
                { term: 'Dry volume', definition: 'The loose volume of cement, sand and aggregate needed before mixing — larger than the wet (finished) concrete volume because dry materials have air gaps that close up once mixed and wetted.' },
                { term: 'Water-cement ratio', definition: 'The weight of water used per weight of cement. Too much water weakens the cured concrete; too little makes it unworkable.' },
                { term: 'MPa (megapascal)', definition: 'The strength rating of concrete. 20 MPa is standard residential, 25–32 MPa for structural or exposed work.' },
              ]}
            />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.concrete[settings.region]}
            </p>

            <AddToQuoteCTA
              scopeSummary={`Concrete mix, ${mixResult.outputs.wetVolume} m³`}
              materials={mixQuoteMaterials}
              jobName={jobName}
            />
            <div style={{
              background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Save</p>
              <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastMixId, { jobName: name })} />
              <AddToJobPrompt calculationId={lastMixId} />
              <ShareCalcButton
                calculationId={lastMixId}
                shareTitle={jobName || 'Concrete mix order'}
                shareBody={buildShoppingListShareBody({
                  jobName,
                  scopeSummary: `${mixResult.outputs.wetVolume} m³ concrete mix`,
                  rows: mixShopRows,
                })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
