import type { jsPDF } from 'jspdf';
import regular from '../assets/fonts/Inter-Regular.ttf?inline';
import semibold from '../assets/fonts/Inter-SemiBold.ttf?inline';

// jsPDF only ships Helvetica; anything customer-facing must use the brand font.
// jsPDF has no weight axis, so Regular maps to 'normal' and SemiBold to 'bold'.
export const PDF_FONT = 'Inter';

const b64 = (dataUri: string) => dataUri.slice(dataUri.indexOf(',') + 1);

export function registerPdfFonts(doc: jsPDF): void {
  doc.addFileToVFS('Inter-Regular.ttf', b64(regular));
  doc.addFont('Inter-Regular.ttf', PDF_FONT, 'normal');
  doc.addFileToVFS('Inter-SemiBold.ttf', b64(semibold));
  doc.addFont('Inter-SemiBold.ttf', PDF_FONT, 'bold');
  doc.setFont(PDF_FONT, 'normal');
}
