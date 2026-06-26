/*
  Package-builder catalog: website types, feature add-ons, and prices.
  EDIT PRICES HERE — everything renders from this file (option list, preview,
  total, mailto summary, admin inquiry labels). Pure data, server-safe.

  Prices are in Turkish Lira (₺). They were converted from the original USD
  figures at 1 USD = 46.62 TRY (26 Jun 2026) and rounded DOWN to the nearest
  1,000. To re-price, edit the ₺ numbers below directly.
*/

export type WebsiteTypeId =
  | "ecommerce"
  | "service"
  | "restaurant"
  | "portfolio";

export type PreviewZone = "navbar" | "hero" | "footer";

export type PreviewEffect =
  | { kind: "nav-icon"; icon: "globe" | "currency" | "card" | "avatar" | "theme" }
  | { kind: "chat-bubble"; style: "ai" | "whatsapp" | "telegram" }
  | { kind: "section"; section: "booking" | "analytics" }
  | { kind: "chrome-badge"; label: string }
  | { kind: "cms-outline" }
  | { kind: "ambient-motion" }
  | { kind: "none" };

export interface WebsiteType {
  id: WebsiteTypeId;
  label: string;
  tagline: string;
  basePrice: number;
  /** Shown in the preview's URL pill. */
  previewUrl: string;
}

export interface Feature {
  id: string;
  label: string;
  description: string;
  price: number;
  /** Types this feature applies to. Undefined = all types. */
  appliesTo?: WebsiteTypeId[];
  /** Only selectable/charged while this parent feature is also selected. */
  requires?: string;
  /** Mutually-exclusive group — selecting one clears the others (one or none). */
  group?: string;
  /** Caveat shown as a red pill on the feature row. */
  note?: string;
  effect: PreviewEffect;
}

export const CURRENCY = "TRY";

export function formatPrice(n: number): string {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export const WEBSITE_TYPES: WebsiteType[] = [
  {
    id: "portfolio",
    label: "Portfolio / Studio",
    tagline: "Show the work. Galleries, case studies, a voice.",
    basePrice: 30000,
    previewUrl: "yourstudio.com",
  },
  {
    id: "service",
    label: "Service business",
    tagline: "Clinics, salons, agencies — built to win enquiries.",
    basePrice: 40000,
    previewUrl: "yourbusiness.com",
  },
  {
    id: "restaurant",
    label: "Restaurant & booking",
    tagline: "Menu, atmosphere, reservations that actually convert.",
    basePrice: 50000,
    previewUrl: "yourrestaurant.com",
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    tagline: "Catalog, cart, checkout — a store that feels premium.",
    basePrice: 80000,
    previewUrl: "yourstore.com",
  },
];

/* ------------------------------------------------------------------ */
/* Component option groups — each zone offers styles; "custom" is the   */
/* bespoke option and renders as the animated gradient in the preview.  */
/* ------------------------------------------------------------------ */

export interface ComponentVariant {
  id: string;
  label: string;
  description: string;
  price: number; // 0 = included in the base
}

export interface ComponentGroup {
  zone: PreviewZone;
  label: string;
  /** First variant is the included default. */
  variants: ComponentVariant[];
}

export const COMPONENT_GROUPS: ComponentGroup[] = [
  {
    zone: "navbar",
    label: "Navbar",
    variants: [
      {
        id: "standard",
        label: "Classic",
        description: "Logo left, links right. Clean and familiar.",
        price: 0,
      },
      {
        id: "pills",
        label: "Wide pill",
        description: "Links grouped in a wide rounded pill.",
        price: 0,
      },
      {
        id: "floating",
        label: "Floating centered",
        description: "A rounded bar hovering over the page.",
        price: 0,
      },
      {
        id: "custom",
        label: "Custom design",
        description: "Designed from scratch around your brand.",
        price: 2000,
      },
    ],
  },
  {
    zone: "hero",
    label: "Hero",
    variants: [
      {
        id: "standard",
        label: "Editorial left",
        description: "Headline and call-to-action, left aligned.",
        price: 0,
      },
      {
        id: "centered",
        label: "Centered statement",
        description: "One big centered message, nothing else.",
        price: 0,
      },
      {
        id: "split",
        label: "Split with visual",
        description: "Copy on the left, imagery on the right.",
        price: 0,
      },
      {
        id: "custom",
        label: "Custom design",
        description: "A first fold designed around your story.",
        price: 5000,
      },
    ],
  },
  {
    zone: "footer",
    label: "Footer",
    variants: [
      {
        id: "columns",
        label: "Link columns",
        description: "Sitemap-style columns. Does the job.",
        price: 0,
      },
      {
        id: "minimal",
        label: "Minimal line",
        description: "One quiet row — logo, links, copyright.",
        price: 0,
      },
      {
        id: "cta",
        label: "Big CTA",
        description: "A closing headline that asks for the call.",
        price: 0,
      },
      {
        id: "custom",
        label: "Custom design",
        description: "Closing section with real character.",
        price: 2000,
      },
    ],
  },
];

export type ZoneChoices = Record<PreviewZone, string>;

export const DEFAULT_ZONE_CHOICES: ZoneChoices = {
  navbar: "standard",
  hero: "standard",
  footer: "columns",
};

/* ------------------------------------------------------------------ */
/* Theme + palette                                                     */
/* ------------------------------------------------------------------ */

export type ThemeChoice = "dark" | "light" | "both";

export interface ThemeOption {
  id: ThemeChoice;
  label: string;
  description: string;
  price: number;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "dark",
    label: "Dark",
    description: "One committed dark theme.",
    price: 0,
  },
  {
    id: "light",
    label: "Light",
    description: "One committed light theme.",
    price: 0,
  },
  {
    id: "both",
    label: "Light & dark",
    description: "Two themes, remembered per visitor.",
    price: 5000,
  },
];

