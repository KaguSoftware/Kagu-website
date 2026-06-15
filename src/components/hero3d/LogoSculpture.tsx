"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, type ThreeEvent } from "@react-three/fiber";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import * as THREE from "three";

// Base longest dimension of one normalized bird, in world units.
// Each instance multiplies this by its own `scale`.
const TARGET_SIZE = 1.7;
// Extrude depth in raw SVG units — normalized away, so it just sets how "thick"
// the folded slab reads relative to its silhouette.
export const DEPTH = 130;
// Rounded-edge bevel (raw SVG units): generous + smooth so a bright reflection
// streak rides along every edge — that highlight is what reveals the form of
// the black glass against the black backdrop.
const BEVEL_THICKNESS = 12;
const BEVEL_SIZE = 10;
const BEVEL_SEGMENTS = 6;

// Click interaction: a tap injects an extra angular velocity that decays back to
// the idle drift, so the sculpture lunges into a fast spin then settles. Kicks
// stack, so rapid taps wind it up further.
const SPIN_KICK = 14; // rad/s added per click (~2.2 turns/sec at peak)
const SPIN_DECAY = 2.4; // how fast the kick eases back to idle (1/seconds)

// Drag / scroll interaction: grab a sculpture and swing it horizontally, or
// horizontal-scroll over it. Both feed the same spin so it all composes.
const DRAG_SENSITIVITY = 0.012; // radians of yaw per pixel dragged
const WHEEL_SENSITIVITY = 0.04; // rad/s of spin added per unit of horizontal scroll
const FLING_MAX = 40; // clamp the release fling so a fast flick can't go absurd
const DRAG_THRESHOLD = 4; // px of travel before a press counts as a drag (suppresses the click kick)

type Part = { geometry: THREE.BufferGeometry; ghost: boolean };
type Materials = {
  main: THREE.MeshPhysicalMaterial;
  ghost: THREE.MeshPhysicalMaterial;
};

export type BirdConfig = {
  position: [number, number, number];
  scale: number;
  yaw: number;
  /** radians/sec of slow Y drift — varied per bird so none move in lockstep */
  rotSpeed: number;
  floatSpeed: number;
  floatAmp: number;
  phase: number;
};

// The flock. Index 0 is the hero bird — large, centered and forward; the rest
// sit smaller and further back, drifting at distinct rotation/float speeds so
// none move in lockstep. `count` always keeps the lead (it's first).
const FLOCK: BirdConfig[] = [
  // lead — big, centered, front
  { position: [0.0, 0.05, 1.0], scale: 1.45, yaw: -0.4, rotSpeed: 0.045, floatSpeed: 0.4, floatAmp: 0.08, phase: 0.0 },
  // background flock — set back, smaller, varied speeds
  { position: [2.5, 0.95, -2.2], scale: 0.55, yaw: 0.4, rotSpeed: 0.08, floatSpeed: 0.6, floatAmp: 0.16, phase: 1.3 },
  { position: [-2.1, 0.8, -2.8], scale: 0.5, yaw: -1.0, rotSpeed: 0.05, floatSpeed: 0.5, floatAmp: 0.18, phase: 2.2 },
  { position: [2.1, -1.15, -2.0], scale: 0.6, yaw: 0.7, rotSpeed: 0.09, floatSpeed: 0.55, floatAmp: 0.16, phase: 0.7 },
  { position: [-2.5, -0.7, -3.4], scale: 0.42, yaw: 1.1, rotSpeed: 0.06, floatSpeed: 0.7, floatAmp: 0.12, phase: 3.0 },
  { position: [0.7, 1.6, -3.0], scale: 0.45, yaw: -0.6, rotSpeed: 0.07, floatSpeed: 0.65, floatAmp: 0.13, phase: 1.8 },
];

/**
 * Load the SVG once and build the shared extruded geometry + materials.
 * Every bird in the flock reuses these — extruding per-instance would be wasteful.
 */
