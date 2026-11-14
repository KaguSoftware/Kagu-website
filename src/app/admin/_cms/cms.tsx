import Link from "next/link";
import { type ReactNode } from "react";
import { ButtonLink } from "../_components/ui";
import { SubmitButton } from "../_components/SubmitButton";

/* Shared layout pieces for the content-CMS admin pages (hairline list rows,
   calm form shell with a sticky save bar). Server-safe, token-only styling. */

export function RowList({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-ctl)] border border-[var(--line)] bg-[var(--card)]">
      {children}
    </ul>
  );
}

export function Row({
  lead,
  title,
  href,
  meta,
  badges,
  actions,
}: {
  lead?: ReactNode;
  title: ReactNode;
  href: string;
  meta?: ReactNode;
  badges?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--sand)]">
      <div className="flex min-w-0 items-baseline gap-4">
        {lead ? (
          <span className="w-7 shrink-0 text-xs tabular-nums text-[var(--muted)]">{lead}</span>
        ) : null}
        <div className="min-w-0">
          <Link
            href={href}
            className="block truncate text-[15px] text-[var(--ink)] transition-colors hover:text-[var(--accent-ink)]"
          >
            {title}
          </Link>
          {meta ? <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]">{meta}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badges}
        <Link href={href} className="adm-btn adm-btn--text">
          Edit
        </Link>
        {actions}
      </div>
    </li>
  );
}

export function Badge({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "ok" | "warn";
  children: ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "border-[var(--ok)] bg-[var(--ok-soft)] text-[var(--ok-ink)]"
      : tone === "warn"
        ? "border-[var(--warn)] bg-[var(--warn-soft)] text-[var(--warn-ink)]"
        : "border-[var(--line-strong)] text-[var(--muted)]";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] leading-4 ${cls}`}>{children}</span>
  );
}

/** Form wrapper with a sticky save bar. Pass the server action + a cancel href. */
export function FormShell({
  action,
  cancelHref,
  submitLabel,
  width = "max-w-xl",
  children,
}: {
  action: (formData: FormData) => void;
  cancelHref: string;
  submitLabel: string;
  width?: string;
  children: ReactNode;
}) {
  return (
    <form action={action} className={`${width} space-y-7`}>
      {children}
      <div className="sticky bottom-0 -mx-1 flex items-center gap-3 border-t border-[var(--line)] bg-[var(--bg)] px-1 py-4">
        <SubmitButton>{submitLabel}</SubmitButton>
        <ButtonLink href={cancelHref}>Cancel</ButtonLink>
      </div>
    </form>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="space-y-6 border-t border-[var(--line)] pt-6 first:border-t-0 first:pt-0">
      {title ? <h2 className="eyebrow">{title}</h2> : null}
      {children}
    </section>
  );
}
