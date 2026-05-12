import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { JobNameInput } from '../components/JobNameInput';
import { calculateDecking } from '../calculators/decking';
import type { DeckingOutputs } from '../calculators/decking';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { VoiceInputButton } from '../components/VoiceInputButton';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../App';

interface Inputs {
  deckLength: string;
  deckWidth: string;
  boardWidth: string;
  boardGap: string;
  joistSpacing: string;
  bearerSpacing: string;
}

const DEFAULTS: Inputs = {
  deckLength: '',
  deckWidth: '',
  boardWidth: '90',
  boardGap: '5',
  joistSpacing: '450',
  bearerSpacing: '1800',
};

export function DeckingCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [result, setResult] = useState<{ outputs: DeckingOutputs; steps: WorkingStep[] } | null>(null);
  const [jobName, setJobName] = useState('');
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  function handleCalculate() {
    const length = parseFloat(inputs.deckLength);
    const width = parseFloat(inputs.deckWidth);
    const boardWidth = parseFloat(inputs.boardWidth);
    const boardGap = parseFloat(inputs.boardGap);
    const joistSpacing = parseFloat(inputs.joistSpacing);
    const bearerSpacing = parseFloat(inputs.bearerSpacing);

    if (!length || !width || length <= 0 || width <= 0) {
      setError('Enter a deck length and width to calculate.');
      return;
    }
    if (!boardWidth || boardWidth <= 0) {
      setError('Enter a valid board width.');
      return;
    }

    setError('');

    const calc = calculateDecking({ deckLength: length, deckWidth: width, boardWidth, boardGap, joistSpacing, bearerSpacing });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'decking',
      timestamp: Date.now(),
      jobName: jobName || undefined,
      inputs: { deckLength: length, deckWidth: width, boardWidth, boardGap, joistSpacing, bearerSpacing },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Decking"
        right={
          <VoiceInputButton
            prompt="Say: length, width, board width"
            onValues={values => setInputs(prev => ({
              ...prev,
              ...(values[0] !== undefined && { deckLength: String(values[0]) }),
              ...(values[1] !== undefined && { deckWidth: String(values[1]) }),
              ...(values[2] !== undefined && { boardWidth: String(values[2]) }),
            }))}
          />
        }
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
              <NumberInput label="Deck length" value={inputs.deckLength} onChange={set('deckLength')} unit="m" placeholder="e.g. 4.2" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Deck width" value={inputs.deckWidth} onChange={set('deckWidth')} unit="m" placeholder="e.g. 3.0" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Board width" value={inputs.boardWidth} onChange={set('boardWidth')} unit="mm" placeholder="90" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Board gap" value={inputs.boardGap} onChange={set('boardGap')} unit="mm" placeholder="5" hint="default 5mm" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Joist spacing" value={inputs.joistSpacing} onChange={set('joistSpacing')} unit="mm" placeholder="450" hint="AS 1684" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Bearer spacing" value={inputs.bearerSpacing} onChange={set('bearerSpacing')} unit="mm" placeholder="1800" />
            </div>
          </div>
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 13, color: '#e53e3e' }}>{error}</p>
        )}

        {/* Calculate button */}
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

        {/* Results */}
        {result && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Boards" value={result.outputs.boardCount} accent />
                <ResultCard label="Lineal metres" value={result.outputs.totalLinealMetres} unit="lm" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <ResultCard label="Joists" value={result.outputs.joistCount} />
                <ResultCard label="Bearers" value={result.outputs.bearerCount} />
                <ResultCard label="Fixings" value={result.outputs.fixingsCount} />
              </div>
            </div>

            {/* Apprentice mode */}
            {settings.apprenticeMode && (
              <ApprenticeWorking
                steps={result.steps}
                why="Getting your material quantities right before you order saves money and site trips. Overordering boards is the most common waste on a deck job — a 10% buffer on lineal metres is plenty once you've got an accurate board count."
              />
            )}

            {/* Job name + compliance note */}
            <JobNameInput
              value={jobName}
              onChange={setJobName}
              onSave={name => updateEntry(lastEntryId, { jobName: name })}
            />

            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: 'var(--color-muted)',
                lineHeight: 1.5,
              }}
            >
              {COMPLIANCE_NOTES.decking[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
