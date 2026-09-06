/*
  SEO single source of truth — canonical URLs, hreflang pairs, and the JSON-LD
  builders every public page shares. Business facts (address, phone, e-mail)
  come from src/lib/legal.ts so they can never drift from the legal pages.

  Every indexable page calls pageMetadata() so canonicals, hreflang alternates
  and OG/Twitter tags stay consistent, and renders its JSON-LD through
  <JsonLd/> (src/components/seo/JsonLd.tsx).
*/

import type { Metadata } from "next";
import { seller } from "@/lib/legal";

export const SITE_URL = "https://kagusoftware.com";
export const SITE_NAME = "Kagu";

/** Date the SEO copy on the static marketing pages was last reviewed. */
export const CONTENT_UPDATED = "2026-07-10";
export const CONTENT_PUBLISHED = "2026-07-10";

export type PageLang = "en" | "tr";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}

interface PageMetadataInput {
  /** ≤60 chars, carries the head keyword + brand. */
  title: string;
  /** 70–160 chars. */
  description: string;
  /** This page's own path ("/admin-sistemleri"). Becomes the canonical. */
  path: string;
  lang: PageLang;
  /** hreflang pair — the EN and TR versions of this cluster (either may be this page). */
  enPath?: string;
  trPath?: string;
}

/**
 * Self-referencing canonical + hreflang alternates + OG/Twitter for one page.
 * x-default points at the cluster's primary-language page (this page's own
 * language version), so unmatched languages land on the canonical version.
 */
export function pageMetadata({
  title,
  description,
  path,
  lang,
  enPath,
  trPath,
}: PageMetadataInput): Metadata {
  const languages: Record<string, string> = {};
  if (enPath) languages.en = enPath;
  if (trPath) languages.tr = trPath;
  if (enPath || trPath) languages["x-default"] = path;

  return {
    title,
    description,
    alternates: {
      canonical: path,
      ...(Object.keys(languages).length ? { languages } : {}),
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: lang === "tr" ? "tr_TR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/**
 * Clip prose to `max` on a word boundary, dropping any dangling punctuation
 * before the ellipsis. Meta descriptions get cut around 160 chars, and a case
 * lede can run well past that.
 */
export function clampText(text: string, max = 155): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const atSpace = cut.slice(0, cut.lastIndexOf(" "));
  return atSpace.replace(/[\s,;:.—-]+$/, "") + "…";
}

/* ------------------------------- JSON-LD -------------------------------- */

const ORG_ID = `${SITE_URL}/#organization`;

/**
 * Sitewide Organization/LocalBusiness node (rendered once in the root layout).
 * Address, phone and e-mail read from the seller record in src/lib/legal.ts.
 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "@id": ORG_ID,
    name: seller.tradeName,
    url: SITE_URL,
    logo: `${SITE_URL}/kagulogoNoBg.png`,
    email: seller.email,
    telephone: seller.phone,
    description:
      "Custom-built software for boutique operators — custom websites, digital tools, full-stack platforms and admin systems, with multilingual support.",
    foundingDate: "2025",
    address: {
      "@type": "PostalAddress",
      streetAddress: seller.address,
      addressLocality: seller.taxOffice,
      addressRegion: seller.city,
      addressCountry: "TR",
    },
    areaServed: ["Istanbul", "Worldwide"],
    knowsLanguage: ["tr", "en", "ar", "fa", "ru"],
    // TODO(owner): add real social/profile URLs (GitHub, LinkedIn, Instagram…) as sameAs.
    // TODO(owner): add openingHoursSpecification if fixed office hours exist.
  };
}

export interface FaqItem {
  q: string;
  a: string;
}

/** FAQPage node — call with the SAME array the visible FAQ renders from. */
export function faqJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

interface ServiceInput {
  name: string;
  description: string;
  path: string;
  lang: PageLang;
}

/** Service node for the service/pricing landing pages. */
export function serviceJsonLd({ name, description, path, lang }: ServiceInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: absoluteUrl(path),
    inLanguage: lang,
    serviceType: "Custom software development",
    provider: { "@id": ORG_ID },
    areaServed: ["Istanbul", "Worldwide"],
  };
}

interface WebPageInput {
  title: string;
  description: string;
  path: string;
  lang: PageLang;
  datePublished?: string;
  dateModified?: string;
}

/** WebPage node carrying machine-readable dates for content pages. */
export function webPageJsonLd({
  title,
  description,
  path,
  lang,
  datePublished = CONTENT_PUBLISHED,
  dateModified = CONTENT_UPDATED,
}: WebPageInput) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: absoluteUrl(path),
    inLanguage: lang,
    datePublished,
    dateModified,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    publisher: { "@id": ORG_ID },
  };
}

/** BreadcrumbList for pages one level below the homepage. */
export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
