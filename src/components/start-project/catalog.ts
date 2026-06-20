/*
  Package-builder catalog: website types, feature add-ons, and prices.
  EDIT PRICES HERE — everything renders from this file (option list, preview,
  total, mailto summary, admin inquiry labels). Pure data, server-safe.
*/

export type WebsiteTypeId =
  | "ecommerce"
  | "service"
  | "restaurant"
  | "portfolio"
  | "saas";

export type PreviewZone = "navbar" | "hero" | "footer";

export type PreviewEffect =
  | { kind: "nav-icon"; icon: "globe" | "currency" | "card" | "avatar" | "theme" }
  | { kind: "chat-bubble"; style: "ai" | "whatsapp" }
  | { kind: "section"; section: "blog" | "booking" | "analytics" }
  | { kind: "chrome-badge"; label: string }
  | { kind: "cms-outline" }
  | { kind: "ambient-motion" };

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
  effect: PreviewEffect;
}

export const CURRENCY = "USD";

export function formatPrice(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

export const WEBSITE_TYPES: WebsiteType[] = [
  {
    id: "portfolio",
    label: "Portfolio / Studio",
    tagline: "Show the work. Galleries, case studies, a voice.",
    basePrice: 2000,
    previewUrl: "yourstudio.com",
  },
  {
    id: "service",
    label: "Service business",
    tagline: "Clinics, salons, agencies — built to win enquiries.",
    basePrice: 2600,
    previewUrl: "yourbusiness.com",
  },
  {
    id: "restaurant",
    label: "Restaurant & booking",
    tagline: "Menu, atmosphere, reservations that actually convert.",
    basePrice: 3200,
    previewUrl: "yourrestaurant.com",
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    tagline: "Catalog, cart, checkout — a store that feels premium.",
    basePrice: 4800,
    previewUrl: "yourstore.com",
  },
  {
    id: "saas",
    label: "Web app / SaaS",
    tagline: "Product UI, auth, dashboards — software, not brochure.",
    basePrice: 7500,
    previewUrl: "app.yourproduct.com",
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
        price: 250,
      },
      {
        id: "floating",
        label: "Floating centered",
        description: "A rounded bar hovering over the page.",
        price: 250,
      },
      {
        id: "custom",
        label: "Custom design",
        description: "Designed from scratch around your brand.",
        price: 400,
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
        price: 300,
      },
      {
        id: "split",
        label: "Split with visual",
        description: "Copy on the left, imagery on the right.",
        price: 350,
      },
      {
        id: "custom",
        label: "Custom design",
        description: "A first fold designed around your story.",
        price: 650,
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
        price: 150,
      },
      {
        id: "cta",
        label: "Big CTA",
        description: "A closing headline that asks for the call.",
        price: 250,
      },
      {
        id: "custom",
        label: "Custom design",
        description: "Closing section with real character.",
        price: 300,
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
    price: 350,
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
export const BRANDING_PRICE = 500;
export const BRANDING_LABEL = "I want branding";

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
    price: 1200,
    effect: { kind: "cms-outline" },
  },
  {
    id: "blog",
    label: "Blog & articles",
    description: "Publishing pipeline with categories and SEO meta.",
    price: 800,
    effect: { kind: "section", section: "blog" },
  },
  {
    id: "booking",
    label: "Booking & reservations",
    description: "Calendar, time slots, confirmations.",
    price: 1400,
    appliesTo: ["restaurant", "service"],
    effect: { kind: "section", section: "booking" },
  },
  {
    id: "payments",
    label: "Online payments",
    description: "Cards and local methods, securely handled.",
    price: 950,
    appliesTo: ["ecommerce", "restaurant", "saas", "service"],
    effect: { kind: "nav-icon", icon: "card" },
  },
  {
    id: "auth",
    label: "User accounts & auth",
    description: "Sign-up, login, password reset, profiles.",
    price: 1100,
    appliesTo: ["saas", "ecommerce"],
    effect: { kind: "nav-icon", icon: "avatar" },
  },
  {
    id: "multilang",
    label: "Multi-language",
    description: "Full i18n — every page in every language you need.",
    price: 900,
    effect: { kind: "nav-icon", icon: "globe" },
  },
  {
    id: "multicurrency",
    label: "Multi-currency",
    description: "Prices in the visitor's currency, auto-detected.",
    price: 600,
    appliesTo: ["ecommerce"],
    effect: { kind: "nav-icon", icon: "currency" },
  },
  {
    id: "llm",
    label: "LLM API integration",
    description: "AI chat, translation, smart drafting — wired to your content.",
    price: 1500,
    effect: { kind: "chat-bubble", style: "ai" },
  },
  {
    id: "messaging",
    label: "WhatsApp / Telegram API",
    description: "Enquiries and orders land as structured messages where your team lives.",
    price: 700,
    effect: { kind: "chat-bubble", style: "whatsapp" },
  },
  {
    id: "pdf",
    label: "PDF generation",
    description: "Documents generated server-side, downloadable in a click.",
    price: 600,
    effect: { kind: "chrome-badge", label: "PDF" },
  },
  {
    id: "seo",
    label: "SEO setup",
    description: "Technical SEO, structured data, sitemaps.",
    price: 500,
    effect: { kind: "chrome-badge", label: "SEO" },
  },
  {
    id: "analytics",
    label: "Analytics dashboard",
    description: "Privacy-friendly traffic and conversion insight.",
    price: 700,
    effect: { kind: "section", section: "analytics" },
  },
  {
    id: "animations",
    label: "Custom animations",
    description: "Motion design — entrances, scroll, micro-interactions.",
    price: 900,
    effect: { kind: "ambient-motion" },
  },
];

export function getWebsiteType(id: string): WebsiteType | undefined {
  return WEBSITE_TYPES.find((t) => t.id === id);
}

export function featuresForType(typeId: WebsiteTypeId): Feature[] {
  return FEATURES.filter((f) => !f.appliesTo || f.appliesTo.includes(typeId));
}

export function computeTotals(
  typeId: WebsiteTypeId,
  selected: ReadonlySet<string>,
  zoneChoices: ZoneChoices,
  theme: ThemeChoice,
  paletteId: string
) {
  const type = getWebsiteType(typeId);
  const base = type?.basePrice ?? 0;
  const features = featuresForType(typeId).filter((f) => selected.has(f.id));
  const featuresPrice = features.reduce((sum, f) => sum + f.price, 0);
  const variants = COMPONENT_GROUPS.map((group) => ({
    group,
    variant: getVariant(group.zone, zoneChoices[group.zone]) ?? group.variants[0],
  }));
  const variantsPrice = variants.reduce((sum, v) => sum + v.variant.price, 0);
  const themeOption = getThemeOption(theme) ?? THEME_OPTIONS[0];
  const brandingPrice = paletteId === BRANDING_ID ? BRANDING_PRICE : 0;
  return {
    base,
    featuresPrice,
    variants,
    variantsPrice,
    themeOption,
    brandingPrice,
    total: base + featuresPrice + variantsPrice + themeOption.price + brandingPrice,
    features,
  };
}
