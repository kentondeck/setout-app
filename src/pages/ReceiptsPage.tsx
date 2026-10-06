import { useContext, useMemo, useRef, useState } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext } from '../contexts';
import { useReceipts, RECEIPT_CATEGORIES, compressImageFile, type Receipt } from '../lib/useRecords';
import { exportReceipts } from '../lib/recordsExport';
import { currentTaxYear, previousTaxYear, type TaxYearRange } from '../lib/taxYear';
import { hapticMedium } from '../lib/haptics';
import { PhotoViewer } from '../components/PhotoViewer';

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

// Local date as YYYY-MM-DD for <input type="date"> — defaults the purchase
// date to today so a real date is always captured (the tradie edits it for an
// older receipt). Without this the PDF falls back to the upload timestamp.
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.2px',
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

  const [adding, setAdding] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Receipt>>({});
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
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
    } catch {
      setError('Could not process that image — try another photo.');
    } finally {
      setProcessing(false);
    }
  }

  function closeForm() {
    setAdding(false);
    setPendingPhoto(null);
    setEditingId(null);
    setEditingPhoto(null);
    setForm({});
    setError('');
  }

  async function handleSave() {
    if (!form.supplier?.trim()) { setError('Enter a supplier.'); return; }
    await add(pendingPhoto, {
      supplier: form.supplier?.trim() || undefined,
      amount: form.amount,
      date: form.date || undefined,
      category: form.category || undefined,
      notes: form.notes?.trim() || undefined,
    });
    closeForm();
    hapticMedium();
  }

  // Edit reopens the same full form (photo + all fields, including the date)
  // rather than a cramped inline row — so the purchase date can be changed.
  function beginEdit(r: Receipt, dataUrl?: string | null) {
    setEditingId(r.id);
    setEditingPhoto(dataUrl ?? null);
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
    closeForm();
    hapticMedium();
  }

  const formOpen = adding || pendingPhoto !== null || editingId !== null;
  const formPhoto = pendingPhoto ?? editingPhoto;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Receipts" />

      <div style={{ padding: '4px 20px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: '0 4px 4px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
          Add a receipt's details — snap a photo if you want. Everything stays on your phone — back up regularly.
        </p>

        {/* Tax-year filter chips */}
        {!formOpen && items.length > 0 && (
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
        {!formOpen && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setAdding(true); setForm({ date: todayISO() }); setPendingPhoto(null); setError(''); }}
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
              + Add receipt
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
        )}
        {/* Hidden picker — used by the optional "Add photo" button inside the form. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          style={{ display: 'none' }}
        />

        {error && <p style={{ margin: 0, fontSize: 13, color: '#e53e3e' }}>{error}</p>}

        {/* Pending photo form */}
        {formOpen && (
          <div style={{
            background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius-card)', padding: 14,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
              {editingId ? 'Edit receipt' : 'New receipt'}
            </p>
            {formPhoto ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <img
                  src={formPhoto}
                  alt=""
                  style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 10, background: '#000' }}
                />
                {!editingId && (
                  <button
                    onClick={() => setPendingPhoto(null)}
                    style={{
                      alignSelf: 'flex-start', padding: '4px 6px', border: 'none', background: 'none',
                      color: 'var(--color-muted)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >Remove photo</button>
                )}
              </div>
            ) : !editingId ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10,
                  border: '1px dashed var(--color-border)', background: 'var(--color-bg)',
                  color: 'var(--color-muted)', fontSize: 14, fontWeight: 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                {processing ? 'Processing…' : '+ Add photo'}
              </button>
            ) : null}
            <input
              type="text" placeholder="Supplier (e.g. Bunnings)"
              value={form.supplier ?? ''}
              onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={fieldLabelStyle}>Amount</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '0 12px' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>$</span>
                  <input
                    type="number" inputMode="decimal" step="0.01" placeholder="Amount"
                    value={form.amount ?? ''}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    style={{ flex: 1, minWidth: 0, padding: '12px 0', border: 'none', background: 'transparent', fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none' }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={fieldLabelStyle}>Date purchased</label>
                <input
                  type="date"
                  value={form.date ?? ''}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ ...inputStyle, minWidth: 0 }}
                />
              </div>
            </div>
            <select
              value={form.category ?? ''}
              onChange={e => setForm(f => ({ ...f, category: e.target.value || undefined }))}
              style={inputStyle}
            >
              <option value="">Category</option>
              {RECEIPT_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <textarea
              placeholder="Notes"
              value={form.notes ?? ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={closeForm}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, border: '0.5px solid var(--color-border)',
                  background: 'var(--color-bg)', color: 'var(--color-muted)', fontSize: 14, fontWeight: 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={editingId ? saveEdit : handleSave}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
                  background: 'var(--color-orange)', color: '#fff', fontSize: 14, fontWeight: 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                {editingId ? 'Save changes' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Groups */}
        {grouped.length === 0 && !formOpen && (
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
                      <>
                        <button
                          onClick={() => beginEdit(record, dataUrl)}
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

      {viewerPhoto && <PhotoViewer src={viewerPhoto} onClose={() => setViewerPhoto(null)} />}
    </div>
  );
}
