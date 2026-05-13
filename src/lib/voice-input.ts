// ---------------------------------------------------------------------------
// Number word tables
// ---------------------------------------------------------------------------

const ONES: Record<string, number> = {
  zero: 0, oh: 0,
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9,
};

const TEENS: Record<string, number> = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const SKIP: Set<string> = new Set([
  'and', 'the', 'is', 'a', 'an', 'of',
  'millimetres', 'millimeters', 'millimetre', 'millimeter',
  'metres', 'meters', 'metre', 'meter',
  'mil', 'mm', 'm',
  'feet', 'foot', 'inches', 'inch', 'ft', 'in',
  'degrees', 'degree', 'deg',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a spoken transcript into an ordered array of numbers.
 * No external dependencies — all logic is self-contained.
 *
 * Handles:
 *   "4200"                      → [4200]
 *   "4.2"                       → [4.2]
 *   "four point two"            → [4.2]
 *   "four thousand two hundred" → [4200]
 *   "forty-two hundred"         → [4200]
 *   "one forty"                 → [140]   (builder shorthand)
 *   "140 mil"                   → [140]   (unit words stripped)
 *   "4 by 3 by 140"             → [4, 3, 140]
 */
export function parseVoiceInput(transcript: string): number[] {
  let text = transcript
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\bpoint\b/g, '.');  // "four point two" → "four . two"

  // Split on separator words so each value is its own segment
  text = text.replace(/\b(by|times|x)\b/g, '|');

  const results: number[] = [];
  for (const segment of text.split('|').map(s => s.trim()).filter(Boolean)) {
    results.push(...extractFromSegment(segment));
  }
  return results;
}

// ---------------------------------------------------------------------------
// Internal parsing
// ---------------------------------------------------------------------------

function extractFromSegment(segment: string): number[] {
  const tokens = segment.split(/\s+/).filter(Boolean);
  const results: number[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (SKIP.has(token)) { i++; continue; }

    // Direct numeric token — handles "4200", "4.2", "22.5"
    if (/^\d/.test(token)) {
      const n = parseFloat(token);
      if (!isNaN(n)) { results.push(n); i++; continue; }
    }

    // Word number — handles "four thousand", "one forty", "four . two"
    const wr = tryWordNumber(tokens, i);
    if (wr) { results.push(wr.value); i += wr.consumed; continue; }

    i++;
  }

  return results;
}

interface WordResult { value: number; consumed: number }

function tryWordNumber(tokens: string[], start: number): WordResult | null {
  let i = start;
  let current = 0;
  let result = 0;
  let consumed = 0;
  let found = false;

  while (i < tokens.length) {
    const token = tokens[i];

    if (SKIP.has(token)) { i++; consumed++; continue; }

    // Decimal point: collect fractional part and return
    if (token === '.') {
      if (found) {
        const dr = tryDecimalSuffix(tokens, i + 1);
        if (dr) return { value: result + current + dr.frac, consumed: consumed + 1 + dr.consumed };
      }
      break;
    }

    if (token in ONES) {
      current += ONES[token]; found = true; i++; consumed++;
    } else if (token in TEENS) {
      current += TEENS[token]; found = true; i++; consumed++;
    } else if (token in TENS) {
      // "one forty" → single-digit × 100 + tens  (builder shorthand)
      if (found && current > 0 && current < 10) current *= 100;
      current += TENS[token]; found = true; i++; consumed++;
    } else if (token === 'hundred') {
      if (current === 0) current = 1;
      current *= 100; found = true; i++; consumed++;
    } else if (token === 'thousand') {
      if (current === 0) current = 1;
      result += current * 1000; current = 0; found = true; i++; consumed++;
    } else {
      break;
    }
  }

  if (!found) return null;
  return { value: result + current, consumed };
}

function tryDecimalSuffix(tokens: string[], start: number): { frac: number; consumed: number } | null {
  let fracStr = '0.';
  let consumed = 0;
  for (let i = start; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^\d+$/.test(t)) { fracStr += t; consumed++; }
    else if (t in ONES && ONES[t] <= 9) { fracStr += ONES[t]; consumed++; }
    else break;
  }
  return consumed > 0 ? { frac: parseFloat(fracStr), consumed } : null;
}

// ---------------------------------------------------------------------------
// Support / permission helpers
// ---------------------------------------------------------------------------

export function isVoiceSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
}

const DENIED_KEY = 'setout_voice_denied';

export function getVoiceDenied(): boolean {
  try { return localStorage.getItem(DENIED_KEY) === '1'; } catch { return false; }
}

export function setVoiceDenied(denied: boolean): void {
  try {
    if (denied) localStorage.setItem(DENIED_KEY, '1');
    else localStorage.removeItem(DENIED_KEY);
  } catch { /* storage unavailable */ }
}
