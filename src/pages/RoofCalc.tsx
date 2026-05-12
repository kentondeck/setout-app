import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { JobNameInput } from '../components/JobNameInput';
import { calculateRoof } from '../calculators/roof';
import type { RoofOutputs } from '../calculators/roof';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { VoiceInputButton } from '../components/VoiceInputButton';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../App';

interface Inputs {
  buildingWidth: string;
  pitchDegrees: string;
  overhang: string;
}

const DEFAULTS: Inputs = {
  buildingWidth: '',
  pitchDegrees: '22.5',
  overhang: '0.6',
};

export function RoofCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [result, setResult] = useState<{ outputs: RoofOutputs; steps: WorkingStep[] } | null>(null);
  const [jobName, setJobName] = useState('');
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  function handleCalculate() {
    const buildingWidth = parseFloat(inputs.buildingWidth);
    const pitchDegrees = parseFloat(inputs.pitchDegrees);
    const overhang = parseFloat(inputs.overhang);

    if (!buildingWidth || buildingWidth <= 0) {
      setError('Enter a building width to calculate.');
      return;
    }
    if (!pitchDegrees || pitchDegrees <= 0 || pitchDegrees >= 90) {
      setError('Enter a pitch between 1° and 89°.');
      return;
    }

    setError('');

    const calc = calculateRoof({ buildingWidth, pitchDegrees, overhang: isNaN(overhang) ? 0 : overhang });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'roof',
      timestamp: Date.now(),
      jobName: jobName || undefined,
      inputs: { buildingWidth, pitchDegrees, overhang: isNaN(overhang) ? 0 : overhang },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Roof pitch"
        right={
          <VoiceInputButton
            prompt="Say: building width, pitch in degrees, overhang"
            onValues={values => setInputs(prev => ({
              ...prev,
              ...(values[0] !== undefined && { buildingWidth: String(values[0]) }),
              ...(values[1] !== undefined && { pitchDegrees: String(values[1]) }),
              ...(values[2] !== undefined && { overhang: String(values[2]) }),
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
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Building width" value={inputs.buildingWidth} onChange={set('buildingWidth')} unit="m" placeholder="e.g. 8.0" hint="full span" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Pitch" value={inputs.pitchDegrees} onChange={set('pitchDegrees')} unit="°" placeholder="22.5" hint="degrees" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Eaves overhang" value={inputs.overhang} onChange={set('overhang')} unit="m" placeholder="0.6" hint="each side" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }} />
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Rafter length" value={result.outputs.totalRafterLength} unit="m" accent />
                <ResultCard label="Ridge height" value={result.outputs.ridgeHeight} unit="m" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <ResultCard label="Run" value={result.outputs.run} unit="m" />
                <ResultCard label="Plumb cut" value={result.outputs.plumbCutAngle} unit="°" />
                <ResultCard label="Seat cut" value={result.outputs.seatCutAngle} unit="°" />
              </div>
            </div>

            {settings.apprenticeMode && (
              <ApprenticeWorking
                steps={result.steps}
                why="All rafter work flows from two numbers: the run (half your building width) and the pitch. Once you have the rafter length and the two cut angles, you can mark and cut every rafter on the job identically. The plumb cut goes at the ridge; the seat cut (bird's mouth) sits on the wall plate."
              />
            )}

            <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.roof[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
