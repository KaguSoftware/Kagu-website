"use client";

/*
  M03 — i18n-cycle. Cross-fade one word through translations.
  1.6s interval, 200ms swap. Reduced-motion: shows first greeting only.
*/

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const GREETINGS = [
  "Hello",
  "Merhaba",
  "مرحبا",
  "سلام",
  "Selam",
  "Bonjour",
  "Hola",
  "Olá",
  "Ciao",
  "Hallo",
  "Salam",
  "Namaste",
  "Konnichiwa",
  "Annyeong",
  "Nǐ hǎo",
  "Privet",
  "Yassou",
  "Hej",
  "Aloha",
];

interface GreetingCycleProps {
  intervalMs?: number;
  className?: string;
  style?: CSSProperties;
}

export function GreetingCycle({ intervalMs = 1600, className, style }: GreetingCycleProps) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  // Hidden, absolutely-positioned mirror of the current word — its
  // natural width drives the wrapper's CSS width transition so the
  // siblings next to the cycler glide horizontally instead of jumping.
  const measureRef = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState<number | null>(null);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setI((prev) => (prev + 1) % GREETINGS.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, reduced]);

  useEffect(() => {
    if (!measureRef.current) return;
    setW(measureRef.current.offsetWidth);
  }, [i]);

  if (reduced) {
    return <span className={className} style={style}>{GREETINGS[0]}</span>;
  }

  return (
    <span
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        verticalAlign: "baseline",
        height: "auto",
        width: w !== null ? `${w}px` : undefined,
        transition: "width 520ms cubic-bezier(0.22, 1, 0.36, 1)",
        ...style,
      }}
    >
      {/* Absolute, visibility-hidden measurement: sized to current word */}
      <span
        ref={measureRef}
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          visibility: "hidden",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {GREETINGS[i]}
      </span>
      {/* Visible cross-fade. popLayout pulls the exit out of flow so the
          new word can claim its slot while the wrapper width animates. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={GREETINGS[i]}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "inline-block", whiteSpace: "nowrap" }}
        >
          {GREETINGS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
