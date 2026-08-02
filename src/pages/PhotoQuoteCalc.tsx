import { useState, useContext, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalcHeader } from '../components/CalcHeader';
import { ResultCard } from '../components/ResultCard';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { JobNameInput } from '../components/JobNameInput';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { buildQuotePdf, formatDateInput } from '../lib/quotePdf';
import type { QuoteDocType, PdfLogo } from '../lib/quotePdf';
import { lookupMaterialPrice, lookupLabourRate } from '../lib/materialPricing';
import { getRememberedMaterialPrice, getRememberedMaterialSource, rememberMaterialPrice, getRememberedLabourRate, rememberLabourRate, fuzzyMaterialKey, getRememberedIsSelf, rememberIsSelf } from '../lib/priceMemory';
import { lookupCachedPrices, normalizeItemKey, isCheapFixing } from '../lib/priceLookup';
import { getLearnedPreferences, recordMaterialRemoved, recordMaterialAdded } from '../lib/buildHabits';
import type { Employee } from '../types';

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

function docTypeLabel(t: QuoteDocType): string {
  return t === 'quote' ? 'Quote' : t === 'invoice' ? 'Invoice' : 'Estimate';
}

type Confidence = 'high' | 'medium' | 'low';

interface ApiMaterial {
  item: string;
  quantity: number | null;
  unit: string;
  note: string;
  confidence: Confidence;
}

interface ApiLabour {
  role: string;
  hours: number;
}

interface QuoteResult {
  error: string;
  errorReason: string;
  confidence: Confidence;
  dimensions: { lengthM: number; widthM: number; areaM2: number };
  materials: ApiMaterial[];
  labour: ApiLabour[];
  scopeSummary: string;
  assumptions: string[];
  clarificationsNeeded: string[];
  exclusions: string[];
  wasteFactorApplied: string;
}

interface EditableMaterial {
  id: string;
  item: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  note?: string;
  confidence?: Confidence;
  sellOverride?: string; // manual client price per unit — undefined means use the material margin
  priceKind?: 'memory' | 'book' | 'shared' | 'manual'; // where unitPrice (cost) came from, for trust display
  priceSourceName?: string; // retailer name, when priceKind is 'shared'
  priceChecked?: boolean; // true once the shared-cache check has resolved (found or not) — gates the "enter manually" prompt
}

interface EditableLabour {
  id: string;
  role: string;
  hours: string;
  rate: string;
  rateOverride?: string; // manual client rate per hour — undefined means use the labour margin
  isSelf?: boolean; // the builder's own time — what's charged for it is profit, not a real cash cost
  employeeName?: string; // for the tradie's own reference only — never printed on the client-facing quote
}

// Shape any calculator can pass via navigate('/calc/photoquote', { state }) to jump straight into
// the pricing/editing/PDF flow with its own exact-math materials — no AI takeoff step needed, since
// the calculator already computed real quantities. See src/lib/calcToQuote.ts for the "Add to
// Quote" button helper that builds this.
export interface CalcQuoteHandoff {
  fromCalculator: true;
  scopeSummary: string;
  materials: { item: string; quantity: number; unit: string; note?: string }[];
  jobName?: string;
  docType?: QuoteDocType; // defaults to 'quote' when omitted (existing calculator "Add to Quote" buttons)
}

// Navigate to /calc/photoquote with this state (e.g. from History, Jobs, or the Quotes tab) to
// reopen a previously saved quote fully editable, instead of starting a new one.
export interface ResumeQuoteRequest {
  resumeEntryId: string;
}

