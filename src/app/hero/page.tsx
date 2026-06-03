import type { Metadata } from "next";
import { Hero3D } from "@/components/hero3d/Hero3D";

export const metadata: Metadata = {
  title: "Kagu · AI systems for ambitious teams",
  description: "A premium interactive 3D hero — the Kagu mark as a folded obsidian sculpture.",
};

export default function HeroPage() {
  return <Hero3D />;
}
