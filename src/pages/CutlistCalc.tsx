import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { JobNameInput } from '../components/JobNameInput';
import { calculateCutlist } from '../calculators/cutlist';
import type { CutlistOutputs, CutlistPlan } from '../calculators/cutlist';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { VoiceInputButton } from '../components/VoiceInputButton';
import { SettingsContext, HistoryContext } from '../App';

interface CutRow {
  id: string;
  length: string;
  qty: string;
}

interface Result {
  outputs: CutlistOutputs;
  plan: CutlistPlan[];
  steps: WorkingStep[];
}

function newRow(): CutRow {
  return { id: crypto.randomUUID(), length: '', qty: '1' };
}

export function CutlistCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [stockLength, setStockLength] = useState('5400');
  const [pricePerMetre, setPricePerMetre] = useState('');
  const [rows, setRows] = useState<CutRow[]>([newRow(), newRow()]);
  const [result, setResult] = useState<Result | null>(null);
  const [jobName, setJobName] = useState('');
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');

  function updateRow(id: string, field: 'length' | 'qty', value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function addRow() {
    setRows(prev => [...prev, newRow()]);
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id));
  }

  function handleCalculate() {
    const stock = parseFloat(stockLength);
    if (!stock || stock <= 0) {
      setError('Enter a stock length.');
      return;
    }

    const cuts = rows
      .map(r => ({ length: parseFloat(r.length), qty: parseInt(r.qty) }))
      .filter(c => c.length > 0 && c.qty > 0);

    if (cuts.length === 0) {
      setError('Add at least one cut with a length and quantity.');
      return;
    }

    const tooLong = cuts.find(c => c.length > stock);
    if (tooLong) {
      setError(`Cut ${tooLong.length}mm is longer than stock length ${stock}mm.`);
      return;
    }

    setError('');

    const price = parseFloat(pricePerMetre) || 0;
    const calc = calculateCutlist({ stockLength: stock, cuts, pricePerMetre: price });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'cutlist',
      timestamp: Date.now(),
      jobName: jobName || undefined,
      inputs: { stockLength: stock, pricePerMetre: price, cutCount: cuts.length },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Cut list"
        right={
          <VoiceInputButton
            prompt="Say: timber length, then cuts (length, quantity)"
            onValues={values => {
              if (values.length === 0) return;
              // First number → stock length; remaining pairs → cut rows
              setStockLength(String(values[0]));
              if (values.length > 1) {
                const newRows: typeof rows = [];
                for (let i = 1; i < values.length; i += 2) {
                  newRows.push({
                    id: crypto.randomUUID(),
                    length: String(values[i]),
                    qty: values[i + 1] !== undefined ? String(Math.round(values[i + 1])) : '1',
                  });
                }
                if (newRows.length > 0) setRows(newRows);
              }
            }}
          />
        }
      />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Stock settings */}
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
              <NumberInput label="Stock length" value={stockLength} onChange={setStockLength} unit="mm" placeholder="5400" hint="e.g. 5400, 4200" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Price / metre" value={pricePerMetre} onChange={setPricePerMetre} unit="$/m" placeholder="optional" />
            </div>
          </div>
        </div>

        {/* Cut rows */}
        <div
          style={{
            background: 'var(--color-card)',
            border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>CUTS</p>

          {rows.map((row, i) => (
            <div key={row.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 2, minWidth: 0 }}>
                <NumberInput
                  label={i === 0 ? 'Length' : ''}
                  value={row.length}
                  onChange={v => updateRow(row.id, 'length', v)}
                  unit="mm"
                  placeholder="e.g. 1200"
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <NumberInput
                  label={i === 0 ? 'Qty' : ''}
                  value={row.qty}
                  onChange={v => updateRow(row.id, 'qty', v)}
                  unit=""
                  placeholder="1"
                />
              </div>
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(row.id)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: '0.5px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-muted)',
                    fontSize: 18,
                    cursor: 'pointer',
                    flexShrink: 0,
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 0,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}

          <button
            onClick={addRow}
            style={{
              border: '0.5px dashed var(--color-border)',
              background: 'transparent',
              borderRadius: 10,
              padding: '10px',
              fontSize: 13,
              color: 'var(--color-orange)',
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            + Add cut
          </button>
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
          Optimise
        </button>

        {result && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Lengths needed" value={result.outputs.stockCount} accent />
                <ResultCard label="Waste" value={result.outputs.wastePercent} unit="%" />
              </div>
              {result.outputs.totalCost > 0 && (
                <ResultCard label="Total cost" value={`$${result.outputs.totalCost}`} />
              )}
            </div>

            {/* Cutting plan */}
            <div
              style={{
                background: 'var(--color-card)',
                border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                padding: '16px',
              }}
            >
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>
                CUTTING PLAN
              </p>
              {result.plan.map(stock => (
                <div
                  key={stock.stockIndex}
                  style={{
                    marginBottom: 10,
                    paddingBottom: 10,
                    borderBottom: stock.stockIndex < result.plan.length ? '0.5px solid var(--color-border)' : 'none',
                  }}
                >
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 500 }}>
                    Length {stock.stockIndex}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
                    {stock.cuts.map(c => `${c.length}mm`).join(' · ')}
                    {' '}· <span style={{ color: '#e53e3e' }}>{stock.waste}mm waste</span>
                  </p>
                </div>
              ))}
            </div>

            {settings.apprenticeMode && (
              <ApprenticeWorking
                steps={result.steps}
                why="Cutting the longest pieces first (first-fit decreasing) is the standard way to minimise waste — short offcuts can fill gaps that long pieces can't. A 3mm kerf is deducted per cut because that's what the blade removes. Even a 5% waste improvement across a big framing job is meaningful money."
              />
            )}

            <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Optimised using first-fit decreasing bin packing with a 3mm saw kerf per cut. Order 5–10% extra for splits, defects, and measurement errors.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
