/* Work page grouping: which bucket each case lives in, plus plain-words copy. */

export type GroupId = "apps" | "platforms" | "hosting" | "ai";
export type GroupPiece = "wing" | "ribbon" | "fold" | "all";

export interface ProductGroup {
  id: GroupId;
  title: string;
  line: string;
  tags: string[];
  piece: GroupPiece;
  emptyNote?: string;
}

export const groups: ProductGroup[] = [
  {
    id: "apps",
    title: "Apps",
    line: "Phone, tablet, computer.",
    tags: ["Phone", "iPad", "Mac", "Windows", "Shop tills"],
    piece: "wing",
  },
  {
    id: "platforms",
    title: "Platforms",
    line: "Run your business.",
    tags: ["CRM", "Online shops", "Bookings", "Stock", "Admin tools", "Dashboards"],
    piece: "ribbon",
  },
  {
    id: "hosting",
    title: "Hosting",
    line: "Handled for you.",
    tags: ["Supabase", "Vercel", "Your own servers", "Moving old systems", "Upkeep"],
    piece: "fold",
    emptyNote: "We host it and keep it running.",
  },
  {
    id: "ai",
    title: "AI",
    line: "Smart helpers.",
    tags: ["Chatbots", "Search your files", "Automation"],
    piece: "all",
  },
];

const caseGroupMap: Record<string, GroupId> = {
  four: "apps",
  upperdeck: "platforms",
  "sabrina-turizm": "platforms",
  "vize-makinesi": "platforms",
  genbuzz: "ai",
};

/** Slug to group id; unknown slugs land in platforms. */
export const caseGroup: Record<string, GroupId> = new Proxy(caseGroupMap, {
  get: (t, k) => (typeof k === "string" ? (t[k] ?? "platforms") : undefined),
});

export const caseOneLiner: Record<string, string> = {
  "sabrina-turizm": "Tours, booked online.",
  upperdeck: "A menu you order from.",
  genbuzz: "AI writes the paperwork.",
  "vize-makinesi": "Visa rules, made simple.",
  four: "Our own iPhone app.",
};

/** Known one-liner, else first sentence of the lede cut to ~6 words. */
export function oneLiner(c: { slug: string; lede: string }): string {
  const known = caseOneLiner[c.slug];
  if (known) return known;
  const first = (c.lede.split(/(?<=[.!?])\s/)[0] ?? "").trim().replace(/[.!?]+$/, "");
  const words = first.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.slice(0, 6).join(" ") + (words.length > 6 ? "…" : ".");
}
