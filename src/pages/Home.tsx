import { useContext } from 'react';
import { SettingsContext, HistoryContext } from '../contexts';
import { TopBar } from '../components/TopBar';
import { ReorderableCalcGrid } from '../components/ReorderableCalcGrid';
import { QuoteTile } from '../components/QuoteTile';
import { getGreeting } from '../lib/greeting';
import { CALCULATORS } from '../lib/calculators';
import type { CalculatorId } from '../types';

// Quote gets pulled out into its own wide tile up top (see QuoteTile) — everything else is
// the reorderable measuring-calculator grid.
const GRID_CALCULATORS = CALCULATORS.filter(c => c.id !== 'photoquote');
const QUOTE_AI = CALCULATORS.find(c => c.id === 'photoquote')!;

// Replaces just the members of `groupIds` within `fullOrder` with `newGroupOrder`, keeping every
// other id's slot untouched — lets each grid section (Pinned / All) reorder independently while
// both stay merged into one persisted Settings.calcOrder array.
function replaceGroupOrder(fullOrder: CalculatorId[], groupIds: Set<CalculatorId>, newGroupOrder: CalculatorId[]): CalculatorId[] {
  let i = 0;
  return fullOrder.map(id => (groupIds.has(id) ? newGroupOrder[i++] : id));
}

export function Home() {
  const { settings, updateSettings } = useContext(SettingsContext);
  const { history } = useContext(HistoryContext);

  const { greeting, sub } = getGreeting(settings.userName);
  const lastEntry = history[0] ?? null;
  const highlightedId = lastEntry?.calculatorId ?? 'decking';
  const pinned = settings.pinnedCalcs ?? [];

  function handlePinToggle(id: string) {
    const calcId = id as CalculatorId;
    const next = pinned.includes(calcId)
      ? pinned.filter(p => p !== calcId)
      : [...pinned, calcId];
    updateSettings({ pinnedCalcs: next });
  }

  // Merge the tradie's saved drag order with the canonical calculator list — anything not yet in
  // their stored order (first run, or a calculator added since) is appended in its default position.
  const allIds = GRID_CALCULATORS.map(c => c.id);
  const storedOrder = (settings.calcOrder ?? []).filter(id => allIds.includes(id));
  const fullOrder = [...storedOrder, ...allIds.filter(id => !storedOrder.includes(id))];

  const pinnedSet = new Set(pinned);
  const pinnedIds = fullOrder.filter(id => pinnedSet.has(id));
  const restIds = fullOrder.filter(id => !pinnedSet.has(id));
  const pinnedCalcs = pinnedIds.map(id => GRID_CALCULATORS.find(c => c.id === id)!);
  const restCalcs = restIds.map(id => GRID_CALCULATORS.find(c => c.id === id)!);

  function handleReorderPinned(newOrder: CalculatorId[]) {
    updateSettings({ calcOrder: replaceGroupOrder(fullOrder, pinnedSet, newOrder) });
  }
  function handleReorderRest(newOrder: CalculatorId[]) {
    updateSettings({ calcOrder: replaceGroupOrder(fullOrder, new Set(restIds), newOrder) });
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TopBar userName={settings.userName} />

      <div style={{ padding: '24px 20px 16px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.5px' }}>
          {greeting}
        </p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 400, color: 'var(--color-muted)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
          {sub}
        </p>
      </div>

      <div style={{ padding: '0 20px 12px' }}>
        <QuoteTile calc={QUOTE_AI} />
      </div>

      <div style={{ padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {pinnedCalcs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Pinned
            </p>
            <ReorderableCalcGrid
              calcs={pinnedCalcs}
              highlightedId={highlightedId}
              pinnedIds={pinnedSet}
              onPinToggle={handlePinToggle}
              onReorder={handleReorderPinned}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pinnedCalcs.length > 0 && (
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              All calculators
            </p>
          )}
          <ReorderableCalcGrid
            calcs={restCalcs}
            highlightedId={highlightedId}
            pinnedIds={pinnedSet}
            onPinToggle={handlePinToggle}
            onReorder={handleReorderRest}
          />
        </div>
      </div>
    </div>
  );
}
