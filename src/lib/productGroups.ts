/* Work page grouping: which bucket each case lives in, plus plain-words copy. */

export type GroupId = "apps" | "platforms" | "hosting" | "ai";
export type GroupPiece = "wing" | "ribbon" | "fold" | "all";

export interface GroupMore {
  intro: string;
  items: { title: string; text: string }[];
  note: string;
}

export interface ProductGroup {
  id: GroupId;
  title: string;
  line: string;
  tags: string[];
  piece: GroupPiece;
  emptyNote?: string;
  /** Shown in the group's detail popup on /work. */
  more: GroupMore;
}

export const groups: ProductGroup[] = [
  {
    id: "apps",
    title: "Apps",
    line: "Phone, tablet, computer.",
    tags: ["Phone", "iPad", "Mac", "Windows", "Shop tills"],
    piece: "wing",
    more: {
      intro: "One team, every screen.",
      items: [
        { title: "iPhone and iPad", text: "Apps people keep on their home screen." },
        { title: "Mac and Windows", text: "Desktop tools for the office or the shop." },
        { title: "Shop tills", text: "Sell, print and take payment on one screen." },
        { title: "Screens that feel alive", text: "Fast, smooth front-end with motion that feels right." },
      ],
      note: "We design it too.",
    },
  },
  {
    id: "platforms",
    title: "Platforms",
    line: "Run your business.",
    tags: ["CRM", "Online shops", "Bookings", "Stock", "Admin tools", "Dashboards"],
    piece: "ribbon",
    more: {
      intro: "The system behind your business.",
      items: [
        { title: "Online shops", text: "Sell on your own site, with your own look." },
        { title: "Bookings", text: "Let people book and pay without a phone call." },
        { title: "Customers", text: "A CRM that keeps every chat and order in one place." },
        { title: "Stock and orders", text: "Know what you have and what to reorder." },
        { title: "Admin tools and dashboards", text: "A control panel made for your team." },
      ],
      note: "Built around how you work, not from a template.",
    },
  },
  {
    id: "hosting",
    title: "Hosting",
    line: "Handled for you.",
    tags: ["Supabase", "Vercel", "Your own servers", "Moving old systems", "Upkeep"],
    piece: "fold",
    emptyNote: "We host it and keep it running.",
    more: {
      intro: "We keep it running.",
      items: [
        { title: "Supabase and Vercel", text: "Fast, safe, and easy to grow." },
        { title: "Your own servers", text: "Self-host it if you want to own everything." },
        { title: "Moving old systems", text: "Bring old software somewhere new, with your data." },
        { title: "Upkeep", text: "Updates, backups, and someone to call." },
      ],
      note: "Everything we build can be self-hosted or run on Supabase.",
    },
  },
  {
    id: "ai",
    title: "AI",
    line: "Smart helpers.",
    tags: ["Chatbots", "Search your files", "Automation"],
    piece: "all",
    more: {
      intro: "Helpers that do the boring bits.",
      items: [
        { title: "Chat helpers", text: "Answer customers on your site, any time." },
        { title: "Search your files", text: "Ask a question, get the answer from your own documents." },
        { title: "Automation", text: "Forms, emails and reports done for you." },
        { title: "AI inside your app", text: "Smart features, added only where they help." },
      ],
      note: "You stay in charge. The helper does the legwork.",
    },
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
