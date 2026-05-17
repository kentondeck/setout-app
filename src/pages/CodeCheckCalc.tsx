import { useState, useContext, useRef } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { SettingsContext } from '../contexts';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import type { Region } from '../types';

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

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setAnswer('');
    setError('');

    try {
      const res = await fetch('/api/code-check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q, region }),
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
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
