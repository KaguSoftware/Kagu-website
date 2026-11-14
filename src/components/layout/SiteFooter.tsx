/*
  SiteFooter — rendered once by the (site) layout. Server component.
  The turning ray-traced ASCII Kagu mark as centrepiece, a huge ASCII KAGU wordmark that
  scales to the width, link columns with mono labels, the kagu bird as a
  signature, then the legal strip (iyzico-required). Styles: src/styles/site.css.
*/

import { NavLink } from "@/components/site/NavLink";
import { KaguMark } from "@/components/KaguMark";
import { AsciiLogo } from "@/components/ascii/AsciiLogo";
import { AsciiBanner } from "@/components/ascii/AsciiBlock";
import { FooterLegalStrip } from "./FooterLegalStrip";
import { FALLBACK_EMAIL, contactHref } from "./navItems";

export type FooterStudio = { email?: string | null };

const guidesEn = [
  { href: "/custom-website-pricing", label: "Website pricing", lang: "en" },
  { href: "/full-stack-platform-cost", label: "Platform cost", lang: "en" },
  { href: "/multilingual-support-pricing", label: "Multilingual sites", lang: "en" },
  { href: "/admin-systems", label: "Admin systems", lang: "en" },
  { href: "/digital-tools-for-boutique-operators", label: "Boutique tools", lang: "en" },
] as const;
const guidesTr = [
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
      <div className="site-footer__art" aria-hidden="true">
        <AsciiLogo className="site-footer__logo" />
      </div>
      <div className="site-wrap">
        <div className="site-footer__word">
          <AsciiBanner word="KAGU" tone="shimmer" animate={false} className="site-footer__banner" />
        </div>

        <div className="site-footer__cols">
          <div className="site-footer__brand">
            <NavLink href="/" className="site-brand site-brand--sm" aria-label="Kagu home">
              <KaguMark variant="outline" height={14} />
              <span>kagu</span>
            </NavLink>
            <p>Software, built with care. Websites, platforms and the tools behind them.</p>
          </div>

          <nav className="site-footer__col" aria-label="Footer">
            <h3>Navigate</h3>
            <NavLink href="/work">Work</NavLink>
            <NavLink href="/marketing">Marketing</NavLink>
            <NavLink href="/about">About</NavLink>
            <NavLink href={contactHref}>Contact</NavLink>
          </nav>

          {/* SEO topic pages: quiet sitewide links so they keep inbound links */}
          <nav className="site-footer__col" aria-label="Guides">
            <h3>Guides</h3>
            {guidesEn.map((g) => (
              <NavLink key={g.href} href={g.href} lang={g.lang}>
                {g.label}
              </NavLink>
            ))}
          </nav>
          <nav className="site-footer__col" aria-label="Rehberler" lang="tr">
            <h3>Rehberler</h3>
            {guidesTr.map((g) => (
              <NavLink key={g.href} href={g.href} lang={g.lang}>
                {g.label}
              </NavLink>
            ))}
          </nav>

          <div className="site-footer__col">
            <h3>Say hello</h3>
            <a href={`mailto:${email}`}>{email}</a>
            <span>Istanbul</span>
          </div>
        </div>
      </div>
      <FooterLegalStrip />
    </footer>
  );
}
