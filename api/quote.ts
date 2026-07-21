import Anthropic from '@anthropic-ai/sdk';

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
    labourHours: { type: 'number' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
  required: ['dimensions', 'materials', 'labourHours', 'assumptions'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are a construction estimator helping a tradie scope a job from a site photo and a short description of what the client wants.

Look at the photo to judge scale — fence lines, pavers, doorways, and other objects with typical known dimensions are useful references — and combine it with the description to produce a materials estimate.

Rules:
- Dimensions are your best estimate from the photo and description. If the description gives an explicit dimension (e.g. "6x4 metres"), use it — don't override it from the photo.
- Materials list must be practical and buildable: correct timber and post sizes, fixings, concrete where posts are involved.
- Labour hours should reflect a competent tradie or small crew, not an apprentice.
- List every material or dimension assumption you made so the tradie can correct it before ordering.
- Never invent brand names or prices.`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('API key not configured', { status: 500 });
  }

  let imageBase64: string, mediaType: string, description: string;
  try {
    ({ imageBase64, mediaType, description } = (await req.json()) as {
      imageBase64: string;
      mediaType: string;
      description: string;
    });
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  if (!imageBase64 || !description?.trim()) {
    return new Response('Missing photo or description', { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
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
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: imageBase64 },
            },
            { type: 'text', text: description.trim() },
          ],
        },
      ],
    });

    if (!response.parsed_output) {
      return new Response('No estimate returned', { status: 502 });
    }

    return new Response(JSON.stringify(response.parsed_output), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return new Response(err.message, { status: err.status ?? 500 });
    }
    return new Response('Estimate failed', { status: 500 });
  }
}
