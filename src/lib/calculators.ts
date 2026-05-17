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
    id: 'stairs',
    label: 'Stairs',
    subtitle: 'Rise, run, stringer',
    number: '03',
    svgPath: 'M3 20h4v-4h4v-4h4V8h4V4',
  },
  {
    id: 'roof',
    label: 'Roof pitch',
    subtitle: 'Rafters, angles',
    number: '04',
    svgPath: 'M3 18L12 6l9 12',
  },
  {
    id: 'cutlist',
    label: 'Cut list',
    subtitle: 'Optimise waste',
    number: '05',
    svgPath: 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4',
  },
  {
    id: 'baluster',
    label: 'Balusters',
    subtitle: 'Spacing, quantity',
    number: '06',
    svgPath: 'M5 4v16M11 4v16M17 4v16',
  },
  {
    id: 'concrete',
    label: 'Concrete',
    subtitle: 'Slabs, post holes',
    number: '07',
    svgPath: 'M3 7h18v13H3zM3 11h18M3 15h18',
  },
  {
    id: 'raked',
    label: 'Raked Wall',
    subtitle: 'Varying stud heights',
    number: '08',
    svgPath: 'M4 18V6M9 18V9M14 18V12M19 18V15M4 6l15 9',
  },
  {
    id: 'cladding',
    label: 'Cladding',
    subtitle: 'Story rod, boards',
    number: '09',
    svgPath: 'M3 5h18M3 9h18M3 13h18M3 17h18M3 5v16M21 5v16',
  },
  {
    id: 'setout',
    label: 'Square Check',
    subtitle: 'Check for square',
    number: '10',
    svgPath: 'M4 20V4M4 20h16M4 4l16 16',
  },
  {
    id: 'codecheck',
    label: 'Code Check',
    subtitle: 'Ask the standard',
    number: '11',
    svgPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h4',
  },
];
