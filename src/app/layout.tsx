import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Public_Sans, Space_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { NavigationEvents } from "@/components/providers/NavigationEvents";
import { SiteHeaderGate } from "@/components/layout/SiteHeaderGate";
import { PageTransition } from "@/components/motion/PageTransition";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

const publicSans = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kagu · Software for boutique operators",
  description:
    "Kagu builds Next.js + Supabase platforms for hospitality and service businesses. Founded 2025, Istanbul.",
  metadataBase: new URL("https://kagusoftware.com"),
};

export const viewport: Viewport = {
  themeColor: "#14161d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${publicSans.variable}`}>
      <body className="min-h-svh antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SmoothScrollProvider>
          <PageTransition />
          <SiteHeaderGate />
          <main id="main">{children}</main>
        </SmoothScrollProvider>
        <Suspense fallback={null}>
          <NavigationEvents />
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
