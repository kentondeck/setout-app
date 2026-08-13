import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import { createClient } from 'redis'

// System prompts duplicated here for local dev — canonical copy lives in api/code-check.ts
const DEV_SYSTEM_PROMPTS: Record<string, string> = {
  AU: `Australian residential construction reference. Reference: AS 1684, NCC Vol 2, AS 1657, AS 3600, AS/NZS 1170.
OUTPUT FORMAT: Optional ONE short context line (≤14 words), then 2–6 bullets each ≤14 words prefixed "- ", then a Source line.
CITATION RULE: Every number must be citable. Never invent. If unsure, write "refer to [standard]".
SCOPE: Answer only what was asked. Omit uncertain details.
BANNED: Restating question, "Hope this helps", bold/asterisks/markdown/emoji, invented clause numbers, adjacent unrequested facts, engineer disclaimers unless asked.`,
  NZ: `New Zealand residential construction reference. Reference: NZS 3604, NZBC, NZS 3109, NZS/AS 1170, E2/AS1.
OUTPUT FORMAT: Optional ONE short context line (≤14 words), then 2–6 bullets each ≤14 words prefixed "- ", then a Source line.
CITATION RULE: Every number must be citable. Never invent. If unsure, write "refer to [standard]".
SCOPE: Answer only what was asked. Omit uncertain details.
BANNED: Restating question, "Hope this helps", bold/asterisks/markdown/emoji, invented clause numbers, adjacent unrequested facts, LBP disclaimers unless asked.`,
}

function codeCheckDevPlugin(apiKey: string): Plugin {
  return {
    name: 'code-check-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/code-check', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }

        if (!apiKey) {
          res.statusCode = 500;
          res.end('Add ANTHROPIC_API_KEY to .env.local to use Code Check locally.');
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const { question, region } = JSON.parse(Buffer.concat(chunks).toString()) as { question: string; region: string };

          fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 512,
              stream: true,
              system: DEV_SYSTEM_PROMPTS[region] ?? DEV_SYSTEM_PROMPTS.AU,
              messages: [{ role: 'user', content: question }],
            }),
          }).then(upstream => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            if (!upstream.body) { res.end(); return; }
            const reader = upstream.body.getReader();
            const pump = (): void => {
              reader.read().then(({ done, value }) => {
                if (done) { res.end(); return; }
                res.write(value);
                pump();
              }).catch(() => res.end());
            };
            pump();
          }).catch(() => { res.statusCode = 500; res.end('Upstream error'); });
        });
      });
    },
  };
}

// Schema and prompt duplicated here for local dev — canonical copy lives in api/quote.ts
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
}

const QUOTE_MATERIAL_CONVENTIONS: Record<string, string> = {
  AU: `Use Australian material conventions: metric units, AU timber sizes and grades (90x45, 140x45, 190x45 MGP10/MGP12, LVL, H3/H4 treated pine), Colorbond roofing/cladding profiles, standard sheet sizes (2400x1200), 20kg bag concrete premix. Reference AS 1684 framing practice.`,
  NZ: `Use New Zealand material conventions: metric units, NZ timber sizes and grades (90x45, 140x45, 190x45 MSG8/MSG10/MSG12, LVL, H3.2/H4 treated pine to NZS 3640), Coloursteel roofing/cladding profiles, standard sheet sizes (2400x1200), 20kg bag concrete premix. Reference NZS 3604 framing practice.`,
}

function buildQuoteSystemPrompt(region: string): string {
  const conventions = QUOTE_MATERIAL_CONVENTIONS[region] ?? QUOTE_MATERIAL_CONVENTIONS.AU
  return `You are a quantity surveyor's assistant for Setout, a construction app for Australian and New Zealand tradespeople. Your job is to analyse a photo and/or written description of a construction job and produce a structured material takeoff for a tradie to review before ordering.

If a photo is included, look at it to judge scale — fence lines, pavers, doorways, and other objects with typical known dimensions are useful references — and combine it with the description. If no photo is included, base your estimate on the description alone.

${conventions}

Rules:
- Dimensions are your best estimate from the photo (if provided) and description. If the description gives an explicit dimension (e.g. "6x4 metres"), use it — don't override it from the photo. If there is no photo and no explicit dimension in the description, make a reasonable assumption for a typical job of this kind and list it under assumptions.
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
- If the input is unusable — a photo too blurry or unrelated to a construction job, or a description with virtually nothing to work from and no usable photo — set error to "unusable_input" and fill errorReason with why. Still return the full JSON shape: dimensions all zero, empty materials/labour/assumptions/clarificationsNeeded/exclusions arrays, wasteFactorApplied as an empty string, confidence "low". Otherwise leave error and errorReason as empty strings.`
}

