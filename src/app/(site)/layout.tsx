import type { Viewport } from "next";
import "@/styles/site.css";

import { siteFontVars } from "@/lib/siteFonts";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooterServer } from "@/components/layout/SiteFooterServer";
import { PageTransition } from "@/components/site/PageTransition";

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`site ${siteFontVars}`}>
      <SiteHeader />
      <PageTransition>
        <main id="main">{children}</main>
        <SiteFooterServer />
      </PageTransition>
    </div>
  );
}
