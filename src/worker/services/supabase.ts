/**
 * Minimal PostgREST client. The Worker is the only thing that talks to
 * Supabase, always with the service key, so no SDK is needed.
 */

export function supabaseConfigured(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);
}

function headers(env: Env, prefer: string): HeadersInit {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

async function check(res: Response, what: string): Promise<void> {
  if (res.ok) return;
  const detail = await res.text().catch(() => "");
  throw new Error(`Supabase ${what} failed: HTTP ${res.status} ${detail.slice(0, 200)}`);
}

export async function insertRow<T extends Record<string, unknown>>(
  env: Env,
  table: string,
  row: T,
): Promise<{ id: string }> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?select=id`, {
    method: "POST",
    headers: headers(env, "return=representation"),
    body: JSON.stringify(row),
  });
  await check(res, `insert into ${table}`);
  const [created] = (await res.json()) as { id: string | number }[];
  if (!created) throw new Error(`Supabase insert into ${table} returned no row`);
  return { id: String(created.id) };
}

export async function updateRow(
  env: Env,
  table: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: headers(env, "return=minimal"),
    body: JSON.stringify(patch),
  });
  await check(res, `update ${table}`);
}
