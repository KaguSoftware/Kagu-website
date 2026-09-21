/*
  Marketing clients, rendered as file cards on /marketing.

  Adding a client is one entry here — the section maps over this array and the
  numbering, ramp colour and card layout all follow. Order is the order they
  appear in; the ramp runs across however many there are.

  Copy rule for this file: sector, what we run, what the goal is. No metrics,
  no results claims, no numbers — real case studies come later, with real data.
*/

/** The link slots a client card can carry, in render order. */
export type ClientLinkKind = "instagram" | "tiktok" | "facebook" | "website";

export interface ClientLink {
  kind: ClientLinkKind;
  /**
   * Second line on the button: the @handle, or the bare domain for a site.
   * Omitted where there is nothing honest to put there — a Facebook page on a
   * numeric profile.php URL has no handle to show, so the button is just its
   * label rather than a made-up one.
   */
  detail?: string;
  url: string;
  /**
   * Square logo in /public/marketing/, for a `website` link where there is no
   * platform mark to draw. SVG, or a PNG at 128 × 128 on a transparent
   * background.
   *
   * Nothing renders it at the moment — it belonged to the 2 × 2 button grid
   * the phone replaced, and is kept for whatever brings the platform links
   * back. Setting it today has no visible effect.
   */
  icon?: string;
}

export interface ClientReelVideo {
  /**
   * Path under /public. An H.264 MP4 cut to the phone's portrait aspect
   * (9 / 19.5 — 576 x 1248 and 1080 x 2340 both land on it exactly). Anything
   * else is cover-cropped by the phone screen, so a squarer edit loses its
   * top and bottom.
   */
  src: string;
  /** Optional still for the first frame, same aspect as the video. */
  poster?: string;
}

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
  /**
   * Where the account lives, most important first. The right-hand side of the
   * card is the phone now, so only the FIRST entry renders — as the card's
   * "View profile" link, the same slot /work's cards use for "View file". The
   * rest are kept because they are the account's real addresses and the next
   * thing to go on a card (a link row under the copy, a second reel) will want
   * them; leave a platform out entirely rather than pointing it at a URL that
   * does not resolve.
   */
  links: readonly ClientLink[];
  /**
   * The video on the phone screen. Omit and the card renders copy only — no
   * empty frame.
   */
  reel?: ClientReelVideo;
}

export const MARKETING_CLIENTS: readonly MarketingClient[] = [
  {
    id: "vision",
    name: "VISION",
    tab: "Streetwear",
    tags: ["Streetwear", "Instagram & Meta ads"],
    lede:
      "Turkish streetwear brand. We run their Instagram presence and their Meta performance campaigns, aimed at online sales and audience growth.",
    links: [
      {
        kind: "instagram",
        detail: "@vision.cl1",
        url: "https://instagram.com/vision.cl1",
      },
      {
        kind: "tiktok",
        detail: "@vision.cl1",
        url: "https://www.tiktok.com/@vision.cl1",
      },
      {
        // No vanity URL on this page yet, so there is no handle to show.
        kind: "facebook",
        url: "https://www.facebook.com/profile.php?id=61593693388926",
      },
      {
        // Stripped back to the bare storefront on purpose. The URL as supplied
        // carried VISION's own link-in-bio tracking — utm_source=ig,
        // utm_medium=social, utm_content=link_in_bio, a utm_id and an fbclid
        // from one real Instagram click. Shipping that here would file every
        // visitor we send as Instagram link-in-bio traffic in their analytics,
        // and replay a stale Meta click id on top. See the note in
        // src/app/marketing/page.tsx if a Kagu-side UTM is wanted instead.
        kind: "website",
        detail: "visiontr.ikas.shop",
        url: "https://visiontr.ikas.shop/",
        // TODO(owner): drop VISION's logo at /public/marketing/vision-logo.svg
        // (or a 128x128 transparent PNG) and set icon to that path.
        // icon: "/marketing/vision-logo.svg",
      },
    ],
    // Vertical brand cut, 576 x 1248 — already the phone's exact aspect, so
    // the screen shows it whole rather than cropping it.
    reel: { src: "/marketing/vision-reel.mp4" },
  },
];
