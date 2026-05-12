import { useContext } from 'react';
import { SettingsContext, HistoryContext } from '../App';
import { TopBar } from '../components/TopBar';
import { CalculatorTile } from '../components/CalculatorTile';
import { ContinueCard } from '../components/ContinueCard';
import { getGreeting } from '../lib/greeting';
import { CALCULATORS } from '../lib/calculators';

export function Home() {
  const { settings } = useContext(SettingsContext);
  const { history } = useContext(HistoryContext);

  const { greeting, sub } = getGreeting(settings.userName);
  const lastEntry = history[0] ?? null;
  const highlightedId = lastEntry?.calculatorId ?? 'decking';

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

      {lastEntry && (
        <div style={{ padding: '0 20px 12px' }}>
          <ContinueCard entry={lastEntry} />
        </div>
      )}

      <div style={{ padding: '8px 20px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {CALCULATORS.map(calc => (
            <CalculatorTile
              key={calc.id}
              calc={calc}
              highlighted={calc.id === highlightedId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
