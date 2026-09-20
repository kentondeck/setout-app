import type { WorkingStep } from '../components/ApprenticeWorking';
import { CalcInputError } from './errors';

export interface CladdingInputs {
  wallHeight: number;   // mm
  wallWidth: number;    // mm
  boardWidth: number;   // mm
  lap: number;          // mm overlap between courses
  boardLength: number;  // mm (stock length)
  startOffset: number;  // mm — distance from slab/floor to first course line
}

export interface CladdingOutputs extends Record<string, number> {
  courseCount: number;
  faceCover: number;       // mm — actual even face cover per course
  topBoardRip: number;     // mm — rip width to keep on the top board (= faceCover)
  totalLm: number;         // lm — boards only
  stockCount: number;      // boards needed at given stock length
  wastePercent: number;    // %
  firstMark: number;       // mm — first rod mark from datum
  lastMark: number;        // mm — bottom of last course
  // Echoed back so the page's "actual overlap" display uses the values that
  // actually produced this result, not re-parsed live inputs.
  boardWidth: number;      // mm
  desiredLap: number;      // mm — the lap originally requested, before rounding to a whole course count
}

export interface CladdingResult {
  outputs: CladdingOutputs;
  rodMarks: number[];      // mm — each course line from datum
  steps: WorkingStep[];
}

export function calculateCladding(inputs: CladdingInputs): CladdingResult {
  const { wallHeight, wallWidth, boardWidth, lap, boardLength, startOffset } = inputs;

  // Lap ≥ board width would give a zero-or-negative face cover — every board
  // would be entirely hidden by the one above, which is nonsense.
  if (lap >= boardWidth) {
    throw new CalcInputError('Lap must be less than the board width.');
  }
  // Start offset ≥ wall height leaves nothing to clad.
  if (startOffset >= wallHeight) {
    throw new CalcInputError('Start offset must be less than the wall height.');
  }

  const nominalFace = boardWidth - lap;

  // Spread courses evenly across wall height above start offset.
  // Rounding UP the course count is critical: the user enters the lap they want
  // as a minimum. More courses ⇒ smaller face cover ⇒ larger actual lap. Rounding
  // down (with Math.round) can drop lap below spec and fail weatherproofing.
  const availableHeight = wallHeight - startOffset;
  const rawCourseCount = availableHeight / nominalFace;
  const courseCount = Math.max(1, Math.ceil(rawCourseCount));
  const faceCover = parseFloat((availableHeight / courseCount).toFixed(1));

  // Rod marks: one per course line (bottom edge of each board) — keep 1dp
  // so the marks don't accumulate rounding drift up the wall.
  const rodMarks: number[] = [];
  for (let i = 0; i < courseCount; i++) {
    rodMarks.push(parseFloat((startOffset + i * faceCover).toFixed(1)));
  }

  const firstMark = rodMarks[0];
  const lastMark = rodMarks[courseCount - 1];
  // Top board is always ripped — its top edge would overshoot wall height by (boardWidth - faceCover)
  const topBoardRip = faceCover;

  // Lineal metres of boards: one board-width per course for the full wall width
  const totalLm = parseFloat(((wallWidth / 1000) * courseCount).toFixed(2));

  // Boards at stock length
  const boardsPerCourse = Math.ceil(wallWidth / boardLength);
  const rawStockCount = boardsPerCourse * courseCount;

  // Usable cuts per stock board
  const cutsPerBoard = Math.floor(boardLength / wallWidth);
  const stockCount = cutsPerBoard >= 1
    ? Math.ceil(courseCount / cutsPerBoard)
    : rawStockCount;

  // Waste: compare usable timber vs total purchased
  const purchased = stockCount * boardLength;
  const used = wallWidth * courseCount; // mm total
  const wastePercent = parseFloat((((purchased - used) / purchased) * 100).toFixed(1));

  const steps: WorkingStep[] = [
    {
      label: 'Nominal face cover',
      formula: 'board width − lap',
      result: `${boardWidth}mm − ${lap}mm = ${nominalFace}mm`,
    },
    {
      label: 'Course count',
      formula: 'ceil( available height ÷ nominal face ) — rounds up so lap stays ≥ spec',
      result: `ceil( ${availableHeight} ÷ ${nominalFace} ) = ${courseCount} courses`,
    },
    {
      label: 'Adjusted face cover',
      formula: 'available height ÷ course count',
      result: `${availableHeight} ÷ ${courseCount} = ${faceCover}mm per course`,
    },
    {
      label: 'Story rod marks',
      formula: 'start offset + ( course index × face cover )',
      result: `${firstMark}mm, ${parseFloat((startOffset + faceCover).toFixed(1))}mm … ${lastMark}mm`,
    },
    {
      label: 'Top board rip',
      formula: 'top board has no board above to lap — rip down to face cover width',
      result: `rip top board to ${topBoardRip}mm (cut off ${boardWidth - topBoardRip}mm)`,
    },
    cutsPerBoard >= 1
      ? {
          label: 'Boards required',
          formula: 'ceil( courses ÷ cuts per board )',
          result: `${cutsPerBoard} cuts per ${boardLength}mm board → ceil( ${courseCount} ÷ ${cutsPerBoard} ) = ${stockCount} boards`,
        }
      : {
          label: 'Boards required',
          formula: 'courses × ceil( wall width ÷ board length )',
          result: `${courseCount} × ${boardsPerCourse} = ${stockCount} boards at ${boardLength}mm`,
        },
  ];

  return {
    outputs: { courseCount, faceCover, topBoardRip, totalLm, stockCount, wastePercent, firstMark, lastMark, boardWidth, desiredLap: lap },
    rodMarks,
    steps,
  };
}
