import Link from "next/link";
import "@/styles/site.css";
import { KaguMark } from "@/components/KaguMark";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooterServer } from "@/components/layout/SiteFooterServer";
import { siteFontVars } from "@/lib/siteFonts";

export const metadata = {
  title: "Not found, Kagu",
};

export default function NotFound() {
  return (
    <div className={`site ${siteFontVars}`}>
      <SiteHeader />
      <main id="main" className="site-notfound">
        <KaguMark variant="outline" />
        <h1>Page not found.</h1>
        <Link href="/" className="site-btn">
          Back home
        </Link>
      </main>
      <SiteFooterServer />
    </div>
  );
}