export function useLogoParts(url: string): { parts: Part[]; scale: number; materials: Materials } {
  const data = useLoader(SVGLoader, url);

  const materials = useMemo<Materials>(() => {
    // Glossy black glass, like the reference: opaque, near-mirror surface with a
    // clearcoat. The form isn't drawn — it's revealed by bright reflections
    // streaking along the rounded edges. This needs a DARK environment with
    // bright light strips to reflect (set in Hero3D); against a bright env, black
    // glass just washes out to flat grey.
    const main = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#000000"),
      metalness: 0,
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      reflectivity: 0.7,
      envMapIntensity: 2.0,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    // The echoed wing — softer reflections so it recedes into the black.
    const ghost = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#000000"),
      metalness: 0,
      roughness: 0.13,
      clearcoat: 0.8,
      clearcoatRoughness: 0.08,
      reflectivity: 0.5,
      envMapIntensity: 1.4,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return { main, ghost };
  }, []);

  const { parts, scale } = useMemo(() => {
    const built: Part[] = [];

    data.paths.forEach((path, index) => {
      // First path is the faint echoed wing, second the solid body. Prefer the
      // SVG's declared opacity when present; fall back to path order otherwise.
      const style = path.userData?.style as
        | { fillOpacity?: string | number; opacity?: string | number }
        | undefined;
      const declared = Number(style?.fillOpacity ?? style?.opacity);
      const ghost = Number.isFinite(declared) ? declared < 0.5 : index === 0;
      const slabDepth = ghost ? DEPTH * 0.45 : DEPTH;

      SVGLoader.createShapes(path).forEach((shape) => {
        // Rounded bevel so every edge catches a smooth highlight streak.
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: slabDepth,
          bevelEnabled: true,
          bevelThickness: BEVEL_THICKNESS,
          bevelSize: BEVEL_SIZE,
          bevelSegments: BEVEL_SEGMENTS,
          curveSegments: 12,
        });
        built.push({ geometry, ghost });
      });
    });

    // Combined bounds → center on origin + normalize uniformly. A uniform,
    // positive scale preserves face winding/normals; the SVG's y-down axis is
    // corrected with a +X rotation on the mesh group below (never a mirror).
    const box = new THREE.Box3();
    built.forEach(({ geometry }) => {
      geometry.computeBoundingBox();
      if (geometry.boundingBox) box.union(geometry.boundingBox);
    });
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const normalize = TARGET_SIZE / Math.max(size.x, size.y);

    built.forEach(({ geometry }) =>
      geometry.translate(-center.x, -center.y, -center.z),
    );

    return { parts: built, scale: normalize };
  }, [data]);

  // Hand-built GPU resources — dispose on unmount.
  useEffect(() => {
    const createdParts = parts;
    const createdMaterials = materials;
    return () => {
      createdParts.forEach(({ geometry }) => geometry.dispose());
      createdMaterials.main.dispose();
      createdMaterials.ghost.dispose();
    };
  }, [parts, materials]);

  return { parts, scale, materials };
}

