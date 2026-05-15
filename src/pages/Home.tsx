import { useContext } from 'react';
import { SettingsContext, HistoryContext, JobsContext } from '../contexts';
import { TopBar } from '../components/TopBar';
import { CalculatorTile } from '../components/CalculatorTile';
import { ContinueCard } from '../components/ContinueCard';
import { getGreeting } from '../lib/greeting';
import { CALCULATORS } from '../lib/calculators';
import type { CalculatorId } from '../types';

export function Home() {
  const { settings, updateSettings } = useContext(SettingsContext);
  const { history } = useContext(HistoryContext);
  const { jobs, getJobCalculations } = useContext(JobsContext);

  const { greeting, sub } = getGreeting(settings.userName);
  const lastEntry = history[0] ?? null;
  const highlightedId = lastEntry?.calculatorId ?? 'decking';

  const mostRecentJob = jobs.length > 0
    ? [...jobs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    : null;

  const lastJobCalcEntry = mostRecentJob
    ? getJobCalculations(mostRecentJob.id).sort((a, b) => b.timestamp - a.timestamp)[0]
    : undefined;
  const pinned = settings.pinnedCalcs ?? [];

  function handlePinToggle(id: string) {
    const calcId = id as CalculatorId;
    const next = pinned.includes(calcId)
      ? pinned.filter(p => p !== calcId)
      : [...pinned, calcId];
    updateSettings({ pinnedCalcs: next });
  }

  const pinnedCalcs = CALCULATORS.filter(c => pinned.includes(c.id));
  const restCalcs   = CALCULATORS.filter(c => !pinned.includes(c.id));

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

      {(mostRecentJob || lastEntry) && (
        <div style={{ padding: '0 20px 12px' }}>
          {mostRecentJob ? (
            <ContinueCard job={mostRecentJob} lastCalcEntry={lastJobCalcEntry} />
          ) : (
            <ContinueCard entry={lastEntry!} />
          )}
        </div>
      )}

      <div style={{ padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {pinnedCalcs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Pinned
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {pinnedCalcs.map(calc => (
                <CalculatorTile
                  key={calc.id}
                  calc={calc}
                  highlighted={calc.id === highlightedId}
                  pinned
                  onPinToggle={handlePinToggle}
                />
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pinnedCalcs.length > 0 && (
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              All calculators
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {restCalcs.map(calc => (
              <CalculatorTile
                key={calc.id}
                calc={calc}
                highlighted={calc.id === highlightedId}
                pinned={false}
                onPinToggle={handlePinToggle}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
