import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { Dispatch, SetStateAction } from 'react';

// When you open a calculator from History ("Open" on an entry), the entry's
// saved inputs ride along in navigation state as `prefill`. This hook applies
// them once to a calculator's single `inputs` object — stringifying the stored
// numbers to match the input fields, and only touching keys the form actually
// has (so extra stored keys like `type`/`wastage` are ignored safely).
//
// Calculators with a single `const [inputs, setInputs] = useState<Inputs>(…)`
// just call `useCalcPrefill(setInputs)`. Others can read the raw object via
// `usePrefillData()` and apply it however their state is shaped.

export function usePrefillData(): Record<string, number | string> | null {
  const { state } = useLocation();
  const prefill = (state as { prefill?: Record<string, number | string> } | null)?.prefill;
  return prefill && typeof prefill === 'object' ? prefill : null;
}

// Constrained to `object` (not `Record<string, string>`): the pages declare
// their state as an `interface Inputs`, and interfaces have no implicit index
// signature, so they don't satisfy `Record<string, string>` — which would force
// `T` to collapse to the bare constraint and break inference. With `T extends
// object` and the exact `Dispatch<SetStateAction<T>>` shape, `T` infers to each
// page's concrete `Inputs` by direct structural match. We only ever shallow-
// merge known string keys, so the Record cast inside is safe.
export function useCalcPrefill<T extends object>(setInputs: Dispatch<SetStateAction<T>>) {
  const prefill = usePrefillData();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !prefill) return;
    done.current = true;
    setInputs(prev => {
      const next = { ...prev };
      const rec = next as unknown as Record<string, string>;
      for (const [k, v] of Object.entries(prefill)) {
        if (k in rec) rec[k] = String(v);
      }
      return next;
    });
  }, [prefill, setInputs]);
}
