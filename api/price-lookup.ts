export const config = { runtime: 'edge' };

const PRICE_LOOKUP_SCHEMA = {
  type: 'object',
  properties: {
    materials: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          price: { type: 'number' },
        },
        required: ['item', 'price'],
        additionalProperties: false,
      },
    },
  },
  required: ['materials'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You price construction materials for a residential tradie in Australia or New Zealand.
For each material given, return a realistic current trade/merchant price per unit in the stated region's currency (AUD or NZD).
Give a reasonable mid-range starting price the tradie will review, not false precision. Never invent brand names.
Return the item name back exactly as given so it can be matched.`;

export default async function handler(req: Request): Promise<Response> {
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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      output_config: {
        format: { type: 'json_schema', schema: PRICE_LOOKUP_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Region: ${regionLabel}\n\nItems:\n${itemsText}` }],
    }),
  });

  if (!anthropicRes.ok) {
    const body = await anthropicRes.text();
    return new Response(`API error ${anthropicRes.status}: ${body}`, { status: anthropicRes.status });
  }

  const data = (await anthropicRes.json()) as { content: { type: string; text?: string }[] };
  const textBlock = data.content.find(b => b.type === 'text');
  if (!textBlock?.text) {
    return new Response('No prices returned', { status: 502 });
  }

  return new Response(textBlock.text, {
    headers: { 'content-type': 'application/json' },
  });
}
