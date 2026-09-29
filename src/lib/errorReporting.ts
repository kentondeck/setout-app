import * as Sentry from '@sentry/capacitor';
import * as SentryReact from '@sentry/react';
import { Capacitor } from '@capacitor/core';

// Crash/error reporting only — no performance tracing, no session replay, no
// PII. Silently does nothing if VITE_SENTRY_DSN isn't set (local dev by
// default), so this is safe to call unconditionally at startup.
const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initErrorReporting(): void {
  if (!DSN) return;

  Sentry.init(
    {
      dsn: DSN,
      environment: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
      release: `setout@${__APP_VERSION__}`,
      tracesSampleRate: 0,
      sendDefaultPii: false,
    },
    SentryReact.init,
  );
}
