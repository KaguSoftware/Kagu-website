"use client";

/*
  Skeleton building blocks for the package-builder preview. Everything is
  pure CSS/JSX — no images, no iframe. Stubs read their fill from the
  --spv-stub custom property so a zone can swap to a gradient background and
  its stubs automatically lighten (see BuilderPreview's zone wrapper).
*/

import type { CSSProperties, ReactNode } from "react";
import type { WebsiteTypeId } from "./catalog";

/** A skeleton bar/box. Width/height via props, fill via --spv-stub. */
export function Stub({
  w,
  h = 8,
  r = 3,
  grow,
  style,
}: {
  w?: number | string;
  h?: number | string;
  r?: number;
  grow?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        width: w,
        height: h,
        flex: grow ? 1 : undefined,
        borderRadius: r,
        background: "var(--spv-stub)",
        ...style,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Navbar icon glyphs (14px, stroke = currentColor)                    */
/* ------------------------------------------------------------------ */

const ICON_STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.4 };

export function NavGlyph({ icon }: { icon: string }) {
  switch (icon) {
    case "globe":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" {...ICON_STROKE}>
          <circle cx="8" cy="8" r="6.2" />
          <ellipse cx="8" cy="8" rx="2.8" ry="6.2" />
          <path d="M2 8h12" />
        </svg>
      );
    case "currency":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" {...ICON_STROKE}>
          <circle cx="8" cy="8" r="6.2" />
          <path d="M10 5.8c-.5-.7-1.2-1-2-1-1.2 0-2.1.7-2.1 1.6 0 2.2 4.2 1 4.2 3.2 0 .9-.9 1.6-2.1 1.6-.8 0-1.5-.3-2-1M8 3.6v8.8" />
        </svg>
      );
    case "card":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" {...ICON_STROKE}>
          <rect x="1.8" y="3.5" width="12.4" height="9" rx="1.5" />
          <path d="M1.8 6.5h12.4" />
        </svg>
      );
    case "avatar":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" {...ICON_STROKE}>
          <circle cx="8" cy="5.5" r="2.6" />
          <path d="M2.8 13.5c.9-2.4 2.9-3.6 5.2-3.6s4.3 1.2 5.2 3.6" />
        </svg>
      );
    case "theme":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" {...ICON_STROKE}>
          <circle cx="8" cy="8" r="6.2" />
          <path d="M8 1.8v12.4A6.2 6.2 0 0 0 8 1.8Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "cart":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" {...ICON_STROKE}>
          <path d="M1.8 2.5h2l1.6 8h7.2l1.6-6H4.6" />
          <circle cx="6.2" cy="13" r="1.1" />
          <circle cx="11.6" cy="13" r="1.1" />
        </svg>
      );
    default:
      return null;
  }
}

export function ChatGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" {...ICON_STROKE} strokeWidth={1.5}>
      <path d="M2.2 3.8A1.8 1.8 0 0 1 4 2h8a1.8 1.8 0 0 1 1.8 1.8v5.4A1.8 1.8 0 0 1 12 11H6.5L3 14V11h.2A1.8 1.8 0 0 1 2.2 9.2Z" />
      <path d="M5.2 6.6h5.6" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Per-type content bodies                                             */
/* ------------------------------------------------------------------ */

function Card({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="spv-cms-target"
      style={{
        border: "1px solid var(--spv-hairline)",
        borderRadius: 4,
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 7,
        background: "var(--spv-card)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function EcommerceBody() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <Stub h={44} r={3} style={{ width: "100%" }} />
          <Stub w="80%" h={6} />
          <Stub w="45%" h={6} />
          <Stub w="30%" h={7} style={{ background: "var(--spv-accent-3)" }} />
        </Card>
      ))}
    </div>
  );
}

