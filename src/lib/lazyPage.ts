import { lazy, type ComponentType } from 'react';

type PageModule<K extends string> = Record<K, ComponentType>;

const prefetchQueue: Array<() => Promise<unknown>> = [];

// Code-split a route, and (unless opted out) register it to be preloaded in the
// background once the app is idle — so the first tap into a screen doesn't
// flash blank while its chunk loads and parses.
export function lazyPage<K extends string>(
  load: () => Promise<PageModule<K>>,
  exportName: K,
  { prefetch = true }: { prefetch?: boolean } = {},
) {
  if (prefetch) prefetchQueue.push(load);
  return lazy(() => load().then(m => ({ default: m[exportName] })));
}

function whenIdle(cb: () => void) {
  if ('requestIdleCallback' in window) window.requestIdleCallback(cb, { timeout: 3000 });
  else setTimeout(cb, 400);
}

// One chunk per idle slot, so parsing never lands as a single long task.
export function prefetchPages() {
  const run = (i: number) => {
    if (i >= prefetchQueue.length) return;
    prefetchQueue[i]().catch(() => {});
    whenIdle(() => run(i + 1));
  };
  whenIdle(() => run(0));
}
