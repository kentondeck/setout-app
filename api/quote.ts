// Node runtime, not Edge — Opus + adaptive thinking on this prompt regularly takes 25s+ and grew
// slower again after the QS-assistant rewrite (more rules to reason through: nullable quantities,
// per-item confidence, waste factors, clarifications, exclusions, region conventions) — confirmed
// via production logs timing out at the old 60s cap. Pinned to Sydney to keep AU/NZ latency low
// without Edge's stricter duration limit.
export const config = { runtime: 'nodejs', regions: ['syd1'], maxDuration: 120 };

const QUOTE_SCHEMA = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    errorReason: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
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
          quantity: { type: ['number', 'null'] },
          unit: { type: 'string' },
          note: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['item', 'quantity', 'unit', 'note', 'confidence'],
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
    clarificationsNeeded: { type: 'array', items: { type: 'string' } },
    exclusions: { type: 'array', items: { type: 'string' } },
    wasteFactorApplied: { type: 'string' },
  },
  required: [
    'error', 'errorReason', 'confidence', 'dimensions', 'materials', 'labour', 'scopeSummary',
    'assumptions', 'clarificationsNeeded', 'exclusions', 'wasteFactorApplied',
  ],
  additionalProperties: false,
};

const MATERIAL_CONVENTIONS: Record<string, string> = {
  AU: `Use Australian material conventions: metric units, AU timber sizes and grades (90x45, 140x45, 190x45 MGP10/MGP12, LVL, H3/H4 treated pine), Colorbond roofing/cladding profiles, standard sheet sizes (2400x1200), 20kg bag concrete premix. Reference AS 1684 framing practice.`,
  NZ: `Use New Zealand material conventions: metric units, NZ timber sizes and grades (90x45, 140x45, 190x45 MSG8/MSG10/MSG12, LVL, H3.2/H4 treated pine to NZS 3640), Coloursteel roofing/cladding profiles, standard sheet sizes (2400x1200), 20kg bag concrete premix. Reference NZS 3604 framing practice.`,
};

function buildSystemPrompt(region: string, hasPlans: boolean): string {
  const conventions = MATERIAL_CONVENTIONS[region] ?? MATERIAL_CONVENTIONS.AU;
  const plansGuidance = hasPlans ? `

A set of construction plans (PDF — site plan, floor plans, elevations, sections, schedules) is included. These are scaled technical drawings, not a photo — read dimension strings, grid lines, and schedules directly rather than estimating by eye, and cross-reference between pages (e.g. a floor plan dimension against a matching elevation or schedule entry). Note in assumptions where a dimension had to be inferred because it wasn't explicitly called out. Still treat the result as a takeoff to verify, not a certified quantity survey — flag anything illegible, contradictory between pages, or outside the plan set's scope (e.g. services, structural engineering not shown) under clarificationsNeeded or exclusions.` : '';
  return `You are a quantity surveyor's assistant for Setout, a construction app for Australian and New Zealand tradespeople. Your job is to analyse a photo, construction plans, and/or written description of a construction job and produce a structured material takeoff for a tradie to review before ordering.

If a photo is included, look at it to judge scale — fence lines, pavers, doorways, and other objects with typical known dimensions are useful references — and combine it with the description. If no photo or plans are included, base your estimate on the description alone.
${plansGuidance}

${conventions}

Rules:
- Dimensions are your best estimate from the plans (if provided), photo (if provided), and description. If the description gives an explicit dimension (e.g. "6x4 metres"), use it — don't override it from the photo. If there is no photo, no plans, and no explicit dimension in the description, make a reasonable assumption for a typical job of this kind and list it under assumptions.
- Materials list must be practical and buildable: correct timber and post sizes, fixings, concrete where posts are involved. Do not price materials — pricing is applied separately from the tradie's own price list, so just get the item, quantity and unit right.
- Include consumables and fixings a tradie would actually need (nails, screws, joist hangers, brackets, adhesive, flashing) as their own line items — these are commonly forgotten in quotes and quietly eat into a job's margin when left out.
- Round quantities up to purchasable units — you buy 6 lengths, not 5.3; round bags, sheets, and boxes up to whole units.
- If you cannot justify a quantity for an item you know the job needs, set that item's quantity to null and explain why in its note — never invent a number you can't justify from the input.
- Set each material's confidence (high/medium/low) based on how directly the photo/description support its size and quantity.
- Apply a waste factor to cut and measured materials (e.g. ~10% on timber for offcuts, ~5% on sheet goods) and summarise what you applied in wasteFactorApplied.
- Deck and floor joists are structural — 140mm deep (e.g. 140x45) is the typical default, going up to 190mm for longer spans. Never default to 90mm for a structural joist — reserve 90mm for non-structural framing (e.g. fascia, screening battens).
- Bearers are structural and usually built by doubling up two 140x45 boards bolted/nailed together, forming a 90mm-wide x 140mm-deep member. Bearers normally sit ON TOP of the posts (post continues up to bearer height). Only bolt/cheek-fix the bearer to the SIDE of the posts for a low-set deck close to the ground, where height clearance rules it out. List the bearer item as 140x45 and double the lineal-metre quantity to account for both boards, noting in the material's note field that it's a doubled/laminated bearer sitting on top of the posts (or side-fixed only if this is a low-set deck).
- Break labour into the roles actually needed for this job (e.g. Carpenter, Apprentice, Labourer) with hours per role. Use a single role for small jobs; multiple roles only when the job genuinely needs a crew mix. Do not estimate hourly rates.
- A standard work day is 9 hours — use that when reasoning about how many days a job will take. Labour hours must cover the full scope: prep, cutting/fitting, sealing, and clean-up, not just the core install step. Real jobs consistently run longer than a bare best-case estimate — if your hours imply a day count that would surprise an experienced tradie as too fast for the scope described, revise the hours up rather than shipping an optimistic number.
- scopeSummary: rewrite the tradie's raw job notes into one brief, professional sentence describing the scope of work, suitable to print on a client-facing quote (e.g. "Supply and install a 6x4m treated pine deck with 4x4 posts and a privacy screen."). Do not just repeat their notes verbatim — tighten it.
- assumptions: list every material or dimension assumption you made so the tradie can correct it before ordering.
- clarificationsNeeded: questions whose answer would materially change the takeoff (e.g. exact height above ground affecting post embedment, whether existing structure needs demolishing first). Leave empty if the input is clear enough that nothing would materially change the result.
- exclusions: things visible or implied by the input but not part of this takeoff (e.g. council permit, demolition of existing structure, electrical/plumbing rough-in).
- confidence: your overall confidence in the whole takeoff, based on how much you had to assume.
- If the input is unusable — a photo too blurry or unrelated to a construction job, or a description with virtually nothing to work from and no usable photo — set error to "unusable_input" and fill errorReason with why. Still return the full JSON shape: dimensions all zero, empty materials/labour/assumptions/clarificationsNeeded/exclusions arrays, wasteFactorApplied as an empty string, confidence "low". Otherwise leave error and errorReason as empty strings.`;
}

