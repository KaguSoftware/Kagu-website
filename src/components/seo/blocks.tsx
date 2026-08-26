/*
  Shared building blocks for the SEO cluster pages (§4 of the SEO brief).
  Server components only — the copy must exist in the raw HTML. They reuse the
  site's tokens (eyebrow, display type, section rhythm, hairlines) so the
  pages read as native, not bolted on.

  Layout contract per page:
    <SeoHero/> (paper) → <SeoSection/>* (alternating paper / mint-pale)
    → <FaqSection/> (mint-soft) → <CtaBand/> (paper) → <SiteFooter/>

  Writing rules the blocks encode:
  - every SeoSection is an <h2>; the FIRST paragraph inside must answer the
    heading on its own (answer-first, liftable into AI Overviews);
  - FaqSection renders the visible Q&A and the FAQPage JSON-LD from the SAME
    array, so they can never drift apart (Google cross-checks verbatim).
*/

import Link from "next/link";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/layout/Eyebrow";
import { JsonLd } from "./JsonLd";
import { faqJsonLd, type FaqItem } from "@/lib/seo";
import { ArrowGlyph } from "@/components/ui/ArrowGlyph";

const SURFACE = ["var(--paper)", "var(--mint-pale)"] as const;

/* ------------------------------- hero ----------------------------------- */

interface SeoHeroProps {
  eyebrow: string;
  title: string;
  lede: string;
  /** Link to the other-language version of this page ("/custom-website-pricing"). */
  langSwitchHref: string;
  langSwitchLabel: string;
}

export function SeoHero({ eyebrow, title, lede, langSwitchHref, langSwitchLabel }: SeoHeroProps) {
  return (
    <section
      style={{ background: "var(--paper)" }}
      className="px-(--container-x) pt-(--space-32) pb-(--space-20)"
    >
      <div className="w-full max-w-(--container-max) mx-auto">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <span className="eyebrow block" style={{ marginBottom: "var(--space-6)" }}>
            {eyebrow}
          </span>
          <Link
            href={langSwitchHref}
            data-cursor="nav-link"
            className="font-mono"
            style={{
              fontSize: "var(--type-xs)",
              letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase",
              color: "var(--mint-text)",
              borderBottom: "1px solid var(--mint-text)",
              paddingBottom: 2,
            }}
          >
            {langSwitchLabel}
          </Link>
        </div>
        <h1
          className="display"
          style={{ fontSize: "var(--type-5xl)", lineHeight: 0.95, maxWidth: "18ch" }}
        >
          {title}
        </h1>
        <p
          style={{
            marginTop: "var(--space-8)",
            maxWidth: "58ch",
            fontSize: "var(--type-lg)",
            lineHeight: 1.55,
            color: "var(--slate-ink)",
          }}
        >
          {lede}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------ sections --------------------------------- */

interface SeoSectionProps {
  /** 0-based position — drives the alternating background rhythm. */
  index: number;
  title: string;
  /** Short section label next to the number (defaults to the site name). */
  eyebrow?: string;
  children: ReactNode;
}

export function SeoSection({ index, title, eyebrow = "Kagu", children }: SeoSectionProps) {
  return (
    <section
      style={{ background: SURFACE[index % 2] }}
      className="px-(--container-x) py-(--section-y)"
    >
      <div className="w-full max-w-(--container-max) mx-auto">
        <Eyebrow number={String(index + 1).padStart(2, "0")}>{eyebrow}</Eyebrow>
        <h2
          className="display"
          style={{
            fontSize: "var(--type-3xl)",
            lineHeight: 1.1,
            margin: "var(--space-6) 0 var(--space-10)",
            maxWidth: "28ch",
          }}
        >
          {title}
        </h2>
        <div style={{ display: "grid", gap: "var(--space-6)", maxWidth: "68ch" }}>
          {children}
        </div>
      </div>
    </section>
  );
}

/** Body paragraph. The first <P> in a SeoSection must answer the h2 alone. */
export function P({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: "var(--type-md)", lineHeight: 1.7, color: "var(--ink)" }}>
      {children}
    </p>
  );
}

/** Inline internal link with the site's underline treatment. */
export function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      data-cursor="read"
      style={{ color: "var(--mint-text)", borderBottom: "1px solid var(--mint-text)" }}
    >
      {children}
    </Link>
  );
}

