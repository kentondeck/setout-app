// Feature flags — flip these back to `true` to bring hidden features back
// without redeploying any of their underlying code.
//
// smartQuote: AI-powered material takeoff from a photo or plans PDF. The full
// pipeline (photo upload → Anthropic API → structured takeoff → editable quote)
// stays in the repo (PhotoQuoteCalc AI-mode blocks, PhotoQuoteGate, api/quote.ts,
// api/validate-code.ts, buildHabits.ts, priceMemory.ts). Turning this on again
// only requires flipping this flag and redeploying — nothing to rebuild.
export const FEATURES = {
  smartQuote: false,
} as const;
