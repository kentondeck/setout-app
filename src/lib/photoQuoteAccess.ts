const KEY = 'setout_photoquote_token';

export function getPhotoQuoteToken(): string | null {
  return localStorage.getItem(KEY);
}

export function setPhotoQuoteToken(token: string): void {
  localStorage.setItem(KEY, token);
}

export function hasPhotoQuoteAccess(): boolean {
  return !!localStorage.getItem(KEY);
}
