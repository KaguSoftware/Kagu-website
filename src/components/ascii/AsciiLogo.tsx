"use client";

/*
  The Kagu mark as a small solid-white ASCII sculpture (the hero's renderer,
  without the background field), fitted to its box. It turns slowly and
  looks toward the cursor anywhere on the page. Animates only while visible
  (AsciiField pauses off-screen / hidden tab), capped fps, still frame under
  reduced motion.

    <AsciiLogo className="footer-logo" />                 // turning
    <AsciiLogo shatter={0.6} still className="nf-logo" />  // frozen mid-shatter (404)

  The wrapper needs a size from outside (aspect-ratio / height). Decorative.
*/
import { useEffect, useRef } from "react";
import { AsciiField } from "./AsciiField";
import { createLogoProgram } from "./logoProgram";
import "./ascii.css";

const fitProgram = () => createLogoProgram({ field: false, place: "fit" });

export function AsciiLogo({
  shatter = 0,
  still = false,
  fps = 30,
  className = "",
}: {
  /** 0..1, how far the mark has burst into dust (fixed) */
  shatter?: number;
  still?: boolean;
  fps?: number;
  className?: string;
}) {
  const control = useRef<Record<string, number>>({ k: shatter });
  useEffect(() => {
    control.current.k = shatter;
  }, [shatter]);
  // glyph size follows the box so small logos stay legible and big ones stay detailed
  const fontSize = (w: number, h: number) => Math.max(5, Math.min(10, Math.min(w / 130, h / 50)));
  return (
    <div className={`ascii-logo ${className}`.trim()} aria-hidden="true">
      <AsciiField
        program={fitProgram}
        control={control}
        interactive
        still={still}
        stillTime={8}
        fps={fps}
        fontSize={fontSize}
        maxCells={12000}
        fontWeight={400}
        lineHeight={1.15}
      />
    </div>
  );
}
