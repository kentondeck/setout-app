import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

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
}

const QUOTE_SYSTEM_PROMPT = `You are a construction estimator helping a tradie scope a job from a short description of what the client wants, optionally with a site photo.

If a photo is included, look at it to judge scale — fence lines, pavers, doorways, and other objects with typical known dimensions are useful references — and combine it with the description. If no photo is included, base your estimate on the description alone.

Rules:
- Dimensions are your best estimate from the photo (if provided) and description. If the description gives an explicit dimension (e.g. "6x4 metres"), use it — don't override it from the photo. If there is no photo and no explicit dimension in the description, make a reasonable assumption for a typical job of this kind and list it under assumptions.
- Materials list must be practical and buildable: correct timber and post sizes, fixings, concrete where posts are involved. Do not price materials — pricing is applied separately from the tradie's own price list, so just get the item, quantity and unit right.
- Deck and floor joists are structural — 140mm deep (e.g. 140x45) is the typical default, going up to 190mm for longer spans. Never default to 90mm for a structural joist — reserve 90mm for non-structural framing (e.g. fascia, screening battens).
- Bearers are structural and usually built by doubling up two 140x45 boards bolted/nailed together, forming a 90mm-wide x 140mm-deep member. List the bearer item as 140x45 and double the lineal-metre quantity to account for both boards, noting in the material's note field that it's a doubled/laminated bearer.
- Break labour into the roles actually needed for this job (e.g. Carpenter, Apprentice, Labourer) with hours per role. Use a single role for small jobs; multiple roles only when the job genuinely needs a crew mix. Do not estimate hourly rates.
- A standard work day is 9 hours — use that when reasoning about how many days a job will take. Labour hours must cover the full scope: prep, cutting/fitting, sealing, and clean-up, not just the core install step. Real jobs consistently run longer than a bare best-case estimate — if your hours imply a day count that would surprise an experienced tradie as too fast for the scope described, revise the hours up rather than shipping an optimistic number.
- scopeSummary: rewrite the tradie's raw job notes into one brief, professional sentence describing the scope of work, suitable to print on a client-facing quote (e.g. "Supply and install a 6x4m treated pine deck with 4x4 posts and a privacy screen."). Do not just repeat their notes verbatim — tighten it.
- List every material or dimension assumption you made so the tradie can correct it before ordering.`

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
          const regionLabel = region === 'NZ' ? 'NZ (price in NZD)' : 'AU (price in AUD)';

          const content: Record<string, unknown>[] = [];
          if (imageBase64 && mediaType) {
            content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } });
          }
          content.push({ type: 'text', text: `${description}\n\nRegion: ${regionLabel}` });

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
              system: QUOTE_SYSTEM_PROMPT,
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

For each material listed, use web search to find a real, current price at a mainstream AU/NZ trade or
hardware retailer (e.g. Bunnings, Mitre 10, PlaceMakers, ITM, Carters, Bunnings Warehouse NZ). Search
per item — do not guess from memory. Use the price in the stated region's currency (AUD or NZD).

If you cannot find a real listed price for an item after searching, omit it from the output rather than
guessing.

When you are done searching, respond with ONLY a JSON object in this exact shape and nothing else — no
markdown code fences, no commentary before or after:

{"materials":[{"item":"<exact item name as given>","price":<number>,"source":"<retailer name>"}]}`

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
              model: 'claude-opus-4-8',
              max_tokens: 4096,
              tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: Math.min(items.length * 6, 20) }],
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      tailwindcss(),
      codeCheckDevPlugin(env.ANTHROPIC_API_KEY ?? ''),
      quoteDevPlugin(env.ANTHROPIC_API_KEY ?? ''),
      priceLookupDevPlugin(env.ANTHROPIC_API_KEY ?? ''),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
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
