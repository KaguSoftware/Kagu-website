import "server-only";
import { unstable_rethrow } from "next/navigation";

/*
  Result-returning Server Action wrapper for interactive admin UI (the leads
  module): dropdowns, debounced saves, and inline approve/reject must not
  navigate, so unlike withFlash there is no redirect — the client component
  inspects the result and surfaces errors via adminToast.
*/

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export function withResult<Args extends unknown[], T = void>(
  fn: (...args: Args) => Promise<T>,
  fallbackError = "Something went wrong. Please try again."
): (...args: Args) => Promise<ActionResult<T>> {
  return async (...args: Args) => {
    try {
      const data = await fn(...args);
      return data === undefined ? { ok: true } : { ok: true, data };
    } catch (err) {
      // Let Next's redirect/notFound control-flow errors propagate.
      unstable_rethrow(err);
      const message =
        err instanceof Error && err.message ? err.message : fallbackError;
      return { ok: false, error: message };
    }
  };
}
