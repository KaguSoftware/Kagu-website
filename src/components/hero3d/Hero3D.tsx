"use client";
/* eslint-disable react-hooks/immutability -- imperative react-three-fiber scene: mutating the camera / objects inside useFrame is the intended idiom */

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import * as THREE from "three";

import { GreetingCycle } from "@/components/motion/GreetingCycle";
import { Flock } from "./LogoSculpture";
import { GrainOverlay } from "./GrainOverlay";
import { useIsClient, useMediaQuery, useReducedMotion } from "./useReducedMotion";

/* --------------------------------- lighting -------------------------------- */

function StudioLights({ reducedMotion }: { reducedMotion: boolean }) {
  const keyArea = useRef<THREE.RectAreaLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);

  // LTC lookup tables for the area light — must be initialized once before use.
  useMemo(() => RectAreaLightUniformsLib.init(), []);

  useEffect(() => {
    keyArea.current?.lookAt(0, 0, 0);
  }, []);

  // Slow light sweep: the cool rim arcs behind the sculpture.
  useFrame((state) => {
    if (reducedMotion || !rim.current) return;
    const t = state.clock.elapsedTime;
    rim.current.position.x = Math.sin(t * 0.1) * 6;
    rim.current.position.z = -5 + Math.cos(t * 0.1) * 2.2;
  });

  return (
    <>
      <ambientLight intensity={0.45} color="#eaf5ff" />

      {/* large soft studio key — the obsidian sheen reads off this */}
      <rectAreaLight
        ref={keyArea}
        position={[-3.4, 4, 4]}
        width={9}
        height={7}
        intensity={3.6}
        color="#ffffff"
      />

      {/* key with cinematic self-shadowing — wide enough to cover the flock */}
      <directionalLight
        position={[5, 8, 6]}
        intensity={1.7}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0006}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />

      {/* cool rim / back light — swept */}
      <directionalLight ref={rim} position={[-4, 2, -6]} intensity={1.35} color="#bfe0ff" />
    </>
  );
}

/* ------------------------------- camera rig -------------------------------- */

function CameraRig({
  reducedMotion,
  targetX,
}: {
  reducedMotion: boolean;
  targetX: number;
}) {
  const { camera } = useThree();
  const base = useMemo(() => new THREE.Vector3(0, 0.2, 6.4), []);

  useFrame((state, delta) => {
    if (reducedMotion) {
      camera.position.copy(base);
      camera.lookAt(targetX * 0.5, 0, 0);
      return;
    }
    const t = state.clock.elapsedTime;
    const px = base.x + Math.sin(t * 0.08) * 0.55 + state.pointer.x * 0.25;
    const py = base.y + Math.sin(t * 0.06) * 0.28 + state.pointer.y * 0.15;
    const ease = Math.min(1, delta * 1.4);
    camera.position.x += (px - camera.position.x) * ease;
    camera.position.y += (py - camera.position.y) * ease;
    camera.lookAt(targetX * 0.5, 0, 0);
  });

  return null;
}

/* ---------------------------------- scene ---------------------------------- */