// Full editable state of a quote, snapshotted into the history entry's outputs on every edit
// (as quoteStateJson) so it can be reloaded exactly as left — not just the summary shown in lists.
interface QuoteStateSnapshot {
  fromCalculator: boolean;
  isManual: boolean;
  docType: QuoteDocType;
  result: QuoteResult;
  materialsList: EditableMaterial[];
  labourList: EditableLabour[];
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  siteAddress: string;
  quoteNumber: string;
  notes: string;
  dueDate: string;
  paid: boolean;
  travelMode: TravelMode;
  travelRate: string;
  travelQty: string;
  materialMarginPct: string;
  labourMarginPct: string;
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

// Anthropic's PDF limit is 32MB once base64-encoded (~33% inflation) — cap the raw file well
// under that so the rest of the request body (description, preferences) always has headroom.
const MAX_PLANS_FILE_BYTES = 20 * 1024 * 1024;

function fileToPdfBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_PLANS_FILE_BYTES) {
      reject(new Error('Plans PDF is too large (max 20MB) — try exporting a smaller/compressed version'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('Could not read the plans file — try again'));
    reader.readAsDataURL(file);
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
  const { settings, updateSettings } = useContext(SettingsContext);
  const { history, addEntry, updateEntry } = useContext(HistoryContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [plansFile, setPlansFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [docType, setDocType] = useState<QuoteDocType>('estimate');
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [fromCalculator, setFromCalculator] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobName, setJobName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [quoteNumber, setQuoteNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paid, setPaid] = useState(false);
  const [lastEntryId, setLastEntryId] = useState('');
  const [copied, setCopied] = useState(false);
  const [materialsList, setMaterialsList] = useState<EditableMaterial[]>([]);
  const [labourList, setLabourList] = useState<EditableLabour[]>([]);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [travelMode, setTravelMode] = useState<TravelMode>(() => {
    const stored = localStorage.getItem('setout_photoquote_travel_mode');
    return (TRAVEL_MODES as readonly string[]).includes(stored ?? '') ? (stored as TravelMode) : 'flat';
  });
  const [travelRate, setTravelRate] = useState('');
  const [travelQty, setTravelQty] = useState('');
  const [materialMarginPct, setMaterialMarginPct] = useState(() => localStorage.getItem('setout_photoquote_material_margin') ?? '20');
  // Not persisted to localStorage like materialMarginPct — labour margin is scoped to this quote
  // only, so dragging it here never changes the default the next quote starts with, and never
  // touches a team member's saved charge-out rate back in Settings.
  const [labourMarginPct, setLabourMarginPct] = useState('20');
  const [logo, setLogo] = useState<PdfLogo | null>(() => {
    const stored = localStorage.getItem('setout_photoquote_logo');
    try { return stored ? (JSON.parse(stored) as PdfLogo) : null; } catch { return null; }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plansInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  // What the AI actually proposed for the current takeoff, captured right after a generate — diffed
  // against materialsList when the tradie finalizes (download/share) to learn their build habits.
  // Only set for AI-generated quotes, not calculator handoffs (those are exact math, nothing to learn).
  const aiBaselineRef = useRef<{ item: string; unit: string; note: string }[]>([]);
  const habitsCapturedRef = useRef(true);

  // Keep the job-order snapshot AND the full editable quote state in sync as the tradie edits
  // anything, so reopening this entry later (from History, Jobs, or the Quotes tab) restores it
  // exactly as left, not just the summary shown in lists.
  useEffect(() => {
    if (!lastEntryId || !result) return;
    const totalHours = labourList.reduce((s, l) => s + (parseFloat(l.hours) || 0), 0);
    const materialsSnapshot = materialsList
      .map(m => ({ item: m.item.trim(), quantity: parseFloat(m.quantity) || 0, unit: m.unit.trim() || 'each' }))
      .filter(m => m.item && m.quantity > 0);
    const snapshot: QuoteStateSnapshot = {
      fromCalculator, isManual, docType, result, materialsList, labourList,
      clientName, clientPhone, clientEmail, clientAddress, siteAddress,
      quoteNumber, notes, dueDate, paid, travelMode, travelRate, travelQty,
      materialMarginPct, labourMarginPct,
    };
    updateEntry(lastEntryId, {
      outputs: {
        areaM2: result.dimensions.areaM2,
        labourHours: totalHours,
        materialCount: materialsList.length,
        materialsJson: JSON.stringify(materialsSnapshot),
        quoteStateJson: JSON.stringify(snapshot),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    materialsList, labourList, lastEntryId, fromCalculator, isManual, docType, result,
    clientName, clientPhone, clientEmail, clientAddress, siteAddress,
    quoteNumber, notes, dueDate, paid, travelMode, travelRate, travelQty, materialMarginPct, labourMarginPct,
  ]);

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

  function handlePlansChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PLANS_FILE_BYTES) {
      setError('Plans PDF is too large (max 20MB) — try exporting a smaller/compressed version');
      return;
    }
    setPlansFile(file);
    setResult(null);
    setError('');
  }

  function handleRemovePlans() {
    setPlansFile(null);
    if (plansInputRef.current) plansInputRef.current.value = '';
  }

  // Price priority: remembered (your own confirmed price) → price book directly for cheap,
  // low-variance fixings and consumables → shared cache check for everything else (free, instant,
  // no live search) → if still unknown, left blank for the tradie to type in themselves.
  function priceMaterialsList(materials: { item: string; quantity: number | null; unit: string; note?: string; confidence?: Confidence }[]): EditableMaterial[] {
    return materials.map(m => {
      const remembered = getRememberedMaterialPrice(m.item, settings.region);
      const bookNow = !remembered && isCheapFixing(m.item) ? lookupMaterialPrice(m.item, settings.region) : '';
      return {
        id: crypto.randomUUID(),
        item: m.item,
        quantity: m.quantity === null ? '' : String(m.quantity),
        unit: m.unit,
        unitPrice: remembered || bookNow,
        note: m.note,
        confidence: m.confidence,
        priceKind: remembered ? ('memory' as const) : bookNow ? ('book' as const) : undefined,
        priceSourceName: remembered ? getRememberedMaterialSource(m.item, settings.region) : undefined,
        priceChecked: !!(remembered || bookNow),
      };
    });
  }

  // Diffs the current materials list against what the AI originally proposed and remembers any
  // items the tradie consistently strips out or adds by hand — e.g. always dropping protective tape,
  // or always adding a material the AI keeps missing. Runs once per generation, triggered by a
  // finalize action (download/share) or the next generate, so ad-hoc mid-edit states aren't recorded.
  function captureBuildHabits() {
    if (habitsCapturedRef.current || aiBaselineRef.current.length === 0) return;
    habitsCapturedRef.current = true;

    const currentKeys = new Set(materialsList.filter(m => m.item.trim()).map(m => fuzzyMaterialKey(m.item)));
    const baselineKeys = new Set(aiBaselineRef.current.map(m => fuzzyMaterialKey(m.item)));

    for (const b of aiBaselineRef.current) {
      if (!currentKeys.has(fuzzyMaterialKey(b.item))) recordMaterialRemoved(b.item);
    }
    for (const m of materialsList) {
      if (m.item.trim() && !baselineKeys.has(fuzzyMaterialKey(m.item))) {
        recordMaterialAdded(m.item, m.unit, m.note ?? '');
      }
    }
  }

  // Reserves the next quote number from Settings and advances the counter — called once per new
  // quote (not on every render) so numbers are never reused, even if this one never gets downloaded.
  function reserveQuoteNumber() {
    setQuoteNumber(String(settings.nextQuoteNumber));
    updateSettings({ nextQuoteNumber: settings.nextQuoteNumber + 1 });
  }

  // A calculator (e.g. Fencing) can hand off its exact-math materials via navigate('/calc/photoquote',
  // { state }) to jump straight into pricing/editing/PDF — no AI takeoff step needed, the calculator
  // already computed real quantities.
  useEffect(() => {
    const state = location.state as CalcQuoteHandoff | null;
    if (!state?.fromCalculator) return;

    aiBaselineRef.current = [];
    habitsCapturedRef.current = true;
    setFromCalculator(true);
    setDocType(state.docType ?? 'quote');
    const quote: QuoteResult = {
      error: '', errorReason: '', confidence: 'high',
      dimensions: { lengthM: 0, widthM: 0, areaM2: 0 },
      materials: state.materials.map(m => ({ ...m, note: m.note ?? '', confidence: 'high' as const })),
      labour: [],
      scopeSummary: state.scopeSummary,
      assumptions: [], clarificationsNeeded: [], exclusions: [], wasteFactorApplied: '',
    };
    setResult(quote);
    reserveQuoteNumber();
    const newMaterials = priceMaterialsList(quote.materials);
    setMaterialsList(newMaterials);
    setLabourList([]);
    if (state.jobName) setJobName(state.jobName);
    fillMissingMaterialPrices(newMaterials, settings.region);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'photoquote',
      timestamp: Date.now(),
      inputs: { description: state.scopeSummary },
      outputs: {
        areaM2: 0,
        labourHours: 0,
        materialCount: state.materials.length,
        materialsJson: JSON.stringify(state.materials.map(m => ({ item: m.item, quantity: m.quantity, unit: m.unit }))),
      },
    });
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reopening a saved quote from History, Jobs, or the Quotes tab — navigate('/calc/photoquote',
  // { state: { resumeEntryId } }). Restores the full editable state from that entry's snapshot and
  // keeps editing the SAME history entry (via lastEntryId) instead of creating a new one.
  useEffect(() => {
    const state = location.state as ResumeQuoteRequest | null;
    if (!state?.resumeEntryId) return;

    const entry = history.find(e => e.id === state.resumeEntryId);
    const raw = entry?.outputs.quoteStateJson;
    if (typeof raw !== 'string') { navigate(location.pathname, { replace: true, state: null }); return; }

    try {
      const snap = JSON.parse(raw) as QuoteStateSnapshot;
      setFromCalculator(snap.fromCalculator);
      setIsManual(snap.isManual ?? false);
      setDocType(snap.docType);
      setResult(snap.result);
      setMaterialsList(snap.materialsList);
      setLabourList(snap.labourList);
      setClientName(snap.clientName);
      setClientPhone(snap.clientPhone);
      setClientEmail(snap.clientEmail);
      setClientAddress(snap.clientAddress);
      setSiteAddress(snap.siteAddress);
      setQuoteNumber(snap.quoteNumber);
      setNotes(snap.notes);
      setDueDate(snap.dueDate ?? '');
      setPaid(snap.paid ?? false);
      setTravelMode(snap.travelMode);
      setTravelRate(snap.travelRate);
      setTravelQty(snap.travelQty);
      setMaterialMarginPct(snap.materialMarginPct);
      setLabourMarginPct(snap.labourMarginPct);
      setJobName(entry?.jobName ?? '');
      setLastEntryId(state.resumeEntryId);
      habitsCapturedRef.current = true; // don't re-learn build habits from a quote that's just being reopened, not freshly generated
    } catch { /* corrupt snapshot — fall through to a blank quote rather than crash */ }

    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Starts a completely blank quote/estimate/invoice with no AI call — the tradie types the
  // description and every material/labour line by hand. Reuses the same hidden-photo/no-Generate
  // layout as a calculator handoff, but with an editable scope description instead of a read-only one.
  function startManual(type: QuoteDocType) {
    captureBuildHabits();
    aiBaselineRef.current = [];
    habitsCapturedRef.current = true;
    setIsManual(true);
    setFromCalculator(false);
    setDocType(type);
    setPhoto(null);
    setPhotoPreview('');
    setPlansFile(null);
    setDescription('');
    setError('');
    const blank: QuoteResult = {
      error: '', errorReason: '', confidence: 'high',
      dimensions: { lengthM: 0, widthM: 0, areaM2: 0 },
      materials: [], labour: [],
      scopeSummary: '',
      assumptions: [], clarificationsNeeded: [], exclusions: [], wasteFactorApplied: '',
    };
    setResult(blank);
    reserveQuoteNumber();
    setMaterialsList([]);
    setLabourList([]);
    setJobName('');

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'photoquote',
      timestamp: Date.now(),
      inputs: { description: '' },
      outputs: { areaM2: 0, labourHours: 0, materialCount: 0, materialsJson: '[]' },
    });
  }

  async function handleGenerate() {
    if (!description.trim() || loading) return;

    captureBuildHabits(); // in case a prior AI takeoff this session was never downloaded/shared

    setLoading(true);
    setError('');
    setResult(null);
    setFromCalculator(false);

    try {
      const imageBase64 = photo ? await fileToJpegBase64(photo) : null;
      const pdfBase64 = plansFile ? await fileToPdfBase64(plansFile) : null;
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mediaType: imageBase64 ? 'image/jpeg' : null,
          pdfBase64,
          description: description.trim(),
          region: settings.region,
          preferences: getLearnedPreferences(),
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Estimate failed (${res.status}): ${body}`);
      }

      const quote = (await res.json()) as QuoteResult;
      if (quote.error) {
        setError(quote.errorReason || "Couldn't make sense of that photo/description — try a clearer photo or more detail.");
        return;
      }
      setResult(quote);
      reserveQuoteNumber();
      aiBaselineRef.current = quote.materials.map(m => ({ item: m.item, unit: m.unit, note: m.note }));
      habitsCapturedRef.current = false;
      const newMaterials = priceMaterialsList(quote.materials);
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

  // Runs in the background after results are already shown — checks the shared cache (free,
  // instant) for anything not already remembered or book-priced. No live web search: that cost
  // real credits and took up to a few minutes per quote. Anything still unpriced after the cache
  // check just stays blank with a prompt to type it in — better than a guess that might be wrong.
  async function fillMissingMaterialPrices(materials: EditableMaterial[], region: 'AU' | 'NZ') {
    const missing = materials.filter(m => !m.unitPrice && m.item.trim());
    if (missing.length === 0) return;

    const priced = await lookupCachedPrices(missing.map(m => ({ item: m.item, unit: m.unit || 'each' })), region);
    setMaterialsList(prev => prev.map(m => {
      if (m.unitPrice) return m; // already priced, or the tradie already edited it while this was in flight
      const found = priced.find(p => normalizeItemKey(p.item) === normalizeItemKey(m.item));
      if (found) return { ...m, unitPrice: String(found.price), priceKind: 'shared' as const, priceSourceName: found.source, priceChecked: true };
      return { ...m, priceChecked: true };
    }));
  }

  function handleMaterialMarginChange(v: string) {
    setMaterialMarginPct(v);
    localStorage.setItem('setout_photoquote_material_margin', v);
  }

  function handleLabourMarginChange(v: string) {
    setLabourMarginPct(v);
  }

  function handleTravelModeChange(mode: TravelMode) {
    setTravelMode(mode);
    localStorage.setItem('setout_photoquote_travel_mode', mode);
  }

  function updateMaterial(id: string, patch: Partial<EditableMaterial>) {
    setMaterialsList(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));
  }

  function addMaterialRow() {
    // priceChecked: true — a hand-added row never goes through fillMissingMaterialPrices, so
    // leaving it false would show "Checking price list…" forever instead of prompting for a price.
    setMaterialsList(prev => [...prev, { id: crypto.randomUUID(), item: '', quantity: '1', unit: 'each', unitPrice: '', priceChecked: true }]);
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

  // Adds a role pre-filled from a saved teammate (Settings → Your team) — only pay rate comes
  // straight from their profile; the client rate is left to the labour margin slider, same as a
  // manually-typed role, so it moves with the margin just like materials do. (Their saved charge-out
  // rate is still there in Settings if the tradie wants to "Edit" this row to that fixed number.)
  // Only the role/trade is printed on the client-facing quote — the employee's name is kept as
  // employeeName, shown in-app only, never in the PDF or share text.
  function addEmployeeToLabour(emp: Employee) {
    setLabourList(prev => [...prev, {
      id: crypto.randomUUID(),
      role: emp.role || 'Labour',
      hours: '1',
      rate: String(emp.payRate),
      employeeName: emp.name,
      isSelf: getRememberedIsSelf(emp.name),
    }]);
    setShowTeamPicker(false);
    setTeamSearch('');
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
      const isSelf = l.isSelf ?? false;
      // The builder's own time isn't a real cash cost — everything charged for it is profit, not
      // cost recovery, so it doesn't count toward costTotal even though payRate/rate still display.
      const costTotal = isSelf ? 0 : hours * payRate;
      return { role: l.role.trim() || 'Labour', hours, payRate, rate, overridden, isSelf, costTotal, lineTotal: hours * rate };
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
      quoteNumber: quoteNumber.trim(),
      dueDate,
      paid,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim(),
      clientAddress: clientAddress.trim(),
      siteAddress: siteAddress.trim(),
      jobName: jobName.trim(),
      jobDescription: result.scopeSummary,
      notes: notes.trim(),
      logo,
      region: totals.region,
      businessName: settings.businessName,
      businessNumber: settings.businessNumber,
      businessPhone: settings.businessPhone,
      businessEmail: settings.businessEmail,
      businessAddress: settings.businessAddress,
      licenceNumber: settings.licenceNumber,
      paymentTerms: settings.paymentTerms,
      bankAccountName: settings.bankAccountName,
      bankBSB: settings.bankBSB,
      bankAccountNumber: settings.bankAccountNumber,
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
    captureBuildHabits();
    doc.save(`${(jobName || docType).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`);
  }

  async function handleSharePdf() {
    const doc = buildPdfDoc();
    if (!doc) return;
    captureBuildHabits();
    const fileName = `${(jobName || docType).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
    const blob = doc.output('blob') as Blob;
    const file = new File([blob], fileName, { type: 'application/pdf' });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Setout ${docTypeLabel(docType)}` });
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
    const docLabel = docTypeLabel(docType);
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
      if (totals.labourLines.length > 1) {
        lines.push(`Labour total: ${fmt.format(totals.labourSubtotal)}`);
      }
      if (totals.travel > 0) lines.push(`Travel: ${fmt.format(totals.travel)}`);
      lines.push('');
      lines.push(`${docType === 'invoice' ? 'Total due' : 'Total inc. GST'}: ${fmt.format(totals.total)}`);
      if (docType === 'invoice' && dueDate.trim()) {
        lines.push(`Due: ${formatDateInput(dueDate, totals.region)}`);
      }
      if (docType === 'invoice' && paid) lines.push('PAID IN FULL');
    }
    lines.push('');
    lines.push(
      docType === 'quote' ? 'Final price may vary if site conditions differ. Valid for 30 days.' :
      docType === 'invoice' ? 'Please arrange payment by the due date above.' :
      'This is a preliminary estimate, not a fixed price. A formal quote follows a site visit.'
    );
    return lines.join('\n');
  }

  async function handleShare() {
    captureBuildHabits();
    const text = buildShareText();
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `Setout — ${docTypeLabel(docType)}`, text });
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
  const quoteDetailInputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 12, border: '0.5px solid var(--color-border)',
    background: 'var(--color-card)', fontSize: 15, fontFamily: 'inherit', color: 'var(--color-text)',
    outline: 'none', boxSizing: 'border-box',
  };
  const smallInputStyle: React.CSSProperties = {
    padding: '8px 0', border: 'none', background: 'transparent',
    fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none',
    WebkitAppearance: 'none', MozAppearance: 'textfield' as React.CSSProperties['MozAppearance'],
  };
  const totalLabourHours = labourList.reduce((s, l) => s + (parseFloat(l.hours) || 0), 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title={(fromCalculator || isManual) ? docTypeLabel(docType) : 'SmartQuote'} />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {!fromCalculator && !isManual && !result && !loading && (
          <div style={{ display: 'flex', gap: 8 }}>
            {(['estimate', 'quote', 'invoice'] as QuoteDocType[]).map(t => (
              <button
                key={t}
                onClick={() => startManual(t)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 12.5, fontWeight: 500,
                  fontFamily: 'inherit', cursor: 'pointer',
                  border: '1px dashed var(--color-orange)', background: 'none', color: 'var(--color-orange)',
                }}
              >
                + New {docTypeLabel(t)}
              </button>
            ))}
          </div>
        )}

        {!fromCalculator && !isManual && (
          <>
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

            {/* Construction plans (PDF) */}
            <div>
              <input
                ref={plansInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePlansChange}
                style={{ display: 'none' }}
              />
              {plansFile ? (
                <div style={{
                  width: '100%', padding: '14px 16px', background: 'var(--color-card)',
                  border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-card)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,90,31,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--color-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {plansFile.name}
                    </p>
                    <p style={{ margin: '1px 0 0', fontSize: 11.5, color: 'var(--color-muted)' }}>
                      {(plansFile.size / (1024 * 1024)).toFixed(1)} MB — construction plans
                    </p>
                  </div>
                  <button
                    onClick={handleRemovePlans}
                    aria-label="Remove plans"
                    style={{
                      flexShrink: 0, width: 26, height: 26, borderRadius: '50%', border: 'none',
                      background: 'rgba(0,0,0,0.05)', color: 'var(--color-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => plansInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '16px', background: 'none',
                    border: '0.5px dashed rgba(0,0,0,0.18)', borderRadius: 'var(--radius-card)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text)' }}>
                    Upload a full set of plans <span style={{ color: 'var(--color-muted)' }}>(PDF, optional)</span>
                  </p>
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
          </>
        )}

        {/* Quote / Estimate / Invoice toggle */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>DOCUMENT TYPE</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['estimate', 'quote', 'invoice'] as QuoteDocType[]).map(t => {
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
                  {t === 'quote' ? 'Firm quote' : t === 'invoice' ? 'Invoice' : 'Estimate'}
                </button>
              );
            })}
          </div>
        </div>

        {docType === 'invoice' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>DUE DATE</p>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, border: '0.5px solid var(--color-border)',
                  background: 'var(--color-card)', fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={() => setPaid(p => !p)}
              style={{
                padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                border: paid ? '1.5px solid #22c55e' : '0.5px solid var(--color-border)',
                background: paid ? 'rgba(34,197,94,0.08)' : 'var(--color-card)',
                color: paid ? '#16a34a' : 'var(--color-text)',
                whiteSpace: 'nowrap',
              }}
            >
              {paid ? '✓ Paid' : 'Mark as paid'}
            </button>
          </div>
        )}

        {error && <p style={{ margin: 0, fontSize: 13, color: '#e53e3e', lineHeight: 1.5 }}>{error}</p>}

        {!fromCalculator && !isManual && (
          <>
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
              {loading ? 'Estimating…' : `Generate ${docTypeLabel(docType).toLowerCase()}`}
            </button>
            {loading && (
              <p style={{ margin: '-10px 0 0', fontSize: 12, color: 'var(--color-muted)', textAlign: 'center' }}>
                {plansFile
                  ? 'Reading through the plan set — a full document can take a couple of minutes'
                  : 'Working through a full takeoff — this can take up to a minute'}
              </p>
            )}
          </>
        )}

        {result && (
          <>
            {fromCalculator ? (
              result.scopeSummary.trim() && (
                <div style={{
                  background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)', padding: '14px 16px',
                }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>FROM CALCULATOR</p>
                  <p style={{ margin: '4px 0 0', fontSize: 14.5, color: 'var(--color-text)', lineHeight: 1.4 }}>{result.scopeSummary}</p>
                </div>
              )
            ) : isManual ? (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>JOB DESCRIPTION</p>
                <textarea
                  value={result.scopeSummary}
                  onChange={e => setResult(r => (r ? { ...r, scopeSummary: e.target.value } : r))}
                  placeholder="Describe the job — this prints on the client-facing document"
                  rows={3}
                  style={{
                    width: '100%', background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
                    borderRadius: 12, padding: '12px 14px', fontSize: 15, fontFamily: 'inherit',
                    color: 'var(--color-text)', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5,
                  }}
                />
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <ResultCard label="Area" value={result.dimensions.areaM2} unit="m²" accent />
                  <ResultCard label="Labour" value={totalLabourHours} unit="hrs" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
                    {result.dimensions.lengthM}m × {result.dimensions.widthM}m estimated {photo ? 'from photo' : 'from description'}
                  </p>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase',
                    padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                    color: result.confidence === 'high' ? '#2f9e44' : result.confidence === 'low' ? '#e8590c' : '#9c6f00',
                    background: result.confidence === 'high' ? 'rgba(47,158,68,0.1)' : result.confidence === 'low' ? 'rgba(232,89,12,0.1)' : 'rgba(156,111,0,0.1)',
                  }}>
                    {result.confidence} confidence
                  </span>
                </div>
              </>
            )}

            <div style={{
              background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)', padding: '18px 16px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>MATERIALS — WHAT YOU PAY</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-muted)' }}>Fixings/consumables use a standard estimate; other materials use a remembered or shared price if known, otherwise enter it yourself — check before sending. Material margin below sets the client price</p>
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
                    {m.confidence === 'low' && (
                      <span style={{
                        flexShrink: 0, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase',
                        padding: '2px 6px', borderRadius: 999, color: '#e8590c', background: 'rgba(232,89,12,0.1)', whiteSpace: 'nowrap',
                      }}>
                        Check this
                      </span>
                    )}
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
                  {(() => {
                    const qtyNum = parseFloat(m.quantity) || 0;
                    const costNum = parseFloat(m.unitPrice) || 0;
                    if (qtyNum <= 0 || costNum <= 0) return null;
                    return (
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', textAlign: 'right' }}>
                        {qtyNum} {m.unit || 'unit'} × {currencyFmt(settings.region).format(costNum)} = {currencyFmt(settings.region).format(qtyNum * costNum)}
                      </p>
                    );
                  })()}
                  {m.priceKind && m.priceKind !== 'manual' && (
                    <p style={{ margin: 0, fontSize: 10.5, color: m.priceKind === 'memory' ? '#2f9e44' : 'var(--color-muted)' }}>
                      {m.priceKind === 'memory' && 'Your saved price'}
                      {m.priceKind === 'book' && 'Estimate — please confirm'}
                      {m.priceKind === 'shared' && `Shared price list${m.priceSourceName ? ` — ${m.priceSourceName}` : ''} — please confirm`}
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
                    ) : m.unitPrice ? (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                          Client price: {currencyFmt(settings.region).format(autoSellPrice)}/{m.unit || 'unit'} · {currencyFmt(settings.region).format(autoSellPrice * (parseFloat(m.quantity) || 0))} total
                        </span>
                        <button
                          onClick={() => updateMaterial(m.id, { sellOverride: autoSellPrice.toFixed(2) })}
                          style={{ fontSize: 11, color: 'var(--color-orange)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                        >
                          Edit
                        </button>
                      </>
                    ) : m.priceChecked ? (
                      <span style={{ fontSize: 11, color: 'var(--color-orange)' }}>Price not known — enter it above</span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--color-muted)', fontStyle: 'italic' }}>Checking price list…</span>
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
                      onBlur={e => {
                        if (!l.employeeName && getRememberedIsSelf(e.target.value)) updateLabour(l.id, { isSelf: true });
                      }}
                      placeholder="Role — e.g. Carpenter"
                      style={{
                        flex: 1, minWidth: 0, padding: '6px 0', border: 'none', background: 'transparent',
                        fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none',
                      }}
                    />
                    {l.employeeName && (
                      <span style={{
                        flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#fff',
                        background: 'var(--color-orange)', borderRadius: 8, padding: '5px 12px', whiteSpace: 'nowrap',
                      }}>
                        {l.employeeName}
                      </span>
                    )}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => {
                        const next = !l.isSelf;
                        updateLabour(l.id, { isSelf: next });
                        rememberIsSelf(l.employeeName || l.role, next);
                      }}
                      style={{
                        padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                        border: l.isSelf ? '1px solid var(--color-orange)' : '0.5px solid var(--color-border)',
                        background: l.isSelf ? 'rgba(255,90,31,0.08)' : 'var(--color-bg)',
                        color: l.isSelf ? 'var(--color-orange)' : 'var(--color-muted)',
                      }}
                    >
                      {l.isSelf ? '✓ Your own time' : 'Your own time?'}
                    </button>
                    {l.isSelf && (
                      <span style={{ fontSize: 10.5, color: 'var(--color-muted)' }}>Counts as profit, not a cost</span>
                    )}
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={addLabourRow}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px 0', borderRadius: 10, border: '0.5px dashed rgba(0,0,0,0.18)',
                    background: 'none', color: 'var(--color-orange)', fontSize: 13.5, fontWeight: 500,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  + Add labour role
                </button>
                <button
                  onClick={() => setShowTeamPicker(v => !v)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px 0', borderRadius: 10,
                    border: showTeamPicker ? '1.5px solid var(--color-orange)' : '0.5px dashed rgba(0,0,0,0.18)',
                    background: showTeamPicker ? 'rgba(255,90,31,0.06)' : 'none',
                    color: 'var(--color-orange)', fontSize: 13.5, fontWeight: 500,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  + From your team
                </button>
              </div>

              {showTeamPicker && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 8,
                  padding: '12px', borderRadius: 10, border: '0.5px solid var(--color-border)', background: 'var(--color-bg)',
                }}>
                  {settings.employees.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                      No team saved yet. Add employees once in <a href="#/settings" style={{ color: 'var(--color-orange)' }}>Settings → Your team</a>, then pick them here on every future quote.
                    </p>
                  ) : (
                    <>
                      {settings.employees.length > 4 && (
                        <input
                          type="text"
                          placeholder="Search your team"
                          value={teamSearch}
                          onChange={e => setTeamSearch(e.target.value)}
                          style={{
                            padding: '8px 10px', borderRadius: 8, border: '0.5px solid var(--color-border)',
                            background: 'var(--color-card)', fontSize: 13, fontFamily: 'inherit',
                            color: 'var(--color-text)', outline: 'none',
                          }}
                        />
                      )}
                      {settings.employees
                        .filter(emp => `${emp.name} ${emp.role}`.toLowerCase().includes(teamSearch.trim().toLowerCase()))
                        .map(emp => (
                          <button
                            key={emp.id}
                            onClick={() => addEmployeeToLabour(emp)}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                              padding: '10px 12px', borderRadius: 8, border: '0.5px solid var(--color-border)',
                              background: 'var(--color-card)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                            }}
                          >
                            <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--color-text)' }}>{emp.name}</span>
                            <span style={{ fontSize: 11.5, color: 'var(--color-muted)' }}>
                              {emp.role || 'No role set'} · {currencyFmt(settings.region).format(emp.payRate)}/hr pay · {currencyFmt(settings.region).format(emp.chargeRate)}/hr charge
                            </span>
                          </button>
                        ))}
                    </>
                  )}
                </div>
              )}
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
                    <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', color: 'var(--color-orange)' }}>{docType === 'invoice' ? 'Total due' : 'Total inc. GST'}</span>
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
              const selfLabourAmount = totals.labourLines.filter(l => l.isSelf).reduce((s, l) => s + l.lineTotal, 0);
              const selfHours = totals.labourLines.filter(l => l.isSelf).reduce((s, l) => s + l.hours, 0);
              const labourMarginAmount = totals.labourLines.filter(l => !l.isSelf).reduce((s, l) => s + (l.lineTotal - l.costTotal), 0);
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
                    {selfLabourAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--color-muted)' }}>Your own time (all profit)</span>
                        <span style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{fmt.format(selfLabourAmount)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--color-muted)' }}>Total cost (materials + team + travel)</span>
                      <span style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{fmt.format(totals.totalCost)}</span>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    paddingTop: 6, borderTop: '0.5px solid var(--color-border)',
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase',
                      color: totals.profit > 0 ? '#2f9e44' : '#e53e3e',
                    }}>
                      Profit ({totals.profitPct.toFixed(0)}%)
                    </span>
                    <span style={{
                      fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px',
                      color: totals.profit > 0 ? '#2f9e44' : '#e53e3e',
                    }}>
                      {fmt.format(totals.profit)}
                    </span>
                  </div>
                  {selfHours > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--color-muted)' }}>Profit per hour</span>
                      <span style={{ color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>{fmt.format(totals.profit / selfHours)}/hr</span>
                    </div>
                  )}
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

            {result.clarificationsNeeded.length > 0 && (
              <div style={{
                background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-card)', padding: '18px 16px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>WORTH CONFIRMING — FOR YOUR REVIEW, NOT SENT TO CLIENT</p>
                {result.clarificationsNeeded.map((c, i) => (
                  <p key={i} style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text)', lineHeight: 1.5 }}>• {c}</p>
                ))}
              </div>
            )}

            {result.exclusions.length > 0 && (
              <div style={{
                background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-card)', padding: '18px 16px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>NOT INCLUDED IN THIS TAKEOFF</p>
                {result.exclusions.map((ex, i) => (
                  <p key={i} style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text)', lineHeight: 1.5 }}>• {ex}</p>
                ))}
              </div>
            )}

            <div>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>COMPANY LOGO <span style={{ textTransform: 'none', fontWeight: 400 }}>(small, top of PDF)</span></p>
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
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>QUOTE DETAILS <span style={{ textTransform: 'none', fontWeight: 400 }}>(shown on PDF)</span></p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={quoteNumber}
                    onChange={e => setQuoteNumber(e.target.value)}
                    placeholder="Quote #"
                    style={{ ...quoteDetailInputStyle, flex: '0 0 90px' }}
                  />
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Client name"
                    style={{ ...quoteDetailInputStyle, flex: 1, minWidth: 0 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    placeholder="Client phone"
                    style={{ ...quoteDetailInputStyle, flex: 1, minWidth: 0 }}
                  />
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="Client email"
                    style={{ ...quoteDetailInputStyle, flex: 1, minWidth: 0 }}
                  />
                </div>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={e => setClientAddress(e.target.value)}
                  placeholder="Client address (optional)"
                  style={quoteDetailInputStyle}
                />
                <input
                  type="text"
                  value={siteAddress}
                  onChange={e => setSiteAddress(e.target.value)}
                  placeholder="Site address (if different, optional)"
                  style={quoteDetailInputStyle}
                />
              </div>
            </div>

            <div>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>NOTES <span style={{ textTransform: 'none', fontWeight: 400 }}>(shown on PDF)</span></p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Client to arrange council permit. Excludes removal of existing structure."
                rows={3}
                style={{
                  width: '100%', background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
                  borderRadius: 12, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit',
                  color: 'var(--color-text)', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5,
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
                {`Send ${docTypeLabel(docType).toLowerCase()} PDF`}
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
              {fromCalculator
                ? 'Materials and quantities came from the calculator, not a SmartQuote estimate. Prices are starting figures — check before ordering or quoting a client.'
                : isManual
                ? 'Entered manually — check all materials, hours, and prices before sending.'
                : COMPLIANCE_NOTES.photoquote[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
