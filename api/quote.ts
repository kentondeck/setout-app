export const config = { runtime: 'edge' };

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

const SYSTEM_PROMPT = `You are a construction estimator helping a tradie scope a job from a site photo and a short description of what the client wants.

Look at the photo to judge scale — fence lines, pavers, doorways, and other objects with typical known dimensions are useful references — and combine it with the description to produce a materials and pricing estimate.

Rules:
- Dimensions are your best estimate from the photo and description. If the description gives an explicit dimension (e.g. "6x4 metres"), use it — don't override it from the photo.
- Materials list must be practical and buildable: correct timber and post sizes, fixings, concrete where posts are involved. Do not price materials — pricing is applied separately from the tradie's own price list, so just get the item, quantity and unit right.
- Break labour into the roles actually needed for this job (e.g. Carpenter, Apprentice, Labourer) with hours per role. Use a single role for small jobs; multiple roles only when the job genuinely needs a crew mix. Do not estimate hourly rates.
- scopeSummary: rewrite the tradie's raw job notes into one brief, professional sentence describing the scope of work, suitable to print on a client-facing quote (e.g. "Supply and install a 6x4m treated pine deck with 4x4 posts and a privacy screen."). Do not just repeat their notes verbatim — tighten it.
- List every material or dimension assumption you made so the tradie can correct it before ordering.`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('API key not configured', { status: 500 });
  }

  let imageBase64: string, mediaType: string, description: string, region: string;
  try {
    ({ imageBase64, mediaType, description, region } = (await req.json()) as {
      imageBase64: string;
      mediaType: string;
      description: string;
      region: string;
    });
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  if (!imageBase64 || !description?.trim()) {
    return new Response('Missing photo or description', { status: 400 });
  }

  const regionLabel = region === 'NZ' ? 'NZ (price in NZD)' : 'AU (price in AUD)';

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
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: `${description.trim()}\n\nRegion: ${regionLabel}` },
          ],
        },
      ],
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
