// The native app loads its bundled files from a local origin, not
// setoutapp.com.au, so any call to a Vercel serverless function (api/*) needs
// an absolute URL — a relative '/api/...' fetch would otherwise resolve
// against the wrong origin and silently 404 on native. Works unchanged on
// web too, since that's the real origin there already.
export const API_BASE = 'https://setoutapp.com.au';
