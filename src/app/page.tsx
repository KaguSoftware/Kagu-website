/*
  Homepage — 9-section assembly.
  Section order locked per DESIGN_BASELINE.md §3 background rhythm:
    Hero (paper) → Capabilities (mint-pale) → Selected Work (paper)
    → Approach (mint-soft) → About (paper) → Recognition (mint-soft)
    → Boutique software (paper) → FAQ (mint-soft) → Contact (#0e1016)
  No two adjacent sections share background.
*/

import type { Metadata } from "next";
import { Hero3D } from "@/components/hero3d/Hero3D";
import { CapabilitiesSection } from "@/components/sections/CapabilitiesSection";
import { SelectedWorkSection } from "@/components/sections/SelectedWorkSection";
import { ApproachSection } from "@/components/sections/ApproachSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { ClientsRecognitionSection } from "@/components/sections/ClientsRecognitionSection";
import { BoutiqueSoftwareSection } from "@/components/sections/BoutiqueSoftwareSection";
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
import { pageMetadata, serviceJsonLd, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

const TITLE = "Boutique Operator Software · Kagu";
const DESCRIPTION =
  "Custom-built software for boutique operators, streamlining operations and improving customer experience — websites, digital tools and admin systems from Kagu.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/",
  lang: "en",
  enPath: "/",
  trPath: "/butik-operator-yazilimi",
});

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
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: "/", lang: "en" })}
      />
      <JsonLd
        data={serviceJsonLd({
          name: "Boutique Operator Software",
          description: DESCRIPTION,
          path: "/",
          lang: "en",
        })}
      />
      <Hero3D
        title="Kagu"
        subtitle="Custom websites and digital tools, built to fit your business."
        ctaLabel="Start a project"
        ctaHref="/contact"
        location="Est. 2025 · Istanbul"
      />
      <CapabilitiesSection capabilities={capabilities} stackTokens={marquees.lineage} />
      {/* Decorative section break: a strip of walking kagu birds. */}
      <div style={{ background: "var(--paper)", padding: "var(--space-12) 0" }}>
        <BirdWalk count={10} size={40} duration={42} />
      </div>
      <SelectedWorkSection cases={featured} />
      <ApproachSection approach={approach} />
      <AboutSection principles={studio.principles} />
      <ClientsRecognitionSection metrics={studio.metrics} clients={clientNames} />
      <BoutiqueSoftwareSection />
      <ContactFooterSection studio={studio} />
    </>
  );
}
