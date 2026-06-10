import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

/* Service-role client — bypasses RLS. This process owns the write path. */
export const db = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
