import { useEffect, useRef } from 'react';

// Scrolls the results section into view once a calculation completes — without this, nothing on
// screen indicates the tap registered until the tradie scrolls down manually to check.
export function useScrollToResult<T>(result: T) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (result) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);
  return ref;
}
