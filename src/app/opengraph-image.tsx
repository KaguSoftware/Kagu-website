import { ImageResponse } from "next/og";
import { palette } from "@/lib/brand.config";

export const runtime = "edge";
export const alt = "Kagu, software for boutique operators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
  OG image for the homepage. Renders the wordmark + eyebrow + statement
  on paper background. Per-route OG images can override by adding their
  own opengraph-image.tsx in the route folder later.
*/
export default function OpengraphImage() {
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
          <span>kagu</span>
          <span>est. 2025 · istanbul</span>
        </div>

        <div
          style={{
            fontSize: 96,
            lineHeight: 1,
            letterSpacing: -1.2,
            color: palette.slateInk,
            maxWidth: 1040,
          }}
        >
          Software for boutique operators.
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
          }}
        >
          <span style={{ maxWidth: 600, lineHeight: 1.4, color: palette.ink }}>
            Next.js + Supabase platforms for hospitality, tourism, and operator tools.
          </span>
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
            kagu.software
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
