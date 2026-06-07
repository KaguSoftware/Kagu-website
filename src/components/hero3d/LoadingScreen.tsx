"use client";

/*
  Brand loading screen — a single kagu sculpture spinning fast against the dark
  studio backdrop. Reuses the hero's extruded glass geometry/materials so the
  loader and the hero are the same object. Mounted as the app's route-level
  loading state (src/app/loading.tsx) so it shows on every navigation.
*/

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

import { useLogoParts, DEPTH } from "./LogoSculpture";
import { useIsClient, useReducedMotion } from "./useReducedMotion";

/** One sculpture, centered, spinning fast about Y. */
function SpinSculpture({ reducedMotion }: { reducedMotion: boolean }) {
  const { parts, scale, materials } = useLogoParts("/kagu-logo.svg");
  const spin = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const g = spin.current;
    if (!g) return;
    // radians/sec — a quick, confident spin (gentler if reduced-motion).
    const speed = reducedMotion ? 0.8 : 5.4;
    g.rotation.y += delta * speed;
  });

  return (
    // static tilt so the fast Y spin reads as a 3D slab flipping, not a flat wipe
    <group rotation={[0.18, 0, 0]} scale={1.5}>
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

export function LoadingScreen() {
  // WebGL only mounts on the client; until then the dark backdrop stands in.
  const isClient = useIsClient();
  const reducedMotion = useReducedMotion();

  return (
    <div className="kagu-loading" role="status" aria-label="Loading">
      {isClient && (
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 0, 4.6], fov: 32, near: 0.1, far: 50 }}
        >
          <fogExp2 attach="fog" args={["#04050a", 0.07]} />
          <ambientLight intensity={0.18} color="#9fb6d8" />
          <directionalLight position={[5, 8, 6]} intensity={1.7} color="#ffffff" />
          <directionalLight position={[-4, 2, -6]} intensity={1.35} color="#bfe0ff" />

          <Suspense fallback={null}>
            <SpinSculpture reducedMotion={reducedMotion} />
          </Suspense>

          {/* Dark studio so the black glass reads off bright reflection strips. */}
          <Environment resolution={256} frames={1}>
            <color attach="background" args={["#05060a"]} />
            <Lightformer intensity={3.0} position={[-4, 3, 4]} scale={[8, 8, 1]} color="#ffffff" />
            <Lightformer intensity={5} position={[3.5, 1, 3]} scale={[0.6, 10, 1]} color="#ffffff" />
            <Lightformer intensity={1.1} position={[0, -4, -4]} scale={[10, 3, 1]} color="#9fc4ff" />
          </Environment>
        </Canvas>
      )}

      <span className="kagu-loading__label">Loading</span>

      <style>{`
        .kagu-loading {
          position: fixed;
          inset: 0;
          z-index: var(--z-curtain);
          display: grid;
          place-items: center;
          background:
            radial-gradient(120% 100% at 50% 38%, #1b4173 0%, #102a51 45%, #081729 100%),
            #081729;
        }
        .kagu-loading canvas { position: absolute; inset: 0; }
        .kagu-loading__label {
          position: absolute;
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
        @media (prefers-reduced-motion: reduce) {
          .kagu-loading__label { animation: none; }
        }
      `}</style>
    </div>
  );
}
