import { ImageResponse } from "next/og";
import { RIBBON, FOLD, WING, KAGU_VIEWBOX } from "@/components/KaguMark";

export const runtime = "edge";
export const alt = "Kagu — Software, done right.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
  Link-preview image (WhatsApp, iMessage, Slack, X…) for the site.
  Same look as the site: cream paper, ink type, the outline mark in black.
  Per-route OG images can override this with their own opengraph-image.tsx.
*/
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#faf7f2",
          color: "#1b222b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
        }}
      >
        <svg width={520} height={234} viewBox={KAGU_VIEWBOX}>
          {[RIBBON, FOLD, WING].map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="#1b222b"
              strokeWidth={7}
              strokeLinejoin="round"
            />
          ))}
        </svg>
        <div style={{ fontSize: 76, letterSpacing: -2, lineHeight: 1 }}>
          Software, done right.
        </div>
        <div style={{ fontSize: 26, color: "#646c76", letterSpacing: 1 }}>
          kagusoftware.com
        </div>
      </div>
    ),
    size,
  );
}
