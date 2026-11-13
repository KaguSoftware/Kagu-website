"use client";

/*
  A real video played as live ASCII; the real video shows on hover / tap.

    <AsciiVideo src="/marketing/vision-reel.mp4" label="Kagu vision reel" className="mk-reel" />

  - Nothing is downloaded until the block is near the viewport (preload="none"
    until then). It plays muted + looped only while visible and pauses
    otherwise; the ASCII field samples the frames at 20 fps.
  - Hover (or tap / Enter on touch & keyboard) fades the real video in.
  - Reduced motion: no autoplay; the real video's first frame is shown with
    native controls instead.
  The wrapper needs a size from outside (aspect-ratio / height).
*/
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { GlAsciiField } from "./gl/GlAsciiField";
import { videoProgram } from "./videoProgram";
import "./ascii.css";

export function AsciiVideo({
  src,
  label,
  fontSize = 6,
  className = "",
}: {
  src: string;
  label: string;
  fontSize?: number;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [real, setReal] = useState(false);
  const [reduce, setReduce] = useState(false);
  // the program finds the <video> by id each frame (no refs read during render)
  const videoId = useId();
  const program = useMemo(() => videoProgram(videoId), [videoId]);
  const size = useMemo(() => () => fontSize, [fontSize]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    const v = videoRef.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          if (!reduce) v.play().catch(() => {});
        } else v.pause();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <div
      ref={wrapRef}
      className={`ascii-video${real || reduce ? " is-real" : ""} ${className}`.trim()}
      onPointerEnter={(e) => e.pointerType === "mouse" && setReal(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setReal(false)}
      onClick={() => setReal((r) => !r)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setReal((r) => !r);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${real ? "showing the video" : "showing it as ASCII"}. Press to switch.`}
    >
      {!reduce && (
        <GlAsciiField
          kind="video"
          videoId={videoId}
          fallback={program}
          fontSize={size}
          fps={20}
          maxCells={14000}
          fontWeight={400}
          lineHeight={1.15}
          className="ascii-video__art"
        />
      )}
      <video
        ref={videoRef}
        id={videoId}
        className="ascii-video__video"
        src={near ? src : undefined}
        muted
        loop
        playsInline
        preload={near ? "auto" : "none"}
        controls={reduce}
        aria-hidden={!reduce}
      />
    </div>
  );
}