export const DEFAULT_THEME: ThemeChoice = "dark";

export function getThemeOption(id: string): ThemeOption | undefined {
  return THEME_OPTIONS.find((t) => t.id === id);
}

/* Three custom color slots — one general/primary plus two accents. */
export interface CustomPalette {
  primary: string;
  accent2: string;
  accent3: string;
}

export const DEFAULT_CUSTOM_PALETTE: CustomPalette = {
  primary: "#1f8fe0",
  accent2: "#7c5cff",
  accent3: "#2dd4bf",
};

/* "I want branding" — no chosen colors; we design the identity. */
export const BRANDING_ID = "branding";
export const BRANDING_PRICE = 23000;
export const BRANDING_LABEL = "I want branding";

/* Hero motion add-on — cursor-reactive 3D first fold (rides on any hero style). */
export const ANIMATION_ID = "hero-animation";
export const ANIMATION_PRICE = 10000;
export const ANIMATION_LABEL = "Animate the hero";

/* Navbar motion add-on — cursor-aware hover interactions on the navbar. */
export const NAV_HOVER_ID = "nav-hover";
export const NAV_HOVER_PRICE = 3000;
export const NAV_HOVER_LABEL = "Animate on hover";

export function isValidHex(s: string): boolean {
  return /^#([0-9a-f]{6})$/i.test(s);
}

