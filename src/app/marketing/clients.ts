/*
  Marketing clients, rendered as file cards on /marketing.

  Adding a client is one entry here — the section maps over this array and the
  numbering, ramp colour and card layout all follow. Order is the order they
  appear in; the ramp runs across however many there are.

  Copy rule for this file: sector, what we run, what the goal is. No metrics,
  no results claims, no numbers — real case studies come later, with real data.
*/

export interface MarketingClient {
  /** Stable key + anchor id. */
  id: string;
  /** Client name — the card title. */
  name: string;
  /** Short uppercase label on the folder tab. */
  tab: string;
  /** Card subline, joined by the "/" separator: sector / what we run. */
  tags: readonly [string, string];
  /** One or two plain sentences. */
  lede: string;
  /** Instagram profile, or null for a card with no outbound link. */
  instagram: { handle: string; url: string } | null;
  /**
   * Portrait content screenshot or logo, served from /public/marketing/.
   * Renders inside the phone mockup, so supply it at the phone's 9:19.5 aspect
   * — 1080 × 2340 PNG or JPG. While this is null the card shows a monogram
   * plate built from the client's initials instead, in the card's own ink.
   */
  image: string | null;
  /** Alt text for that image. Required whenever `image` is set. */
  imageAlt?: string;
}

export const MARKETING_CLIENTS: readonly MarketingClient[] = [
  {
    id: "upperdeck",
    name: "Upperdeck",
    tab: "Restaurant",
    tags: ["Restaurant", "Meta & TikTok ads"],
    lede:
      "American diner in Beşiktaş, İstanbul. We run their Meta and TikTok advertising alongside their in-house content team, with walk-in traffic to the restaurant as the goal.",
    instagram: { handle: "@uupperdeckk", url: "https://instagram.com/uupperdeckk" },
    // TODO(owner): drop a 1080×2340 screenshot at /public/marketing/upperdeck.png
    // and set image: "/marketing/upperdeck.png" with imageAlt.
    image: null,
  },
  {
    id: "vision",
    name: "VISION",
    tab: "Streetwear",
    tags: ["Streetwear", "Instagram & Meta ads"],
    lede:
      "Turkish streetwear brand. We run their Instagram presence and their Meta performance campaigns, aimed at online sales and audience growth.",
    instagram: { handle: "@vision.cl1", url: "https://instagram.com/vision.cl1" },
    // TODO(owner): drop a 1080×2340 screenshot at /public/marketing/vision.png
    // and set image: "/marketing/vision.png" with imageAlt.
    image: null,
  },
];
