// crypto.randomUUID is unavailable in insecure-context WKWebViews (e.g. the app
// loading over http://<lan-ip>:5173 during live-reload dev). Fall back to a
// pseudo-random v4-ish string so Calculate never throws — collision odds are
// fine for local IDs that only exist in this device's storage.
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