/** "1f8fe0-7c5cff-2dd4bf" — no '#', dash-joined, for shareable URLs. */
export function serializePalette(p: CustomPalette): string {
  return [p.primary, p.accent2, p.accent3]
    .map((c) => c.replace(/^#/, "").toLowerCase())
    .join("-");
}

export function parsePalette(s: string): CustomPalette | null {
  const parts = s.split("-");
  if (parts.length !== 3) return null;
  const [primary, accent2, accent3] = parts.map((c) => `#${c}`);
  if (!isValidHex(primary) || !isValidHex(accent2) || !isValidHex(accent3)) {
    return null;
  }
  return { primary, accent2, accent3 };
}

export function getComponentGroup(zone: PreviewZone): ComponentGroup {
  return COMPONENT_GROUPS.find((g) => g.zone === zone)!;
}

export function getVariant(
  zone: PreviewZone,
  variantId: string
): ComponentVariant | undefined {
  // Tolerates arbitrary zone strings (admin resolves stored tokens with it).
  const group = COMPONENT_GROUPS.find((g) => g.zone === zone);
  return group?.variants.find((v) => v.id === variantId);
}

/** "navbar:floating" tokens — how zone choices are stored alongside feature ids. */
export function zoneTokens(choices: ZoneChoices): string[] {
  return (Object.keys(choices) as PreviewZone[]).map(
    (zone) => `${zone}:${choices[zone]}`
  );
}

export const FEATURES: Feature[] = [
  {
    id: "cms",
    label: "CMS / admin panel",
    description: "Edit content yourself — no developer needed.",
    price: 55000,
    effect: { kind: "cms-outline" },
  },
  {
    id: "booking",
    label: "Booking & reservations",
    description: "Calendar, time slots, confirmations.",
    price: 65000,
    appliesTo: ["restaurant", "service"],
    effect: { kind: "section", section: "booking" },
  },
  {
    id: "payments",
    label: "Online payments",
    description: "Cards and local methods, securely handled.",
    price: 10000,
    appliesTo: ["ecommerce", "restaurant", "service"],
    note: "Merchant account and approval are arranged by the client, directly with the payment provider.",
    effect: { kind: "nav-icon", icon: "card" },
  },
  {
    id: "auth",
    label: "User accounts & auth",
    description: "Sign-up, login, password reset, profiles.",
    price: 50000,
    appliesTo: ["ecommerce"],
    effect: { kind: "nav-icon", icon: "avatar" },
  },
  {
    id: "multilang",
    label: "Multi-language",
    description: "Full i18n — every page in every language you need.",
    price: 15000,
    effect: { kind: "nav-icon", icon: "globe" },
  },
  {
    id: "rtl",
    label: "Right-to-left support",
    description: "Arabic & Persian — mirrored layouts and typography.",
    price: 10000,
    requires: "multilang",
    effect: { kind: "none" },
  },
  {
    id: "multicurrency",
    label: "Multi-currency",
    description: "Prices in the visitor's currency, auto-detected.",
    price: 10000,
    appliesTo: ["ecommerce"],
    effect: { kind: "nav-icon", icon: "currency" },
  },
  {
    id: "llm",
    label: "LLM API integration",
    description: "AI chat, translation, smart drafting — wired to your content.",
    price: 30000,
    effect: { kind: "chat-bubble", style: "ai" },
  },
  {
    id: "telegram",
    label: "Telegram API",
    description: "Enquiries and orders arrive as structured Telegram messages.",
    price: 10000,
    group: "messaging",
    effect: { kind: "chat-bubble", style: "telegram" },
  },
  {
    id: "whatsapp",
    label: "WhatsApp API",
    description: "Enquiries and orders arrive as structured WhatsApp messages.",
    price: 15000,
    group: "messaging",
    note: "WhatsApp Business API access and approval are arranged by the client, directly with Meta.",
    effect: { kind: "chat-bubble", style: "whatsapp" },
  },
  {
    id: "pdf",
    label: "PDF generation",
    description: "Documents generated server-side, downloadable in a click — includes PDF design.",
    price: 15000,
    effect: { kind: "chrome-badge", label: "PDF" },
  },
  {
    id: "seo",
    label: "SEO setup",
    description: "Technical SEO, structured data, sitemaps.",
    price: 20000,
    effect: { kind: "chrome-badge", label: "SEO" },
  },
  {
    id: "analytics",
    label: "Deep analytics and insights",
    description: "Privacy-friendly traffic and conversion insight.",
    price: 40000,
    effect: { kind: "section", section: "analytics" },
  },
];

export function getWebsiteType(id: string): WebsiteType | undefined {
  return WEBSITE_TYPES.find((t) => t.id === id);
}

export function featuresForType(typeId: WebsiteTypeId): Feature[] {
  return FEATURES.filter((f) => !f.appliesTo || f.appliesTo.includes(typeId));
}

/** Ids of features that require `featureId` (so they prune when it's removed). */
export function dependentFeatureIds(featureId: string): string[] {
  return FEATURES.filter((f) => f.requires === featureId).map((f) => f.id);
}

/** Other ids in the same mutually-exclusive group (cleared when one is picked). */
export function exclusiveSiblingIds(featureId: string): string[] {
  const f = FEATURES.find((x) => x.id === featureId);
  if (!f?.group) return [];
  return FEATURES.filter((x) => x.group === f.group && x.id !== f.id).map((x) => x.id);
}

/** A feature counts only if selected AND its parent (if any) is also selected. */
function isFeatureActive(f: Feature, selected: ReadonlySet<string>): boolean {
  return selected.has(f.id) && (!f.requires || selected.has(f.requires));
}

export function computeTotals(
  typeId: WebsiteTypeId,
  selected: ReadonlySet<string>,
  zoneChoices: ZoneChoices,
  theme: ThemeChoice,
  paletteId: string,
  animation: boolean = false,
  navHover: boolean = false
) {
  const type = getWebsiteType(typeId);
  const base = type?.basePrice ?? 0;
  const features = featuresForType(typeId).filter((f) => isFeatureActive(f, selected));
  const featuresPrice = features.reduce((sum, f) => sum + f.price, 0);
  const variants = COMPONENT_GROUPS.map((group) => ({
    group,
    variant: getVariant(group.zone, zoneChoices[group.zone]) ?? group.variants[0],
  }));
  const variantsPrice = variants.reduce((sum, v) => sum + v.variant.price, 0);
  const themeOption = getThemeOption(theme) ?? THEME_OPTIONS[0];
  const brandingPrice = paletteId === BRANDING_ID ? BRANDING_PRICE : 0;
  const animationPrice = animation ? ANIMATION_PRICE : 0;
  const navHoverPrice = navHover ? NAV_HOVER_PRICE : 0;
  return {
    base,
    featuresPrice,
    variants,
    variantsPrice,
    themeOption,
    brandingPrice,
    animationPrice,
    navHoverPrice,
    total:
      base +
      featuresPrice +
      variantsPrice +
      themeOption.price +
      brandingPrice +
      animationPrice +
      navHoverPrice,
    features,
  };
}
