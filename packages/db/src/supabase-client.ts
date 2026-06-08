import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | undefined;

/**
 * Server-side Supabase client using the SECRET key (bypasses RLS).
 * Runs on the server ONLY — never bundled into the frontend.
 * Used for realtime broadcast, REST, admin auth.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!admin) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY not set");
    admin = createClient(url, key, { auth: { persistSession: false } });
  }
  return admin;
}
