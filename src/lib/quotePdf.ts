import { jsPDF } from 'jspdf';
import type { Region } from '../types';

export type QuoteDocType = 'quote' | 'estimate' | 'invoice';

export interface PdfLabourLine {
  role: string;
  hours: number;
  rate: number;
  lineTotal: number;
}

export interface PdfLogo {
  dataUrl: string;
  width: number;
  height: number;
}

export interface PdfQuoteInput {
  docType: QuoteDocType;
  quoteNumber: string;
  dueDate: string; // invoice only
  paid: boolean; // invoice only
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  siteAddress: string;
  jobName: string;
  jobDescription: string;
  notes: string;
  logo?: PdfLogo | null;
  region: Region;
  businessName: string;
  businessNumber: string; // ABN (AU) or GST number (NZ)
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  licenceNumber: string; // builder's licence (AU) or LBP number (NZ)
  paymentTerms: string;
  bankAccountName: string;
  bankBSB: string; // AU only
  bankAccountNumber: string;
  areaM2: number;
  lengthM: number;
  widthM: number;
  materialsSubtotal: number;
  labour: PdfLabourLine[];
  labourSubtotal: number;
  travelAmount: number;
  subtotal: number;
  gstPct: number;
  gstAmount: number;
  total: number;
}

const DISCLAIMERS: Record<QuoteDocType, string> = {
  quote: 'Final price may vary if actual site conditions differ from those assessed. Valid for 30 days from the date above.',
  estimate: 'This is a preliminary estimate, not a fixed price. A formal quote will be provided following an on-site assessment.',
  invoice: 'Please arrange payment by the due date above. Contact us if you have any questions about this invoice.',
};

function fmtCurrency(amount: number, region: Region): string {
  return new Intl.NumberFormat(region === 'AU' ? 'en-AU' : 'en-NZ', {
    style: 'currency',
    currency: region === 'AU' ? 'AUD' : 'NZD',
    maximumFractionDigits: 2,
  }).format(amount);
}

// Formats a <input type="date"> value ("YYYY-MM-DD") for display. Parses the components as a local
// date rather than `new Date(dateStr)`, which reads bare date strings as UTC midnight — in any
// timezone behind UTC that rolls back to the previous day once formatted in local time.
export function formatDateInput(dateStr: string, region: Region): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(region === 'AU' ? 'en-AU' : 'en-NZ');
}

