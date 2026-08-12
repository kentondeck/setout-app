export const config = { runtime: 'nodejs', regions: ['syd1'] };

export async function POST(req: Request): Promise<Response> {
  const codes = (process.env.PHOTOQUOTE_ACCESS_CODES ?? '')
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);

  let code: string;
  try {
    ({ code } = (await req.json()) as { code: string });
  } catch {
    return new Response('Invalid request', { status: 400 });
  }

  if (!code?.trim()) {
    return new Response('Missing code', { status: 400 });
  }

  const normalised = code.trim().toUpperCase();
  const valid = codes.map(c => c.toUpperCase()).includes(normalised);

  if (valid) {
    return new Response(JSON.stringify({ valid: true, token: normalised }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ valid: false }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
}
