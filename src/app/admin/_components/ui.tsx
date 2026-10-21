import { type ReactNode } from "react";
import Link from "next/link";
import { KaguMark } from "@/components/KaguMark";
import { CustomSelect } from "./CustomSelect";

export { CustomSelect } from "./CustomSelect";
export type { CustomSelectProps, SelectOption } from "./CustomSelect";
export { NumberField } from "./NumberField";
export { DatePicker } from "./DatePicker";
export { FileField } from "./FileField";

/* Shared admin primitives (server-safe; Select pulls in the client CustomSelect).
   Look: cream/ink light theme from src/styles/admin.css — Newsreader 300 titles,
   Geist UI text, 1px hairlines, ink pill buttons, accent only for focus/active. */

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
    <div className="adm-page-head">
      <div className="min-w-0">
        <h1 className="display adm-page-title">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-slate-ink">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
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
        className="w-full"
      />
      {hint ? <span className="mt-1.5 block text-xs text-slate-ink">{hint}</span> : null}
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
        className="w-full resize-y"
      />
      {hint ? <span className="mt-1.5 block text-xs text-slate-ink">{hint}</span> : null}
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
  const labelId = `sel-${name}`;
  return (
    <div className="kagu-field block">
      <span id={labelId} className="eyebrow mb-2 block">
        {label}
        {required ? <span className="text-mint-deep"> *</span> : null}
      </span>
      <CustomSelect
        name={name}
        required={required}
        defaultValue={defaultValue ?? undefined}
        options={options}
        aria-labelledby={labelId}
      />
    </div>
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
    <label className="adm-check text-sm text-ink">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} value="on" />
      <span className="adm-check__box" aria-hidden>
        <svg viewBox="0 0 12 12" fill="none">
          <path d="M2 6.5 4.8 9 10 3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
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
  return (
    <Link href={href} className={`adm-btn ${variant === "solid" ? "adm-btn--solid" : "adm-btn--ghost"}`}>
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`adm-card ${className}`}>{children}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="adm-empty">
      <KaguMark variant="outline" height={22} className="adm-empty__mark" />
      <p>{children}</p>
    </div>
  );
}

/** Custom-drawn radio around a real <input type="radio"> (group by shared `name`). */
export function Radio({
  label,
  name,
  value,
  defaultChecked,
  required,
}: {
  label: string;
  name: string;
  value: string;
  defaultChecked?: boolean;
  required?: boolean;
}) {
  return (
    <label className="adm-radio text-sm text-ink">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} required={required} />
      <span className="adm-radio__dot" aria-hidden />
      <span>{label}</span>
    </label>
  );
}

/** CSS tooltip (no title=). Wrap any focusable/inline element: <Tip text="…">…</Tip>.
    The wrapper is focusable so keyboard users get the tip too. */
export function Tip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span data-tip={text} tabIndex={0} className="inline-flex">
      {children}
    </span>
  );
}
