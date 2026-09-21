// Shared error type for calculator input validation.
//
// Pages already parse strings and reject empty / zero / negative inputs before
// calling a calculator. This class handles the SEMANTIC cases where numeric
// inputs are individually valid but don't work together — e.g. cladding lap
// bigger than board width (face cover goes negative), raked wall with the high
// end shorter than the low end (rise goes negative), baluster spans that can't
// fit a single baluster.
//
// Calcs throw CalcInputError with a builder-friendly message. Pages wrap the
// call in try/catch and surface the message via setError.

export class CalcInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalcInputError';
  }
}
