import type { HistoryEntry } from '../types';

export interface OrderLine {
  id: string;
  name: string;
  qty: number;
  unit: string;
  approx?: boolean;
  sources: string[];
  lengthMm?: number;
}

export interface JobOrder {
  timber: OrderLine[];
  concrete: OrderLine[];
  fixings: OrderLine[];
  other: OrderLine[];
  timberLinealM: number;
}

interface TimberPiece {
  lengthMm: number;
  qty: number;
  calc: string;
  noun: string;
}

function num(v: number | string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtLen(mm: number): string {
  return mm >= 1000
    ? `${(mm / 1000).toFixed(1).replace(/\.0$/, '')} m`
    : `${Math.round(mm)} mm`;
}

export function buildJobOrder(entries: HistoryEntry[]): JobOrder {
  const pieces: TimberPiece[] = [];
  const concrete: OrderLine[] = [];
  const fixings: OrderLine[] = [];
  const other: OrderLine[] = [];
  let looseTimberLm = 0;

  function addPiece(lengthMm: number, qty: number, calc: string, noun: string) {
    if (lengthMm > 0 && qty > 0) pieces.push({ lengthMm: Math.round(lengthMm), qty, calc, noun });
  }

  for (const e of entries) {
    const i = e.inputs;
    const o = e.outputs;
    switch (e.calculatorId) {
      case 'decking': {
        const widthMm = num(i.deckWidth) * 1000;
        const lengthMm = num(i.deckLength) * 1000;
        addPiece(widthMm, num(o.boardCount), 'Decking', 'boards');
        addPiece(lengthMm, num(o.joistCount), 'Decking', 'joists');
        addPiece(widthMm, num(o.bearerCount), 'Decking', 'bearers');
        const screws = num(o.fixingsCount);
        if (screws > 0) fixings.push({ id: `fix-deck-${e.id}`, name: 'Decking screws', qty: screws, unit: 'screws', approx: true, sources: ['Decking'] });
        break;
      }
      case 'framing': {
        const wallLengthMm = num(i.wallLength) * 1000;
        const wallHeightMm = num(i.wallHeight) * 1000;
        addPiece(wallHeightMm, num(o.studCount), 'Framing', 'studs');
        const plateLm = num(o.topPlateLineal) + num(o.bottomPlateLineal);
        const wallLengthM = num(i.wallLength);
        const plateRuns = wallLengthM > 0 ? Math.round(plateLm / wallLengthM) : 0;
        addPiece(wallLengthMm, plateRuns, 'Framing', 'plates');
        const nogLen = num(i.studSpacing) - 90;
        addPiece(nogLen, num(o.nogginCount), 'Framing', 'nogs');
        break;
      }
      case 'raked': {
        addPiece(num(o.highStudHeight), num(o.studCount), 'Raked wall', 'studs (longest)');
        addPiece(num(o.rakePlateLength), 1, 'Raked wall', 'rake plate');
        addPiece(num(o.bottomPlateLineal) * 1000, 1, 'Raked wall', 'bottom plate');
        break;
      }
      case 'cladding': {
        addPiece(num(i.boardLength), num(o.stockCount), 'Cladding', 'cladding boards');
        break;
      }
      case 'stairs': {
        addPiece(num(o.stringerLength), 2, 'Stairs', 'stringers');
        const treads = num(o.treadCount);
        if (treads > 0) other.push({ id: `stair-treads-${e.id}`, name: `Treads, ${num(o.treadDepth)} mm deep`, qty: treads, unit: 'treads', sources: ['Stairs'] });
        break;
      }
      case 'baluster': {
        const count = num(o.balusters);
        if (count > 0) other.push({ id: `balusters-${e.id}`, name: `Balusters, ${num(i.balusterWidth)} mm`, qty: count, unit: 'balusters', sources: ['Balusters'] });
        break;
      }
      case 'fencing': {
        addPiece(num(o.postTotalLengthMm), num(o.postCount), 'Fencing', 'posts');
        addPiece(num(i.height) * 1000, num(o.palingCount), 'Fencing', 'palings');
        const railLm = num(o.railLinealM);
        if (railLm > 0) {
          looseTimberLm += railLm;
          other.push({ id: `rails-${e.id}`, name: 'Fence rails', qty: Math.ceil(railLm), unit: 'lm', sources: ['Fencing'] });
        }
        const bags = num(o.totalConcreteBags);
        if (bags > 0) concrete.push({ id: `conc-fence-${e.id}`, name: '20 kg bags', qty: bags, unit: 'bags', sources: ['Fencing'] });
        break;
      }
      case 'concrete': {
        if (num(o.useBagMix) === 1) {
          const bags = num(o.bagCount);
          if (bags > 0) concrete.push({ id: `conc-bags-${e.id}`, name: '20 kg bags', qty: bags, unit: 'bags', sources: ['Concrete'] });
        } else {
          const vol = num(o.orderVolume);
          if (vol > 0) concrete.push({ id: `conc-mix-${e.id}`, name: 'Ready-mix', qty: vol, unit: 'm³', sources: ['Concrete'] });
        }
        break;
      }
      case 'roofing': {
        const sheets = num(o.sheetCount);
        if (sheets > 0) other.push({ id: `sheets-${e.id}`, name: `Roofing sheets, ${fmtLen(num(o.sheetLengthMm))}`, qty: sheets, unit: 'sheets', sources: ['Roofing'] });
        const screws = num(o.screwCount);
        if (screws > 0) fixings.push({ id: `fix-roof-${e.id}`, name: 'Roofing screws', qty: screws, unit: 'screws', approx: true, sources: ['Roofing'] });
        break;
      }
    }
  }

  // Consolidate timber by length
  const byLen = new Map<number, TimberPiece[]>();
  for (const p of pieces) {
    const group = byLen.get(p.lengthMm);
    if (group) group.push(p);
    else byLen.set(p.lengthMm, [p]);
  }

  const timber: OrderLine[] = [...byLen.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([lengthMm, group]) => {
      const qty = group.reduce((s, p) => s + p.qty, 0);
      const nouns = new Set(group.map(p => p.noun));
      const name = nouns.size === 1
        ? `${fmtLen(lengthMm)} ${group[0].noun}`
        : `${fmtLen(lengthMm)} lengths`;
      const sources = [...new Set(group.map(p => `${p.calc} · ${p.noun}`))];
      return { id: `timber-${lengthMm}`, name, qty, unit: nouns.size === 1 ? group[0].noun : 'lengths', sources, lengthMm };
    });

  // Merge identical concrete lines (e.g. bags from fencing + bags from concrete calc)
  const mergedConcrete: OrderLine[] = [];
  for (const line of concrete) {
    const existing = mergedConcrete.find(l => l.name === line.name && l.unit === line.unit);
    if (existing) {
      existing.qty += line.qty;
      existing.sources = [...new Set([...existing.sources, ...line.sources])];
    } else {
      mergedConcrete.push({ ...line });
    }
  }

  const timberLinealM = parseFloat(
    (timber.reduce((s, l) => s + ((l.lengthMm ?? 0) / 1000) * l.qty, 0) + looseTimberLm).toFixed(1)
  );

  return { timber, concrete: mergedConcrete, fixings, other, timberLinealM };
}

export function applyBuffer(qty: number, pct: number): number {
  return pct > 0 ? Math.ceil(qty * (1 + pct / 100)) : qty;
}

export function formatOrderText(order: JobOrder, jobName: string, bufferPct: number): string {
  const lines: string[] = [`ORDER — ${jobName}${bufferPct > 0 ? ` (+${bufferPct}% waste)` : ''}`];
  const section = (label: string, items: OrderLine[]) => {
    if (items.length === 0) return;
    lines.push('', label.toUpperCase());
    for (const l of items) {
      const qty = l.unit === 'm³' ? l.qty : applyBuffer(l.qty, bufferPct);
      lines.push(`${l.approx ? '~' : ''}${qty.toLocaleString()} ${l.unit === 'lm' ? 'lm' : '×'} ${l.name}`);
    }
  };
  section('Timber', order.timber);
  section('Concrete', order.concrete);
  section('Fixings', order.fixings);
  section('Other', order.other);
  if (order.timberLinealM > 0) {
    lines.push('', `Timber total: ${applyBuffer(order.timberLinealM, bufferPct)} lm`);
  }
  return lines.join('\n');
}
