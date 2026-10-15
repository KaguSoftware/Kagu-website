"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { rerunSeoStrategyJob } from "../../_actions/seo-strategy-jobs";
import { adminToast } from "../../_components/toast";

/* Queues a fresh strategy job with the same URL/context/settings and jumps
   to it. The current report is left intact as history. */
export function RerunStrategyButton({
  jobId,
  variant = "solid",
}: {
  jobId: string;
  variant?: "solid" | "link";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const rerun = () =>
    startTransition(async () => {
      const result = await rerunSeoStrategyJob(jobId);
      if (!result.ok) {
        adminToast("error", result.error);
        return;
      }
      adminToast("success", "Strategy queued again — the worker picks it up when idle.");
      if (result.data) router.push(`/admin/leads/seo/${result.data}`);
      else router.refresh();
    });

  const className =
    variant === "solid"
      ? "inline-flex items-center gap-2 border border-ink px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
      : "text-xs font-mono uppercase tracking-[0.18em] text-mint-deep underline-offset-4 transition-colors hover:underline disabled:opacity-50";

  return (
    <button type="button" disabled={pending} onClick={rerun} className={className}>
      {pending ? "Queuing…" : "Run again"}
    </button>
  );
}
