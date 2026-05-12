import type { CalculatorId } from '../types';

export interface CalcMeta {
  id: CalculatorId;
  label: string;
  subtitle: string;
  number: string;
  svgPath: string;
}

export const CALCULATORS: CalcMeta[] = [
  {
    id: 'decking',
    label: 'Decking',
    subtitle: 'Boards, joists, bearers',
    number: '01',
    svgPath: 'M3 6h18M3 12h18M3 18h18',
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
];
