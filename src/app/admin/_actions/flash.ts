import "server-only";
import { cookies } from "next/headers";
import { FLASH_COOKIE, type Flash, type FlashTone } from "./flash-shared";

/*
  One-shot flash messages for the admin panel (server helpers).

  Server Actions signal success by redirect() and failure by throwing — neither
  carries a message to the page that renders next. flash() drops a short-lived
  cookie that the admin layout reads exactly once (readFlash) and turns into a
  toast, so every create/update/delete can speak to the user across the redirect.

  Client-safe types + the cookie name live in ./flash-shared so the Toaster can
  import them without pulling next/headers into the client bundle.
*/

const COOKIE = FLASH_COOKIE;

/** Queue a toast to show on the next admin render. Call before redirect(). */
export async function flash(tone: FlashTone, message: string) {
  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify({ tone, message }), {
    path: "/admin",
    maxAge: 30, // seconds — it's read on the very next render
    httpOnly: false, // read by the layout (server) only; not sensitive
    sameSite: "lax",
  });
}

/** Read the pending flash (call in the admin layout). The client Toaster clears
    the cookie via document.cookie once shown, so it only appears once — cookies
    can't be mutated from a Server Component, hence client-side clearing. */
export async function readFlash(): Promise<Flash | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Flash;
    if (parsed?.message && parsed?.tone) return parsed;
  } catch {
    /* ignore malformed */
  }
  return null;
}
