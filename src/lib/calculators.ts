import type { CalculatorId } from '../types';

export interface CalcMeta {
  id: CalculatorId;
  label: string;
  subtitle: string;
  number: string;
  svgPath: string;
  svgPathAccent?: string;
}

export const CALCULATORS: CalcMeta[] = [
  {
    id: 'decking',
    label: 'Decking',
    subtitle: 'Boards, joists, bearers',
    number: '01',
    svgPath: 'M7 5L17 5M6 8L18 8M5 11L19 11M4 14L20 14M3 17L21 17M2 20L22 20',
  },
  {
    id: 'framing',
    label: 'Wall Framing',
    subtitle: 'Studs, plates, nogs',
    number: '02',
    svgPath: 'M4 4v16M10 4v16M16 4v16M22 4v16',
  },
  {
    id: 'equalspacing',
    label: 'Equal Spacing',
    subtitle: 'Divide any span evenly',
    number: '03',
    svgPath: 'M3 12h18M7 6v12M12 6v12M17 6v12',
  },
  {
    id: 'stairs',
    label: 'Stairs',
    subtitle: 'Rise, run, stringer',
    number: '04',
    svgPath: 'M3 20h4v-4h4v-4h4V8h4V4',
  },
  {
    id: 'roof',
    label: 'Roof pitch',
    subtitle: 'Rafters, angles',
    number: '05',
    svgPath: 'M3 18L12 6l9 12',
  },
  {
    id: 'cutlist',
    label: 'Cut list',
    subtitle: 'Optimise waste',
    number: '06',
    svgPath: 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4',
  },
  {
    id: 'baluster',
    label: 'Balusters',
    subtitle: 'Spacing, quantity',
    number: '07',
    svgPath: 'M5 4v16M11 4v16M17 4v16',
  },
  {
    id: 'concrete',
    label: 'Concrete',
    subtitle: 'Slabs, post holes',
    number: '08',
    svgPath: 'M2 10a5 5 0 1 0 10 0a5 5 0 1 0-10 0M13 9h8v9h-8zM2 18h20M5 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  },
  {
    id: 'raked',
    label: 'Raked Wall',
    subtitle: 'Varying stud heights',
    number: '09',
    svgPath: 'M4 18V6M9 18V9M14 18V12M19 18V15M4 6l15 9',
  },
  {
    id: 'cladding',
    label: 'Cladding',
    subtitle: 'Story rod, boards',
    number: '10',
    svgPath: 'M3 5h18M3 9h18M3 13h18M3 17h18M3 5v16M21 5v16',
  },
  {
    id: 'setout',
    label: 'Square Check',
    subtitle: 'Check for square',
    number: '11',
    svgPath: 'M4 20V4M4 20h16M4 4l16 16',
  },
  {
    id: 'roofing',
    label: 'Roofing',
    subtitle: 'Sheets, screws, flashing',
    number: '13',
    svgPath: 'M3 20L12 5L21 20M5 18h14M7 15h10M9 12h6',
  },
  {
    id: 'excavation',
    label: 'Excavation',
    subtitle: 'Volume, swell, truck loads',
    number: '14',
    svgPath: 'M2,10 L8,10 L8,22 L16,22 L16,10 L22,10',
  },
  {
    id: 'gradient',
    label: 'Gradient',
    subtitle: 'Fall, ratio, grade',
    number: '14',
    svgPath: 'M3 20L21 4M21 4h-6M21 4v6',
  },
];
