/*
  SiteFooter — tiny, quiet closing strip rendered once by the (site) layout.
  Row 1: outline mark + wordmark left; links + email right.
  Row 2: copyright + legal links (Turkish pages, iyzico-required) + payment marks.
  Server component (no client state). Styles: src/styles/site.css (.site-footer).
*/

import Link from "next/link";
import { KaguMark } from "@/components/KaguMark";
import { FooterLegalStrip } from "./FooterLegalStrip";
import { FALLBACK_EMAIL, contactHref } from "./navItems";

export type FooterStudio = { email?: string | null };

const guides = [
  { href: "/custom-website-pricing", label: "Website pricing", lang: "en" },
  { href: "/full-stack-platform-cost", label: "Platform cost", lang: "en" },
  { href: "/multilingual-support-pricing", label: "Multilingual sites", lang: "en" },
  { href: "/admin-systems", label: "Admin systems", lang: "en" },
  { href: "/digital-tools-for-boutique-operators", label: "Boutique tools", lang: "en" },
  { href: "/custom-website-fiyati", label: "Website fiyatı", lang: "tr" },
  { href: "/full-stack-platform-maliyeti", label: "Platform maliyeti", lang: "tr" },
  { href: "/multilingual-support-fiyat", label: "Çok dilli siteler", lang: "tr" },
  { href: "/admin-sistemleri", label: "Admin sistemleri", lang: "tr" },
  { href: "/butik-operatoler-dijital-arac", label: "Butik araçlar", lang: "tr" },
] as const;

export function SiteFooter({ studio }: { studio?: FooterStudio }) {
  const email = studio?.email?.trim() || FALLBACK_EMAIL;
  return (
    <footer className="site-footer">
      <div className="site-wrap">
        <div className="site-footer__row">
          <Link href="/" className="site-brand site-brand--sm" aria-label="Kagu home">
            <KaguMark variant="outline" height={14} />
            <span>kagu</span>
          </Link>
          <nav className="site-footer__links" aria-label="Footer">
            <Link href="/work">Work</Link>
            <Link href="/marketing">Marketing</Link>
            <Link href={contactHref}>Contact</Link>
            <a href={`mailto:${email}`}>{email}</a>
          </nav>
        </div>
        {/* SEO topic pages: quiet sitewide links so they keep inbound links */}
        <nav className="site-footer__guides" aria-label="Guides">
          {guides.map((g) => (
            <Link key={g.href} href={g.href} lang={g.lang}>
              {g.label}
            </Link>
          ))}
        </nav>
      </div>
      <FooterLegalStrip />
    </footer>
  );
}
