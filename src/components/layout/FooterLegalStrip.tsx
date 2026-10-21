/*
  Footer legal band: policy links + accepted-payment marks + SSL note.
  REQUIRED on every page for the iyzico merchant approval (Turkish
  distance-sales rules) — keep every link label (from @/lib/legal) and both
  payment marks. Colour and styling are free: the white marks are drawn in ink
  to sit on the cream footer. Plain server component.
*/

import Link from "next/link";
import Image from "next/image";
import { legalLinks } from "@/lib/legal";

export function FooterLegalStrip() {
  return (
    <div className="site-legal">
      <div className="site-wrap site-legal__inner">
        <nav aria-label="Yasal / Legal" lang="tr" className="site-legal__links">
          {legalLinks.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.tr}
            </Link>
          ))}
        </nav>
        <div className="site-legal__pay">
          <div className="site-legal__marks">
            <Image
              src="/logo_band_white@2x.png"
              alt="iyzico ile Öde · MasterCard · Visa · American Express · Troy"
              width={912}
              height={64}
              className="site-legal__band"
            />
            <Image
              src="/pay_with_iyzico_horizontal_white.png"
              alt="Pay with iyzico"
              width={1050}
              height={145}
              className="site-legal__iyzico"
            />
          </div>
          <span className="site-legal__ssl">Güvenli ödeme · SSL · Secure payment</span>
        </div>
        <span className="site-legal__copy">© {new Date().getFullYear()} Kagu · Istanbul</span>
      </div>
    </div>
  );
}