function Scene({
  reducedMotion,
  offsetX,
  count,
}: {
  reducedMotion: boolean;
  offsetX: number;
  count: number;
}) {
  return (
    <>
      {/* bright icy haze — distant birds dissolve into the ice-blue air */}
      <fogExp2 attach="fog" args={["#bfe3fb", 0.07]} />

      <StudioLights reducedMotion={reducedMotion} />
      <CameraRig reducedMotion={reducedMotion} targetX={offsetX} />

      <Suspense fallback={null}>
        <Flock reducedMotion={reducedMotion} offsetX={offsetX} count={count} />
      </Suspense>

      {/* self-contained icy studio environment for reflections — no external HDR */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#e6f4ff"]} />
        <Lightformer
          intensity={2.4}
          position={[-3, 3, 4]}
          scale={[7, 7, 1]}
          color="#ffffff"
        />
        <Lightformer
          intensity={1.0}
          position={[4, 2, 3]}
          scale={[4, 4, 1]}
          color="#cfe6ff"
        />
        <Lightformer
          intensity={1.3}
          position={[0, -3, -5]}
          scale={[9, 3, 1]}
          color="#eaf5ff"
        />
        <Lightformer
          intensity={0.8}
          position={[-5, 0, -6]}
          scale={[3, 6, 1]}
          color="#9fc4ff"
        />
      </Environment>
    </>
  );
}

/* ----------------------------------- hero ---------------------------------- */

export interface Hero3DProps {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Show the cycling multilingual greeting (hello / merhaba / privet…). */
  greeting?: boolean;
  /** Tagline next to the greeting, e.g. "Est. 2025 · Istanbul". */
  location?: string;
  /** Availability pill text; omit/empty to hide the pulsing status. */
  availability?: string;
}

export function Hero3D({
  title = "Kagu",
  subtitle = "AI systems for ambitious teams.",
  ctaLabel = "Start building",
  ctaHref = "#start",
  greeting = true,
  location = "Est. 2025 · Istanbul",
  availability = "Accepting projects · 2026 Q3",
}: Hero3DProps = {}) {
  const reducedMotion = useReducedMotion();
  // The Canvas is mounted client-side only (WebGL never runs during SSR).
  const isClient = useIsClient();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Push the flock to the right so the headline owns the left; thin it out on
  // phones for performance.
  const offsetX = isDesktop ? 1.4 : 0.5;
  const count = isDesktop ? 6 : 4;

  return (
    <section aria-label="Kagu" className="kagu-hero">
      {/* 3D background */}
      <div className="kagu-hero__canvas" aria-hidden>
        {isClient && (
          <Canvas
            shadows
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            camera={{ position: [0, 0.2, 6.4], fov: 32, near: 0.1, far: 50 }}
            frameloop={reducedMotion ? "demand" : "always"}
            onCreated={({ gl }) => {
              gl.toneMappingExposure = 1.05;
            }}
          >
            <Scene reducedMotion={reducedMotion} offsetX={offsetX} count={count} />
          </Canvas>
        )}
      </div>

      {/* legibility scrim + vignette */}
      <div className="kagu-hero__scrim" aria-hidden />

      {/* foreground copy */}
      <div className="kagu-hero__content">
        <div className="kagu-hero__meta">
          {greeting && (
            <span className="kagu-hero__greeting">
              <GreetingCycle className="kagu-hero__greeting-word" />
              {location ? (
                <span className="kagu-hero__meta-sep">· {location}</span>
              ) : null}
            </span>
          )}
          {availability ? (
            <span className="kagu-hero__status">
              <span className="kagu-hero__pulse" aria-hidden>
                <span className="kagu-hero__pulse-ring" />
                <span className="kagu-hero__pulse-dot" />
              </span>
              {availability}
            </span>
          ) : null}
        </div>
        <div className="kagu-hero__main">
          <h1 className="kagu-hero__title">{title}</h1>
          <p className="kagu-hero__subtitle">{subtitle}</p>
          <a className="kagu-hero__cta" href={ctaHref}>
            <span>{ctaLabel}</span>
            <span className="kagu-hero__cta-arrow" aria-hidden />
          </a>
        </div>
      </div>

      {/* film grain over everything */}
      <GrainOverlay />

      <style>{`
        .kagu-hero {
          position: relative;
          width: 100%;
          min-height: 100dvh;
          overflow: hidden;
          isolation: isolate;
          /* ice-bright blue */
          background:
            radial-gradient(120% 100% at 60% 8%, #f4fcff 0%, #d2f0fe 38%, #a9defb 70%, #8fd0f7 100%),
            #a9defb;
          color: #0a1622;
        }
        .kagu-hero__canvas {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .kagu-hero__canvas canvas {
          display: block;
        }
        /* light left-weighted scrim: keeps the bright backdrop behind the dark
           copy so a passing obsidian bird never drops the contrast */
        .kagu-hero__scrim {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(244,251,255,0.88) 0%, rgba(244,251,255,0.45) 40%, rgba(244,251,255,0) 72%),
            linear-gradient(0deg, rgba(143,208,247,0.35) 0%, rgba(143,208,247,0) 32%);
        }
        .kagu-hero__content {
          position: relative;
          z-index: 2;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          padding-inline: clamp(1.5rem, 6vw, 7rem);
          padding-block: clamp(1.5rem, 4vh, 2.5rem) clamp(2.5rem, 6vh, 4rem);
        }
        /* full-width top bar: greeting left, availability right */
        .kagu-hero__meta {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.75rem 1.5rem;
          width: 100%;
          padding-top: clamp(1rem, 3vh, 2rem);
        }
        /* headline block, centered in the remaining height, left-aligned */
        .kagu-hero__main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 1.1rem;
          max-width: 46rem;
        }
        .kagu-hero__greeting {
          display: inline-flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 0.7rem;
          font-family: var(--font-display, ui-monospace, monospace);
          font-size: var(--type-3xl, 2.5rem);
          letter-spacing: var(--tracking-tight, -0.012em);
          line-height: 1;
          color: var(--ink, #081320);
        }
        .kagu-hero__greeting-word {
          font-weight: 500;
        }
        .kagu-hero__meta-sep {
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(8, 19, 32, 0.58);
        }
        .kagu-hero__status {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(8, 19, 32, 0.62);
        }
        .kagu-hero__pulse {
          position: relative;
          width: 8px;
          height: 8px;
          display: inline-block;
        }
        .kagu-hero__pulse-ring {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: #0e8fe0;
          animation: kagu-hero-pulse 2.2s ease-out infinite;
        }
        .kagu-hero__pulse-dot {
          position: absolute;
          inset: 2px;
          border-radius: 999px;
          background: #0e8fe0;
        }
        @keyframes kagu-hero-pulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          70% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .kagu-hero__pulse-ring { animation: none; }
        }
        .kagu-hero__title {
          margin: 0;
          font-family: var(--font-display, ui-monospace, monospace);
          font-weight: 500;
          line-height: 0.92;
          letter-spacing: -0.03em;
          font-size: clamp(4.5rem, 16vw, 12rem);
          color: #081320;
        }
        .kagu-hero__subtitle {
          margin: 0;
          max-width: 30ch;
          font-size: clamp(1.05rem, 1.4vw, 1.4rem);
          line-height: 1.5;
          color: rgba(8,19,32,0.74);
        }
        .kagu-hero__cta {
          --edge: rgba(8,19,32,0.28);
          margin-top: 0.8rem;
          display: inline-flex;
          align-items: center;
          gap: 0.85rem;
          padding: 1.05rem 1.6rem;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: 0.8rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #081320;
          text-decoration: none;
          border: 1px solid var(--edge);
          border-radius: 2px;
          background: rgba(255,255,255,0.25);
          backdrop-filter: blur(2px);
          transition: border-color 320ms cubic-bezier(0.16,1,0.3,1),
            background-color 320ms cubic-bezier(0.16,1,0.3,1),
            transform 320ms cubic-bezier(0.16,1,0.3,1);
        }
        .kagu-hero__cta-arrow {
          width: 26px;
          height: 1px;
          background: #0e8fe0;
          transition: width 320ms cubic-bezier(0.16,1,0.3,1);
        }
        .kagu-hero__cta:hover {
          border-color: rgba(14,143,224,0.7);
          background: rgba(14,143,224,0.1);
          transform: translateY(-1px);
        }
        .kagu-hero__cta:hover .kagu-hero__cta-arrow {
          width: 40px;
        }
        .kagu-hero__cta:focus-visible {
          outline: 2px solid #0e8fe0;
          outline-offset: 3px;
        }
        @media (prefers-reduced-motion: reduce) {
          .kagu-hero__cta,
          .kagu-hero__cta-arrow { transition: none; }
        }
      `}</style>
    </section>
  );
}
