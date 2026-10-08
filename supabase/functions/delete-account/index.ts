// Supabase Edge Function: delete-account
//
// Permanently deletes the signed-in user's account — required by Apple
// guideline 5.1.1(v) for any app that lets users create an account.
//
// The client (anon key) can't delete an auth user, so this runs with the
// service-role key. It identifies the caller from their JWT and deletes ONLY
// that user, plus their media folder. The `backups` row is removed by the
// foreign-key cascade when the auth user is deleted, but we also clear it
// explicitly, and we clean Storage (which does not cascade).
//
// Deploy:  supabase functions deploy delete-account --project-ref vjkeabnlgjbqaqrcsheg
// Invoked from the app via supabase.functions.invoke('delete-account').

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Recursively list every object under a prefix. In Supabase Storage listings,
// folders come back with `id === null`; files have an id.
async function listAllFiles(admin: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const stack = [prefix];
  while (stack.length) {
    const dir = stack.pop()!;
    const { data } = await admin.storage.from(bucket).list(dir, { limit: 1000 });
    for (const item of data ?? []) {
      const path = dir ? `${dir}/${item.name}` : item.name;
      if ((item as { id: string | null }).id === null) stack.push(path);
      else out.push(path);
    }
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Identify the caller from their JWT — a user can only ever delete themselves.
    const asUser = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user }, error: uErr } = await asUser.auth.getUser();
    if (uErr || !user) return json({ error: 'Not authenticated' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Best-effort: clear the user's media folder (Storage doesn't cascade).
    try {
      const files = await listAllFiles(admin, 'user-media', user.id);
      if (files.length) await admin.storage.from('user-media').remove(files);
    } catch (_) { /* best effort */ }

    await admin.from('backups').delete().eq('user_id', user.id);

    const { error: dErr } = await admin.auth.admin.deleteUser(user.id);
    if (dErr) return json({ error: dErr.message }, 500);

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
