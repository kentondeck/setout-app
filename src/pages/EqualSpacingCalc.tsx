import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { ShareCalcButton } from '../components/ShareCalcButton';
import { ResultHero } from '../components/CalcResult';
import { calculateEqualSpacing } from '../calculators/equalspacing';
import { JobNameInput } from '../components/JobNameInput';
import type { EqualSpacingOutputs } from '../calculators/equalspacing';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { useScrollToResult } from '../lib/useScrollToResult';
import { uuid } from '../lib/uuid';

interface Inputs {
  totalSpan: string;
  itemWidth: string;
  itemCount: string;
  preferredSpacing: string;
}

const DEFAULTS: Inputs = {
  totalSpan: '',
  itemWidth: '',
  itemCount: '',
  preferredSpacing: '',
};

export function EqualSpacingCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [result, setResult] = useState<{ outputs: EqualSpacingOutputs; steps: WorkingStep[]; countDerived: boolean } | null>(null);
  const resultRef = useScrollToResult(result);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');
  const [jobName, setJobName] = useState('');

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  function handleCalculate() {
    const totalSpan = parseFloat(inputs.totalSpan);
    const itemWidth = inputs.itemWidth ? parseFloat(inputs.itemWidth) : 0;
    const itemCount = inputs.itemCount ? parseFloat(inputs.itemCount) : undefined;
    const preferredSpacing = inputs.preferredSpacing ? parseFloat(inputs.preferredSpacing) : undefined;

    if (!totalSpan || totalSpan <= 0) {
      setError('Enter a total span to calculate.');
      return;
    }
    if (!itemCount && !preferredSpacing) {
      setError('Enter an item count or a preferred spacing.');
      return;
    }
    if (itemCount && (!Number.isInteger(itemCount) || itemCount < 1)) {
      setError('Item count must be a whole number of 1 or more.');
      return;
    }

    setError('');

    const calc = calculateEqualSpacing({ totalSpan, itemWidth, itemCount, preferredSpacing });
    setResult(calc);

    const id = uuid();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'equalspacing',
      timestamp: Date.now(),
      inputs: { totalSpan, ...(itemWidth ? { itemWidth } : {}), ...(itemCount ? { itemCount } : {}), ...(preferredSpacing ? { preferredSpacing } : {}) },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  const hasItemWidth = result && parseFloat(inputs.itemWidth) > 0;

  const apprenticeSteps: WorkingStep[] = result ? [
    { label: 'Total span', explanation: 'The full length to divide up', result: `${inputs.totalSpan} mm` },
    ...(result.countDerived && inputs.preferredSpacing ? [{
      label: 'Items needed',
      explanation: 'Work out how many items fit at approximately your preferred spacing',
      calculation: inputs.itemWidth
        ? `(${inputs.totalSpan} − ${inputs.preferredSpacing}) ÷ (${inputs.preferredSpacing} + ${inputs.itemWidth})`
        : `${inputs.totalSpan} ÷ ${inputs.preferredSpacing} − 1`,
      result: `Round to ${result.outputs.itemCount} items`,
    }] : []),
    {
      label: hasItemWidth ? 'Actual gap between items' : 'Actual spacing',
      explanation: hasItemWidth
        ? 'Subtract all the item widths from the span, then divide equally across all gaps'
        : 'Divide the span equally — one gap either side of each item',
      calculation: hasItemWidth
        ? `(${inputs.totalSpan} − ${result.outputs.itemCount} × ${inputs.itemWidth}) ÷ ${result.outputs.gapCount}`
        : `${inputs.totalSpan} ÷ ${result.outputs.gapCount}`,
      result: `${result.outputs.actualGap} mm`,
    },
    ...(hasItemWidth ? [{
      label: 'Centre-to-centre spacing',
      explanation: 'Gap plus the item width gives you the centre spacing for marking out',
      calculation: `${result.outputs.actualGap} + ${inputs.itemWidth}`,
      result: `${result.outputs.centreSpacing} mm centres`,
    }] : []),
  ] : [];

  const firstMark = result
    ? hasItemWidth
      ? Math.round(result.outputs.actualGap + parseFloat(inputs.itemWidth) / 2)
      : result.outputs.actualGap
    : 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Equal Spacing" />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

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
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Total span" value={inputs.totalSpan} onChange={set('totalSpan')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 3600', m: 'e.g. 3.6' }} hint="full length to divide" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Item width" value={inputs.itemWidth} onChange={set('itemWidth')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 70', m: 'e.g. 0.07' }} hint="optional · 0 for point marks" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Item count" value={inputs.itemCount} onChange={set('itemCount')} units={[]} placeholders={{ '': 'e.g. 5' }} hint="optional · whole number" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Preferred spacing" value={inputs.preferredSpacing} onChange={set('preferredSpacing')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 400', m: 'e.g. 0.4' }} hint="optional · gap or c/c" />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
            Enter item count <em>or</em> preferred spacing — or both (count takes priority)
          </p>
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
          <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ResultHero
              label="Equal spacing"
              value={result.outputs.itemCount}
              unit="items"
              spec={`${inputs.totalSpan} span · ${result.outputs.actualGap}mm ${hasItemWidth ? 'clear gap' : 'spacing'}`}
              stats={[
                ...(hasItemWidth ? [{ label: `${result.outputs.centreSpacing}mm centres` }] : []),
                { label: `First mark ${firstMark}mm` },
                { label: `${result.outputs.gapCount} gaps` },
              ]}
            />

            {result.countDerived && (
              <div style={{
                background: 'var(--color-card)',
                border: '0.5px solid var(--color-border)',
                borderRadius: 10,
                padding: '12px 14px',
              }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)' }}>
                  Item count derived from preferred spacing — <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{result.outputs.itemCount} items</span> gives the closest fit
                </p>
              </div>
            )}

            <ApprenticeWorking
              steps={apprenticeSteps}
              finalAnswer={`${result.outputs.itemCount} items at ${result.outputs.actualGap}mm ${hasItemWidth ? 'clear gap' : 'spacing'}`}
              finalLabel="Equal spacing"
              visible={settings.apprenticeMode}
              id="equalspacing"
              glossary={[
                { term: 'Gap', definition: 'The clear distance between two items — edge to edge. Different from centre-to-centre spacing when items have physical width.' },
                { term: 'Centre spacing', definition: 'The distance from the centre of one item to the centre of the next. Equals gap + item width. Used for marking out positions on site.' },
                { term: 'First mark', definition: 'Where to make your first mark from the end of the span. For items with width, this is the centre of the first item.' },
              ]}
            />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.equalspacing[settings.region]}
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
