// Node runtime, not Edge — the agentic web_search loop can take well over Edge's ~25s cap, and this
// call already runs in the background after results are shown, so the single-region latency Edge
// avoids for the main quote flow doesn't matter here.
export const config = { runtime: 'nodejs', maxDuration: 300 };

// Structured output (json_schema) can't be combined with the agentic web_search tool loop, so this
// prompts for a bare JSON final answer instead and parses it defensively below.
const SYSTEM_PROMPT = `You price construction materials for a residential tradie in Australia or New Zealand.

For each material listed, use web search to find a real, current price at a mainstream AU/NZ trade or
hardware retailer (e.g. Bunnings, Mitre 10, PlaceMakers, ITM, Carters, Bunnings Warehouse NZ). Search
per item — do not guess from memory. Use the price in the stated region's currency (AUD or NZD).

If you cannot find a real listed price for an item after searching, omit it from the output rather than
guessing.

When you are done searching, respond with ONLY a JSON object in this exact shape and nothing else — no
markdown code fences, no commentary before or after:

{"materials":[{"item":"<exact item name as given>","price":<number>,"source":"<retailer name>"}]}`;

export default async function handler(req: Request): Promise<Response> {
  console.log('[price-lookup] invoked', req.method);
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

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
  console.log('[price-lookup] parsed body, items:', items?.length, 'region:', region);

  if (!items?.length) {
    return new Response('No items to price', { status: 400 });
  }

  const regionLabel = region === 'NZ' ? 'NZ (price in NZD)' : 'AU (price in AUD)';
  const itemsText = items.map(i => `- ${i.item} (per ${i.unit})`).join('\n');

  console.log('[price-lookup] calling anthropic...');
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
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: Math.min(items.length * 2, 10) }],
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Region: ${regionLabel}\n\nItems to price:\n${itemsText}` }],
    }),
  });
  console.log('[price-lookup] anthropic responded, status:', anthropicRes.status);

  if (!anthropicRes.ok) {
    const body = await anthropicRes.text();
    return new Response(`API error ${anthropicRes.status}: ${body}`, { status: anthropicRes.status });
  }

  const data = (await anthropicRes.json()) as { content: { type: string; text?: string }[] };
  console.log('[price-lookup] parsed anthropic json, blocks:', data.content?.length);
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
    return new Response('Could not parse prices', { status: 502 });
  }

  return new Response(jsonText, {
    headers: { 'content-type': 'application/json' },
  });
}
