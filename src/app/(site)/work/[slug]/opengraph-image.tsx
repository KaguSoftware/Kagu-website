import { ImageResponse } from "next/og";
import { RIBBON, FOLD, WING, KAGU_VIEWBOX } from "@/components/KaguMark";
import { getCases } from "@/lib/content";

export const alt = "Kagu project";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
  Per-case OG image (metadata image files are per-segment, so app/opengraph-image
  does not reach here). Cream paper, ink text, outline logo. Node runtime: it
  reads the case through the server-only content layer.
*/

const PAPER = "#faf7f2";
const INK = "#1b222b";
const MUTED = "#646c76";
const ACCENT = "#1f8fe0";

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
  const titleSize = client.length > 12 ? 112 : client.length > 8 ? 140 : 168;
  const meta = [c?.sector, c?.year].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: PAPER,
          color: INK,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, color: MUTED }}>
          <svg
            width="80"
            height="36"
            viewBox={KAGU_VIEWBOX}
            fill="none"
            stroke={ACCENT}
            strokeWidth="6"
            strokeLinejoin="round"
          >
            <path d={RIBBON} />
            <path d={FOLD} />
            <path d={WING} />
          </svg>
          <span>Kagu</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: titleSize, lineHeight: 1, letterSpacing: -4, maxWidth: 1040 }}>
            {client}
          </div>
          <div style={{ fontSize: 30, color: MUTED }}>{meta}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
