import type { Metadata } from "next";
import { Suspense } from "react";
import { Public_Sans, Space_Mono } from "next/font/google";
import "./globals.css";

import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { NavigationEvents } from "@/components/providers/NavigationEvents";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PreloadCurtain } from "@/components/motion/PreloadCurtain";

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
    "Kagu builds Next.js + Supabase platforms for hospitality, tourism, and service businesses. Founded 2025, Istanbul.",
  metadataBase: new URL("https://kagu.software"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${publicSans.variable}`}>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SmoothScrollProvider>
          <PreloadCurtain />
          <SiteHeader />
          <main id="main">{children}</main>
        </SmoothScrollProvider>
        <Suspense fallback={null}>
          <NavigationEvents />
        </Suspense>
      </body>
    </html>
  );
}
