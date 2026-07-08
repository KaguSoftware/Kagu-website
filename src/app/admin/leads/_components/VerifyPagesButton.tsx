"use client";

import { useTransition } from "react";
import { verifySeoStrategyPages } from "../../_actions/seo-strategy-jobs";
import { adminToast } from "../../_components/toast";

/* Fetches every planned slug on the live site and stores which ones are up —
   the page re-renders with live/missing badges via revalidation. */
export function VerifyPagesButton({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const result = await verifySeoStrategyPages(jobId);
      if (result.ok) adminToast("success", "Planned pages checked against the live site.");
      else adminToast("error", result.error);
    });

  return (
    <button
      type="button"
      disabled={pending}
      onClick={run}
      className="border border-neutral px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-ink disabled:opacity-50"
    >
      {pending ? "Checking…" : "Verify pages"}
    </button>
  );
}
