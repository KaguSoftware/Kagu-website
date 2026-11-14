import Link from "next/link";
import "@/styles/site.css";
import "./not-found.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooterServer } from "@/components/layout/SiteFooterServer";
import { AsciiBanner } from "@/components/ascii/AsciiBlock";
import { AsciiLogo } from "@/components/ascii/AsciiLogo";
import { siteFontVars } from "@/lib/siteFonts";

export const metadata = {
  title: "Not found, Kagu",
};

export default function NotFound() {
  return (
    <div className={`site ${siteFontVars}`}>
      <SiteHeader />
      <main id="main" className="nf">
        <div className="nf__body">
          <div className="nf__logo" aria-hidden="true">
            <AsciiLogo shatter={0.6} still />
          </div>
          <AsciiBanner word="404" tone="shimmer" size="clamp(96px, 16vw, 190px)" className="nf__banner" />
          <h1 className="nf__h1">Page not found.</h1>
          <p className="nf__p">The page you are looking for has moved, or never existed.</p>
          <Link href="/" className="site-btn">
            Back home
          </Link>
        </div>
      </main>
      <SiteFooterServer />
    </div>
  );
}
