import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cookie-less anon client for PUBLIC content reads.
 *
 * The SSR client in server.ts calls `cookies()`, which opts every route that
 * touches it out of prerendering — public pages were paying ~1.2s of dynamic
 * TTFB for content that is identical for every visitor. Public data never
 * needs the visitor's session (anon RLS reads), so this client skips cookies
 * entirely and lets the public pages be statically prerendered. Freshness is
 * handled by revalidatePublic() on admin edits plus each page's `revalidate`.
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