/** Numbered steps (processes) or plain bullets (features). */
export function SeoList({
  items,
  ordered = false,
}: {
  items: ReactNode[];
  ordered?: boolean;
}) {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <ListTag
      style={{
        display: "grid",
        gap: "var(--space-4)",
        paddingLeft: "1.4em",
        listStyle: ordered ? "decimal" : "disc",
        fontSize: "var(--type-md)",
        lineHeight: 1.7,
        color: "var(--ink)",
      }}
    >
      {items.map((item, i) => (
        <li key={i} style={{ paddingLeft: "0.3em" }}>
          {item}
        </li>
      ))}
    </ListTag>
  );
}

/* ------------------------------- table ----------------------------------- */

interface PriceTableProps {
  headers: string[];
  rows: ReactNode[][];
  /** Footnote under the table (e.g. VAT/currency note). */
  note?: string;
}

export function PriceTable({ headers, rows, note }: PriceTableProps) {
  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "var(--type-base)",
            lineHeight: 1.5,
          }}
        >
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="font-mono"
                  style={{
                    textAlign: "left",
                    fontSize: "var(--type-xs)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    fontWeight: 400,
                    color: "var(--slate-ink)",
                    borderBottom: "1px solid var(--neutral)",
                    padding: "var(--space-3) var(--space-4) var(--space-3) 0",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    style={{
                      borderBottom: "1px solid var(--neutral)",
                      padding: "var(--space-4) var(--space-4) var(--space-4) 0",
                      color: j === 0 ? "var(--ink)" : "var(--slate-ink)",
                      whiteSpace: j === row.length - 1 ? "nowrap" : undefined,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? (
        <p
          className="font-mono"
          style={{
            marginTop: "var(--space-4)",
            fontSize: "var(--type-xs)",
            letterSpacing: "0.04em",
            color: "var(--slate-ink)",
          }}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------- FAQ ------------------------------------ */

interface FaqSectionProps {
  /** 0-based section position, continues the numbering rhythm. */
  index: number;
  title: string;
  faqs: FaqItem[];
}

export function FaqSection({ index, title, faqs }: FaqSectionProps) {
  return (
    <section
      style={{ background: "var(--mint-soft)" }}
      className="px-(--container-x) py-(--section-y)"
    >
      {/* Same data renders the visible Q&A and the FAQPage node — verbatim by construction. */}
      <JsonLd data={faqJsonLd(faqs)} />
      <div className="w-full max-w-(--container-max) mx-auto">
        <Eyebrow number={String(index + 1).padStart(2, "0")}>FAQ</Eyebrow>
        <h2
          className="display"
          style={{
            fontSize: "var(--type-3xl)",
            lineHeight: 1.1,
            margin: "var(--space-6) 0 var(--space-12)",
            maxWidth: "24ch",
          }}
        >
          {title}
        </h2>
        <div style={{ display: "grid", gap: "var(--space-10)", maxWidth: "68ch" }}>
          {faqs.map((f) => (
            <div
              key={f.q}
              style={{ borderTop: "1px solid var(--neutral)", paddingTop: "var(--space-6)" }}
            >
              <h3
                className="display"
                style={{
                  fontSize: "var(--type-xl)",
                  lineHeight: 1.2,
                  marginBottom: "var(--space-4)",
                }}
              >
                {f.q}
              </h3>
              <p style={{ fontSize: "var(--type-md)", lineHeight: 1.7, color: "var(--ink)" }}>
                {f.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- CTA band -------------------------------- */

interface CtaBandProps {
  title: string;
  href: string;
  label: string;
  /** Secondary link (e.g. contact). */
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function CtaBand({ title, href, label, secondaryHref, secondaryLabel }: CtaBandProps) {
  return (
    <section
      style={{ background: "var(--paper)" }}
      className="px-(--container-x) py-(--section-y)"
    >
      <div className="w-full max-w-(--container-max) mx-auto">
        <p
          className="display"
          style={{
            fontSize: "var(--type-4xl)",
            lineHeight: 0.98,
            color: "var(--slate-ink)",
            maxWidth: "20ch",
            marginBottom: "var(--space-12)",
          }}
        >
          {title}
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <Link
            href={href}
            data-cursor="view"
            className="inline-flex items-center gap-3"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--type-md)",
              letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase",
              color: "var(--ink)",
              background: "var(--mint-deep)",
              padding: "20px 28px",
              minHeight: 56,
              border: "1px solid var(--ink)",
            }}
          >
            {label}
            <ArrowGlyph length={24} color="var(--ink)" />
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              data-cursor="nav-link"
              className="font-mono inline-flex items-center gap-3"
              style={{
                fontSize: "var(--type-sm)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: "var(--mint-text)",
                borderBottom: "1px solid var(--mint-text)",
                paddingBottom: "var(--space-2)",
                minHeight: 44,
                alignItems: "center",
              }}
            >
              {secondaryLabel}
              <ArrowGlyph length={24} />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