function quoteDevPlugin(apiKey: string): Plugin {
  return {
    name: 'quote-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/quote', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }

        if (!apiKey) {
          res.statusCode = 500;
          res.end('Add ANTHROPIC_API_KEY to .env.local to use Photo Quote locally.');
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const { imageBase64, mediaType, description, region } = JSON.parse(Buffer.concat(chunks).toString()) as {
            imageBase64: string | null; mediaType: string | null; description: string; region: string;
          };
          const regionCode = region === 'NZ' ? 'NZ' : 'AU';

          const content: Record<string, unknown>[] = [];
          if (imageBase64 && mediaType) {
            content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } });
          }
          content.push({ type: 'text', text: `${description}\n\nRegion: ${regionCode}` });

          fetch('https://api.anthropic.com/v1/messages', {
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
              system: buildQuoteSystemPrompt(regionCode),
              messages: [{ role: 'user', content }],
            }),
          }).then(async upstream => {
            if (!upstream.ok) {
              res.statusCode = upstream.status;
              res.end(await upstream.text());
              return;
            }
            const data = await upstream.json() as { content: { type: string; text?: string }[]; stop_reason?: string };
            if (data.stop_reason === 'max_tokens') {
              res.statusCode = 502;
              res.end('Estimate was cut off — try a shorter job description');
              return;
            }
            const textBlock = data.content.find(b => b.type === 'text');
            if (!textBlock?.text) {
              res.statusCode = 502;
              res.end('No estimate returned');
              return;
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(textBlock.text);
          }).catch(() => { res.statusCode = 500; res.end('Upstream error'); });
        });
      });
    },
  };
}

// Prompt duplicated here for local dev — canonical copy lives in api/price-lookup.ts
const PRICE_LOOKUP_SYSTEM_PROMPT = `You price construction materials for a residential tradie in Australia or New Zealand.

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

{"materials":[{"item":"<exact item name as given, with no unit annotation added>","price":<number>,"source":"<retailer name>"}]}`

function priceLookupDevPlugin(apiKey: string): Plugin {
  return {
    name: 'price-lookup-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/price-lookup', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }

        if (!apiKey) {
          res.statusCode = 500;
          res.end('Add ANTHROPIC_API_KEY to .env.local to use Photo Quote locally.');
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const { items, region } = JSON.parse(Buffer.concat(chunks).toString()) as {
            items: { item: string; unit: string }[]; region: string;
          };
          const regionLabel = region === 'NZ' ? 'NZ (price in NZD)' : 'AU (price in AUD)';
          const itemsText = items.map(i => `- ${i.item} (per ${i.unit})`).join('\n');

          fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-5',
              max_tokens: 4096,
              tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: Math.min(items.length * 4, 10) }],
              system: PRICE_LOOKUP_SYSTEM_PROMPT,
              messages: [{ role: 'user', content: `Region: ${regionLabel}\n\nItems to price:\n${itemsText}` }],
            }),
          }).then(async upstream => {
            if (!upstream.ok) {
              res.statusCode = upstream.status;
              res.end(await upstream.text());
              return;
            }
            const data = await upstream.json() as { content: { type: string; text?: string }[] };
            const textBlocks = data.content.filter(b => b.type === 'text' && b.text);
            const finalText = textBlocks[textBlocks.length - 1]?.text;
            if (!finalText) {
              res.statusCode = 502;
              res.end('No prices returned');
              return;
            }
            let jsonText = finalText.trim();
            const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (fenceMatch) jsonText = fenceMatch[1].trim();
            try {
              JSON.parse(jsonText);
            } catch {
              const start = jsonText.indexOf('{');
              const end = jsonText.lastIndexOf('}');
              if (start === -1 || end === -1 || end <= start) {
                res.statusCode = 502;
                res.end('Could not parse prices');
                return;
              }
              jsonText = jsonText.slice(start, end + 1);
              try {
                JSON.parse(jsonText);
              } catch {
                res.statusCode = 502;
                res.end('Could not parse prices');
                return;
              }
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(jsonText);
          }).catch(() => { res.statusCode = 500; res.end('Upstream error'); });
        });
      });
    },
  };
}

