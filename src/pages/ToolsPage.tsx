import { useContext, useMemo, useRef, useState } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext } from '../contexts';
import { useTools, TOOL_CATEGORIES, compressImageFile, type Tool } from '../lib/useRecords';
import { exportTools } from '../lib/recordsExport';
import { hapticMedium } from '../lib/haptics';

function formatMoney(n: number | undefined): string {
  if (n == null || !isFinite(n)) return '';
  return `$${n.toFixed(0)}`;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '0.5px solid var(--color-border)', background: 'var(--color-bg)',
  fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)',
  outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none',
};

const UNCATEGORISED = 'Other';

export function ToolsPage() {
  const { settings } = useContext(SettingsContext);
  const { items, add, update, remove } = useTools();

  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Tool>>({});
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
      await exportTools(items);
    } catch (err) {
      setError((err as Error).message || 'Could not build the PDF.');
    } finally {
      setSending(false);
    }
  }

  // Group by category so a tradie can flick between "power tools" and "hand
  // tools" mentally. Fixed category order keeps the sections stable as items
  // are added / removed.
  const grouped = useMemo(() => {
    const groups = new Map<string, typeof items>();
    for (const h of items) {
      const k = h.record.category || UNCATEGORISED;
      const arr = groups.get(k) ?? [];
      arr.push(h);
      groups.set(k, arr);
    }
    const ordered: [string, typeof items][] = [];
    for (const cat of TOOL_CATEGORIES) {
      const arr = groups.get(cat);
      if (arr && arr.length > 0) ordered.push([cat, arr]);
    }
    // Any category strings not in the standard list get appended at the end.
    for (const [k, v] of groups) {
      if (!TOOL_CATEGORIES.includes(k)) ordered.push([k, v]);
    }
    return ordered;
  }, [items]);

  const totalValue = useMemo(() => {
    return items.reduce((sum, h) => sum + (h.record.replacementValue ?? 0), 0);
  }, [items]);

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
      name: form.name?.trim() || undefined,
      brand: form.brand?.trim() || undefined,
      model: form.model?.trim() || undefined,
      serial: form.serial?.trim() || undefined,
      purchaseDate: form.purchaseDate || undefined,
      replacementValue: form.replacementValue,
      category: form.category || undefined,
      notes: form.notes?.trim() || undefined,
    });
    setPendingPhoto(null);
    setForm({});
    hapticMedium();
  }

  function beginEdit(t: Tool) {
    setEditingId(t.id);
    setForm({
      name: t.name, brand: t.brand, model: t.model, serial: t.serial,
      purchaseDate: t.purchaseDate, replacementValue: t.replacementValue,
      category: t.category, notes: t.notes,
    });
  }

  function saveEdit() {
    if (!editingId) return;
    update(editingId, {
      name: form.name?.trim() || undefined,
      brand: form.brand?.trim() || undefined,
      model: form.model?.trim() || undefined,
      serial: form.serial?.trim() || undefined,
      purchaseDate: form.purchaseDate || undefined,
      replacementValue: form.replacementValue,
      category: form.category || undefined,
      notes: form.notes?.trim() || undefined,
    });
    setEditingId(null);
    setForm({});
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Tools" />

      <div style={{ padding: '4px 20px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: '0 4px 4px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
          Photograph each tool with serial + replacement value. If your tools get stolen, the insurer wants this list.
        </p>

        {items.length > 0 && (
          <div style={{
            padding: '10px 14px', borderRadius: 12,
            background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <span style={{ fontSize: 12, color: 'var(--color-muted)', letterSpacing: '0.4px', textTransform: 'uppercase', fontWeight: 500 }}>Total value</span>
            <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>
              {formatMoney(totalValue)} <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 400 }}>· {items.length} items</span>
            </span>
          </div>
        )}

        {!pendingPhoto && (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                style={{
                  flex: items.length > 0 ? 1 : undefined,
                  width: items.length === 0 ? '100%' : undefined,
                  padding: '14px', borderRadius: 14,
                  background: 'var(--color-orange)', color: '#fff',
                  border: 'none', fontSize: 15, fontWeight: 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                  letterSpacing: '-0.2px',
                }}
              >
                {processing ? 'Processing…' : '+ Add tool'}
              </button>
              {items.length > 0 && (
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
                  {sending ? 'Building…' : 'Send for insurance'}
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
              type="text" placeholder="Name (e.g. 18V impact driver)"
              value={form.name ?? ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text" placeholder="Brand"
                value={form.brand ?? ''}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
              />
              <input
                type="text" placeholder="Model"
                value={form.model ?? ''}
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
              />
            </div>
            <input
              type="text" placeholder="Serial number"
              value={form.serial ?? ''}
              onChange={e => setForm(f => ({ ...f, serial: e.target.value }))}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date" placeholder="Purchase date"
                value={form.purchaseDate ?? ''}
                onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '0 12px' }}>
                <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>$</span>
                <input
                  type="number" inputMode="decimal" step="1" placeholder="Replacement $"
                  value={form.replacementValue ?? ''}
                  onChange={e => setForm(f => ({ ...f, replacementValue: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  style={{ flex: 1, minWidth: 0, padding: '12px 0', border: 'none', background: 'transparent', fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none' }}
                />
              </div>
            </div>
            <select
              value={form.category ?? ''}
              onChange={e => setForm(f => ({ ...f, category: e.target.value || undefined }))}
              style={inputStyle}
            >
              <option value="">Category (optional)</option>
              {TOOL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
              >Cancel</button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
                  background: 'var(--color-orange)', color: '#fff', fontSize: 14, fontWeight: 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >Save</button>
            </div>
          </div>
        )}

        {grouped.length === 0 && !pendingPhoto && (
          <p style={{ margin: '20px 4px', fontSize: 13, color: 'var(--color-muted)', textAlign: 'center' }}>
            No tools logged yet.
          </p>
        )}

        {grouped.map(([category, records]) => (
          <div key={category}>
            <p style={{
              margin: '8px 4px 8px', fontSize: 11, fontWeight: 500,
              color: 'var(--color-muted)', letterSpacing: '0.6px', textTransform: 'uppercase',
            }}>{category} · {records.length}</p>
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
                          type="text" placeholder="Name"
                          value={form.name ?? ''}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="text" placeholder="Brand"
                            value={form.brand ?? ''}
                            onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                            style={{ ...inputStyle, padding: '8px 10px', fontSize: 13, flex: 1 }}
                          />
                          <input
                            type="text" placeholder="Model"
                            value={form.model ?? ''}
                            onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                            style={{ ...inputStyle, padding: '8px 10px', fontSize: 13, flex: 1 }}
                          />
                        </div>
                        <input
                          type="text" placeholder="Serial"
                          value={form.serial ?? ''}
                          onChange={e => setForm(f => ({ ...f, serial: e.target.value }))}
                          style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 8, padding: '0 8px' }}>
                            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>$</span>
                            <input
                              type="number" step="1" placeholder="Value"
                              value={form.replacementValue ?? ''}
                              onChange={e => setForm(f => ({ ...f, replacementValue: e.target.value ? parseFloat(e.target.value) : undefined }))}
                              style={{ flex: 1, minWidth: 0, padding: '8px 0', border: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none' }}
                            />
                          </div>
                          <select
                            value={form.category ?? ''}
                            onChange={e => setForm(f => ({ ...f, category: e.target.value || undefined }))}
                            style={{ ...inputStyle, padding: '8px 8px', fontSize: 13, flex: 1 }}
                          >
                            <option value="">Cat</option>
                            {TOOL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                            {record.name || <span style={{ color: 'var(--color-muted)' }}>Tap to add name</span>}
                          </p>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
                            {[
                              [record.brand, record.model].filter(Boolean).join(' '),
                              record.serial && `SN ${record.serial}`,
                              formatMoney(record.replacementValue),
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
          {COMPLIANCE_NOTES.tools[settings.region]}
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
