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
  | { kind: "zone-gradient"; zone: PreviewZone }
  | { kind: "nav-icon"; icon: "globe" | "currency" | "card" | "avatar" | "theme" }
  | { kind: "chat-bubble" }
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

export const FEATURES: Feature[] = [
  {
    id: "custom_navbar",
    label: "Custom navbar",
    description: "Designed navigation, not a template header.",
    price: 400,
    effect: { kind: "zone-gradient", zone: "navbar" },
  },
  {
    id: "custom_hero",
    label: "Custom hero",
    description: "A first fold designed around your story.",
    price: 650,
    effect: { kind: "zone-gradient", zone: "hero" },
  },
  {
    id: "custom_footer",
    label: "Custom footer",
    description: "Closing section with sitemap, contact, character.",
    price: 300,
    effect: { kind: "zone-gradient", zone: "footer" },
  },
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
    id: "chatbot",
    label: "AI chatbot",
    description: "Answers visitors 24/7, trained on your content.",
    price: 1500,
    effect: { kind: "chat-bubble" },
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
    id: "darkmode",
    label: "Dark / light mode",
    description: "Two themes, remembered per visitor.",
    price: 350,
    effect: { kind: "nav-icon", icon: "theme" },
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

export function computeTotals(typeId: WebsiteTypeId, selected: ReadonlySet<string>) {
  const type = getWebsiteType(typeId);
  const base = type?.basePrice ?? 0;
  const features = featuresForType(typeId).filter((f) => selected.has(f.id));
  const featuresPrice = features.reduce((sum, f) => sum + f.price, 0);
  return { base, featuresPrice, total: base + featuresPrice, features };
}
