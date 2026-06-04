import { type ReactNode } from "react";
import Link from "next/link";

/* Shared, server-safe admin primitives. Style mirrors the public site:
   paper bg, ink text, Space Mono (font-mono) labels/eyebrows, neutral hairlines,
   mint-deep accent, small radii. */

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral pb-6">
      <div>
        <h1 className="display text-2xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-prose text-sm text-slate-ink">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="kagu-field block">
      <span className="eyebrow mb-2 block">
        {label}
        {required ? <span className="text-mint-deep"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? undefined}
        className="w-full border-0 border-b border-neutral bg-transparent py-2 text-base text-ink outline-none placeholder:text-neutral"
      />
      {hint ? <span className="mt-1 block text-xs text-slate-ink">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  rows = 4,
  required,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="kagu-field block">
      <span className="eyebrow mb-2 block">
        {label}
        {required ? <span className="text-mint-deep"> *</span> : null}
      </span>
      <textarea
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue ?? undefined}
        className="w-full resize-y border border-neutral bg-transparent p-3 text-base text-ink outline-none focus-visible:border-mint-deep"
      />
      {hint ? <span className="mt-1 block text-xs text-slate-ink">{hint}</span> : null}
    </label>
  );
}

export function Select({
  label,
  name,
  defaultValue,
  options,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="kagu-field block">
      <span className="eyebrow mb-2 block">
        {label}
        {required ? <span className="text-mint-deep"> *</span> : null}
      </span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? undefined}
        className="w-full border border-neutral bg-paper px-3 py-2 text-base text-ink outline-none focus-visible:border-mint-deep"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Checkbox({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-ink">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        value="on"
        className="size-4 accent-mint-deep"
      />
      <span className="eyebrow">{label}</span>
    </label>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "ghost",
}: {
  href: string;
  children: ReactNode;
  variant?: "solid" | "ghost";
}) {
  const base =
    "inline-flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] transition-colors";
  const styles =
    variant === "solid"
      ? "bg-ink text-paper hover:bg-mint-deep hover:text-paper"
      : "border border-neutral text-ink hover:border-mint-deep";
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border border-neutral bg-paper p-5 ${className}`}>{children}</div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="border border-dashed border-neutral p-8 text-center text-sm text-slate-ink">
      {children}
    </p>
  );
}