/** One bird instance — shares geometry/materials, owns its own motion. */
function Bird({
  parts,
  scale,
  materials,
  config,
  reducedMotion,
}: {
  parts: Part[];
  scale: number;
  materials: Materials;
  config: BirdConfig;
  reducedMotion: boolean;
}) {
  const floatRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  // Click/scroll kick: `boostVel` is the decaying extra angular velocity; once
  // spent it is integrated into `extraAngle`, a persistent offset so the hand-off
  // back to the idle drift is seamless (no snap). Dragging writes `extraAngle`
  // directly (1:1 with the pointer) and, on release, flings into `boostVel`.
  const boostVel = useRef(0);
  const extraAngle = useRef(0);
  // Idle yaw accumulated frame-by-frame (NOT elapsedTime * rotSpeed). Integrating
  // it means pausing during a grab just holds the last angle, instead of dropping
  // the whole accrued drift to zero — that drop was the twitch-back on first
  // contact, and its mirror jump on release was the twitch on tap.
  const driftAngle = useRef(0);

  // Drag bookkeeping.
  const dragging = useRef(false);
  const lastX = useRef(0); // clientX of the previous move, for per-frame delta
  const downX = useRef(0); // clientX at press, to measure total travel
  const lastMoveT = useRef(0); // timestamp of the previous move, for fling velocity
  const dragVel = useRef(0); // latest drag angular velocity (rad/s) for the fling
  const moved = useRef(false); // did this press travel far enough to be a drag?

  useFrame((state, delta) => {
    if (reducedMotion) return; // posed statically via the JSX defaults below
    const float = floatRef.current;
    const spin = spinRef.current;
    if (!float || !spin) return;

    // While grabbed the pointer drives the yaw directly; otherwise wind down any
    // active kick/fling and bank its rotation into the persistent offset.
    if (!dragging.current && boostVel.current !== 0) {
      extraAngle.current += boostVel.current * delta;
      boostVel.current *= Math.exp(-SPIN_DECAY * delta);
      if (Math.abs(boostVel.current) < 0.001) boostVel.current = 0;
    }

    // Advance the idle drift only when free; while grabbed it holds, so the yaw
    // stays continuous through press/release (no snap). Clamp delta so returning
    // to a backgrounded tab can't fast-forward the drift in a single frame.
    if (!dragging.current) driftAngle.current += config.rotSpeed * Math.min(delta, 0.1);

    const t = state.clock.elapsedTime + config.phase;
    // Idle drift + the user-driven offset (drag/kick), both continuous.
    spin.rotation.y = config.yaw + driftAngle.current + extraAngle.current;
    spin.rotation.x = Math.sin(t * 0.22) * 0.06;
    spin.rotation.z = Math.sin(t * 0.16) * 0.025;
    // Float + faint breathing.
    float.position.y = config.position[1] + Math.sin(t * config.floatSpeed) * config.floatAmp;
    float.scale.setScalar(config.scale * (1 + Math.sin(t * 0.5 + config.phase) * 0.015));
  });

  // Reset the cursor if the bird unmounts mid-hover/drag.
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation(); // only the front-most bird under the pointer reacts
    if (moved.current) return; // it was a drag, not a tap — the fling already spun it
    boostVel.current += SPIN_KICK;
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId); // keep moves coming if the pointer slips off
    dragging.current = true;
    moved.current = false;
    // Don't reset boostVel here. While dragging it's frozen (not applied), so the
    // bird still locks to the pointer — and keeping it lets rapid TAPS stack their
    // kicks, since a tap runs through pointerdown too and zeroing would wipe the
    // wind-up between taps. A real drag overwrites it with the fling on release.
    lastX.current = downX.current = e.clientX;
    lastMoveT.current = performance.now();
    dragVel.current = 0;
    document.body.style.cursor = "grabbing";
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    e.stopPropagation();
    const now = performance.now();
    const dx = e.clientX - lastX.current;
    const dt = Math.max(1, now - lastMoveT.current) / 1000; // seconds, floored to avoid div-by-0
    lastX.current = e.clientX;
    lastMoveT.current = now;
    const dAngle = dx * DRAG_SENSITIVITY;
    extraAngle.current += dAngle;
    dragVel.current = dAngle / dt;
    if (Math.abs(e.clientX - downX.current) > DRAG_THRESHOLD) moved.current = true;
  };

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    dragging.current = false;
    // Only a real drag flings. A tap travels no distance (dragVel ~0), so flinging
    // it would slam boostVel to 0 and kill the kick fired by the click right after
    // — leave the momentum alone and let that kick stack onto it.
    if (moved.current) {
      boostVel.current = THREE.MathUtils.clamp(dragVel.current, -FLING_MAX, FLING_MAX);
    }
    document.body.style.cursor = "grab";
  };

  const handleWheel = (e: ThreeEvent<WheelEvent>) => {
    e.stopPropagation();
    // Horizontal scroll spins it; the kick decays like a click.
    boostVel.current += e.deltaX * WHEEL_SENSITIVITY;
  };

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = dragging.current ? "grabbing" : "grab";
  };
  const handleOut = () => {
    if (!dragging.current) document.body.style.cursor = "";
  };

  return (
    <group
      ref={floatRef}
      position={config.position}
      scale={config.scale}
      onClick={reducedMotion ? undefined : handleClick}
      onPointerDown={reducedMotion ? undefined : handlePointerDown}
      onPointerMove={reducedMotion ? undefined : handlePointerMove}
      onPointerUp={reducedMotion ? undefined : endDrag}
      onPointerCancel={reducedMotion ? undefined : endDrag}
      onWheel={reducedMotion ? undefined : handleWheel}
      onPointerOver={reducedMotion ? undefined : handleOver}
      onPointerOut={reducedMotion ? undefined : handleOut}
    >
      <group ref={spinRef} rotation={[0, config.yaw, 0]}>
        {/* rotation.x = PI flips the SVG's y-down axis upright without mirroring */}
        <group rotation={[Math.PI, 0, 0]} scale={scale}>
          {parts.map(({ geometry, ghost }, i) => (
            <mesh
              key={i}
              geometry={geometry}
              material={ghost ? materials.ghost : materials.main}
              castShadow={!ghost}
              receiveShadow
              position={[0, 0, ghost ? -DEPTH * 0.5 : 0]}
            />
          ))}
        </group>
      </group>
    </group>
  );
}

/**
 * The full flock. `offsetX` shifts the whole group right to clear the headline;
 * `count` trims the flock on smaller screens for performance.
 */
export function Flock({
  url = "/kagu-logo.svg",
  reducedMotion = false,
  offsetX = 0,
  count = FLOCK.length,
  scale: groupScale = 1,
}: {
  url?: string;
  reducedMotion?: boolean;
  offsetX?: number;
  count?: number;
  /** Uniform shrink for the whole flock — used to fit smaller viewports. */
  scale?: number;
}) {
  const { parts, scale, materials } = useLogoParts(url);
  const birds = FLOCK.slice(0, count);

  return (
    <group position={[offsetX, 0, 0]} scale={groupScale}>
      {birds.map((config, i) => (
        <Bird
          key={i}
          parts={parts}
          scale={scale}
          materials={materials}
          config={config}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}
