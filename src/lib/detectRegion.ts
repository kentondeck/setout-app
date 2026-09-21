import type { Region } from '../types';

/**
 * Best-effort guess at the user's region so the first-launch screen comes
 * pre-selected and most people just confirm with one tap.
 *
 * Timezone is checked before locale deliberately — plenty of AU/NZ users run
 * an en-US or en-GB locale, but their timezone is almost always correct.
 * Falls back to AU (primary market) when nothing is conclusive.
 */
export function detectRegion(): Region {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    if (tz === 'Pacific/Auckland' || tz === 'Pacific/Chatham') return 'NZ';
    if (tz.startsWith('Australia/')) return 'AU';

    const locales = [navigator.language, ...(navigator.languages ?? [])];
    for (const locale of locales) {
      const region = locale?.split('-')[1]?.toUpperCase();
      if (region === 'NZ') return 'NZ';
      if (region === 'AU') return 'AU';
    }
  } catch {
    // Intl or navigator unavailable — fall through to the default.
  }
  return 'AU';
}
