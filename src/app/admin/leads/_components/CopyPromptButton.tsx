"use client";

import { useState } from "react";
import { adminToast } from "../../_components/toast";

/* Copies the master prompt to the clipboard — the main way the strategy
   deliverable leaves the panel (pasted into a coding agent). */
export function CopyPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      adminToast("error", "Clipboard unavailable — select the text and copy manually.");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 bg-ink px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-paper transition-colors hover:bg-mint-deep"
    >
      {copied ? "Copied ✓" : "Copy prompt"}
    </button>
  );
}
