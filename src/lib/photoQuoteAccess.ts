const KEY = 'setout_photoquote_token';

export function getPhotoQuoteToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setPhotoQuoteToken(token: string): void {
  try { localStorage.setItem(KEY, token); } catch { /* best-effort — access still granted for this session */ }
}

export function hasPhotoQuoteAccess(): boolean {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}
