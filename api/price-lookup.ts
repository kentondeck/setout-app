// Node runtime, not Edge — the agentic web_search loop can take well over Edge's ~25s cap, and this
// call already runs in the background after results are shown, so the single-region latency Edge
// avoids for the main quote flow doesn't matter here.
export const config = { runtime: 'nodejs', maxDuration: 300 };

// Structured output (json_schema) can't be combined with the agentic web_search tool loop, so this
// prompts for a bare JSON final answer instead and parses it defensively below.
const SYSTEM_PROMPT = `You price construction materials for a residential tradie in Australia or New Zealand.

The request tells you which region — AU or NZ. Search ONLY that region's retailers, never the other
country's:
- AU: bunnings.com.au, mitre10.com.au, thehardwarestore.com.au, tradelink.com.au — prices in AUD.
- NZ: bunnings.co.nz, mitre10.co.nz, placemakers.co.nz, itm.co.nz, carters.co.nz — prices in NZD.

Include the region's country in every search query (e.g. "Bunnings Australia" or "Bunnings NZ", not
just "Bunnings") so results don't drift to the other country's site or currency. If a search result is
from the wrong country's domain, discard it and search again — do not convert a price from the wrong
region's currency or reuse a price found on the wrong domain.

Search per item — do not guess from memory.

If you cannot find a real listed price for an item after searching, omit it from the output rather than
guessing.

When you are done searching, respond with ONLY a JSON object in this exact shape and nothing else — no
markdown code fences, no commentary before or after:

{"materials":[{"item":"<exact item name as given, with no unit annotation added>","price":<number>,"source":"<retailer name>"}]}`;

// Node runtime here only honors returned Response objects from a NAMED HTTP-method export
// (e.g. POST) — a default export with this signature silently discards the response and hangs
// until maxDuration, which is what caused every request to this endpoint to time out.
export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('API key not configured', { status: 500 });
  }

  let items: { item: string; unit: string }[], region: string;
  try {
    ({ items, region } = (await req.json()) as { items: { item: string; unit: string }[]; region: string });
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  if (!items?.length) {
    return new Response('No items to price', { status: 400 });
  }

  const regionLabel = region === 'NZ' ? 'NZ (price in NZD)' : 'AU (price in AUD)';
  const itemsText = items.map(i => `- ${i.item} (per ${i.unit})`).join('\n');

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: Math.min(items.length * 6, 20) }],
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Region: ${regionLabel}\n\nItems to price:\n${itemsText}` }],
    }),
  });

  if (!anthropicRes.ok) {
    const body = await anthropicRes.text();
    return new Response(`API error ${anthropicRes.status}: ${body}`, { status: anthropicRes.status });
  }

  const data = (await anthropicRes.json()) as { content: { type: string; text?: string }[] };
  const textBlocks = data.content.filter(b => b.type === 'text' && b.text);
  const finalText = textBlocks[textBlocks.length - 1]?.text;
  if (!finalText) {
    return new Response('No prices returned', { status: 502 });
  }

  let jsonText = finalText.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonText = fenceMatch[1].trim();

  try {
    JSON.parse(jsonText);
  } catch {
    // The model sometimes prefixes the JSON with a line of commentary (e.g. "search limit
    // reached, so...") despite instructions — fall back to the outermost {...} substring.
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return new Response('Could not parse prices', { status: 502 });
    }
    jsonText = jsonText.slice(start, end + 1);
    try {
      JSON.parse(jsonText);
    } catch {
      return new Response('Could not parse prices', { status: 502 });
    }
  }

  return new Response(jsonText, {
    headers: { 'content-type': 'application/json' },
  });
}
