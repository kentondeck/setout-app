import { useState, useContext, useRef } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { SettingsContext } from '../contexts';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import type { Region } from '../types';

const SYSTEM_PROMPTS: Record<Region, string> = {
  AU: `You are a precise construction compliance advisor for Australian residential builders and tradespeople. Accuracy is critical — a wrong answer could cause a failed inspection or structural failure.

RULE: If you are not confident in a specific number, span, or clause, say "refer to the relevant table in [Standard]" rather than guessing. Never invent clause numbers or span values.

STANDARDS IN SCOPE:
- AS 1684.2/3/4 — Residential Timber-Framed Construction (span tables are in the separate Span Tables volume)
- NCC Volume 2 — National Construction Code Housing Provisions
- AS 1657 — Fixed platforms, walkways, stairways and ladders
- AS 3600 — Concrete structures
- AS 2870 — Residential slabs and footings
- AS/NZS 1170 — Structural loading

KNOWN LIMITS (cite these confidently):
Stairs (AS 1657): riser 115–225mm, tread 240–355mm, sum of going + riser = 550–700mm, min headroom 2000mm
Balustrades (NCC Vol 2 / AS 1657): min 1000mm height where floor is >1m above ground, max 125mm gap between infill elements
Pool fencing (AS 1926.1): non-climbable zone, max 100mm gap, min 1200mm height
Concrete (AS 3600 / AS 2870): min 20 MPa for residential footings, min 25 MPa for suspended slabs
Stud sizes: 70×35 non-load-bearing; 90×45 typical load-bearing; spacings 450mm or 600mm centres
Timber grades: F4, F5, F7, F8, F11, F14, F17, MGP10, MGP12, MGP15, LVL grades vary by manufacturer
Wind classes: N1–N4 (non-cyclonic), C1–C4 (cyclonic) — affects bracing, fixings, and spans significantly
Notching/drilling joists: max 1/4 depth notch in outer 1/4 span; max 1/4 depth hole in middle 1/2 span

SPAN-CRITICAL ANSWERS: Joist, bearer, rafter, lintel, and column spans depend on timber species, grade, spacing, load width, wind class, and application. Always direct the user to the specific table in AS 1684 Span Tables rather than stating a span value you are not certain of.

FORMAT: Direct answer first. Cite the standard and clause/table number. Flag when a licensed engineer or building certifier is required. Plain language. Under 150 words unless the question genuinely requires more.`,

  NZ: `You are a precise construction compliance advisor for New Zealand residential builders and tradespeople. Accuracy is critical — a wrong answer could cause a failed inspection or structural failure.

RULE: If you are not confident in a specific number, span, or clause, say "refer to the relevant table in [Standard]" rather than guessing. Never invent clause numbers or span values.

STANDARDS IN SCOPE:
- NZS 3604:2011 — Timber-framed buildings (primary residential framing standard)
- NZBC — New Zealand Building Code (Acceptable Solutions and Verification Methods)
- NZS 3109 — Concrete construction
- NZS/AS 1170 — Structural loading
- E2/AS1 — External moisture (cladding)
- G7/AS1 — Natural light
- F4/AS1 — Safety from falling (balustrades)

KNOWN LIMITS (cite these confidently):
Stairs (NZS 3604 / Clause F2): riser 150–220mm, tread 220–355mm, min headroom 2000mm, max pitch 42°
Balustrades (NZBC F4/AS1): min 1000mm height where floor is >1m above ground, max 100mm gap between infill elements; min 1100mm for commercial
Pool fencing (NZBC F9): min 1200mm height, max 100mm gap, non-climbable zone applies
Concrete (NZS 3109): min 17.5 MPa non-structural residential, min 20 MPa structural footings
Stud sizes: 90×45 typical load-bearing; 70×45 non-load-bearing; spacings 400mm, 600mm centres
Timber grades: No. 1 Framing, MSG8, MSG10, MSG12, VSG8, VSG10, SG6, SG8, SG10, SG12, LVL grades vary by manufacturer
Wind zones: Low, Medium, High, Very High, Extra High, Specific Design — check NZS 3604 Section 5
Notching/drilling: refer to NZS 3604 Section 7 for limits by member type

SPAN-CRITICAL ANSWERS: Joist, bearer, rafter, lintel, and column spans in NZS 3604 depend on timber grade, spacing, load width, wind zone, and application. Always direct the user to the specific table in NZS 3604 rather than stating a span value you are not certain of.

FORMAT: Direct answer first. Cite the standard and clause/table number. Flag when a Licensed Building Practitioner (LBP) or engineer is required. Plain language. Under 150 words unless the question genuinely requires more.`,
};

