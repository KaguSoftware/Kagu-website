"use client";
/* eslint-disable react-hooks/immutability -- imperative react-three-fiber scene: mutating the camera / objects inside useFrame is the intended idiom */

/*
  Hero3DCanvas — the WebGL scene behind the hero, split out of Hero3D so the
  ~1.2MB three.js/r3f chunk is ONLY downloaded when Hero3D decides the device
  can afford it (fine pointer, no save-data, enough memory), and only after
  the page has gone idle. Hero3D shows a static SVG poster until `onReady`
  fires (second rendered frame), then crossfades this in.
*/

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import * as THREE from "three";

import { Flock } from "./LogoSculpture";

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
      <ambientLight intensity={0.18} color="#9fb6d8" />

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
  coarse,
}: {
  reducedMotion: boolean;
  targetX: number;
  coarse: boolean;
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
    // On touch devices skip pointer tracking — high-frequency touch events cause stutter.
    const px = base.x + Math.sin(t * 0.08) * 0.55 + (coarse ? 0 : state.pointer.x * 0.25);
    const py = base.y + Math.sin(t * 0.06) * 0.28 + (coarse ? 0 : state.pointer.y * 0.15);
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
  flockScale,
  coarse,
}: {
  reducedMotion: boolean;
  offsetX: number;
  count: number;
  flockScale: number;
  coarse: boolean;
}) {
  return (
    <>
      {/* near-black haze — distant birds dissolve into the black air */}
      <fogExp2 attach="fog" args={["#04050a", 0.07]} />

      <StudioLights reducedMotion={reducedMotion} />
      <CameraRig reducedMotion={reducedMotion} targetX={offsetX} coarse={coarse} />

      <Suspense fallback={null}>
        <Flock reducedMotion={reducedMotion} offsetX={offsetX} count={count} scale={flockScale} />
      </Suspense>

      {/* Dark studio for the black glass: a near-black surround so the glass
          stays black, with a few bright strips that reflect as the highlight
          streaks revealing the form (à la the reference). No external HDR. */}
      <Environment resolution={512} frames={1}>
        <color attach="background" args={["#05060a"]} />
        {/* broad soft key — wide sheen down one side */}
        <Lightformer
          intensity={3.0}
          position={[-4, 3, 4]}
          scale={[8, 8, 1]}
          color="#ffffff"
        />
        {/* thin bright pillar — crisp streak riding the rounded edges */}
        <Lightformer
          intensity={5}
          position={[3.5, 1, 3]}
          scale={[0.6, 10, 1]}
          color="#ffffff"
        />
        {/* low cool fill — a faint blue rim from beneath */}
        <Lightformer
          intensity={1.1}
          position={[0, -4, -4]}
          scale={[10, 3, 1]}
          color="#9fc4ff"
        />
      </Environment>
    </>
  );
}

/* Signals the second rendered frame — by then geometry, materials and the
   environment have actually been presented, so the poster can fade out
   without revealing a half-built scene. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 2) onReady();
  });
  return null;
}

export interface Hero3DCanvasProps {
  reducedMotion: boolean;
  offsetX: number;
  count: number;
  flockScale: number;
  coarse: boolean;
  onReady: () => void;
}

export default function Hero3DCanvas({
  reducedMotion,
  offsetX,
  count,
  flockScale,
  coarse,
  onReady,
}: Hero3DCanvasProps) {
  return (
    <Canvas
      // Phones skip the shadow pass and MSAA: at mobile DPI the difference is
      // barely visible, and it keeps the render loop from fighting scrolling.
      shadows={!coarse}
      dpr={coarse ? [1, 1.3] : [1, 1.5]}
      gl={{ antialias: !coarse, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.2, 6.4], fov: 32, near: 0.1, far: 50 }}
      frameloop={reducedMotion ? "demand" : "always"}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.05;
      }}
    >
      <Scene
        reducedMotion={reducedMotion}
        offsetX={offsetX}
        count={count}
        flockScale={flockScale}
        coarse={coarse}
      />
      <ReadySignal onReady={onReady} />
    </Canvas>
  );
}
