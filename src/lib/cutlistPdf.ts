import { jsPDF } from 'jspdf';
import type { CutlistResult, CutlistPlan } from '../calculators/cutlist';

export interface CutlistPdfSection {
  title: string;
  stockLabel?: string; // e.g. "4.8m stock" — shown in the section header
  result: CutlistResult;
}

export interface CutlistPdfInput {
  calcName: string;
  jobName?: string;
  sections: CutlistPdfSection[];
}

// Group identical bins for cleaner PDF display.
function groupBins(plan: CutlistPlan[]): { bin: CutlistPlan; count: number }[] {
  const groups: { bin: CutlistPlan; count: number }[] = [];
  for (const bin of plan) {
    const key = `${bin.stockLength}:${bin.cuts.map(c => c.length).sort((a, b) => b - a).join(',')}`;
    const existing = groups.find(g => {
      const gKey = `${g.bin.stockLength}:${g.bin.cuts.map(c => c.length).sort((a, b) => b - a).join(',')}`;
      return gKey === key;
    });
    if (existing) {
      existing.count++;
    } else {
      groups.push({ bin, count: 1 });
    }
  }
  return groups;
}

// Group identical cut lengths within a single bin: [3000,3000,1500] → "2 × 3000 + 1500"
function formatBinCuts(cuts: { length: number; qty: number }[]): string {
  const map = new Map<number, number>();
  for (const { length } of cuts) map.set(length, (map.get(length) ?? 0) + 1);
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([len, qty]) => (qty > 1 ? `${qty} × ${len}mm` : `${len}mm`))
    .join(' + ');
}

function fmtLength(mm: number): string {
  return `${parseFloat((mm / 1000).toFixed(3))}m`;
}

export function buildCutlistPdf(input: CutlistPdfInput): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 52;

  function ensureSpace(h: number) {
    if (y + h > pageH - 60) { doc.addPage(); y = 52; }
  }

  // ── Header ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(10, 10, 10);
  doc.text('Set', marginX, y);
  const setW = doc.getTextWidth('Set');
  doc.setTextColor(255, 90, 31);
  doc.text('out', marginX + setW, y);
  doc.setTextColor(10, 10, 10);
  doc.setFont('helvetica', 'normal');
  doc.text('  —  Cut List', marginX + setW + doc.getTextWidth('out'), y);

  y += 10;
  doc.setDrawColor(255, 90, 31);
  doc.setLineWidth(2);
  doc.line(marginX, y, pageW - marginX, y);
  y += 16;

  // ── Meta ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(120, 120, 120);
  const dateStr = new Date().toLocaleDateString('en-AU');
  doc.text(`Calculator: ${input.calcName}`, marginX, y);
  doc.text(`Date: ${dateStr}`, pageW - marginX, y, { align: 'right' });
  y += 13;
  if (input.jobName) {
    doc.text(`Job: ${input.jobName}`, marginX, y);
    y += 13;
  }
  y += 14;

  // ── Sections ────────────────────────────────────────────────
  for (const section of input.sections) {
    const { title, stockLabel, result } = section;
    const grouped = groupBins(result.plan);
    const orderSummary = result.materialList
      .map(m => `${m.count} × ${fmtLength(m.stockLength)}`)
      .join(', ');

    ensureSpace(50);

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(10, 10, 10);
    const sectionHeader = stockLabel ? `${title.toUpperCase()}  —  ${stockLabel}` : title.toUpperCase();
    doc.text(sectionHeader, marginX, y);
    y += 5;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.75);
    doc.line(marginX, y, pageW - marginX, y);
    y += 13;

    // Bin rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);

    for (const { bin, count } of grouped) {
      ensureSpace(16);
      const cutsStr = formatBinCuts(bin.cuts);
      const wasteStr = bin.waste > 3 ? `  off-cut: ${bin.waste - 3}mm` : '';
      const countPrefix = count > 1 ? `${count} × ` : '';
      doc.setTextColor(40, 40, 40);
      doc.text(`${countPrefix}${cutsStr}`, marginX + 12, y);
      if (wasteStr) {
        doc.setTextColor(160, 160, 160);
        doc.text(wasteStr, marginX + 12 + doc.getTextWidth(`${countPrefix}${cutsStr}`), y);
      }
      y += 15;
    }

    y += 4;

    // Order line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 90, 31);
    doc.text(`Order: ${orderSummary}  ·  ${result.outputs.wastePercent}% waste`, marginX + 12, y);

    y += 24;
  }

  // ── Full order summary ───────────────────────────────────────
  if (input.sections.length > 1) {
    ensureSpace(30 + input.sections.length * 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(10, 10, 10);
    doc.text('FULL ORDER', marginX, y);
    y += 5;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.75);
    doc.line(marginX, y, pageW - marginX, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);

    for (const section of input.sections) {
      const orderSummary = section.result.materialList
        .map(m => `${m.count} × ${fmtLength(m.stockLength)}`)
        .join(', ');
      doc.text(`${section.title}:  ${orderSummary}`, marginX + 12, y);
      y += 14;
    }
  }

  // ── Footer ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('Generated by Setout', marginX, pageH - 22);

  return doc;
}
