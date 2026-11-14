"use client";

/*
  A real image shown as ASCII first; the real image is revealed on demand.

    <AsciiReveal src="/team/ada.jpg" alt="Ada" sizes="280px" vignette />      // hover / focus
    <AsciiReveal src={shot} alt="…" sizes="100vw" reveal="view" />            // scroll into view

  - The ASCII is drawn once from a ~128px thumbnail (≈2–4 KB).
  - The real <Image> is not mounted (so not requested) until it's wanted:
    "hover" → first pointer-enter / focus; "view" → after it has sat in view
    for a beat. It fades in only once loaded.
  - "hover" hides the real image again on leave (the ASCII is the resting
    state); "view" keeps it once revealed.
  The wrapper needs a size from outside (aspect-ratio / height). It fills it.
*/
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AsciiField } from "./AsciiField";
import { imageProgram } from "./imageProgram";
import "./ascii.css";

export function AsciiReveal({
  src,
  alt,
  sizes,
  reveal = "hover",
  fit = "cover",
  vignette = false,
  mode,
  fontSize = 5,
  className = "",
}: {
  src: string;
  alt: string;
  sizes: string;
  reveal?: "hover" | "view";
  fit?: "cover" | "contain";
  vignette?: boolean;
  /** "auto" (default): photos as tone, bright screenshots as line art */
  mode?: "auto" | "tone" | "lines";
  /** CSS px per glyph; smaller = more detail */
  fontSize?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [wanted, setWanted] = useState(false);
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const program = useMemo(() => imageProgram(src, { vignette, fit, mode }), [src, vignette, fit, mode]);
  const size = useMemo(() => () => fontSize, [fontSize]);

  useEffect(() => {
    if (reveal !== "view") return;
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        window.clearTimeout(timer);
        if (e.isIntersecting) {
          // let the ASCII be seen for a beat before the photo takes over
          timer = window.setTimeout(() => {
            setWanted(true);
            setActive(true);
            io.disconnect();
          }, 900);
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => {
      window.clearTimeout(timer);
      io.disconnect();
    };
  }, [reveal]);

  const on = () => {
    setWanted(true);
    setActive(true);
  };
  const off = () => setActive(false);
  const hover = reveal === "hover";

  return (
    <span
      ref={ref}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      className={[
        "ascii-reveal",
        `ascii-reveal--${fit}`,
        loaded ? "is-loaded" : "",
        active ? "is-active" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerEnter={hover ? on : undefined}
      onPointerLeave={hover ? off : undefined}
      onFocus={hover ? on : undefined}
      onBlur={hover ? off : undefined}
    >
      <AsciiField
        program={program}
        fontSize={size}
        still
        maxCells={16000}
        fontWeight={400}
        lineHeight={1.15}
        className="ascii-reveal__art"
      />
      {wanted ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          loading="eager"
          className="ascii-reveal__img"
          onLoad={() => setLoaded(true)}
        />
      ) : null}
    </span>
  );
}
