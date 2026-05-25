/*
  Case-study cover. Color-block + label, framed with a minimal browser-chrome
  bar (URL pill + window dots) so it reads as "product preview" without
  depending on a third-party screenshot service.

  Previous thum.io integration removed: their free tier returns an "image
  not authorized" PNG that next/image can't detect as an error (it's a
  valid 200-response image, just with rejection text on it).

  If you supply real PNG screenshots later, drop them in `/public/cases/`
  and add an optional `image` prop that renders <Image fill> over this block.
*/

type Bg = "mint-pale" | "mint-soft" | "mint-deep" | "slate-ink" | "paper";

const COVER_BG: Record<Bg, string> = {
  "mint-pale": "var(--mint-pale)",
  "mint-soft": "var(--mint-soft)",
  "mint-deep": "var(--mint-deep)",
  "slate-ink": "var(--slate-ink)",
  paper: "var(--paper)",
};

const LABEL_FG: Record<Bg, string> = {
  "mint-pale": "color-mix(in oklab, var(--slate-ink) 90%, transparent)",
  "mint-soft": "color-mix(in oklab, var(--slate-ink) 90%, transparent)",
  "mint-deep": "color-mix(in oklab, var(--ink) 88%, transparent)",
  "slate-ink": "var(--paper)",
  paper: "color-mix(in oklab, var(--slate-ink) 88%, transparent)",
};

const CHROME_FG: Record<Bg, string> = {
  "mint-pale": "var(--slate-ink)",
  "mint-soft": "var(--slate-ink)",
  "mint-deep": "var(--ink)",
  "slate-ink": "var(--mint-pale)",
  paper: "var(--slate-ink)",
};

interface CaseCoverProps {
  url: string;
  label: string;
  bg: Bg;
  labelSize?: string;
  /** Hide the browser-chrome mock — used for small `/work` index cards */
  noChrome?: boolean;
}

function stripUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function CaseCover({
  url,
  label,
  bg,
  labelSize = "var(--type-5xl)",
  noChrome = false,
}: CaseCoverProps) {
  const chromeColor = CHROME_FG[bg];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: COVER_BG[bg],
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Browser chrome row */}
      {!noChrome && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
            borderBottom: `1px solid color-mix(in oklab, ${chromeColor} 28%, transparent)`,
            color: chromeColor,
          }}
        >
          {/* window dots */}
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: `color-mix(in oklab, ${chromeColor} 35%, transparent)`,
                  display: "inline-block",
                }}
              />
            ))}
          </div>
          {/* URL pill */}
          <div
            style={{
              flex: 1,
              padding: "5px 12px",
              borderRadius: 4,
              background: `color-mix(in oklab, ${chromeColor} 12%, transparent)`,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.04em",
              color: chromeColor,
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "60%",
              margin: "0 auto",
            }}
          >
            {stripUrl(url)}
          </div>
        </div>
      )}

      {/* Label fills the rest */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8)",
        }}
      >
        <span
          className="display"
          style={{
            fontSize: labelSize,
            color: LABEL_FG[bg],
            lineHeight: 0.95,
            letterSpacing: "var(--tracking-tight)",
            textAlign: "center",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
