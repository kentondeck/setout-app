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
import { SettingsContext, HistoryContext } from '../contexts';

interface Inputs {
  buildingWidth: string;
  pitchDegrees: string;
  overhang: string;
  rafterDepth: string;
  plateWidth: string;
  ridgeThickness: string;
}

const DEFAULTS: Inputs = {
  buildingWidth: '',
  pitchDegrees: '22.5',
  overhang: '0.6',
  rafterDepth: '',
  plateWidth: '',
  ridgeThickness: '',
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
    const rafterDepth = parseFloat(inputs.rafterDepth) || undefined;
    const plateWidth = parseFloat(inputs.plateWidth) || undefined;
    const ridgeThickness = parseFloat(inputs.ridgeThickness) || undefined;

    if (!buildingWidth || buildingWidth <= 0) {
      setError('Enter a building width to calculate.');
      return;
    }
    if (!pitchDegrees || pitchDegrees <= 0 || pitchDegrees >= 90) {
      setError('Enter a pitch between 1° and 89°.');
      return;
    }

    setError('');

    const calc = calculateRoof({
      buildingWidth, pitchDegrees,
      overhang: isNaN(overhang) ? 0 : overhang,
      rafterDepth, plateWidth, ridgeThickness,
    });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'roof',
      timestamp: Date.now(),
      jobName: jobName || undefined,
      inputs: {
        buildingWidth, pitchDegrees,
        overhang: isNaN(overhang) ? 0 : overhang,
        ...(rafterDepth !== undefined && { rafterDepth }),
        ...(plateWidth !== undefined && { plateWidth }),
        ...(ridgeThickness !== undefined && { ridgeThickness }),
      },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  const roofPitch = result ? parseFloat(inputs.pitchDegrees) : 0;
  const roofRunMm = result ? Math.round(result.outputs.run * 1000) : 0;
  const roofRidgeMm = result ? Math.round(result.outputs.ridgeHeight * 1000) : 0;
  const roofRafterMm = result ? Math.round(result.outputs.totalRafterLength * 1000) : 0;

  const roofSteps: WorkingStep[] = result ? [
    { label: 'Run', explanation: 'The horizontal distance from the wall to the ridge', result: `${roofRunMm} mm` },
    { label: 'Pitch', explanation: 'The angle of the roof from horizontal', result: `${roofPitch}°` },
    { label: 'Ridge height', explanation: 'The run times the tangent of the pitch angle gives you the rise', calculation: `${roofRunMm} × tan(${roofPitch}°) = ${roofRidgeMm}`, result: `${roofRidgeMm} mm rise` },
    { label: 'Rafter length', explanation: 'The run divided by the cosine of the pitch gives the rafter length', calculation: `${roofRunMm} ÷ cos(${roofPitch}°) = ${roofRafterMm}`, result: `${roofRafterMm} mm rafter` },
  ] : [];

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
              <NumberInput label="Building width" value={inputs.buildingWidth} onChange={set('buildingWidth')} unit="m" placeholder="e.g. 9.0" hint="full span" />
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

        {/* Optional rafter cuts inputs */}
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
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>
            RAFTER CUTS <span style={{ fontWeight: 400 }}>— optional</span>
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Rafter depth" value={inputs.rafterDepth} onChange={set('rafterDepth')} unit="mm" placeholder="e.g. 140" hint="timber size" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Plate width" value={inputs.plateWidth} onChange={set('plateWidth')} unit="mm" placeholder="e.g. 90" hint="birdsmouth seat" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Ridge thickness" value={inputs.ridgeThickness} onChange={set('ridgeThickness')} unit="mm" placeholder="e.g. 50" hint="for shortening" />
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

            {/* Rafter cut details — only when optional inputs were provided */}
            {(result.outputs.birdsmouthPlumbDepth > 0 || result.outputs.ridgeShortening > 0) && (
              <div
                style={{
                  background: 'var(--color-card)',
                  border: '0.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>RAFTER CUTS</p>
                {result.outputs.birdsmouthPlumbDepth > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontWeight: 500 }}>Birdsmouth</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <ResultCard label="Seat width" value={parseFloat(inputs.plateWidth)} unit="mm" />
                      <ResultCard label="Plumb depth" value={result.outputs.birdsmouthPlumbDepth} unit="mm" />
                    </div>
                    {result.outputs.remainingDepth > 0 && (
                      <div
                        style={{
                          background: result.outputs.remainingDepth < result.outputs.birdsmouthPlumbDepth * 0.5
                            ? '#fff7ed'
                            : 'var(--color-bg)',
                          border: `0.5px solid ${result.outputs.remainingDepth < result.outputs.birdsmouthPlumbDepth * 0.5 ? '#fbbf24' : 'var(--color-border)'}`,
                          borderRadius: 8,
                          padding: '7px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Remaining depth</span>
                        <span style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: result.outputs.remainingDepth < result.outputs.birdsmouthPlumbDepth * 0.5 ? '#92400e' : 'var(--color-text)' }}>
                          {result.outputs.remainingDepth}mm
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {result.outputs.ridgeShortening > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontWeight: 500 }}>Ridge</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <ResultCard label="Line length" value={Math.round(result.outputs.rafterLength * 1000)} unit="mm" />
                      <ResultCard label="Shorten by" value={result.outputs.ridgeShortening} unit="mm" />
                    </div>
                    <div
                      style={{
                        background: 'var(--color-bg)',
                        border: '0.5px solid var(--color-border)',
                        borderRadius: 8,
                        padding: '7px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Net rafter (seat → ridge face)</span>
                      <span style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>
                        {result.outputs.netRafterLengthMm}mm
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <ApprenticeWorking
              steps={roofSteps}
              finalAnswer={`${roofRafterMm}mm`}
              finalLabel="Common rafter length"
              visible={settings.apprenticeMode}
              id="roof"
            />

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
