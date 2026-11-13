/*
  Shared building blocks for the SEO cluster pages (§4 of the SEO brief).
  Server components only — the copy must exist in the raw HTML. Dark,
  black-and-white, aligned to .site-wrap. Styles live in seo.css.

  Layout contract per page:
    <SeoHero/> → <SeoSection/>* → <FaqSection/> → <CtaBand/>

  Writing rules the blocks encode:
  - every SeoSection is an <h2>; the FIRST paragraph inside must answer the
    heading on its own (answer-first, liftable into AI Overviews);
  - FaqSection renders the visible Q&A and the FAQPage JSON-LD from the SAME
    array, so they can never drift apart (Google cross-checks verbatim).
*/

import { NavLink } from "@/components/site/NavLink";
import type { ReactNode } from "react";
import { JsonLd } from "./JsonLd";
import { faqJsonLd, type FaqItem } from "@/lib/seo";
import { AsciiBlock } from "@/components/ascii/AsciiBlock";
import "./seo.css";

/* Deterministic ASCII texture band for the hero (plain characters, drawn once). */
const BAND_RAMP = " .,:;-=+*#%";
function makeBand(cols: number, rows: number): string {
  const out: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) {
      const w1 = Math.sin(x * 0.07 + y * 0.9) * 0.5 + 0.5;
      const w2 = Math.sin(x * 0.19 - y * 0.55 + 1.7) * 0.5 + 0.5;
      const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const r = h - Math.floor(h);
      const fade = Math.min(1, y / (rows - 1) + 0.15);
      const v = (w1 * 0.55 + w2 * 0.3 + r * 0.15) * fade;
      line += BAND_RAMP[Math.min(BAND_RAMP.length - 1, Math.floor(v * BAND_RAMP.length))];
    }
    out.push(line);
  }
  return out.join("\n");
}
const HERO_BAND = makeBand(190, 9);

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
    <section className="seo-hero">
      <div className="site-wrap">
        <div className="seo-hero__top">
          <span className="seo-label">{eyebrow}</span>
          <NavLink href={langSwitchHref} className="seo-lang">
            {langSwitchLabel}
          </NavLink>
        </div>
        <h1 className="seo-h1">{title}</h1>
        <p className="seo-lede">{lede}</p>
      </div>
      <div className="seo-band" aria-hidden="true">
        <AsciiBlock art={HERO_BAND} tone="line" size="clamp(6px, 0.8vw, 11px)" />
      </div>
    </section>
  );
}

/* ------------------------------ sections --------------------------------- */

interface SeoSectionProps {
  /** 0-based position — drives the § number. */
  index: number;
  title: string;
  /** Short section label next to the number (defaults to the site name). */
  eyebrow?: string;
  children: ReactNode;
}

export function SeoSection({ index, title, eyebrow = "Kagu", children }: SeoSectionProps) {
  return (
    <section className="seo-sec">
      <div className="site-wrap">
        <span className="seo-label">
          § {String(index + 1).padStart(2, "0")} · {eyebrow}
        </span>
        <h2 className="seo-h2">{title}</h2>
        <div className="seo-body">{children}</div>
      </div>
    </section>
  );
}

/** Body paragraph. The first <P> in a SeoSection must answer the h2 alone. */
export function P({ children }: { children: ReactNode }) {
  return <p className="seo-p">{children}</p>;
}

/** Inline internal link with the site's underline treatment. */
export function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <NavLink href={href} className="seo-a">
      {children}
    </NavLink>
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
    <ListTag className={`seo-list glass${ordered ? " seo-list--ol" : ""}`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
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
    <div className="seo-table glass">
      <div className="seo-table__scroll">
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className={j === row.length - 1 ? "seo-num" : undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? <p className="seo-note">{note}</p> : null}
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
    <section className="seo-sec seo-faq">
      {/* Same data renders the visible Q&A and the FAQPage node — verbatim by construction. */}
      <JsonLd data={faqJsonLd(faqs)} />
      <div className="site-wrap">
        <span className="seo-label">§ {String(index + 1).padStart(2, "0")} · FAQ</span>
        <h2 className="seo-h2">{title}</h2>
        <div className="seo-body seo-body--faq">
          {faqs.map((f) => (
            <div key={f.q} className="seo-qa">
              <h3 className="seo-h3">{f.q}</h3>
              <p className="seo-p">{f.a}</p>
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
    <section className="seo-cta">
      <div className="site-wrap">
        <p className="seo-cta__title">{title}</p>
        <div className="seo-cta__row">
          <NavLink href={href} className="site-btn">
            {label}
            <span aria-hidden="true">&rarr;</span>
          </NavLink>
          {secondaryHref && secondaryLabel ? (
            <NavLink href={secondaryHref} className="seo-a seo-cta__2">
              {secondaryLabel} <span aria-hidden="true">&rarr;</span>
            </NavLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}
