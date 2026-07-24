import { useState, useContext, useRef, useEffect } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { ResultCard } from '../components/ResultCard';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { JobNameInput } from '../components/JobNameInput';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { buildQuotePdf } from '../lib/quotePdf';
import type { QuoteDocType, PdfLogo } from '../lib/quotePdf';
import { lookupMaterialPrice, lookupLabourRate } from '../lib/materialPricing';
import { getRememberedMaterialPrice, getRememberedMaterialSource, rememberMaterialPrice, getRememberedLabourRate, rememberLabourRate } from '../lib/priceMemory';

const GST_RATE: Record<'AU' | 'NZ', number> = { AU: 10, NZ: 15 };
const MARGIN_PRESETS = [10, 20, 30, 50];
const TRAVEL_MODES = ['flat', 'perKm', 'perDay', 'perHour'] as const;
type TravelMode = (typeof TRAVEL_MODES)[number];
const TRAVEL_MODE_LABELS: Record<TravelMode, string> = { flat: 'Flat', perKm: 'Per km', perDay: 'Per day', perHour: 'Per hr' };

function currencyFmt(region: 'AU' | 'NZ') {
  return new Intl.NumberFormat(region === 'AU' ? 'en-AU' : 'en-NZ', {
    style: 'currency',
    currency: region === 'AU' ? 'AUD' : 'NZD',
    maximumFractionDigits: 2,
  });
}

interface ApiMaterial {
  item: string;
  quantity: number;
  unit: string;
  note: string;
}

interface ApiLabour {
  role: string;
  hours: number;
}

interface QuoteResult {
  dimensions: { lengthM: number; widthM: number; areaM2: number };
  materials: ApiMaterial[];
  labour: ApiLabour[];
  scopeSummary: string;
  assumptions: string[];
}

interface EditableMaterial {
  id: string;
  item: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  note?: string;
  sellOverride?: string; // manual client price per unit — undefined means use the material margin
  priceKind?: 'memory' | 'book' | 'search' | 'manual'; // where unitPrice (cost) came from, for trust display
  priceSourceName?: string; // retailer name, when priceKind is 'search'
}

interface EditableLabour {
  id: string;
  role: string;
  hours: string;
  rate: string;
  rateOverride?: string; // manual client rate per hour — undefined means use the labour margin
}

const MAX_DIMENSION = 1568;

// Re-encodes to JPEG via canvas — handles iPhone camera photos (image/heic),
// which the vision API rejects outright, and caps size for token cost.
function fileToJpegBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read photo — try a different one')); };
    img.src = url;
  });
}

const MAX_LOGO_DIMENSION = 320;

function fileToLogo(file: File): Promise<PdfLogo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_LOGO_DIMENSION / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read logo — try a different image')); };
    img.src = url;
  });
}

