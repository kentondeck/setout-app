import { useState, useContext, useEffect } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { JobNameInput } from '../components/JobNameInput';
import { calculateBaluster } from '../calculators/baluster';
import type { BalusterOutputs } from '../calculators/baluster';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { VoiceInputButton } from '../components/VoiceInputButton';
import { COMPLIANCE_NOTES, BALUSTER_MAX_GAP } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { BalusterDiagram } from '../components/BalusterDiagram';

interface Inputs {
  totalLength: string;
  balusterWidth: string;
  maxGap: string;
}

export function BalusterCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(() => ({
    totalLength: '',
    balusterWidth: '',
    maxGap: '',
  }));
  const [result, setResult] = useState<{ outputs: BalusterOutputs; steps: WorkingStep[] } | null>(null);
  const [jobName, setJobName] = useState('');
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');
  const [diagramProps, setDiagramProps] = useState<{
    totalLength: number;
    balusterWidth: number;
    balusterCount: number;
    gap: number;
  } | null>(null);

  useEffect(() => {
    if (!result) { setDiagramProps(null); return; }
    const tl = parseFloat(inputs.totalLength);
    const bw = parseFloat(inputs.balusterWidth);
    const timer = setTimeout(() => {
      setDiagramProps({ totalLength: tl, balusterWidth: bw, balusterCount: result.outputs.balusters, gap: result.outputs.actualGap });
    }, 300);
    return () => clearTimeout(timer);
  }, [result, inputs.totalLength, inputs.balusterWidth]);

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  function handleCalculate() {
    const totalLength = parseFloat(inputs.totalLength);
    const balusterWidth = parseFloat(inputs.balusterWidth);
    const maxGap = parseFloat(inputs.maxGap);

    if (!totalLength || totalLength <= 0) {
      setError('Enter a total span length to calculate.');
      return;
    }
    if (!balusterWidth || balusterWidth <= 0) {
      setError('Enter a valid baluster width.');
      return;
    }
    if (!maxGap || maxGap <= 0) {
      setError('Enter a valid maximum gap.');
      return;
    }

    setError('');

    const calc = calculateBaluster({ totalLength, balusterWidth, maxGap });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'baluster',
      timestamp: Date.now(),
      jobName: jobName || undefined,
      inputs: { totalLength, balusterWidth, maxGap },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  const balLen = result ? parseFloat(inputs.totalLength) : 0;
  const balWidth = result ? parseFloat(inputs.balusterWidth) : 0;
  const balMax = result ? parseFloat(inputs.maxGap) : 0;
  const balCount = result ? result.outputs.balusters : 0;
  const balGap = result ? result.outputs.actualGap : 0;

  const balusterSteps: WorkingStep[] = result ? [
    { label: 'Length between posts', explanation: 'The distance from inside of one post to the inside of the next', result: `${balLen} mm` },
    { label: 'Max gap allowed', explanation: 'Australian Standard says no gap can be bigger than 125mm', result: `${balMax} mm` },
    { label: 'Minimum balusters needed', explanation: 'Work out the smallest number of balusters that keeps the gap under the limit', calculation: `Trial: ${balCount} balusters with ${balGap.toFixed(1)} mm gaps`, result: `${balCount} balusters` },
    { label: 'Actual gap', explanation: 'Subtract the balusters from the total length and divide by the number of gaps', calculation: `(${balLen} - (${balCount} × ${balWidth})) ÷ ${balCount + 1}`, result: `${balGap.toFixed(0)} mm between each` },
  ] : [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Balusters"
        right={
          <VoiceInputButton
            prompt="Say: span length, baluster width, max gap"
            onValues={values => setInputs(prev => ({
              ...prev,
              ...(values[0] !== undefined && { totalLength: String(values[0]) }),
              ...(values[1] !== undefined && { balusterWidth: String(values[1]) }),
              ...(values[2] !== undefined && { maxGap: String(values[2]) }),
            }))}
          />
        }
      />

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
          <NumberInput label="Span length" value={inputs.totalLength} onChange={set('totalLength')} units={['mm', 'm']} placeholder="e.g. 3600" hint="post to post" />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Baluster width" value={inputs.balusterWidth} onChange={set('balusterWidth')} units={['mm', 'm']} placeholder="42" hint="timber size" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Max gap" value={inputs.maxGap} onChange={set('maxGap')} units={['mm', 'm']} placeholder={String(BALUSTER_MAX_GAP[settings.region])} hint={settings.region === 'NZ' ? 'NZS 3604' : 'AS 1657'} />
            </div>
          </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ResultCard label="Balusters" value={result.outputs.balusters} accent />
              <ResultCard label="Actual gap" value={result.outputs.actualGap} unit="mm" />
            </div>

            {diagramProps && (
              <BalusterDiagram
                totalLength={diagramProps.totalLength}
                balusterWidth={diagramProps.balusterWidth}
                gap={diagramProps.gap}
                balusterCount={diagramProps.balusterCount}
              />
            )}

            <ApprenticeWorking
              steps={balusterSteps}
              finalAnswer={`${result.outputs.balusters} balusters`}
              finalLabel="Balusters needed"
              visible={settings.apprenticeMode}
              id="balusters"
            />

            <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.balusters[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
