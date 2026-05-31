"use client";

import { useFormStatus } from "react-dom";

function Inner({ confirm }: { confirm: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
      className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink underline-offset-4 transition-colors hover:text-ink hover:underline disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

/**
 * Submits a delete Server Action bound to a hidden `id`.
 * `action` is a Server Action accepting FormData.
 */
export function DeleteButton({
  id,
  action,
  confirm = "Delete this item? This cannot be undone.",
}: {
  id: string;
  action: (formData: FormData) => void;
  confirm?: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Inner confirm={confirm} />
    </form>
  );
}
