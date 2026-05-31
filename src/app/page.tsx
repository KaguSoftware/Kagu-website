/*
  Homepage — 7-section assembly.
  Section order locked per DESIGN_BASELINE.md §3 background rhythm:
    Hero (paper) → Capabilities (mint-pale) → Selected Work (paper)
    → Approach (mint-soft) → About (paper) → Recognition (mint-deep)
    → Contact (slate-ink)
  No two adjacent sections share background.
*/

import { HeroSection } from "@/components/sections/HeroSection";
import { CapabilitiesSection } from "@/components/sections/CapabilitiesSection";
import { SelectedWorkSection } from "@/components/sections/SelectedWorkSection";
import { ApproachSection } from "@/components/sections/ApproachSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { ClientsRecognitionSection } from "@/components/sections/ClientsRecognitionSection";
import { ContactFooterSection } from "@/components/sections/ContactFooterSection";
import { BirdWalk } from "@/components/motion/BirdWalk";
import {
  getFeaturedCases,
  getCapabilities,
  getApproach,
  getStudio,
  getCases,
} from "@/lib/content";
import { getStackTokens } from "@/lib/marquees";

export default async function Home() {
  const [featured, capabilities, approach, studio, allCases, marquees] =
    await Promise.all([
      getFeaturedCases(),
      getCapabilities(),
      getApproach(),
      getStudio(),
      getCases(),
      getStackTokens(),
    ]);

  const clientNames = allCases.map((c) => ({ slug: c.slug, client: c.client }));

  return (
    <>
      <HeroSection heroMarquee={marquees.hero} />
      <CapabilitiesSection capabilities={capabilities} stackTokens={marquees.lineage} />
      {/* Decorative section break: a strip of walking kagu birds. */}
      <div style={{ background: "var(--paper)", padding: "var(--space-12) 0" }}>
        <BirdWalk count={10} size={40} duration={42} />
      </div>
      <SelectedWorkSection cases={featured} />
      <ApproachSection approach={approach} />
      <AboutSection principles={studio.principles} />
      <ClientsRecognitionSection metrics={studio.metrics} clients={clientNames} />
      <ContactFooterSection studio={studio} />
    </>
  );
}
