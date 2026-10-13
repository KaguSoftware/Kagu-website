import { ImageResponse } from "next/og";
import { palette } from "@/lib/brand.config";
import { getCases } from "@/lib/content";
import { clampText } from "@/lib/seo";

export const alt = "Kagu case study";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
  Per-case OG image. app/opengraph-image.tsx only covers "/" — metadata image
  files aren't inherited by nested segments — so before this every /work/<slug>
  share preview had no image at all. Mirrors the homepage card's layout and
  palette so a shared case reads as the same site.

  Runs on the node runtime (not edge, unlike the homepage card) because it
  reads the case from Supabase through the server-only content layer.
*/

export async function generateStaticParams() {
  const cases = await getCases();
  return cases.map((c) => ({ slug: c.slug }));
}

export default async function CaseOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cases = await getCases();
  const c = cases.find((x) => x.slug === slug);

  const client = c?.client ?? "Kagu";
  // 120px fits "UpperDeck"; longer names ("Sabrina Turizm") need to come down
  // or they wrap into the statement line below.
  const titleSize = client.length > 12 ? 84 : client.length > 8 ? 104 : 128;
  const lede = c?.lede ?? "";
  const blurb = clampText(lede, 150);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: palette.paper,
          color: palette.ink,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: palette.slateInk,
          }}
        >
          <span>kagu · work</span>
          <span>
            {[c?.year, c?.sector].filter(Boolean).join(" · ")}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: titleSize,
              lineHeight: 1,
              letterSpacing: -1.2,
              color: palette.ink,
              maxWidth: 1040,
            }}
          >
            {client}
          </div>
          <div style={{ fontSize: 30, color: palette.slateInk, maxWidth: 900 }}>
            {c?.project ?? ""}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
          }}
        >
          <span style={{ maxWidth: 640, lineHeight: 1.4, color: palette.ink }}>{blurb}</span>
          <span
            style={{
              background: palette.mintDeep,
              color: palette.ink,
              padding: "12px 20px",
              fontSize: 16,
              letterSpacing: 3,
              textTransform: "uppercase",
              border: `1px solid ${palette.ink}`,
            }}
          >
            kagusoftware.com
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