export function CodeCheckCalc() {
  const { settings } = useContext(SettingsContext);
  const [region, setRegion] = useState<Region>(settings.region);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  async function handleAsk() {
    const q = question.trim();
    if (!q || loading) return;

    const apiKey = (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined) ?? '';
    if (!apiKey) {
      setError('Add VITE_ANTHROPIC_API_KEY to your .env.local file to use Code Check.');
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setAnswer('');
    setError('');

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          stream: true,
          system: SYSTEM_PROMPTS[region],
          messages: [{ role: 'user', content: q }],
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`API error ${res.status}: ${body}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data) as { type: string; delta?: { type: string; text: string } };
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              setAnswer(prev => prev + parsed.delta!.text);
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong. Check your API key.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAsk();
    }
  }

  const canAsk = !loading && question.trim().length > 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Code Check" />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Region toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--color-card)',
          borderRadius: 12,
          padding: 4,
          border: '0.5px solid var(--color-border)',
        }}>
          {(['AU', 'NZ'] as Region[]).map(r => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 9,
                border: 'none',
                background: region === r ? 'var(--color-orange)' : 'transparent',
                color: region === r ? '#fff' : 'var(--color-muted)',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {r === 'AU' ? 'Australia' : 'New Zealand'}
            </button>
          ))}
        </div>

        {/* Input card */}
        <div style={{
          background: 'var(--color-card)',
          border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>QUESTION</p>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={region === 'AU'
              ? 'e.g. Max joist span for 90×45 MGP10 at 450mm spacing?'
              : 'e.g. Max stud height for 90×45 MSG8 at 600mm spacing?'}
            rows={4}
            style={{
              width: '100%',
              background: 'var(--color-bg)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 10,
              padding: '12px',
              fontSize: 15,
              fontFamily: 'inherit',
              color: 'var(--color-text)',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.5,
            }}
          />
          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)' }}>
            {region === 'AU' ? 'References AS 1684, NCC Vol 2, AS 1657' : 'References NZS 3604, NZBC, NZS 3109'}
          </p>
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 13, color: '#e53e3e', lineHeight: 1.5 }}>{error}</p>
        )}

        <button
          onClick={handleAsk}
          disabled={!canAsk}
          style={{
            background: canAsk ? 'var(--color-orange)' : 'var(--color-border)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            padding: '16px',
            fontSize: 16,
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: canAsk ? 'pointer' : 'default',
            letterSpacing: '-0.3px',
            transition: 'background 0.15s',
          }}
          onPointerDown={e => { if (canAsk) e.currentTarget.style.opacity = '0.85'; }}
          onPointerUp={e => (e.currentTarget.style.opacity = '1')}
          onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {loading ? 'Checking…' : 'Ask'}
        </button>

        {/* Answer card */}
        {(answer || loading) && (
          <div style={{
            background: 'var(--color-card)',
            border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>ANSWER</p>
            {loading && !answer ? (
              <p style={{ margin: 0, fontSize: 14, color: 'var(--color-muted)' }}>Checking code…</p>
            ) : (
              <p style={{ margin: 0, fontSize: 15, color: 'var(--color-text)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {answer}
                {loading && <span style={{ opacity: 0.4 }}>▍</span>}
              </p>
            )}
          </div>
        )}

        <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
          {COMPLIANCE_NOTES.codecheck[region]}
        </p>
      </div>
    </div>
  );
}
