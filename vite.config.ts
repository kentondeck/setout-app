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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      tailwindcss(),
      codeCheckDevPlugin(env.ANTHROPIC_API_KEY ?? ''),
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
