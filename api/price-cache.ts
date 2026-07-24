// Node runtime here only honors a returned Response from a NAMED HTTP-method export (e.g. POST) —
// a default export with this signature silently discards the response and hangs until maxDuration.
export const config = { runtime: 'nodejs', maxDuration: 30 };

import { createClient } from 'redis';

// Shared across every Setout user — once anyone anywhere has needed a material's price, everyone
// else gets it free and instant instead of paying for another web search. Material prices drift
// slowly but do change, so entries expire after 60 days and fall back to a fresh search.
const TTL_SECONDS = 60 * 60 * 24 * 60;
const MAX_KEYS_PER_REQUEST = 30;
const MAX_PRICE = 100_000;

let client: ReturnType<typeof createClient> | null = null;
async function getClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', () => { /* surfaced via the try/catch around each call instead */ });
    await client.connect();
  }
  return client;
}

interface CacheEntry {
  price: number;
  source?: string;
  updatedAt: number;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const region = url.searchParams.get('region') === 'NZ' ? 'NZ' : 'AU';
  const keysParam = url.searchParams.get('keys') ?? '';
  const keys = keysParam.split(',').map(k => k.trim()).filter(Boolean).slice(0, MAX_KEYS_PER_REQUEST);

  if (!process.env.REDIS_URL || keys.length === 0) {
    return new Response(JSON.stringify({ results: {} }), { headers: { 'content-type': 'application/json' } });
  }

  try {
    const redis = await getClient();
    const redisKeys = keys.map(k => `price:${region}:${k}`);
    const values = await redis.mGet(redisKeys);
    const results: Record<string, CacheEntry> = {};
    keys.forEach((k, i) => {
      const raw = values[i];
      if (!raw) return;
      try { results[k] = JSON.parse(raw) as CacheEntry; } catch { /* skip corrupt entry */ }
    });
    return new Response(JSON.stringify({ results }), { headers: { 'content-type': 'application/json' } });
  } catch {
    // Cache unavailable — callers fall through to a live search rather than failing the quote.
    return new Response(JSON.stringify({ results: {} }), { headers: { 'content-type': 'application/json' } });
  }
}

export async function POST(req: Request): Promise<Response> {
  if (!process.env.REDIS_URL) {
    return new Response(JSON.stringify({ ok: false }), { headers: { 'content-type': 'application/json' } });
  }

  let body: { region: string; entries: { key: string; price: number; source?: string }[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response('Invalid body', { status: 400 });
  }

  const region = body.region === 'NZ' ? 'NZ' : 'AU';
  const entries = (body.entries ?? [])
    .filter(e => e.key?.trim() && typeof e.price === 'number' && e.price > 0 && e.price < MAX_PRICE)
    .slice(0, MAX_KEYS_PER_REQUEST);

  if (entries.length === 0) {
    return new Response('No valid entries', { status: 400 });
  }

  try {
    const redis = await getClient();
    await Promise.all(entries.map(e => {
      const entry: CacheEntry = { price: e.price, source: e.source?.slice(0, 80), updatedAt: Date.now() };
      return redis.set(`price:${region}:${e.key.slice(0, 200)}`, JSON.stringify(entry), { EX: TTL_SECONDS });
    }));
    return new Response(JSON.stringify({ ok: true, written: entries.length }), { headers: { 'content-type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { headers: { 'content-type': 'application/json' } });
  }
}
