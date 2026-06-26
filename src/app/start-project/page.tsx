import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { StartProjectBuilder } from "@/components/start-project/StartProjectBuilder";
import {
  BRANDING_ID,
  DEFAULT_CUSTOM_PALETTE,
  DEFAULT_THEME,
  DEFAULT_ZONE_CHOICES,
  FEATURES,
  getThemeOption,
  parsePalette,
  getVariant,
  getWebsiteType,
  type ThemeChoice,
  type WebsiteTypeId,
  type ZoneChoices,
} from "@/components/start-project/catalog";

export const metadata: Metadata = {
  title: "Start a project · Kagu",
  description:
    "Assemble your website package — pick a starting point, add the components you need, and get a live preview with an instant estimate.",
};

type StartProjectParams = {
  type?: string;
  f?: string;
  nav?: string;
  hero?: string;
  foot?: string;
  theme?: string;
  accent?: string;
  anim?: string;
  navfx?: string;
};

export default async function StartProjectPage({
  searchParams,
}: {
  searchParams: Promise<StartProjectParams>;
}) {
  const params = await searchParams;

  // Validate shared-URL state against the catalog; silently drop anything stale.
  const initialTypeId: WebsiteTypeId = getWebsiteType(params.type ?? "")
    ? (params.type as WebsiteTypeId)
    : "service";
  const validFeatureIds = new Set(FEATURES.map((f) => f.id));
  const initialFeatureIds = (params.f ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => validFeatureIds.has(id));
  const initialZoneChoices: ZoneChoices = {
    navbar: getVariant("navbar", params.nav ?? "")
      ? params.nav!
      : DEFAULT_ZONE_CHOICES.navbar,
    hero: getVariant("hero", params.hero ?? "")
      ? params.hero!
      : DEFAULT_ZONE_CHOICES.hero,
    footer: getVariant("footer", params.foot ?? "")
      ? params.foot!
      : DEFAULT_ZONE_CHOICES.footer,
  };

  const initialTheme: ThemeChoice = getThemeOption(params.theme ?? "")
    ? (params.theme as ThemeChoice)
    : DEFAULT_THEME;
  const accentParam = params.accent ?? "";
  const initialBranding = accentParam === BRANDING_ID;
  const initialPalette =
    parsePalette(accentParam) ?? DEFAULT_CUSTOM_PALETTE;
  const initialAnimation = params.anim === "1";
  const initialNavHover = params.navfx === "1";

  return (
    <>
      <StartProjectBuilder
        initialTypeId={initialTypeId}
        initialFeatureIds={initialFeatureIds}
        initialZoneChoices={initialZoneChoices}
        initialTheme={initialTheme}
        initialPalette={initialPalette}
        initialBranding={initialBranding}
        initialAnimation={initialAnimation}
        initialNavHover={initialNavHover}
      />
      <SiteFooter />
    </>
  );
}
