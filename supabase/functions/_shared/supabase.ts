import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function isPro(
  user: { is_pro: boolean; pro_until: string | null },
): boolean {
  if (!user.is_pro) return false;
  if (!user.pro_until) return true;
  return new Date(user.pro_until).getTime() > Date.now();
}
