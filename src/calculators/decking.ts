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

export function calculateDecking(inputs: DeckingInputs): DeckingResult {
  const { deckLength, deckWidth, boardWidth, boardGap, joistSpacing, bearerSpacing } = inputs;

  // How many boards to cover the deck width
  const effectiveBoardWidth = boardWidth + boardGap;
  const boardCount = Math.ceil((deckWidth * 1000) / effectiveBoardWidth);

  // Total lineal metres of decking boards ordered
  const totalLinealMetres = parseFloat((boardCount * deckLength).toFixed(2));

  // Joists span the deck width, spaced along the length (per AS 1684)
  const joistCount = Math.floor((deckLength * 1000) / joistSpacing) + 1;

  // Bearers span the deck length, spaced across the width
  const bearerCount = Math.ceil((deckWidth * 1000) / bearerSpacing) + 1;

  // 2 fixings per board-joist intersection, +10% for joins landing on joists (4 screws instead of 2)
  const fixingsCount = Math.ceil(boardCount * joistCount * 2 * 1.1);

  const fixingsStep: WorkingStep = {
    label: 'Fixings (approx)',
    formula: 'board count × joist count × 2 screws per intersection, +10% for board joins',
    result: `${boardCount} × ${joistCount} × 2 × 1.1 = ${fixingsCount} screws`,
  };

  const steps: WorkingStep[] = [
    {
      label: 'Board count',
      formula: 'ceil( deck width (mm) ÷ (board width + gap) )',
      result: `ceil( ${deckWidth * 1000} ÷ (${boardWidth} + ${boardGap}) ) = ceil( ${(deckWidth * 1000 / effectiveBoardWidth).toFixed(2)} ) = ${boardCount} boards`,
    },
    {
      label: 'Total lineal metres',
      formula: 'board count × deck length',
      result: `${boardCount} × ${deckLength}m = ${totalLinealMetres}lm`,
    },
    {
      label: 'Joist count',
      formula: 'floor( deck length (mm) ÷ joist spacing ) + 1',
      result: `floor( ${deckLength * 1000} ÷ ${joistSpacing} ) + 1 = ${joistCount} joists`,
    },
    {
      label: 'Bearer count',
      formula: 'ceil( deck width (mm) ÷ bearer spacing ) + 1',
      result: `ceil( ${deckWidth * 1000} ÷ ${bearerSpacing} ) + 1 = ${bearerCount} bearers`,
    },
    fixingsStep,
  ];

  // Actual width of the last board — less than boardWidth means a rip is needed
  const lastBoardWidth = Math.round(deckWidth * 1000 - (boardCount - 1) * effectiveBoardWidth);

  // For each nearby board count, find what gap gives exactly full boards
  const gapSuggestions: GapSuggestion[] = [];
  if (lastBoardWidth < boardWidth) {
    const nMin = Math.floor((deckWidth * 1000) / (boardWidth + 6));
    const nMax = Math.ceil((deckWidth * 1000) / (boardWidth + 3));
    for (let n = Math.max(2, nMin); n <= nMax; n++) {
      const g = (deckWidth * 1000 - n * boardWidth) / (n - 1);
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
