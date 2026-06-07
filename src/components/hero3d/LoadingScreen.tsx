"use client";

/*
  Brand intro — a single kagu sculpture slowly turning above a large
  multilingual greeting, against a graded studio backdrop. Reuses the hero's
  extruded glass geometry/materials so the intro and the hero are the same
  object. Mounted as the app's route-level loading state (src/app/loading.tsx)
  and as the first-visit curtain (PreloadCurtain).
*/

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { AnimatePresence, motion } from "motion/react";
import * as THREE from "three";

import { useLogoParts, DEPTH } from "./LogoSculpture";
import { useIsClient, useReducedMotion } from "./useReducedMotion";

// A short, readable cycle of greetings — Arabic, English, Turkish, Persian —
// rather than a blur of every language.
const GREETINGS = ["مرحبا", "Hello", "Merhaba", "سلام"];
// Each word holds long enough to read, then flows into the next language.
const GREETING_MS = 650;

function FastGreeting() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(
      () => setI((p) => (p + 1) % GREETINGS.length),
      GREETING_MS,
    );
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div className="kagu-loading__greeting" aria-hidden>
      {/* Words stack in a single grid cell so the outgoing and incoming
          languages cross-fade over each other instead of jumping. */}
      <AnimatePresence>
        <motion.span
          key={GREETINGS[i]}
          className="kagu-loading__greeting-word"
          initial={reduced ? false : { opacity: 0, y: "0.32em", filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: "-0.32em", filter: "blur(12px)" }}
          transition={{ duration: reduced ? 0.2 : 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {GREETINGS[i]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

const SCULPTURE_URL = "/kagu-logo.svg";

// Warm the SVG fetch the moment this client module is evaluated (during page
// hydration) so the geometry can build instantly when the canvas mounts —
// otherwise the sculpture only appears after a post-mount round trip.
if (typeof window !== "undefined") {
  useLoader.preload(SVGLoader, SCULPTURE_URL);
}

/** One sculpture, centered, spinning fast about Y. */
function SpinSculpture({ reducedMotion }: { reducedMotion: boolean }) {
  const { parts, scale, materials } = useLogoParts(SCULPTURE_URL);
  const spin = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const g = spin.current;
    if (!g) return;
    // radians/sec — a slow, steady spin (gentler still if reduced-motion).
    const speed = reducedMotion ? 0.6 : 2.2;
    g.rotation.y += delta * speed;
  });

  return (
    // static tilt so the slow Y turn reads as a 3D slab rotating, not a flat
    // wipe — and lifted above center so the greeting sits cleanly beneath it
    <group rotation={[0.18, 0, 0]} scale={0.5} position={[0, 0.62, 0]}>
      <group ref={spin}>
        {/* rotation.x = PI flips the SVG's y-down axis upright without mirroring */}
        <group rotation={[Math.PI, 0, 0]} scale={scale}>
          {parts.map(({ geometry, ghost }, i) => (
            <mesh
              key={i}
              geometry={geometry}
              material={ghost ? materials.ghost : materials.main}
              position={[0, 0, ghost ? -DEPTH * 0.5 : 0]}
            />
          ))}
        </group>
      </group>
    </group>
  );
}

export function LoadingScreen({
  progress,
  greeting = false,
  skeleton = true,
}: { progress?: number; greeting?: boolean; skeleton?: boolean } = {}) {
  // WebGL only mounts on the client; until then the dark backdrop stands in.
  const isClient = useIsClient();
  const reducedMotion = useReducedMotion();

  return (
    <div className="kagu-loading" role="status" aria-label="Loading">
      {/* Layout skeleton behind the (transparent) canvas — a header bar, a big
          headline, and a content row, all shimmering, so the screen reads as
          "the page is arriving". Suppressed on the initial curtain, which is
          just the bird on the dark backdrop. */}
      {skeleton && (
      <div className="kagu-skeleton" aria-hidden>
        <div className="kagu-skeleton__header">
          <div className="kagu-skeleton__row">
            <div className="kg-sk kagu-skeleton__logo" />
            <div className="kagu-skeleton__nav">
              <div className="kg-sk kagu-skeleton__navitem" />
              <div className="kg-sk kagu-skeleton__navitem" />
              <div className="kg-sk kagu-skeleton__navitem" />
              <div className="kg-sk kagu-skeleton__navitem" />
            </div>
          </div>
        </div>
        <div className="kagu-skeleton__main">
          <div className="kg-sk kagu-skeleton__title" />
          <div className="kg-sk kagu-skeleton__title kagu-skeleton__title--short" />
          <div className="kg-sk kagu-skeleton__sub" />
          <div className="kagu-skeleton__cards">
            <div className="kg-sk kagu-skeleton__card" />
            <div className="kg-sk kagu-skeleton__card" />
            <div className="kg-sk kagu-skeleton__card" />
          </div>
        </div>
      </div>
      )}

      {isClient && (
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 0, 4.6], fov: 32, near: 0.1, far: 50 }}
        >
          <fogExp2 attach="fog" args={["#2a2f3b", 0.07]} />
          <ambientLight intensity={0.18} color="#9fb6d8" />
          <directionalLight position={[5, 8, 6]} intensity={1.7} color="#ffffff" />
          <directionalLight position={[-4, 2, -6]} intensity={1.35} color="#bfe0ff" />

          <Suspense fallback={null}>
            <SpinSculpture reducedMotion={reducedMotion} />
          </Suspense>

          {/* Dark studio so the black glass reads off bright reflection strips. */}
          <Environment resolution={128} frames={1}>
            <color attach="background" args={["#05060a"]} />
            <Lightformer intensity={3.0} position={[-4, 3, 4]} scale={[8, 8, 1]} color="#ffffff" />
            <Lightformer intensity={5} position={[3.5, 1, 3]} scale={[0.6, 10, 1]} color="#ffffff" />
            <Lightformer intensity={1.1} position={[0, -4, -4]} scale={[10, 3, 1]} color="#9fc4ff" />
          </Environment>
        </Canvas>
      )}

      {greeting && <FastGreeting />}

      {progress == null ? (
        <span className="kagu-loading__label">Loading</span>
      ) : (
        <div className="kagu-loading__progress" aria-hidden>
          <div
            className="kagu-loading__progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <style>{`
        .kagu-loading {
          position: fixed;
          inset: 0;
          z-index: var(--z-curtain);
          display: grid;
          place-items: center;
          /* graded studio backdrop — a touch brighter near the mark up top,
             settling to a deeper slate at the edges for depth */
          background:
            radial-gradient(125% 115% at 50% 32%, #333a48 0%, #262b36 52%, #1d212a 100%);
        }
        /* soft ambient halo behind the turning mark */
        .kagu-loading::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          background: radial-gradient(48% 42% at 50% 38%, rgba(120, 156, 214, 0.22), transparent 72%);
          pointer-events: none;
        }
        .kagu-loading canvas { position: absolute; inset: 0; z-index: 1; }

        /* --- layout skeleton --- */
        .kagu-skeleton {
          position: absolute;
          inset: 0;
          z-index: 0;
          display: flex;
          flex-direction: column;
          padding: 0 var(--container-x, clamp(1.25rem, 5vw, 5rem));
        }
        .kagu-skeleton__row,
        .kagu-skeleton__main {
          width: 100%;
          max-width: var(--container-max, 96rem);
          margin: 0 auto;
        }
        .kagu-skeleton__header {
          border-bottom: 1px solid color-mix(in oklab, var(--ink, #eef1f5) 8%, transparent);
        }
        .kagu-skeleton__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 64px;
        }
        .kagu-skeleton__logo { width: 42px; height: 20px; border-radius: 5px; }
        .kagu-skeleton__nav { display: flex; gap: clamp(1.25rem, 3vw, 2.5rem); }
        .kagu-skeleton__navitem { width: 54px; height: 11px; border-radius: 4px; }
        .kagu-skeleton__main {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1.25rem;
          padding-block: clamp(2rem, 8vh, 6rem);
        }
        .kagu-skeleton__title { width: 80%; height: clamp(40px, 7vw, 78px); border-radius: 10px; }
        .kagu-skeleton__title--short { width: 52%; }
        .kagu-skeleton__sub { width: 36%; height: 16px; border-radius: 6px; margin-top: 0.5rem; }
        .kagu-skeleton__cards {
          margin-top: clamp(1.5rem, 4vh, 3rem);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(1rem, 2vw, 1.75rem);
        }
        .kagu-skeleton__card { height: clamp(120px, 18vh, 220px); border-radius: 12px; }
        @media (max-width: 767px) {
          .kagu-skeleton__nav { display: none; }
          .kagu-skeleton__cards { grid-template-columns: 1fr; }
          .kagu-skeleton__title { width: 92%; }
        }
        /* shimmering placeholder fill */
        .kg-sk {
          background:
            linear-gradient(
              100deg,
              color-mix(in oklab, var(--ink, #eef1f5) 5%, transparent) 30%,
              color-mix(in oklab, var(--ink, #eef1f5) 11%, transparent) 50%,
              color-mix(in oklab, var(--ink, #eef1f5) 5%, transparent) 70%
            );
          background-size: 200% 100%;
          animation: kagu-skeleton-shimmer 1.5s ease-in-out infinite;
        }
        @keyframes kagu-skeleton-shimmer {
          0% { background-position: 180% 0; }
          100% { background-position: -180% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .kg-sk { animation: none; }
        }

        .kagu-loading__greeting {
          position: absolute;
          z-index: 2;
          top: 64%;
          left: 0;
          right: 0;
          transform: translateY(-50%);
          display: grid;
          place-items: center;
          font-family: var(--font-display, ui-monospace, monospace);
          font-weight: 500;
          font-size: clamp(3.25rem, 11vw, 8rem);
          letter-spacing: -0.035em;
          line-height: 0.95;
          white-space: nowrap;
          /* soft luminous lift on the rendered (clipped) glyphs */
          filter: drop-shadow(0 6px 44px rgba(150, 188, 255, 0.22));
        }
        .kagu-loading__greeting-word {
          /* every word shares the same grid cell so they overlap while
             cross-fading rather than reflowing the line */
          grid-area: 1 / 1;
          display: inline-block;
          background: linear-gradient(180deg, #ffffff 0%, #b6c3d6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .kagu-loading__label {
          position: absolute;
          z-index: 2;
          bottom: clamp(2rem, 8vh, 4rem);
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: 0.7rem;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: rgba(234, 244, 255, 0.55);
          animation: kagu-loading-pulse 1.6s ease-in-out infinite;
        }
        @keyframes kagu-loading-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.8; }
        }
        .kagu-loading__progress {
          position: absolute;
          z-index: 2;
          bottom: clamp(2.25rem, 8vh, 4rem);
          width: clamp(132px, 22vw, 190px);
          height: 1px;
          border-radius: 1px;
          background: rgba(234, 244, 255, 0.12);
          overflow: hidden;
        }
        .kagu-loading__progress-fill {
          height: 100%;
          width: 0;
          border-radius: 1px;
          background: linear-gradient(90deg, rgba(234, 244, 255, 0.2), #eaf4ff);
          box-shadow: 0 0 12px rgba(190, 220, 255, 0.55);
          transition: width 2.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .kagu-loading__label { animation: none; }
        }
      `}</style>
    </div>
  );
}
