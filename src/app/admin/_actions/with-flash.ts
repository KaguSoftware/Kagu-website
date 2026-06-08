import "server-only";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { flash } from "./flash";

/*
  Wrap a Server Action so thrown errors become an error toast + a redirect back
  to the form the user came from (the Referer), instead of a raw 500 page.

  redirect()/notFound() throw control-flow errors internally — unstable_rethrow
  re-throws those untouched so navigation still works. Real errors (DB, zod,
  business rules) are caught, surfaced as an error flash, and the user is sent
  back to where they were so their context isn't lost.

  Success messaging stays inside each action (await flash("success", …) before
  its own redirect), so wrapping is purely additive.
*/

type ActionFn = (formData: FormData) => Promise<void>;

export function withFlash(fn: ActionFn, fallbackError?: string): ActionFn {
  return async (formData: FormData) => {
    try {
      await fn(formData);
    } catch (err) {
      // Let Next's redirect/notFound control-flow errors propagate.
      unstable_rethrow(err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : fallbackError ?? "Something went wrong. Please try again.";
      await flash("error", message);
      // Send the user back where they were so they don't lose their place.
      const ref = (await headers()).get("referer");
      let dest = "/admin";
      if (ref) {
        try {
          const url = new URL(ref);
          if (url.pathname.startsWith("/admin")) dest = url.pathname + url.search;
        } catch {
          /* ignore malformed referer */
        }
      }
      redirect(dest);
    }
  };
}