export function buildQuotePdf(q: PdfQuoteInput): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 56;

  const money = (n: number) => fmtCurrency(n, q.region);
  const docTitle = q.docType === 'quote' ? 'Quote' : q.docType === 'invoice' ? 'Invoice' : 'Estimate';

  function ensureSpace(next: number) {
    if (y + next > pageHeight - 90) {
      doc.addPage();
      y = 56;
    }
  }

  // Header — company logo, big and centred; doc type label below it
  const headerLogoHeight = 84;
  let headerBottomY = y;

  if (q.logo) {
    const logoW = (q.logo.width / q.logo.height) * headerLogoHeight;
    const logoTopY = 28;
    try {
      doc.addImage(q.logo.dataUrl, 'PNG', (pageWidth - logoW) / 2, logoTopY, logoW, headerLogoHeight);
      headerBottomY = logoTopY + headerLogoHeight + 14;
    } catch { /* unsupported image data — skip logo rather than fail the whole PDF */ }
  }

  y = Math.max(y, headerBottomY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(10, 10, 10);
  doc.text(docTitle, pageWidth / 2, y, { align: 'center' });

  y += 16;
  doc.setDrawColor(255, 90, 31);
  doc.setLineWidth(2);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 30;

  // Business identity — ABN (AU) or GST number (NZ), required for a valid tax invoice
  const businessLines: string[] = [];
  if (q.businessName) businessLines.push(q.businessName);
  const businessNumberLabel = q.region === 'AU' ? 'ABN' : 'GST';
  const licenceLabel = q.region === 'AU' ? 'Licence' : 'LBP';
  const identityParts = [
    q.businessNumber ? `${businessNumberLabel}: ${q.businessNumber}` : '',
    q.licenceNumber ? `${licenceLabel}: ${q.licenceNumber}` : '',
  ].filter(Boolean).join('   ·   ');
  if (identityParts) businessLines.push(identityParts);
  const businessContact = [q.businessPhone, q.businessEmail].filter(Boolean).join('   ·   ');
  if (businessContact) businessLines.push(businessContact);
  if (q.businessAddress) businessLines.push(q.businessAddress);

  if (businessLines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 100, 100);
    for (const line of businessLines) {
      doc.text(line, pageWidth / 2, y, { align: 'center' });
      y += 13;
    }
    y += 12;
  }

  // Job / client
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(10, 10, 10);
  doc.text(q.jobName || `Job ${docTitle.toLowerCase()}`, marginX, y);
  if (q.quoteNumber.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`#${q.quoteNumber.trim()}`, pageWidth - marginX, y, { align: 'right' });
  }
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(100, 100, 100);
  if (q.clientName) { doc.text(`For: ${q.clientName}`, marginX, y); y += 14; }
  const clientContact = [q.clientPhone, q.clientEmail].filter(Boolean).join('   ·   ');
  if (clientContact) { doc.text(clientContact, marginX, y); y += 14; }
  if (q.clientAddress) { doc.text(q.clientAddress, marginX, y); y += 14; }
  doc.text(`Date: ${new Date().toLocaleDateString(q.region === 'AU' ? 'en-AU' : 'en-NZ')}`, marginX, y);
  if (q.docType === 'invoice' && q.dueDate.trim()) {
    const dueDateStr = formatDateInput(q.dueDate, q.region);
    doc.text(`Due: ${dueDateStr}`, marginX + 160, y);
  }
  y += 14;
  if (q.siteAddress.trim()) {
    doc.text(`Site: ${q.siteAddress.trim()}`, marginX, y);
    y += 14;
  }
  if (q.areaM2 > 0) {
    doc.text(`Area: ${q.lengthM}m x ${q.widthM}m (${q.areaM2}m2)`, marginX, y);
    y += 20;
  } else {
    y += 6;
  }

  // Job description
  if (q.jobDescription.trim()) {
    const descLines: string[] = doc.splitTextToSize(q.jobDescription.trim(), pageWidth - marginX * 2);
    ensureSpace(descLines.length * 13 + 10);
    doc.setTextColor(60, 60, 60);
    doc.text(descLines, marginX, y);
    y += descLines.length * 13 + 14;
  } else {
    y += 8;
  }

  // Line items table header
  const col = { item: marginX, qty: marginX + 260, price: marginX + 340, total: pageWidth - marginX };
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(140, 140, 140);
  doc.text('ITEM', col.item, y);
  doc.text('HOURS', col.qty, y);
  doc.text('RATE', col.price, y);
  doc.text('TOTAL', col.total, y, { align: 'right' });
  y += 6;
  doc.setDrawColor(225, 225, 225);
  doc.setLineWidth(0.75);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);

  // Materials — one summary line, not itemised
  ensureSpace(20);
  doc.setTextColor(10, 10, 10);
  doc.text('Materials', col.item, y);
  doc.text(money(q.materialsSubtotal), col.total, y, { align: 'right' });
  y += 22;

  // Labour — one row per role, plus a rolled-up total when there's more than one
  for (const l of q.labour) {
    ensureSpace(20);
    doc.setTextColor(10, 10, 10);
    doc.text(`Labour — ${l.role}`, col.item, y);
    doc.setTextColor(90, 90, 90);
    doc.text(`${l.hours} hrs`, col.qty, y);
    doc.text(money(l.rate) + '/hr', col.price, y);
    doc.setTextColor(10, 10, 10);
    doc.text(money(l.lineTotal), col.total, y, { align: 'right' });
    y += 20;
  }
  if (q.labour.length > 1) {
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 10, 10);
    doc.text('Labour total', col.item, y);
    doc.text(money(q.labourSubtotal), col.total, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 20;
  }

  // Travel — optional
  if (q.travelAmount > 0) {
    ensureSpace(20);
    doc.setTextColor(10, 10, 10);
    doc.text('Travel', col.item, y);
    doc.text(money(q.travelAmount), col.total, y, { align: 'right' });
    y += 20;
  }

  y += 6;
  doc.setDrawColor(225, 225, 225);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 24;

  // Totals
  ensureSpace(120);
  function totalRow(label: string, value: string, opts?: { bold?: boolean; accent?: boolean }) {
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(opts?.bold ? 12.5 : 10.5);
    doc.setTextColor(opts?.accent ? 255 : opts?.bold ? 10 : 100, opts?.accent ? 90 : opts?.bold ? 10 : 100, opts?.accent ? 31 : opts?.bold ? 10 : 100);
    doc.text(label, col.price, y);
    doc.text(value, col.total, y, { align: 'right' });
    y += opts?.bold ? 22 : 18;
  }
  totalRow(`GST (${q.gstPct}%)`, money(q.gstAmount));
  y += 4;
  doc.setDrawColor(10, 10, 10);
  doc.setLineWidth(1);
  doc.line(col.price - 10, y - 14, pageWidth - marginX, y - 14);
  totalRow(q.docType === 'invoice' ? 'Total due' : 'Total inc. GST', money(q.total), { bold: true, accent: true });
  y += 20;

  // Paid stamp — invoice only
  if (q.docType === 'invoice' && q.paid) {
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(34, 197, 94);
    doc.text('PAID IN FULL', col.total, y, { align: 'right' });
    y += 20;
  }

  // Payment details — terms and bank transfer info, shown once as its own block
  const bankParts = [
    q.bankAccountName ? `Acc name: ${q.bankAccountName}` : '',
    q.bankBSB ? `BSB: ${q.bankBSB}` : '',
    q.bankAccountNumber ? `Acc: ${q.bankAccountNumber}` : '',
  ].filter(Boolean).join('   ·   ');

  if (q.paymentTerms.trim() || bankParts) {
    ensureSpace(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(140, 140, 140);
    doc.text('PAYMENT', marginX, y);
    y += 6;
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.75);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    if (q.paymentTerms.trim()) {
      const termsLines: string[] = doc.splitTextToSize(q.paymentTerms.trim(), pageWidth - marginX * 2);
      doc.text(termsLines, marginX, y);
      y += termsLines.length * 13 + 4;
    }
    if (bankParts) {
      doc.text(bankParts, marginX, y);
      y += 18;
    }
  }

  // Notes — freeform, shown once as its own block
  if (q.notes.trim()) {
    ensureSpace(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(140, 140, 140);
    doc.text('NOTES', marginX, y);
    y += 6;
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.75);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const notesLines: string[] = doc.splitTextToSize(q.notes.trim(), pageWidth - marginX * 2);
    ensureSpace(notesLines.length * 13 + 10);
    doc.text(notesLines, marginX, y);
    y += notesLines.length * 13 + 4;
  }

  // Footer — disclaimer, with a small Setout credit line below it
  const disclaimerLines: string[] = doc.splitTextToSize(DISCLAIMERS[q.docType], pageWidth - marginX * 2);
  const wordmarkY = pageHeight - 22;
  const disclaimerY = wordmarkY - 16 - (disclaimerLines.length - 1) * 11;
  ensureSpace(30);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(150, 150, 150);
  doc.text(disclaimerLines, marginX, disclaimerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(10, 10, 10);
  doc.text('Set', marginX, wordmarkY);
  const setWidth = doc.getTextWidth('Set');
  doc.setTextColor(255, 90, 31);
  doc.text('out', marginX + setWidth, wordmarkY);

  return doc;
}
