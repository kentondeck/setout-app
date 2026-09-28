// Bump this whenever TERMS.md changes materially — existing users will be asked
// to re-accept on next launch (kept as a date string so it's self-documenting).
export const TERMS_VERSION = '2026-09-22';

const KEY = 'setout_terms_accepted';

export function isTermsAccepted(): boolean {
  try {
    return localStorage.getItem(KEY) === TERMS_VERSION;
  } catch {
    return false;
  }
}

export function acceptTerms(): void {
  try {
    localStorage.setItem(KEY, TERMS_VERSION);
  } catch {
    /* storage unavailable — accept still flows through in-memory for this session */
  }
}