interface LearnedPreferences {
  alwaysOmit: string[];
  alwaysAdd: { item: string; unit: string; note: string }[];
}

// Folds in what this tradie's device has learned about how they build — items they consistently
// strip out of an AI takeoff (e.g. protective tape) or add back in by hand — as a personal layer on
// top of the region's standard conventions. Empty when nothing's been learned yet.
function buildPreferencesBlock(preferences?: LearnedPreferences): string {
  if (!preferences) return '';
  const lines: string[] = [];
  if (preferences.alwaysOmit.length > 0) {
    lines.push(`- Do NOT include these items — this tradie has consistently removed them from past takeoffs, so they don't use them or handle them separately: ${preferences.alwaysOmit.join(', ')}.`);
  }
  if (preferences.alwaysAdd.length > 0) {
    const items = preferences.alwaysAdd.map(a => `${a.item} (${a.unit}${a.note ? `, ${a.note}` : ''})`).join('; ');
    lines.push(`- Always include these items even if not obviously implied by the input — this tradie has consistently added them by hand on past takeoffs: ${items}.`);
  }
  if (lines.length === 0) return '';
  return `\n\nThis tradie's personal build preferences, learned from their past jobs — apply on top of the standard rules above:\n${lines.join('\n')}`;
}

// Node runtime here only honors a returned Response from a NAMED HTTP-method export (e.g. POST) —
// a default export with this signature silently discards the response and hangs until maxDuration.
export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('API key not configured', { status: 500 });
  }

  let imageBase64: string | null, mediaType: string | null, pdfBase64: string | null, description: string, region: string, preferences: LearnedPreferences | undefined;
  try {
    ({ imageBase64, mediaType, pdfBase64, description, region, preferences } = (await req.json()) as {
      imageBase64: string | null;
      mediaType: string | null;
      pdfBase64?: string | null;
      description: string;
      region: string;
      preferences?: LearnedPreferences;
    });
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  if (!description?.trim()) {
    return new Response('Missing description', { status: 400 });
  }

  const regionCode = region === 'NZ' ? 'NZ' : 'AU';

  const content: Record<string, unknown>[] = [];
  if (imageBase64 && mediaType) {
    content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } });
  }
  if (pdfBase64) {
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } });
  }
  content.push({ type: 'text', text: `${description.trim()}\n\nRegion: ${regionCode}` });

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
      system: buildSystemPrompt(regionCode, !!pdfBase64) + buildPreferencesBlock(preferences),
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
