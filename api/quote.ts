// Node runtime, not Edge — Opus + adaptive thinking on this prompt now regularly takes ~25s,
// right at (and sometimes past) Edge's hard execution cap, which was causing every generate to
// time out. Pinned to Sydney to keep AU/NZ latency low without Edge's stricter duration limit.
export const config = { runtime: 'nodejs', regions: ['syd1'], maxDuration: 60 };

const QUOTE_SCHEMA = {
  type: 'object',
  properties: {
    dimensions: {
      type: 'object',
      properties: {
        lengthM: { type: 'number' },
        widthM: { type: 'number' },
        areaM2: { type: 'number' },
      },
      required: ['lengthM', 'widthM', 'areaM2'],
      additionalProperties: false,
    },
    materials: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['item', 'quantity', 'unit', 'note'],
        additionalProperties: false,
      },
    },
    labour: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          role: { type: 'string' },
          hours: { type: 'number' },
        },
        required: ['role', 'hours'],
        additionalProperties: false,
      },
    },
    scopeSummary: { type: 'string' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
  required: ['dimensions', 'materials', 'labour', 'scopeSummary', 'assumptions'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a construction estimator helping a tradie scope a job from a short description of what the client wants, optionally with a site photo.

If a photo is included, look at it to judge scale — fence lines, pavers, doorways, and other objects with typical known dimensions are useful references — and combine it with the description. If no photo is included, base your estimate on the description alone.

Rules:
- Dimensions are your best estimate from the photo (if provided) and description. If the description gives an explicit dimension (e.g. "6x4 metres"), use it — don't override it from the photo. If there is no photo and no explicit dimension in the description, make a reasonable assumption for a typical job of this kind and list it under assumptions.
- Materials list must be practical and buildable: correct timber and post sizes, fixings, concrete where posts are involved. Do not price materials — pricing is applied separately from the tradie's own price list, so just get the item, quantity and unit right.
- Deck and floor joists are structural — 140mm deep (e.g. 140x45) is the typical default, going up to 190mm for longer spans. Never default to 90mm for a structural joist — reserve 90mm for non-structural framing (e.g. fascia, screening battens).
- Bearers are structural and usually built by doubling up two 140x45 boards bolted/nailed together, forming a 90mm-wide x 140mm-deep member. List the bearer item as 140x45 and double the lineal-metre quantity to account for both boards, noting in the material's note field that it's a doubled/laminated bearer.
- Break labour into the roles actually needed for this job (e.g. Carpenter, Apprentice, Labourer) with hours per role. Use a single role for small jobs; multiple roles only when the job genuinely needs a crew mix. Do not estimate hourly rates.
- A standard work day is 9 hours — use that when reasoning about how many days a job will take. Labour hours must cover the full scope: prep, cutting/fitting, sealing, and clean-up, not just the core install step. Real jobs consistently run longer than a bare best-case estimate — if your hours imply a day count that would surprise an experienced tradie as too fast for the scope described, revise the hours up rather than shipping an optimistic number.
- scopeSummary: rewrite the tradie's raw job notes into one brief, professional sentence describing the scope of work, suitable to print on a client-facing quote (e.g. "Supply and install a 6x4m treated pine deck with 4x4 posts and a privacy screen."). Do not just repeat their notes verbatim — tighten it.
- List every material or dimension assumption you made so the tradie can correct it before ordering.`;

// Node runtime here only honors a returned Response from a NAMED HTTP-method export (e.g. POST) —
// a default export with this signature silently discards the response and hangs until maxDuration.
export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('API key not configured', { status: 500 });
  }

  let imageBase64: string | null, mediaType: string | null, description: string, region: string;
  try {
    ({ imageBase64, mediaType, description, region } = (await req.json()) as {
      imageBase64: string | null;
      mediaType: string | null;
      description: string;
      region: string;
    });
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  if (!description?.trim()) {
    return new Response('Missing description', { status: 400 });
  }

  const regionLabel = region === 'NZ' ? 'NZ (price in NZD)' : 'AU (price in AUD)';

  const content: Record<string, unknown>[] = [];
  if (imageBase64 && mediaType) {
    content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } });
  }
  content.push({ type: 'text', text: `${description.trim()}\n\nRegion: ${regionLabel}` });

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 8192,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: QUOTE_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!anthropicRes.ok) {
    const body = await anthropicRes.text();
    return new Response(`API error ${anthropicRes.status}: ${body}`, { status: anthropicRes.status });
  }

  const data = (await anthropicRes.json()) as { content: { type: string; text?: string }[]; stop_reason?: string };

  if (data.stop_reason === 'max_tokens') {
    return new Response('Estimate was cut off — try a shorter job description', { status: 502 });
  }

  const textBlock = data.content.find(b => b.type === 'text');
  if (!textBlock?.text) {
    return new Response('No estimate returned', { status: 502 });
  }

  return new Response(textBlock.text, {
    headers: { 'content-type': 'application/json' },
  });
}
