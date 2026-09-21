import { useContext, useMemo, useRef, useState } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext } from '../contexts';
import { useReceipts, RECEIPT_CATEGORIES, compressImageFile, type Receipt } from '../lib/useRecords';
import { exportReceipts } from '../lib/recordsExport';
import { currentTaxYear, previousTaxYear, type TaxYearRange } from '../lib/taxYear';
import { hapticMedium } from '../lib/haptics';

// Simple month key used to group the list ("Sep 2026") — the tradie sees a
// running feed newest-first, but section headers give a sense of "this month
// vs last month" at a glance.
function monthKey(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function formatMoney(n: number | undefined): string {
  if (n == null || !isFinite(n)) return '';
  return `$${n.toFixed(2)}`;
}

// "1 April 2026 – 31 March 2027" — subtract a day from `to` (exclusive end) to
// get the last day actually included in the tax year.
function formatTaxYearDates(range: TaxYearRange): string {
  const lastDay = new Date(range.to.getTime() - 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  return `${fmt(range.from)} – ${fmt(lastDay)}`;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '0.5px solid var(--color-border)', background: 'var(--color-bg)',
  fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)',
  outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none',
};

type TaxFilter = 'all' | 'current' | 'previous';

// Which timestamp to filter on — prefer the user-entered receipt date, fall
// back to when they added it. Millis so it plays with tax-year ranges cleanly.
function receiptDateTs(r: Receipt): number {
  if (r.date) {
    const t = new Date(r.date).getTime();
    if (!isNaN(t)) return t;
  }
  return r.timestamp;
}

function inRange(ts: number, range: TaxYearRange): boolean {
  return ts >= range.from.getTime() && ts < range.to.getTime();
}

export function ReceiptsPage() {
  const { settings } = useContext(SettingsContext);
  const { items, add, update, remove } = useReceipts();

  const current = useMemo(() => currentTaxYear(settings.region), [settings.region]);
  const previous = useMemo(() => previousTaxYear(settings.region), [settings.region]);
  const [taxFilter, setTaxFilter] = useState<TaxFilter>('all');

  const filteredItems = useMemo(() => {
    if (taxFilter === 'all') return items;
    const range = taxFilter === 'current' ? current : previous;
    return items.filter(h => inRange(receiptDateTs(h.record), range));
  }, [items, taxFilter, current, previous]);

  const currentCount = useMemo(
    () => items.filter(h => inRange(receiptDateTs(h.record), current)).length,
    [items, current],
  );
  const previousCount = useMemo(
    () => items.filter(h => inRange(receiptDateTs(h.record), previous)).length,
    [items, previous],
  );

  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Receipt>>({});
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSend() {
    setSending(true);
    try {
      const periodLabel =
        taxFilter === 'current' ? formatTaxYearDates(current) :
        taxFilter === 'previous' ? formatTaxYearDates(previous) :
        undefined;
      await exportReceipts(filteredItems, periodLabel);
    } catch (err) {
      setError((err as Error).message || 'Could not build the PDF.');
    } finally {
      setSending(false);
    }
  }

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof filteredItems>();
    for (const h of filteredItems) {
      const k = monthKey(h.record.timestamp);
      const arr = groups.get(k) ?? [];
      arr.push(h);
      groups.set(k, arr);
    }
    return [...groups.entries()];
  }, [filteredItems]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProcessing(true);
    setError('');
    try {
      setPendingPhoto(await compressImageFile(file));
      setForm({});
    } catch {
      setError('Could not process that image — try another photo.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleSave() {
    if (!pendingPhoto) return;
    await add(pendingPhoto, {
      supplier: form.supplier?.trim() || undefined,
      amount: form.amount,
      date: form.date || undefined,
      category: form.category || undefined,
      notes: form.notes?.trim() || undefined,
    });
    setPendingPhoto(null);
    setForm({});
    hapticMedium();
  }

  function beginEdit(r: Receipt) {
    setEditingId(r.id);
    setForm({
      supplier: r.supplier,
      amount: r.amount,
      date: r.date,
      category: r.category,
      notes: r.notes,
    });
  }

  function saveEdit() {
    if (!editingId) return;
    update(editingId, {
      supplier: form.supplier?.trim() || undefined,
      amount: form.amount,
      date: form.date || undefined,
      category: form.category || undefined,
      notes: form.notes?.trim() || undefined,
    });
    setEditingId(null);
    setForm({});
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Receipts" />

      <div style={{ padding: '4px 20px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: '0 4px 4px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
          Snap a receipt, add a few details. Everything stays on your phone — back up regularly.
        </p>

        {/* Tax-year filter chips */}
        {!pendingPhoto && items.length > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {([
              { key: 'all', label: 'All', count: items.length },
              { key: 'current', label: `This tax year · ${current.shortLabel}`, count: currentCount },
              { key: 'previous', label: `Last tax year · ${previous.shortLabel}`, count: previousCount },
            ] as { key: TaxFilter; label: string; count: number }[]).map(chip => {
              const active = taxFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setTaxFilter(chip.key)}
                  style={{
                    padding: '8px 12px', borderRadius: 999,
                    background: active ? 'var(--color-orange)' : 'var(--color-card)',
                    color: active ? '#fff' : 'var(--color-text)',
                    border: '0.5px solid ' + (active ? 'var(--color-orange)' : 'var(--color-border)'),
                    fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    letterSpacing: '-0.1px', flexShrink: 0,
                  }}
                >
                  {chip.label} · {chip.count}
                </button>
              );
            })}
          </div>
        )}

        {/* Add + Send buttons */}
        {!pendingPhoto && (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                style={{
                  flex: filteredItems.length > 0 ? 1 : undefined,
                  width: filteredItems.length === 0 ? '100%' : undefined,
                  padding: '14px', borderRadius: 14,
                  background: 'var(--color-orange)', color: '#fff',
                  border: 'none', fontSize: 15, fontWeight: 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                  letterSpacing: '-0.2px',
                }}
              >
                {processing ? 'Processing…' : '+ Add receipt'}
              </button>
              {filteredItems.length > 0 && (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  style={{
                    flex: 1,
                    padding: '14px', borderRadius: 14,
                    background: 'transparent', color: 'var(--color-text)',
                    border: '0.5px solid var(--color-border)',
                    fontSize: 15, fontWeight: 500,
                    fontFamily: 'inherit', cursor: sending ? 'default' : 'pointer',
                    letterSpacing: '-0.2px',
                    opacity: sending ? 0.7 : 1,
                  }}
                >
                  {sending ? 'Building…' : taxFilter === 'all' ? 'Send to accountant' : `Send ${taxFilter === 'current' ? current.shortLabel : previous.shortLabel}`}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
          </>
        )}

        {error && <p style={{ margin: 0, fontSize: 13, color: '#e53e3e' }}>{error}</p>}

        {/* Pending photo form */}
        {pendingPhoto && (
          <div style={{
            background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius-card)', padding: 14,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <img
              src={pendingPhoto}
              alt=""
              style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 10, background: '#000' }}
            />
            <input
              type="text" placeholder="Supplier (e.g. Bunnings)"
              value={form.supplier ?? ''}
              onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '0 12px' }}>
                <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>$</span>
                <input
                  type="number" inputMode="decimal" step="0.01" placeholder="Amount"
                  value={form.amount ?? ''}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  style={{ flex: 1, minWidth: 0, padding: '12px 0', border: 'none', background: 'transparent', fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none' }}
                />
              </div>
              <input
                type="date"
                value={form.date ?? ''}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
              />
            </div>
            <select
              value={form.category ?? ''}
              onChange={e => setForm(f => ({ ...f, category: e.target.value || undefined }))}
              style={inputStyle}
            >
              <option value="">Category (optional)</option>
              {RECEIPT_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <textarea
              placeholder="Notes (optional)"
              value={form.notes ?? ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setPendingPhoto(null); setForm({}); }}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, border: '0.5px solid var(--color-border)',
                  background: 'var(--color-bg)', color: 'var(--color-muted)', fontSize: 14, fontWeight: 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
                  background: 'var(--color-orange)', color: '#fff', fontSize: 14, fontWeight: 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Groups */}
        {grouped.length === 0 && !pendingPhoto && (
          <p style={{ margin: '20px 4px', fontSize: 13, color: 'var(--color-muted)', textAlign: 'center' }}>
            {items.length === 0
              ? 'No receipts yet.'
              : taxFilter === 'current'
                ? `No receipts in this tax year (${current.shortLabel}) yet.`
                : `No receipts in ${previous.shortLabel}.`}
          </p>
        )}

        {grouped.map(([month, records]) => (
          <div key={month}>
            <p style={{
              margin: '8px 4px 8px', fontSize: 11, fontWeight: 500,
              color: 'var(--color-muted)', letterSpacing: '0.6px', textTransform: 'uppercase',
            }}>{month} · {records.length}{records.length === 1 ? ' receipt' : ' receipts'}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {records.map(({ record, dataUrl }) => (
                <div
                  key={record.id}
                  style={{
                    background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
                    borderRadius: 12, padding: 10, display: 'flex', gap: 10,
                  }}
                >
                  <button
                    onClick={() => dataUrl && setViewerPhoto(dataUrl)}
                    style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}
                  >
                    {dataUrl ? (
                      <img src={dataUrl} alt="" style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                    ) : (
                      <div style={{ width: 88, height: 88, borderRadius: 8, background: 'var(--color-bg)' }} />
                    )}
                  </button>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {editingId === record.id ? (
                      <>
                        <input
                          type="text" placeholder="Supplier"
                          value={form.supplier ?? ''}
                          onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                          style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 8, padding: '0 8px' }}>
                            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>$</span>
                            <input
                              type="number" step="0.01" placeholder="Amount"
                              value={form.amount ?? ''}
                              onChange={e => setForm(f => ({ ...f, amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                              style={{ flex: 1, minWidth: 0, padding: '8px 0', border: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none' }}
                            />
                          </div>
                          <select
                            value={form.category ?? ''}
                            onChange={e => setForm(f => ({ ...f, category: e.target.value || undefined }))}
                            style={{ ...inputStyle, padding: '8px 8px', fontSize: 13, flex: 1 }}
                          >
                            <option value="">Cat</option>
                            {RECEIPT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => { setEditingId(null); setForm({}); }}
                            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '0.5px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-muted)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}
                          >Cancel</button>
                          <button
                            onClick={saveEdit}
                            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: 'var(--color-orange)', color: '#fff', fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
                          >Save</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => beginEdit(record)}
                          style={{ padding: 0, border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, fontFamily: 'inherit' }}
                        >
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.1px' }}>
                            {record.supplier || <span style={{ color: 'var(--color-muted)' }}>Tap to add supplier</span>}
                          </p>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
                            {[
                              formatMoney(record.amount),
                              record.category,
                              record.date && new Date(record.date).toLocaleDateString(),
                            ].filter(Boolean).join(' · ') || 'Tap to add details'}
                          </p>
                          {record.notes && (
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text)', lineHeight: 1.4 }}>{record.notes}</p>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (confirmDeleteId === record.id) { remove(record.id); setConfirmDeleteId(null); }
                            else { setConfirmDeleteId(record.id); setTimeout(() => setConfirmDeleteId(null), 3000); }
                          }}
                          style={{
                            marginTop: 'auto',
                            alignSelf: 'flex-start',
                            padding: '4px 8px', borderRadius: 6,
                            background: confirmDeleteId === record.id ? '#e53e3e' : 'transparent',
                            color: confirmDeleteId === record.id ? '#fff' : 'var(--color-muted)',
                            border: 'none', fontSize: 11, fontWeight: confirmDeleteId === record.id ? 600 : 400,
                            fontFamily: 'inherit', cursor: 'pointer',
                          }}
                        >
                          {confirmDeleteId === record.id ? 'Tap again' : 'Delete'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p style={{ margin: '12px 4px 0', fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
          {COMPLIANCE_NOTES.receipts[settings.region]}
        </p>
      </div>

      {viewerPhoto && (
        <div
          onClick={() => setViewerPhoto(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'calc(env(safe-area-inset-top) + 16px) 16px calc(env(safe-area-inset-bottom) + 16px)',
          }}
        >
          <img src={viewerPhoto} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 10 }} />
        </div>
      )}
    </div>
  );
}
