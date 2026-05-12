import { useState } from 'react';

export type WorkingStep = {
  label: string;
  explanation?: string;  // new — plain-English description for apprentice
  formula?: string;      // legacy — kept so existing calculators don't break
  calculation?: string;  // new — the actual maths string
  result: string;
};

interface Props {
  steps: WorkingStep[];
  finalAnswer?: string;
  finalLabel?: string;
  visible?: boolean;
  id?: string;
  why?: string;          // legacy — accepted but not rendered in new design
}

const C_ORANGE = '#FF5A1F';
const C_DARK = '#0a0a0a';
const C_MUTED = '#999999';
const C_BG = '#f5f5f3';
const C_BORDER = 'rgba(0,0,0,0.06)';
const FONT = "Inter, -apple-system, sans-serif";

export function ApprenticeWorking({ steps, finalAnswer, finalLabel, visible = true, id }: Props) {
  const storageKey = id ? `apprentice_working_collapsed_${id}` : null;

  const [collapsed, setCollapsed] = useState(() => {
    if (!storageKey) return false;
    return localStorage.getItem(storageKey) === 'true';
  });

  if (!visible) return null;

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    if (storageKey) localStorage.setItem(storageKey, String(next));
  }

  const isNewFormat = steps.some(s => s.explanation !== undefined);

  return (
    <div>
      {/* Toggle header */}
      <button
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: FONT,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: C_DARK }}>
          Learn how this works
        </span>
        <span style={{ fontSize: 12, color: C_MUTED }}>
          {collapsed ? '▸' : '▾'}
        </span>
      </button>

      {!collapsed && (
        <div style={{ animation: 'fadeIn 200ms ease-in' }}>
          {isNewFormat ? (
            <>
              {/* Section heading */}
              <p style={{
                margin: '0 0 8px',
                fontSize: 13,
                fontWeight: 500,
                color: C_MUTED,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                fontFamily: FONT,
              }}>
                How we got there
              </p>
              <div style={{ height: 1, width: 24, background: C_ORANGE, marginBottom: 16 }} />

              {/* Step cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {steps.map((step, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#ffffff',
                      border: `0.5px solid ${C_BORDER}`,
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    {/* Number badge + label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: C_ORANGE, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#fff', fontFamily: FONT, lineHeight: 1 }}>
                          {i + 1}
                        </span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 500, color: C_DARK, fontFamily: FONT }}>
                        {step.label}
                      </span>
                    </div>

                    {/* Explanation */}
                    {step.explanation && (
                      <p style={{
                        margin: '8px 0 0', marginLeft: 34,
                        fontSize: 12, fontWeight: 400, color: C_MUTED,
                        lineHeight: '16px', fontFamily: FONT,
                      }}>
                        {step.explanation}
                      </p>
                    )}

                    {/* Calculation box */}
                    {step.calculation && (
                      <div style={{
                        marginTop: 10, marginLeft: 34,
                        background: C_BG, padding: '8px 12px', borderRadius: 6,
                      }}>
                        <span style={{
                          fontSize: 14, fontWeight: 500, color: C_DARK,
                          fontFamily: FONT, fontVariantNumeric: 'tabular-nums',
                        }}>
                          {step.calculation}
                        </span>
                      </div>
                    )}

                    {/* Result row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, marginLeft: 34 }}>
                      <span style={{ fontSize: 14, color: C_MUTED, fontFamily: FONT }}>→</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: C_ORANGE, fontFamily: FONT }}>
                        {step.result}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Final answer card */}
              {finalAnswer && finalLabel && (
                <div style={{
                  marginTop: 16,
                  background: C_ORANGE,
                  borderRadius: 16,
                  padding: 20,
                }}>
                  <p style={{
                    margin: 0, fontSize: 10, fontWeight: 500,
                    color: 'rgba(255,255,255,0.70)', letterSpacing: '1.5px',
                    textTransform: 'uppercase', fontFamily: FONT,
                  }}>
                    Answer
                  </p>
                  <p style={{
                    margin: '4px 0 0', fontSize: 28, fontWeight: 500,
                    color: '#fff', letterSpacing: '-0.5px', lineHeight: 1, fontFamily: FONT,
                  }}>
                    {finalAnswer}
                  </p>
                  <p style={{
                    margin: '4px 0 0', fontSize: 13, fontWeight: 400,
                    color: 'rgba(255,255,255,0.80)', fontFamily: FONT,
                  }}>
                    {finalLabel}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Legacy format — formula-based display */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.map((step, i) => (
                <div key={i} style={{
                  background: '#ffffff', border: `0.5px solid ${C_BORDER}`,
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 500, color: C_MUTED, fontFamily: FONT }}>
                    {step.label}
                  </p>
                  {step.formula && (
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: C_MUTED, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                      {step.formula}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C_DARK, fontFamily: FONT }}>
                    {step.result}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
