// Supabase Edge Function: delete-account
//
// Permanently deletes the signed-in user's account — required by Apple
// guideline 5.1.1(v) for any app that lets users create an account. Runs with
// the service-role key (auto-injected by Supabase); identifies the caller from
// their JWT and deletes ONLY that user, plus their media folder.
//
// Deploy via dashboard (Edge Functions -> Deploy a new function, name it
// `delete-account`) or: supabase functions deploy delete-account

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identify the caller from their JWT — a user can only delete themselves.
    const asUser = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(url, service);

    // Best-effort: clear the user's media folder (Storage doesn't cascade).
    try {
      const toRemove: string[] = [];
      for (const prefix of [`${user.id}/jobphotos`, `${user.id}/records`]) {
        const { data: subs } = await admin.storage.from("user-media").list(prefix, { limit: 1000 });
        for (const sub of subs ?? []) {
          const { data: files } = await admin.storage.from("user-media").list(`${prefix}/${sub.name}`, { limit: 1000 });
          for (const f of files ?? []) toRemove.push(`${prefix}/${sub.name}/${f.name}`);
        }
      }
      if (toRemove.length) await admin.storage.from("user-media").remove(toRemove);
    } catch (_e) {
      // ignore — storage cleanup is best-effort
    }

    await admin.from("backups").delete().eq("user_id", user.id);

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