function ServiceBody() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <Stub w={18} h={18} r={9} />
            <Stub w="70%" h={7} />
            <Stub w="92%" h={5} />
            <Stub w="84%" h={5} />
          </Card>
        ))}
      </div>
      <div
        className="spv-cms-target"
        style={{
          borderRadius: 4,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background:
            "linear-gradient(90deg, color-mix(in oklab, var(--spv-accent) 48%, transparent), color-mix(in oklab, var(--spv-accent-3) 42%, transparent))",
          borderLeft: "4px solid var(--spv-accent-2)",
        }}
      >
        <Stub w="38%" h={7} />
        <Stub w={56} h={16} r={8} style={{ background: "var(--spv-accent-2)" }} />
      </div>
    </div>
  );
}

function RestaurantBody() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="spv-cms-target" style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {[42, 55, 36, 60, 47].map((w, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Stub w={`${w}%`} h={6} />
            <span
              aria-hidden
              style={{
                flex: 1,
                borderBottom:
                  "1px dotted color-mix(in oklab, var(--spv-accent-3) 80%, var(--spv-stub))",
                transform: "translateY(2px)",
              }}
            />
            <Stub w={26} h={6} />
          </div>
        ))}
      </div>
      <div
        style={{
          borderRadius: 4,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background:
            "linear-gradient(90deg, color-mix(in oklab, var(--spv-accent) 48%, transparent), color-mix(in oklab, var(--spv-accent-3) 42%, transparent))",
          borderLeft: "4px solid var(--spv-accent-2)",
        }}
      >
        <Stub w="32%" h={7} />
        <Stub w={64} h={16} r={8} style={{ background: "var(--spv-accent-2)" }} />
      </div>
    </div>
  );
}

function PortfolioBody() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Card><Stub h={72} style={{ width: "100%" }} /><Stub w="55%" h={6} /></Card>
        <Card><Stub h={44} style={{ width: "100%" }} /><Stub w="40%" h={6} /></Card>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
        <Card><Stub h={50} style={{ width: "100%" }} /><Stub w="48%" h={6} /></Card>
        <Card><Stub h={66} style={{ width: "100%" }} /><Stub w="60%" h={6} /></Card>
      </div>
    </div>
  );
}


export function TypeBody({ typeId }: { typeId: WebsiteTypeId }) {
  switch (typeId) {
    case "ecommerce":
      return <EcommerceBody />;
    case "service":
      return <ServiceBody />;
    case "restaurant":
      return <RestaurantBody />;
    case "portfolio":
      return <PortfolioBody />;
  }
}

/* ------------------------------------------------------------------ */
/* Conditional sections (mounted when a feature is toggled)            */
/* ------------------------------------------------------------------ */

function SectionTitle() {
  return <Stub w="26%" h={7} style={{ marginBottom: 9 }} />;
}

export function BlogSection() {
  return (
    <div>
      <SectionTitle />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <Stub h={34} style={{ width: "100%" }} />
            <Stub w="85%" h={6} />
            <Stub w="55%" h={5} />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function BookingSection() {
  return (
    <div>
      <SectionTitle />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 5,
          border: "1px solid var(--spv-hairline)",
          borderRadius: 4,
          padding: 9,
        }}
      >
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              height: 16,
              borderRadius: 2,
              background:
                i === 9
                  ? "var(--spv-accent-2)"
                  : i === 4
                    ? "color-mix(in oklab, var(--spv-accent-3) 80%, transparent)"
                    : "color-mix(in oklab, var(--spv-stub) 55%, transparent)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function AnalyticsSection() {
  return (
    <div>
      <SectionTitle />
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          height: 46,
          border: "1px solid var(--spv-hairline)",
          borderRadius: 4,
          padding: "8px 10px",
        }}
      >
        {[40, 65, 50, 85, 60].map((h, i) => (
          <span
            key={i}
            aria-hidden
            className="spv-bar"
            style={{
              flex: 1,
              borderRadius: 2,
              background: `color-mix(in oklab, var(--spv-accent${i % 2 ? "-3" : ""}) 92%, transparent)`,
              height: `${h}%`,
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