// Mirrors api/price-cache.ts for local dev — shared Redis cache of confirmed material prices,
// keyed by fuzzy material identity + region so wording variance across quotes still hits.
const PRICE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 60
const PRICE_CACHE_MAX_KEYS = 30
const PRICE_CACHE_MAX_PRICE = 100_000

function priceCacheDevPlugin(redisUrl: string): Plugin {
  let redisClient: ReturnType<typeof createClient> | null = null
  async function getRedis() {
    if (!redisClient) {
      redisClient = createClient({ url: redisUrl })
      redisClient.on('error', () => {})
      await redisClient.connect()
    }
    return redisClient
  }

  return {
    name: 'price-cache-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/price-cache', (req, res) => {
        if (!redisUrl) {
          res.setHeader('Content-Type', 'application/json')
          res.end(req.method === 'GET' ? '{"results":{}}' : '{"ok":false}')
          return
        }

        if (req.method === 'GET') {
          const url = new URL(req.url ?? '', 'http://localhost')
          const region = url.searchParams.get('region') === 'NZ' ? 'NZ' : 'AU'
          const keys = (url.searchParams.get('keys') ?? '').split(',').map(k => k.trim()).filter(Boolean).slice(0, PRICE_CACHE_MAX_KEYS)
          if (keys.length === 0) { res.setHeader('Content-Type', 'application/json'); res.end('{"results":{}}'); return }
          getRedis().then(async redis => {
            const values = await redis.mGet(keys.map(k => `price:${region}:${k}`))
            const results: Record<string, unknown> = {}
            keys.forEach((k, i) => {
              const raw = values[i]
              if (raw) { try { results[k] = JSON.parse(raw) } catch { /* skip corrupt entry */ } }
            })
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ results }))
          }).catch(() => { res.setHeader('Content-Type', 'application/json'); res.end('{"results":{}}') })
          return
        }

        if (req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', () => {
            let body: { region: string; entries: { key: string; price: number; source?: string }[] }
            try { body = JSON.parse(Buffer.concat(chunks).toString()) } catch { res.statusCode = 400; res.end('Invalid body'); return }
            const region = body.region === 'NZ' ? 'NZ' : 'AU'
            const entries = (body.entries ?? [])
              .filter(e => e.key?.trim() && typeof e.price === 'number' && e.price > 0 && e.price < PRICE_CACHE_MAX_PRICE)
              .slice(0, PRICE_CACHE_MAX_KEYS)
            if (entries.length === 0) { res.statusCode = 400; res.end('No valid entries'); return }
            getRedis().then(async redis => {
              await Promise.all(entries.map(e =>
                redis.set(`price:${region}:${e.key.slice(0, 200)}`, JSON.stringify({ price: e.price, source: e.source?.slice(0, 80), updatedAt: Date.now() }), { EX: PRICE_CACHE_TTL_SECONDS })
              ))
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true, written: entries.length }))
            }).catch(() => { res.setHeader('Content-Type', 'application/json'); res.end('{"ok":false}') })
          })
          return
        }

        res.statusCode = 405
        res.end()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      codeCheckDevPlugin(env.ANTHROPIC_API_KEY ?? ''),
      quoteDevPlugin(env.ANTHROPIC_API_KEY ?? ''),
      priceLookupDevPlugin(env.ANTHROPIC_API_KEY ?? ''),
      priceCacheDevPlugin(env.REDIS_URL ?? ''),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'favicon-192.png', 'favicon-32.png'],
        manifest: {
          name: 'Setout',
          short_name: 'Setout',
          description: 'Construction calculators for tradies',
          theme_color: '#FF5A1F',
          background_color: '#F5F5F3',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // Never let the SW's SPA fallback swallow API calls — they must always
          // hit the network so JSON endpoints (validate-code, quote, price-lookup,
          // etc.) don't return the index.html shell.
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  }
})
