export interface WorkingStep {
  label: string;
  formula: string;
  result: string;
}

interface ApprenticeWorkingProps {
  steps: WorkingStep[];
  why: string;
}

export function ApprenticeWorking({ steps, why }: ApprenticeWorkingProps) {
  return (
    <div
      style={{
        background: 'var(--color-card)',
        border: '0.5px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '0.5px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>🎓</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-text)',
            letterSpacing: '-0.1px',
          }}
        >
          How it's worked out
        </span>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              {step.label}
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-orange)',
                fontFamily: 'ui-monospace, Menlo, monospace',
              }}
            >
              {step.formula}
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-text)' }}>
              {step.result}
            </span>
          </div>
        ))}

        <div
          style={{
            borderTop: '0.5px solid var(--color-border)',
            paddingTop: 12,
            marginTop: 2,
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--color-text)', fontWeight: 500 }}>Why this matters: </strong>
            {why}
          </p>
        </div>
      </div>
    </div>
  );
}
