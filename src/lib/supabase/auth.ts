import "server-only";
import { createClient } from "./server";

/**
 * Verifies an authenticated admin session. Call at the top of every Server Action
 * and protected Server Component, since Server Actions are reachable via direct POST.
 * Throws if there is no valid session.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/** Non-throwing variant for layouts that redirect instead of erroring. */
export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
