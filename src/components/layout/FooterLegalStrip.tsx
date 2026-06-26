/*
  Shared footer strip: legal/policy links + accepted-payment logos + SSL note.
  Rendered inside BOTH SiteFooter (internal routes) and ContactFooterSection
  (homepage / start-project) so the iyzico-required links and marks appear on
  every page. Logos are the white variants in /public, sitting on the dark
  footer surfaces. Plain component (no "use client") — safe to nest in either
  client footer.
*/

import Link from "next/link";
import Image from "next/image";
import { legalLinks } from "@/lib/legal";

export function FooterLegalStrip() {
  return (
    <div
      style={{
        borderTop: "1px solid color-mix(in oklab, var(--ink) 14%, transparent)",
        paddingTop: "var(--space-12)",
        marginTop: "var(--space-16)",
        display: "grid",
        gap: "var(--space-8)",
      }}
    >
      {/* Legal / policy links */}
      <nav
        aria-label="Yasal / Legal"
        className="flex flex-wrap gap-x-6 gap-y-3"
      >
        {legalLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            data-cursor="nav-link"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--type-xs)",
              letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase",
              color: "var(--slate-ink)",
            }}
          >
            {l.tr}
          </Link>
        ))}
      </nav>

      {/* Payment marks + SSL */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <Image
            src="/logo_band_white@2x.png"
            alt="Visa · MasterCard"
            width={912}
            height={64}
            style={{ height: 22, width: "auto", maxWidth: "100%" }}
          />
          <Image
            src="/pay_with_iyzico_horizontal_white.png"
            alt="iyzico ile Öde"
            width={1050}
            height={145}
            style={{ height: 28, width: "auto", maxWidth: "100%" }}
          />
        </div>
        <span
          className="font-mono"
          style={{
            fontSize: "var(--type-xs)",
            letterSpacing: "var(--tracking-eyebrow)",
            textTransform: "uppercase",
            color: "var(--mint-deep)",
            whiteSpace: "nowrap",
          }}
        >
          Güvenli ödeme · SSL · Secure payment
        </span>
      </div>
    </div>
  );
}