export function PhotoQuoteCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [description, setDescription] = useState('');
  const [docType, setDocType] = useState<QuoteDocType>('estimate');
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobName, setJobName] = useState('');
  const [clientName, setClientName] = useState('');
  const [lastEntryId, setLastEntryId] = useState('');
  const [copied, setCopied] = useState(false);
  const [materialsList, setMaterialsList] = useState<EditableMaterial[]>([]);
  const [labourList, setLabourList] = useState<EditableLabour[]>([]);
  const [travelMode, setTravelMode] = useState<TravelMode>(() => {
    const stored = localStorage.getItem('setout_photoquote_travel_mode');
    return (TRAVEL_MODES as readonly string[]).includes(stored ?? '') ? (stored as TravelMode) : 'flat';
  });
  const [travelRate, setTravelRate] = useState('');
  const [travelQty, setTravelQty] = useState('');
  const [materialMarginPct, setMaterialMarginPct] = useState(() => localStorage.getItem('setout_photoquote_material_margin') ?? '20');
  const [labourMarginPct, setLabourMarginPct] = useState(() => localStorage.getItem('setout_photoquote_labour_margin') ?? '20');
  const [logo, setLogo] = useState<PdfLogo | null>(() => {
    const stored = localStorage.getItem('setout_photoquote_logo');
    try { return stored ? (JSON.parse(stored) as PdfLogo) : null; } catch { return null; }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Keep the job-order snapshot in sync as the tradie edits materials/labour after generating
  useEffect(() => {
    if (!lastEntryId || !result) return;
    const totalHours = labourList.reduce((s, l) => s + (parseFloat(l.hours) || 0), 0);
    const materialsSnapshot = materialsList
      .map(m => ({ item: m.item.trim(), quantity: parseFloat(m.quantity) || 0, unit: m.unit.trim() || 'each' }))
      .filter(m => m.item && m.quantity > 0);
    updateEntry(lastEntryId, {
      outputs: {
        areaM2: result.dimensions.areaM2,
        labourHours: totalHours,
        materialCount: materialsList.length,
        materialsJson: JSON.stringify(materialsSnapshot),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialsList, labourList, lastEntryId]);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const next = await fileToLogo(file);
      setLogo(next);
      localStorage.setItem('setout_photoquote_logo', JSON.stringify(next));
    } catch { /* ignore unreadable image */ }
  }

  function handleRemoveLogo() {
    setLogo(null);
    localStorage.removeItem('setout_photoquote_logo');
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setResult(null);
    setError('');
  }

  async function handleGenerate() {
    if (!description.trim() || loading) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const imageBase64 = photo ? await fileToJpegBase64(photo) : null;
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mediaType: imageBase64 ? 'image/jpeg' : null,
          description: description.trim(),
          region: settings.region,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Estimate failed (${res.status}): ${body}`);
      }

      const quote = (await res.json()) as QuoteResult;
      setResult(quote);
      // Price priority: remembered (your own confirmed price) → AI web search (below, cached after).
      // The static price book is a rough guess, not real data — it's only used if the web search
      // call itself fails, not as a default ahead of it.
      const newMaterials = quote.materials.map(m => {
        const remembered = getRememberedMaterialPrice(m.item, settings.region);
        return {
          id: crypto.randomUUID(),
          item: m.item,
          quantity: String(m.quantity),
          unit: m.unit,
          unitPrice: remembered,
          note: m.note,
          priceKind: remembered ? ('memory' as const) : undefined,
          priceSourceName: remembered ? getRememberedMaterialSource(m.item, settings.region) : undefined,
        };
      });
      setMaterialsList(newMaterials);
      setLabourList(quote.labour.map(l => ({
        id: crypto.randomUUID(),
        role: l.role,
        hours: String(l.hours),
        rate: getRememberedLabourRate(l.role, settings.region) || lookupLabourRate(l.role, settings.region),
      })));
      fillMissingMaterialPrices(newMaterials, settings.region);

      const totalHours = quote.labour.reduce((s, l) => s + l.hours, 0);
      const id = crypto.randomUUID();
      setLastEntryId(id);
      addEntry({
        id,
        calculatorId: 'photoquote',
        timestamp: Date.now(),
        inputs: { description: description.trim() },
        outputs: {
          areaM2: quote.dimensions.areaM2,
          labourHours: totalHours,
          materialCount: quote.materials.length,
          materialsJson: JSON.stringify(quote.materials.map(m => ({ item: m.item, quantity: m.quantity, unit: m.unit }))),
        },
      });

      if (navigator.vibrate) navigator.vibrate(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  // Runs in the background after results are already shown — looks up a real price (web search)
  // for anything not already remembered, then remembers it so it's never looked up again. The
  // static price book only fills in whatever the search couldn't find, as a last resort — it's a
  // rough guess, not real data, so it never gets to compete with a search-confirmed price.
  async function fillMissingMaterialPrices(materials: EditableMaterial[], region: 'AU' | 'NZ') {
    const missing = materials.filter(m => !m.unitPrice && m.item.trim());
    if (missing.length === 0) return;

    const applyBookFallback = () => {
      setMaterialsList(prev => prev.map(m => {
        if (m.unitPrice) return m;
        const fromBook = lookupMaterialPrice(m.item, region);
        if (!fromBook) return m;
        return { ...m, unitPrice: fromBook, priceKind: 'book' as const, priceSourceName: undefined };
      }));
    };

    try {
      const res = await fetch('/api/price-lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: missing.map(m => ({ item: m.item, unit: m.unit || 'each' })),
          region,
        }),
      });
      if (!res.ok) { applyBookFallback(); return; }
      const { materials: priced } = (await res.json()) as { materials: { item: string; price: number; source?: string }[] };
      // The model is asked to echo the item name back verbatim but sometimes appends the "(per
      // unit)" hint from the request — strip any trailing parenthetical before matching.
      const normalizeItemKey = (s: string) => s.trim().toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').trim();
      setMaterialsList(prev => prev.map(m => {
        if (m.unitPrice) return m; // already priced, or the tradie already edited it while this was in flight
        const found = priced.find(p => normalizeItemKey(p.item) === normalizeItemKey(m.item));
        if (!found) return m;
        rememberMaterialPrice(m.item, region, String(found.price), found.source);
        return { ...m, unitPrice: String(found.price), priceKind: 'search' as const, priceSourceName: found.source };
      }));
      applyBookFallback(); // anything the search genuinely couldn't find still gets a rough estimate rather than staying blank
    } catch {
      applyBookFallback();
    }
  }

  function handleMaterialMarginChange(v: string) {
    setMaterialMarginPct(v);
    localStorage.setItem('setout_photoquote_material_margin', v);
  }

  function handleLabourMarginChange(v: string) {
    setLabourMarginPct(v);
    localStorage.setItem('setout_photoquote_labour_margin', v);
  }

  function handleTravelModeChange(mode: TravelMode) {
    setTravelMode(mode);
    localStorage.setItem('setout_photoquote_travel_mode', mode);
  }

  function updateMaterial(id: string, patch: Partial<EditableMaterial>) {
    setMaterialsList(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));
  }

  function addMaterialRow() {
    setMaterialsList(prev => [...prev, { id: crypto.randomUUID(), item: '', quantity: '1', unit: 'each', unitPrice: '' }]);
  }

  function removeMaterialRow(id: string) {
    setMaterialsList(prev => prev.filter(m => m.id !== id));
  }

  function updateLabour(id: string, patch: Partial<EditableLabour>) {
    setLabourList(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLabourRow() {
    setLabourList(prev => [...prev, { id: crypto.randomUUID(), role: '', hours: '1', rate: '' }]);
  }

  function removeLabourRow(id: string) {
    setLabourList(prev => prev.filter(l => l.id !== id));
  }

  function computeTotals() {
    if (!result) return null;
    const region = settings.region;
    const gstPct = GST_RATE[region];
    const materialMargin = parseFloat(materialMarginPct) || 0;
    const labourMargin = parseFloat(labourMarginPct) || 0;

    // unitPrice/rate are what the tradie pays (cost) — margin below scales them up to the client price,
    // so every dollar in the total is traceable to an itemised line instead of a hidden markup line.
    // A per-row sellOverride/rateOverride replaces that margin-derived price for just that line.
    const materialLines = materialsList.map(m => {
      const quantity = parseFloat(m.quantity) || 0;
      const cost = parseFloat(m.unitPrice) || 0;
      const autoUnitPrice = cost * (1 + materialMargin / 100);
      const overridden = m.sellOverride !== undefined && m.sellOverride !== '';
      const unitPrice = overridden ? (parseFloat(m.sellOverride!) || 0) : autoUnitPrice;
      return { item: m.item.trim() || 'Untitled item', quantity, unit: m.unit, cost, unitPrice, overridden, costTotal: quantity * cost, lineTotal: quantity * unitPrice };
    });
    const materialsCost = materialLines.reduce((s, l) => s + l.costTotal, 0);
    const materialsSubtotal = materialLines.reduce((s, l) => s + l.lineTotal, 0);

    const labourLines = labourList.map(l => {
      const hours = parseFloat(l.hours) || 0;
      const payRate = parseFloat(l.rate) || 0;
      const autoRate = payRate * (1 + labourMargin / 100);
      const overridden = l.rateOverride !== undefined && l.rateOverride !== '';
      const rate = overridden ? (parseFloat(l.rateOverride!) || 0) : autoRate;
      return { role: l.role.trim() || 'Labour', hours, payRate, rate, overridden, costTotal: hours * payRate, lineTotal: hours * rate };
    });
    const labourCost = labourLines.reduce((s, l) => s + l.costTotal, 0);
    const labourSubtotal = labourLines.reduce((s, l) => s + l.lineTotal, 0);

    const travelQtyNum = parseFloat(travelQty) || 0;
    const travelRateNum = parseFloat(travelRate) || 0;
    const travel = travelMode === 'flat' ? travelRateNum : travelRateNum * travelQtyNum;
    const subtotal = materialsSubtotal + labourSubtotal + travel;
    const gstAmount = subtotal * (gstPct / 100);
    const total = subtotal + gstAmount;

    const totalCost = materialsCost + labourCost + travel;
    const profit = subtotal - totalCost;
    const profitPct = subtotal > 0 ? (profit / subtotal) * 100 : 0;

    return {
      region, gstPct, materialLines, materialsSubtotal, materialsCost, labourLines, labourSubtotal, labourCost,
      travel, subtotal, gstAmount, total, materialMarginPct: materialMargin, labourMarginPct: labourMargin,
      totalCost, profit, profitPct,
    };
  }

  function buildPdfDoc() {
    const totals = computeTotals();
    if (!result || !totals) return null;
    return buildQuotePdf({
      docType,
      clientName: clientName.trim(),
      jobName: jobName.trim(),
      jobDescription: result.scopeSummary,
      logo,
      region: totals.region,
      areaM2: result.dimensions.areaM2,
      lengthM: result.dimensions.lengthM,
      widthM: result.dimensions.widthM,
      materialsSubtotal: totals.materialsSubtotal,
      labour: totals.labourLines,
      labourSubtotal: totals.labourSubtotal,
      travelAmount: totals.travel,
      subtotal: totals.subtotal,
      gstPct: totals.gstPct,
      gstAmount: totals.gstAmount,
      total: totals.total,
    });
  }

  function handleDownloadPdf() {
    const doc = buildPdfDoc();
    if (!doc) return;
    doc.save(`${(jobName || docType).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`);
  }

  async function handleSharePdf() {
    const doc = buildPdfDoc();
    if (!doc) return;
    const fileName = `${(jobName || docType).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
    const blob = doc.output('blob') as Blob;
    const file = new File([blob], fileName, { type: 'application/pdf' });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Setout ${docType === 'quote' ? 'Quote' : 'Estimate'}` });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    doc.save(fileName);
  }

  function buildShareText(): string {
    if (!result) return '';
    const totals = computeTotals();
    const docLabel = docType === 'quote' ? 'Quote' : 'Estimate';
    const lines: string[] = [`${docLabel}${jobName ? ` — ${jobName}` : ''}`, ''];
    if (result.scopeSummary) { lines.push(result.scopeSummary); lines.push(''); }
    lines.push(`Area: ${result.dimensions.lengthM}m × ${result.dimensions.widthM}m = ${result.dimensions.areaM2}m²`);
    lines.push('');
    if (totals) {
      const fmt = currencyFmt(totals.region);
      lines.push(`Materials: ${fmt.format(totals.materialsSubtotal)}`);
      for (const l of totals.labourLines) {
        lines.push(`Labour — ${l.role}: ${l.hours} hrs @ ${fmt.format(l.rate)}/hr = ${fmt.format(l.lineTotal)}`);
      }
      if (totals.travel > 0) lines.push(`Travel: ${fmt.format(totals.travel)}`);
      lines.push('');
      lines.push(`Total inc. GST: ${fmt.format(totals.total)}`);
    }
    lines.push('');
    lines.push(docType === 'quote'
      ? 'Final price may vary if site conditions differ. Valid for 30 days.'
      : 'This is a preliminary estimate, not a fixed price. A formal quote follows a site visit.');
    return lines.join('\n');
  }

  async function handleShare() {
    const text = buildShareText();
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `Setout — ${docType === 'quote' ? 'Quote' : 'Estimate'}`, text });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  const canGenerate = description.trim().length > 0 && !loading;
  const smallInputStyle: React.CSSProperties = {
    padding: '8px 0', border: 'none', background: 'transparent',
    fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none',
    WebkitAppearance: 'none', MozAppearance: 'textfield' as React.CSSProperties['MozAppearance'],
  };
  const totalLabourHours = labourList.reduce((s, l) => s + (parseFloat(l.hours) || 0), 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Photo Quote" />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Photo capture */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />
          {photoPreview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%', padding: 0, border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-card)', overflow: 'hidden', cursor: 'pointer',
                background: 'none', display: 'block',
              }}
            >
              <img src={photoPreview} alt="Job site" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
            </button>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%', padding: '40px 20px', background: 'var(--color-card)',
                border: '0.5px dashed rgba(0,0,0,0.18)', borderRadius: 'var(--radius-card)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,90,31,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>Take or upload a photo <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span></p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>The area you're quoting — or skip and describe the job below</p>
            </button>
          )}
        </div>

        {/* Description */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>WHAT'S THE JOB</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Treated pine deck, 4x4 posts, privacy screen one side, approx 6x4 metres"
            rows={3}
            style={{
              width: '100%', background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
              borderRadius: 12, padding: '12px 14px', fontSize: 15, fontFamily: 'inherit',
              color: 'var(--color-text)', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5,
            }}
          />
        </div>

        {/* Quote / Estimate toggle */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>DOCUMENT TYPE</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['estimate', 'quote'] as QuoteDocType[]).map(t => {
              const active = docType === t;
              return (
                <button
                  key={t}
                  onClick={() => setDocType(t)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                    border: active ? '1.5px solid var(--color-orange)' : '0.5px solid var(--color-border)',
                    background: active ? 'rgba(255,90,31,0.06)' : 'var(--color-card)',
                    color: active ? 'var(--color-orange)' : 'var(--color-text)',
                  }}
                >
                  {t === 'quote' ? 'Firm quote' : 'Estimate'}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p style={{ margin: 0, fontSize: 13, color: '#e53e3e', lineHeight: 1.5 }}>{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            background: canGenerate ? 'var(--color-orange)' : 'var(--color-border)',
            color: '#fff', border: 'none', borderRadius: 14, padding: '16px',
            fontSize: 16, fontWeight: 500, fontFamily: 'inherit',
            cursor: canGenerate ? 'pointer' : 'default', letterSpacing: '-0.3px',
          }}
          onPointerDown={e => { if (canGenerate) e.currentTarget.style.opacity = '0.85'; }}
          onPointerUp={e => (e.currentTarget.style.opacity = '1')}
          onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {loading ? 'Estimating…' : docType === 'quote' ? 'Generate quote' : 'Generate estimate'}
        </button>

        {result && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ResultCard label="Area" value={result.dimensions.areaM2} unit="m²" accent />
              <ResultCard label="Labour" value={totalLabourHours} unit="hrs" />
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
              {result.dimensions.lengthM}m × {result.dimensions.widthM}m estimated {photo ? 'from photo' : 'from description'}
            </p>

            <div style={{
              background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)', padding: '18px 16px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>MATERIALS — WHAT YOU PAY</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-muted)' }}>Prices are your saved history or a live web search — check before sending. Material margin below sets the client price</p>
              </div>
              {materialsList.map(m => {
                const matMarginNum = parseFloat(materialMarginPct) || 0;
                const autoSellPrice = (parseFloat(m.unitPrice) || 0) * (1 + matMarginNum / 100);
                const isOverridden = m.sellOverride !== undefined;
                return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 10, borderBottom: '0.5px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      value={m.item}
                      onChange={e => updateMaterial(m.id, { item: e.target.value })}
                      placeholder="Material name"
                      style={{
                        flex: 1, minWidth: 0, padding: '6px 0', border: 'none', background: 'transparent',
                        fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => removeMaterialRow(m.id)}
                      aria-label="Remove material"
                      style={{
                        flexShrink: 0, width: 24, height: 24, borderRadius: '50%', border: 'none',
                        background: 'rgba(0,0,0,0.05)', color: 'var(--color-muted)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                  {m.note && <p style={{ margin: 0, fontSize: 11.5, color: 'var(--color-muted)' }}>{m.note}</p>}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 64px', background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 9, padding: '0 8px' }}>
                      <input
                        type="number" inputMode="decimal" min="0" step="1"
                        value={m.quantity}
                        onChange={e => updateMaterial(m.id, { quantity: e.target.value })}
                        style={{ ...smallInputStyle, width: '100%', textAlign: 'left' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 88px', background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 9, padding: '0 8px' }}>
                      <input
                        type="text"
                        value={m.unit}
                        onChange={e => updateMaterial(m.id, { unit: e.target.value })}
                        placeholder="unit"
                        style={{ ...smallInputStyle, width: '100%', textAlign: 'left' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, minWidth: 0, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 9, padding: '0 8px' }}>
                      <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>$</span>
                      <input
                        type="number" inputMode="decimal" min="0" step="0.01" placeholder="0"
                        value={m.unitPrice}
                        onChange={e => updateMaterial(m.id, { unitPrice: e.target.value, priceKind: 'manual', priceSourceName: undefined })}
                        onBlur={e => rememberMaterialPrice(m.item, settings.region, e.target.value)}
                        style={{ ...smallInputStyle, width: '100%', textAlign: 'right' }}
                      />
                    </div>
                  </div>
                  {m.priceKind && m.priceKind !== 'manual' && (
                    <p style={{ margin: 0, fontSize: 10.5, color: m.priceKind === 'memory' ? '#2f9e44' : 'var(--color-muted)' }}>
                      {m.priceKind === 'memory' && 'Your saved price'}
                      {m.priceKind === 'book' && 'Estimate — please confirm'}
                      {m.priceKind === 'search' && `Web search${m.priceSourceName ? ` — ${m.priceSourceName}` : ''} — please confirm`}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                    {isOverridden ? (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>Client price $</span>
                        <input
                          type="number" inputMode="decimal" min="0" step="0.01"
                          value={m.sellOverride}
                          onChange={e => updateMaterial(m.id, { sellOverride: e.target.value })}
                          style={{
                            width: 56, padding: '3px 6px', border: '0.5px solid var(--color-orange)', borderRadius: 7,
                            background: 'var(--color-bg)', fontSize: 12, fontFamily: 'inherit', color: 'var(--color-text)',
                            outline: 'none', textAlign: 'right',
                          }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>/{m.unit || 'unit'}</span>
                        <button
                          onClick={() => updateMaterial(m.id, { sellOverride: undefined })}
                          style={{ fontSize: 11, color: 'var(--color-orange)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                        >
                          Use margin
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                          Client price: {currencyFmt(settings.region).format(autoSellPrice)}/{m.unit || 'unit'}
                        </span>
                        <button
                          onClick={() => updateMaterial(m.id, { sellOverride: autoSellPrice.toFixed(2) })}
                          style={{ fontSize: 11, color: 'var(--color-orange)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>
                );
              })}
              <button
                onClick={addMaterialRow}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 0', borderRadius: 10, border: '0.5px dashed rgba(0,0,0,0.18)',
                  background: 'none', color: 'var(--color-orange)', fontSize: 13.5, fontWeight: 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                + Add material
              </button>
            </div>

            <div style={{
              background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)', padding: '18px 16px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>LABOUR — WHAT YOU PAY THE TEAM</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-muted)' }}>Labour margin below sets the client rate</p>
              </div>
              {labourList.map(l => {
                const labMarginNum = parseFloat(labourMarginPct) || 0;
                const autoSellRate = (parseFloat(l.rate) || 0) * (1 + labMarginNum / 100);
                const isOverridden = l.rateOverride !== undefined;
                return (
                <div key={l.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 10, borderBottom: '0.5px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      value={l.role}
                      onChange={e => updateLabour(l.id, { role: e.target.value })}
                      placeholder="Role — e.g. Carpenter"
                      style={{
                        flex: 1, minWidth: 0, padding: '6px 0', border: 'none', background: 'transparent',
                        fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => removeLabourRow(l.id)}
                      aria-label="Remove labour role"
                      style={{
                        flexShrink: 0, width: 24, height: 24, borderRadius: '50%', border: 'none',
                        background: 'rgba(0,0,0,0.05)', color: 'var(--color-muted)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 88px', background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 9, padding: '0 8px' }}>
                      <input
                        type="number" inputMode="decimal" min="0" step="0.5"
                        value={l.hours}
                        onChange={e => updateLabour(l.id, { hours: e.target.value })}
                        style={{ ...smallInputStyle, width: '100%', textAlign: 'left' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>hrs</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, minWidth: 0, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 9, padding: '0 8px' }}>
                      <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>$</span>
                      <input
                        type="number" inputMode="decimal" min="0" step="1" placeholder="0"
                        value={l.rate}
                        onChange={e => updateLabour(l.id, { rate: e.target.value })}
                        onBlur={e => rememberLabourRate(l.role, settings.region, e.target.value)}
                        style={{ ...smallInputStyle, width: '100%', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>/hr</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                    {isOverridden ? (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>Client rate $</span>
                        <input
                          type="number" inputMode="decimal" min="0" step="0.01"
                          value={l.rateOverride}
                          onChange={e => updateLabour(l.id, { rateOverride: e.target.value })}
                          style={{
                            width: 56, padding: '3px 6px', border: '0.5px solid var(--color-orange)', borderRadius: 7,
                            background: 'var(--color-bg)', fontSize: 12, fontFamily: 'inherit', color: 'var(--color-text)',
                            outline: 'none', textAlign: 'right',
                          }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>/hr</span>
                        <button
                          onClick={() => updateLabour(l.id, { rateOverride: undefined })}
                          style={{ fontSize: 11, color: 'var(--color-orange)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                        >
                          Use margin
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                          Client rate: {currencyFmt(settings.region).format(autoSellRate)}/hr
                        </span>
                        <button
                          onClick={() => updateLabour(l.id, { rateOverride: autoSellRate.toFixed(2) })}
                          style={{ fontSize: 11, color: 'var(--color-orange)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>
                );
              })}
              <button
                onClick={addLabourRow}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 0', borderRadius: 10, border: '0.5px dashed rgba(0,0,0,0.18)',
                  background: 'none', color: 'var(--color-orange)', fontSize: 13.5, fontWeight: 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                + Add labour role
              </button>
            </div>

            {(() => {
              const totals = computeTotals();
              if (!totals) return null;
              const fmt = currencyFmt(totals.region);
              return (
                <div style={{
                  background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)', padding: '18px 16px',
                  display: 'flex', flexDirection: 'column', gap: 14,
                }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>PRICING</p>

                  <div>
                    <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Travel <span style={{ color: 'var(--color-muted)' }}>(optional)</span></span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, marginBottom: 8 }}>
                      {TRAVEL_MODES.map(mode => (
                        <button
                          key={mode}
                          onClick={() => handleTravelModeChange(mode)}
                          style={{
                            flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                            border: `0.5px solid ${travelMode === mode ? 'var(--color-orange)' : 'var(--color-border)'}`,
                            background: travelMode === mode ? 'rgba(255,90,31,0.06)' : 'var(--color-bg)',
                            color: travelMode === mode ? 'var(--color-orange)' : 'var(--color-muted)',
                          }}
                        >
                          {TRAVEL_MODE_LABELS[mode]}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 3, flex: 1,
                        background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 9, padding: '0 8px',
                      }}>
                        <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>$</span>
                        <input
                          type="number" inputMode="decimal" min="0" step="0.01" placeholder="0"
                          value={travelRate}
                          onChange={e => setTravelRate(e.target.value)}
                          style={{
                            width: '100%', padding: '8px 0', border: 'none', background: 'transparent',
                            fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none',
                            textAlign: 'right', WebkitAppearance: 'none', MozAppearance: 'textfield',
                          } as React.CSSProperties}
                        />
                        {travelMode !== 'flat' && (
                          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                            /{travelMode === 'perKm' ? 'km' : travelMode === 'perDay' ? 'day' : 'hr'}
                          </span>
                        )}
                      </div>
                      {travelMode !== 'flat' && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4, flex: 1,
                          background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 9, padding: '0 8px',
                        }}>
                          <input
                            type="number" inputMode="decimal" min="0" step="1" placeholder="0"
                            value={travelQty}
                            onChange={e => setTravelQty(e.target.value)}
                            style={{
                              width: '100%', padding: '8px 0', border: 'none', background: 'transparent',
                              fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none',
                              textAlign: 'right', WebkitAppearance: 'none', MozAppearance: 'textfield',
                            } as React.CSSProperties}
                          />
                          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                            {travelMode === 'perKm' ? 'km' : travelMode === 'perDay' ? 'days' : 'hrs'}
                          </span>
                        </div>
                      )}
                    </div>
                    {travelMode !== 'flat' && totals.travel > 0 && (
                      <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--color-muted)', textAlign: 'right' }}>
                        = {fmt.format(totals.travel)}
                      </p>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Material margin</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-orange)' }}>{materialMarginPct || 0}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="1"
                      value={materialMarginPct || '0'}
                      onChange={e => handleMaterialMarginChange(e.target.value)}
                      style={{ width: '100%', accentColor: 'var(--color-orange)' }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {MARGIN_PRESETS.map(p => (
                        <button
                          key={p}
                          onClick={() => handleMaterialMarginChange(String(p))}
                          style={{
                            flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                            border: `0.5px solid ${materialMarginPct === String(p) ? 'var(--color-orange)' : 'var(--color-border)'}`,
                            background: materialMarginPct === String(p) ? 'rgba(255,90,31,0.06)' : 'var(--color-bg)',
                            color: materialMarginPct === String(p) ? 'var(--color-orange)' : 'var(--color-muted)',
                          }}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Labour margin</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-orange)' }}>{labourMarginPct || 0}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="1"
                      value={labourMarginPct || '0'}
                      onChange={e => handleLabourMarginChange(e.target.value)}
                      style={{ width: '100%', accentColor: 'var(--color-orange)' }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {MARGIN_PRESETS.map(p => (
                        <button
                          key={p}
                          onClick={() => handleLabourMarginChange(String(p))}
                          style={{
                            flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                            border: `0.5px solid ${labourMarginPct === String(p) ? 'var(--color-orange)' : 'var(--color-border)'}`,
                            background: labourMarginPct === String(p) ? 'rgba(255,90,31,0.06)' : 'var(--color-bg)',
                            color: labourMarginPct === String(p) ? 'var(--color-orange)' : 'var(--color-muted)',
                          }}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ height: 0.5, background: 'var(--color-border)' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--color-muted)' }}>Materials</span>
                      <span style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{fmt.format(totals.materialsSubtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--color-muted)' }}>Labour</span>
                      <span style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{fmt.format(totals.labourSubtotal)}</span>
                    </div>
                    {totals.travel > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--color-muted)' }}>Travel</span>
                        <span style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{fmt.format(totals.travel)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--color-muted)' }}>GST ({totals.gstPct}%)</span>
                      <span style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{fmt.format(totals.gstAmount)}</span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    paddingTop: 6, borderTop: '0.5px solid var(--color-border)',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', color: 'var(--color-orange)' }}>Total inc. GST</span>
                    <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
                      {fmt.format(totals.total)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {(() => {
              const totals = computeTotals();
              if (!totals) return null;
              const fmt = currencyFmt(totals.region);
              const materialMarginAmount = totals.materialsSubtotal - totals.materialsCost;
              const labourMarginAmount = totals.labourSubtotal - totals.labourCost;
              return (
                <div style={{
                  background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)', padding: '18px 16px',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>YOUR PROFIT — NOT SENT TO CLIENT</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--color-muted)' }}>Materials margin</span>
                      <span style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{fmt.format(materialMarginAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--color-muted)' }}>Labour margin</span>
                      <span style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{fmt.format(labourMarginAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--color-muted)' }}>Total cost (materials + team + travel)</span>
                      <span style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{fmt.format(totals.totalCost)}</span>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    paddingTop: 6, borderTop: '0.5px solid var(--color-border)',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', color: 'var(--color-orange)' }}>
                      Profit ({totals.profitPct.toFixed(0)}%)
                    </span>
                    <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
                      {fmt.format(totals.profit)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {result.assumptions.length > 0 && (
              <div style={{
                background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-card)', padding: '18px 16px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>ASSUMPTIONS — FOR YOUR REVIEW, NOT SENT TO CLIENT</p>
                {result.assumptions.map((a, i) => (
                  <p key={i} style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text)', lineHeight: 1.5 }}>• {a}</p>
                ))}
              </div>
            )}

            <div>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>COMPANY LOGO <span style={{ textTransform: 'none', fontWeight: 400 }}>(small, bottom of PDF)</span></p>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
              {logo ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--color-card)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '10px 14px',
                }}>
                  <img src={logo.dataUrl} alt="Company logo" style={{ height: 32, width: 'auto', maxWidth: 100, objectFit: 'contain' }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--color-muted)' }}>Logo set</span>
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    style={{ fontSize: 13, color: 'var(--color-orange)', background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Change
                  </button>
                  <button
                    onClick={handleRemoveLogo}
                    style={{ fontSize: 13, color: 'var(--color-muted)', background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, border: '0.5px dashed rgba(0,0,0,0.18)',
                    background: 'var(--color-card)', color: 'var(--color-muted)', fontSize: 13.5, fontFamily: 'inherit',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  + Upload your logo (used on every quote)
                </button>
              )}
            </div>

            <div>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>CLIENT NAME <span style={{ textTransform: 'none', fontWeight: 400 }}>(shown on PDF)</span></p>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="e.g. Sarah Thompson"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, border: '0.5px solid var(--color-border)',
                  background: 'var(--color-card)', fontSize: 15, fontFamily: 'inherit', color: 'var(--color-text)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />
            <AddToJobPrompt calculationId={lastEntryId} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={handleSharePdf}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '14px 16px', borderRadius: 14,
                  border: 'none', background: 'var(--color-orange)', color: '#fff',
                  fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '-0.2px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                {docType === 'quote' ? 'Send quote PDF' : 'Send estimate PDF'}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleDownloadPdf}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 12,
                    border: '0.5px solid var(--color-border)', background: 'var(--color-bg)',
                    color: 'var(--color-text)', fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  Download PDF
                </button>
                <button
                  onClick={handleShare}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '12px 16px', borderRadius: 12,
                    border: '0.5px solid var(--color-border)', background: copied ? '#22c55e' : 'var(--color-bg)',
                    color: copied ? '#fff' : 'var(--color-text)', fontSize: 14, fontWeight: 500,
                    fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {copied ? 'Copied' : 'Share as text'}
                </button>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.photoquote[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
