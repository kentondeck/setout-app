import type { WorkingStep } from '../components/ApprenticeWorking';

export interface DeckingInputs {
  deckLength: number;   // metres
  deckWidth: number;    // metres
  boardWidth: number;   // mm
  boardGap: number;     // mm
  joistSpacing: number; // mm
  bearerSpacing: number; // mm
}

export interface DeckingOutputs extends Record<string, number> {
  boardCount: number;
  totalLinealMetres: number;
  joistCount: number;
  bearerCount: number;
  fixingsCount: number;
}

export interface GapSuggestion {
  boardCount: number;
  gap: number; // mm, to 1dp
}

export interface DeckingResult {
  outputs: DeckingOutputs;
  steps: WorkingStep[];
  lastBoardWidth: number; // mm — actual width of the last board (< boardWidth means a rip is needed)
  gapSuggestions: GapSuggestion[]; // empty when last board is full width
}

// Common decking board stock lengths (mm). Lineal metres rounds up to the
// smallest stock that fits each board so the order matches what's actually bought.
const BOARD_STOCK_LENGTHS = [3000, 3600, 4200, 4800, 5400, 6000];

export function calculateDecking(inputs: DeckingInputs): DeckingResult {
  const { deckLength, deckWidth, boardWidth, boardGap, joistSpacing, bearerSpacing } = inputs;

  // Convention: joists run parallel to deck LENGTH (the long structural members),
  // boards run perpendicular across deck WIDTH (each board spans the width).
  const effectiveBoardWidth = boardWidth + boardGap;

  // Boards are spaced along the deck length direction
  const boardCount = Math.ceil((deckLength * 1000) / effectiveBoardWidth);

  // Each board spans the deck width — round up to nearest available stock length.
  // When the span exceeds the longest stock, the board must be butt-joined; the
  // lineal-metre figure then reflects the true span (joins handled in the cut list).
  const boardLengthMm = deckWidth * 1000;
  const maxStockMm = BOARD_STOCK_LENGTHS[BOARD_STOCK_LENGTHS.length - 1];
  const needsJoin = boardLengthMm > maxStockMm;
  const boardStockMm = BOARD_STOCK_LENGTHS.find(s => s >= boardLengthMm) ?? boardLengthMm;
  const totalLinealMetres = parseFloat(((boardCount * boardStockMm) / 1000).toFixed(2));

  // Joists span the deck length, spaced across the width
  const joistCount = Math.floor((deckWidth * 1000) / joistSpacing) + 1;

  // Bearers run perpendicular to joists (span the width), spaced along the length
  const bearerCount = Math.floor((deckLength * 1000) / bearerSpacing) + 1;

  // 2 fixings per board-joist intersection, +10% for joins landing on joists (4 screws instead of 2)
  const fixingsCount = Math.ceil(boardCount * joistCount * 2 * 1.1);

  const fixingsStep: WorkingStep = {
    label: 'Fixings (approx)',
    formula: 'board count × joist count × 2 screws per intersection, +10% for board joins',
    result: `${boardCount} × ${joistCount} × 2 × 1.1 = ${fixingsCount} screws`,
  };

  const stockNote = needsJoin
    ? ` (${boardLengthMm}mm span exceeds the ${maxStockMm}mm max board — butt-joins required)`
    : boardStockMm > boardLengthMm
      ? ` (${boardLengthMm}mm board rounded up to ${boardStockMm}mm stock)`
      : '';

  const steps: WorkingStep[] = [
    {
      label: 'Board count',
      formula: 'ceil( deck length (mm) ÷ (board width + gap) )',
      result: `ceil( ${deckLength * 1000} ÷ (${boardWidth} + ${boardGap}) ) = ceil( ${(deckLength * 1000 / effectiveBoardWidth).toFixed(2)} ) = ${boardCount} boards`,
    },
    {
      label: 'Total lineal metres',
      formula: 'board count × stock length per board',
      result: `${boardCount} × ${(boardStockMm / 1000).toFixed(1)}m = ${totalLinealMetres}lm${stockNote}`,
    },
    {
      label: 'Joist count',
      formula: 'floor( deck width (mm) ÷ joist spacing ) + 1',
      result: `floor( ${deckWidth * 1000} ÷ ${joistSpacing} ) + 1 = ${joistCount} joists`,
    },
    {
      label: 'Bearer count',
      formula: 'floor( deck length (mm) ÷ bearer spacing ) + 1',
      result: `floor( ${deckLength * 1000} ÷ ${bearerSpacing} ) + 1 = ${bearerCount} bearers`,
    },
    fixingsStep,
  ];

  // Actual width of the last board — less than boardWidth means a rip is needed
  const lastBoardWidth = Math.round(deckLength * 1000 - (boardCount - 1) * effectiveBoardWidth);

  // For each nearby board count, find what gap gives exactly full boards
  const gapSuggestions: GapSuggestion[] = [];
  if (lastBoardWidth < boardWidth) {
    const nMin = Math.floor((deckLength * 1000) / (boardWidth + 6));
    const nMax = Math.ceil((deckLength * 1000) / (boardWidth + 3));
    for (let n = Math.max(2, nMin); n <= nMax; n++) {
      const g = (deckLength * 1000 - n * boardWidth) / (n - 1);
      if (g >= 3 && g <= 6) {
        gapSuggestions.push({ boardCount: n, gap: parseFloat(g.toFixed(1)) });
      }
    }
  }

  return {
    outputs: { boardCount, totalLinealMetres, joistCount, bearerCount, fixingsCount },
    steps,
    lastBoardWidth,
    gapSuggestions,
  };
}
