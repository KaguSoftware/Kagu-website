"use client";

import { useFormStatus } from "react-dom";
import { type ReactNode } from "react";

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
}: {
  children: ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-ink px-5 py-2.5 text-xs font-mono uppercase tracking-[0.18em] text-paper transition-colors hover:bg-mint-deep hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
