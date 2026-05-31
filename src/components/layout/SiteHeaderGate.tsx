"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";

/** Renders the public site header everywhere except the admin panel. */
export function SiteHeaderGate() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <SiteHeader />;
}
