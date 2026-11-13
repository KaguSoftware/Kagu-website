"use client";

/*
  Types text in, character by character. A hidden "ghost" copy keeps the final
  size, so nothing shifts. Screen readers get the full text immediately.
  Reduced motion → final text, no typing.
*/
import { useEffect, useState } from "react";
import "./ascii.css";

export function Typewriter({
  text,
  delay = 0,
  speed = 38,
  cursor = false,
  onDone,
  className = "",
}: {
  text: string;
  /** ms before typing starts */
  delay?: number;
  /** ms per character */
  speed?: number;
  /** show a blinking block cursor after the text (stays when done) */
  cursor?: boolean;
  onDone?: () => void;
  className?: string;
}) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const chars = Array.from(text);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => {
        setN(chars.length);
        onDone?.();
      });
      return () => cancelAnimationFrame(id);
    }
    let i = 0;
    let timer = 0;
    const tick = () => {
      i++;
      setN(i);
      if (i < chars.length) timer = window.setTimeout(tick, speed * (0.55 + Math.random() * 0.9));
      else onDone?.();
    };
    timer = window.setTimeout(tick, delay);
    return () => window.clearTimeout(timer);
    // onDone deliberately excluded: callers pass inline functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay, speed]);

  const shown = Array.from(text).slice(0, n).join("");
  return (
    <span className={`tw ${className}`}>
      <span className="site-sr">{text}</span>
      <span className="tw__ghost" aria-hidden="true">
        {text}
        {cursor && <span className="cursor" />}
      </span>
      <span className="tw__live" aria-hidden="true">
        {shown}
        {cursor && <span className="cursor" />}
      </span>
    </span>
  );
}
