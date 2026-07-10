import type { Metadata } from "next";
import { Hero3D } from "@/components/hero3d/Hero3D";

export const metadata: Metadata = {
  title: "Kagu · AI systems for ambitious teams",
  description: "A premium interactive 3D hero — the Kagu mark as a folded obsidian sculpture.",
  // Internal design showcase — keep it out of the index so it never competes
  // with the real homepage.
  robots: { index: false, follow: false },
};

export default function HeroPage() {
  return <Hero3D />;
}
