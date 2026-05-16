import { useState, useContext, useRef } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { SettingsContext } from '../contexts';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { lookupSpan } from '../lib/spanTables';
import { SYSTEM_PROMPTS } from '../lib/codeCheckPrompts';
import type { Region } from '../types';

// Build the tools array per-call so we can bias web_search to the active region.
function buildTools(region: Region) {
  return [
    {
      name: 'lookup_span',
      description:
        'Look up an approximate span or height for a timber framing member from embedded AS 1684 / NZS 3604 span tables. Returns a mid-range value with the table reference. Use this for any joist, bearer, rafter, or stud sizing question — quote both the value and the table reference in the final answer.',
      input_schema: {
        type: 'object' as const,
        properties: {
          region: { type: 'string', enum: ['AU', 'NZ'], description: 'AU for AS 1684, NZ for NZS 3604' },
          member: {
            type: 'string',
            description: 'floor_joist, floor_bearer, rafter, wall_stud, or ceiling_joist',
          },
          size: { type: 'string', description: 'Section size e.g. 90x45, 140x45, 190x45, 240x45' },
          grade: {
            type: 'string',
            description: 'Timber grade e.g. MSG8, MSG10, MSG12, MGP10, MGP12, MGP15',
          },
          spacing_mm: { type: 'number', description: 'Spacing in mm e.g. 400, 450, 600' },
        },
        required: ['region', 'member'],
      },
    },
    {
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 3,
      user_location: {
        type: 'approximate',
        country: region === 'NZ' ? 'NZ' : 'AU',
      },
    },
  ];
}

type TextBlock = { type: 'text'; text: string };
type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
type ContentBlock = TextBlock | ToolUseBlock | { type: string; [key: string]: unknown };

interface ApiResponse {
  content: ContentBlock[];
  stop_reason: string;
}

async function callApi(
  apiKey: string,
  system: string,
  messages: unknown[],
  tools: unknown[],
  signal: AbortSignal,
): Promise<ApiResponse> {
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
      max_tokens: 2048,
      system,
      tools,
      messages,
    }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return (await res.json()) as ApiResponse;
}

function isTextBlock(b: ContentBlock): b is TextBlock {
  return b.type === 'text';
}

function isClientToolUse(b: ContentBlock): b is ToolUseBlock {
  return b.type === 'tool_use';
}

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
    const signal = abortRef.current.signal;

    setLoading(true);
    setAnswer('');
    setError('');

    try {
      const tools = buildTools(region);
      const messages: unknown[] = [{ role: 'user', content: q }];

      // Agentic loop — keep handing tool results back until the model stops
      // requesting client tools. Server tools (web_search) are executed by the
      // API server inline; we only have to relay lookup_span results.
      for (let i = 0; i < 6; i++) {
        const result = await callApi(apiKey, SYSTEM_PROMPTS[region], messages, tools, signal);

        if (result.stop_reason !== 'tool_use') {
          const text = result.content
            .filter(isTextBlock)
            .map(b => b.text)
            .join('')
            .trim();
          setAnswer(text || 'No response. Try rephrasing the question.');
          return;
        }

        messages.push({ role: 'assistant', content: result.content });

        const toolResults = result.content.filter(isClientToolUse).map(block => {
          if (block.name === 'lookup_span') {
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: lookupSpan(block.input as unknown as Parameters<typeof lookupSpan>[0]),
            };
          }
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: `Unknown client tool: ${block.name}`,
            is_error: true,
          };
        });

        messages.push({ role: 'user', content: toolResults });
      }

      throw new Error('Reached tool-use limit. Try a more focused question.');
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
              ? 'e.g. Max span for 140×45 MGP10 floor joist at 450mm spacing?'
              : 'e.g. Max span for 140×45 MSG8 floor joist at 600mm spacing?'}
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
              <p style={{ margin: 0, fontSize: 14, color: 'var(--color-muted)' }}>Checking code, searching sources…</p>
            ) : (
              <p style={{ margin: 0, fontSize: 15, color: 'var(--color-text)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {answer}
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
