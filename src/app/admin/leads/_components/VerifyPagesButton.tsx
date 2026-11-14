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
      className="adm-btn adm-btn--ghost ld-sm"
    >
      {pending ? "Checking…" : "Verify pages"}
    </button>
  );
}
