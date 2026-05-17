import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { calculateCutlist, DEFAULT_STOCK_LENGTHS } from '../calculators/cutlist';
import type { CutlistOutputs, CutlistPlan, MaterialItem } from '../calculators/cutlist';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { SettingsContext, HistoryContext } from '../contexts';

interface CutRow {
  id: string;
  length: string;
  qty: string;
}

interface Result {
  outputs: CutlistOutputs;
  plan: CutlistPlan[];
  materialList: MaterialItem[];
  steps: WorkingStep[];
}

function newRow(): CutRow {
  return { id: crypto.randomUUID(), length: '', qty: '1' };
}

const MAX_STANDARD = DEFAULT_STOCK_LENGTHS[DEFAULT_STOCK_LENGTHS.length - 1];

function fmtLength(mm: number): string {
  const m = mm / 1000;
  return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}m`;
}

export function CutlistCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry } = useContext(HistoryContext);

  const [forcedStock, setForcedStock] = useState('');
  const [pricePerMetre, setPricePerMetre] = useState('');
  const [rows, setRows] = useState<CutRow[]>([newRow(), newRow()]);
  const [result, setResult] = useState<Result | null>(null);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');
  const [planCollapsed, setPlanCollapsed] = useState(true);

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
    const cuts = rows
      .map(r => ({ length: parseFloat(r.length), qty: parseInt(r.qty) }))
      .filter(c => c.length > 0 && c.qty > 0);

    if (cuts.length === 0) {
      setError('Add at least one cut.');
      return;
    }

    const forcedLength = forcedStock ? parseFloat(forcedStock) : undefined;
    const maxAllowed = forcedLength ?? MAX_STANDARD;
    const tooLong = cuts.find(c => c.length >= maxAllowed - 3); // account for kerf
    if (tooLong) {
      setError(
        forcedLength
          ? `Cut ${tooLong.length}mm is longer than your stock length ${forcedLength}mm.`
          : `Cut ${tooLong.length}mm exceeds the maximum standard length ${MAX_STANDARD}mm.`
      );
      return;
    }

    setError('');

    const price = parseFloat(pricePerMetre) || 0;
    const calc = calculateCutlist({ cuts, forcedStockLength: forcedLength, pricePerMetre: price });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'cutlist',
      timestamp: Date.now(),
      inputs: { forcedStockLength: forcedLength ?? 0, pricePerMetre: price, cutCount: cuts.length },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  const cutlistSteps: WorkingStep[] = result ? [
    {
      label: 'Total cuts needed',
      explanation: 'All pieces expanded and sorted longest first',
      result: `${result.outputs.totalCutLength}mm total cut length`,
    },
    {
      label: 'Optimised stock mix',
      explanation: forcedStock
        ? `Fixed to ${fmtLength(parseFloat(forcedStock))} — packed using best-fit decreasing`
        : 'Each new piece of stock is chosen so that the total timber ordered (this bin + estimated remaining) is minimised',
      result: result.materialList.map(m => `${m.count} × ${fmtLength(m.stockLength)}`).join(', '),
    },
    {
      label: 'Offcut waste',
      explanation: 'Leftover after all cuts are made',
      result: `${result.outputs.totalWaste}mm — ${result.outputs.wastePercent}% waste`,
    },
  ] : [];

  const finalAnswer = result
    ? result.materialList.map(m => `${m.count} × ${fmtLength(m.stockLength)}`).join(', ')
    : '';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Cut list" />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Settings card */}
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
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput
                label="Stock length"
                value={forcedStock}
                onChange={setForcedStock}
                units={['mm', 'm']}
                placeholder="auto"
                hint="leave blank to optimise waste"
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Price / metre" value={pricePerMetre} onChange={setPricePerMetre} unit="$/m" placeholder="e.g. 8.50" hint="optional · for cost estimate" />
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
                  units={['mm', 'm']}
                  placeholder="e.g. 2400"
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
            {/* ORDER card — vertical list */}
            <div
              style={{
                background: 'var(--color-card)',
                border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>ORDER</p>
              {result.materialList.map(m => (
                <div
                  key={m.stockLength}
                  style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}
                >
                  <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.5px', lineHeight: 1 }}>
                    {m.count}
                  </span>
                  <span style={{ fontSize: 16, color: 'var(--color-muted)', fontWeight: 400 }}>×</span>
                  <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>
                    {fmtLength(m.stockLength)}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ResultCard label="Pieces" value={result.outputs.totalPieces} accent />
              <ResultCard label="Waste" value={result.outputs.wastePercent} unit="%" />
            </div>
            {result.outputs.totalCost > 0 && (
              <ResultCard label="Total cost" value={`$${result.outputs.totalCost}`} />
            )}

            {/* Cutting plan — collapsible */}
            <div
              style={{
                background: 'var(--color-card)',
                border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                padding: '16px',
              }}
            >
              <button
                onClick={() => setPlanCollapsed(c => !c)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>CUTTING PLAN</span>
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{planCollapsed ? '▸' : '▾'}</span>
              </button>

              {!planCollapsed && (
                <div style={{ marginTop: 12 }}>
                  {result.plan.map(stock => (
                    <div
                      key={stock.stockIndex}
                      style={{
                        marginBottom: 10,
                        paddingBottom: 10,
                        borderBottom: stock.stockIndex < result.plan.length ? '0.5px solid var(--color-border)' : 'none',
                      }}
                    >
                      <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600 }}>
                        {fmtLength(stock.stockLength)}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
                        {stock.cuts.map(c => `${c.length}mm`).join(' · ')}
                        {' '}· <span style={{ color: '#e53e3e' }}>{stock.waste}mm waste</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ApprenticeWorking
              steps={cutlistSteps}
              finalAnswer={finalAnswer}
              finalLabel="Order"
              visible={settings.apprenticeMode}
              id="cutlist"
            />

            <AddToJobPrompt calculationId={lastEntryId} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Optimised across standard NZ/AU stock lengths (2.4–6.0m) using best-fit decreasing with lookahead scoring, 3mm saw kerf per cut. Order 5–10% extra for splits and defects.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
