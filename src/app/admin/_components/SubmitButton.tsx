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
      className="adm-btn adm-btn--solid"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
