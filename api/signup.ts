export const config = { runtime: 'nodejs', regions: ['syd1'] };

export async function POST(req: Request): Promise<Response> {
  let name: string, email: string, region: string, role: string;
  try {
    ({ name, email, region, role } = (await req.json()) as {
      name: string; email: string; region: string; role: string;
    });
  } catch {
    return new Response('Invalid request', { status: 400 });
  }

  try {
    await fetch(process.env.SIGNUP_SHEET_URL ?? '', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email, region, role }),
    });
  } catch {
    // Don't fail the user experience if sheet write fails
  }

  return new Response('ok');
}
