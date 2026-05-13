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

export interface DeckingResult {
  outputs: DeckingOutputs;
  steps: WorkingStep[];
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

  // Two fixings per board per joist is standard practice
  const fixingsCount = boardCount * joistCount * 2;

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
    {
      label: 'Fixings',
      formula: 'board count × joist count × 2 screws per intersection',
      result: `${boardCount} × ${joistCount} × 2 = ${fixingsCount} screws`,
    },
  ];

  return {
    outputs: { boardCount, totalLinealMetres, joistCount, bearerCount, fixingsCount },
    steps,
  };
}
