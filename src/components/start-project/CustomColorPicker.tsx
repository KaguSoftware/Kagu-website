"use client";

/*
  Fully custom, dependency-free color picker for the start-project palette.
  Three slots — one general/primary plus two accents. Pick a slot, then dial in
  any color via the saturation/value square, the hue strip, or a hex input.
  Internally HSV; stored as hex on the CustomPalette.
*/

import { useState } from "react";
import { isValidHex, type CustomPalette } from "./catalog";

type SlotKey = keyof CustomPalette;

const SLOTS: { key: SlotKey; label: string; hint: string }[] = [
  { key: "primary", label: "Primary", hint: "Your main brand color — sets the tone." },
  { key: "accent2", label: "Accent", hint: "Calls to action — buttons and highlights." },
  { key: "accent3", label: "Accent 2", hint: "Supporting pops — tags, charts, details." },
];

/* A few tasteful starting points so a blank picker never feels intimidating. */
const SUGGESTIONS = [
  "#1f8fe0", "#7c5cff", "#2dd4bf", "#e8a33d", "#e25c7a",
  "#34d399", "#f472b6", "#f59e0b", "#60a5fa", "#a78bfa",
  "#ef4444", "#14b8a6", "#eef1f5", "#94a3b8", "#0f172a",
];

/* ---- HSV <-> hex helpers (h: 0-360, s/v: 0-1) ---- */

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function hsvToHex(h: number, s: number, v: number) {
  const [r, g, b] = hsvToRgb(h, s, v);
  return (
    "#" +
    [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")
  );
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return { h: 0, s: 0, v: 0 };
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "var(--type-xs)",
  letterSpacing: "var(--tracking-eyebrow)",
  textTransform: "uppercase",
  color: "var(--slate-ink)",
};

export function CustomColorPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: CustomPalette;
  onChange: (next: CustomPalette) => void;
  disabled?: boolean;
}) {
  const [slot, setSlot] = useState<SlotKey>("primary");
  const current = value[slot];

  // HSV is the editing source of truth; hex is derived. We keep a local HSV so
  // dragging through grey/black areas doesn't lose hue (a pure hex round-trip
  // would). `edit.hex` records which external hex that HSV produced; whenever
  // the slot's hex diverges (slot switch, URL restore, hex-input commit) we
  // reseed HSV from it — reconciled during render, no effect needed.
  const [edit, setEdit] = useState(() => ({
    hex: current,
    hsv: hexToHsv(current),
  }));
  const hsv =
    edit.hex.toLowerCase() === current.toLowerCase()
      ? edit.hsv
      : hexToHsv(current);

  // Hex text field is uncontrolled-ish: its draft only diverges while typing.
  const [hexDraft, setHexDraft] = useState(current);
  const [editingHex, setEditingHex] = useState(false);
  const shownHex = editingHex ? hexDraft : current;

  const commitHsv = (next: { h: number; s: number; v: number }) => {
    const hex = hsvToHex(next.h, next.s, next.v);
    setEdit({ hex, hsv: next });
    onChange({ ...value, [slot]: hex });
  };

  /* ---- pointer dragging (rect read from the captured element, not a ref) ---- */
  const dragHandler = (
    move: (frac: { x: number; y: number }) => void
  ): React.PointerEventHandler<HTMLDivElement> => (e) => {
    if (disabled) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const apply = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      move({
        x: clamp01((clientX - r.left) / r.width),
        y: clamp01((clientY - r.top) / r.height),
      });
    };
    apply(e.clientX, e.clientY);
    const onMove = (ev: PointerEvent) => apply(ev.clientX, ev.clientY);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onSvDown = dragHandler(({ x, y }) =>
    commitHsv({ ...hsv, s: x, v: 1 - y })
  );
  const onHueDown = dragHandler(({ x }) => commitHsv({ ...hsv, h: x * 360 }));

  const onHexCommit = () => {
    setEditingHex(false);
    const normalized = hexDraft.startsWith("#") ? hexDraft : `#${hexDraft}`;
    if (isValidHex(normalized)) {
      const hex = normalized.toLowerCase();
      setEdit({ hex, hsv: hexToHsv(hex) });
      onChange({ ...value, [slot]: hex });
    }
    // invalid → drop the draft; render falls back to `current`
  };

  const applyHex = (hexRaw: string) => {
    const hex = hexRaw.toLowerCase();
    setEdit({ hex, hsv: hexToHsv(hex) });
    setEditingHex(false);
    onChange({ ...value, [slot]: hex });
  };

  const activeSlot = SLOTS.find((s) => s.key === slot)!;
  const hueHex = hsvToHex(hsv.h, 1, 1);

  return (
    <div
      style={{
        opacity: disabled ? 0.45 : 1,
        pointerEvents: disabled ? "none" : "auto",
        transition: "opacity var(--dur-quick) var(--ease-out-quint)",
      }}
      aria-disabled={disabled}
    >
      {/* Combined palette preview — the three colors as a set */}
      <div
        className="flex items-stretch"
        style={{
          height: 44,
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid var(--neutral)",
          marginBottom: "var(--space-4)",
        }}
        aria-hidden
      >
        {SLOTS.map(({ key }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSlot(key)}
            tabIndex={-1}
            style={{
              flex: key === "primary" ? 1.6 : 1,
              background: value[key],
              border: "none",
              cursor: "pointer",
              outline:
                slot === key ? "2px solid var(--ink)" : "2px solid transparent",
              outlineOffset: -2,
              transition: "flex var(--dur-quick) var(--ease-out-quint)",
            }}
          />
        ))}
      </div>

      {/* Slot tabs — pick which color you're editing */}
      <div
        role="radiogroup"
        aria-label="Color slot"
        className="flex flex-wrap items-center gap-2"
        style={{ marginBottom: "var(--space-3)" }}
      >
        {SLOTS.map(({ key, label }) => {
          const on = slot === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={label}
              data-cursor="view"
              onClick={() => setSlot(key)}
              className="inline-flex items-center gap-2"
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid",
                borderColor: on ? "var(--mint-deep)" : "var(--neutral)",
                background: on
                  ? "color-mix(in oklab, var(--mint-deep) 12%, transparent)"
                  : "transparent",
                cursor: "pointer",
                transition:
                  "border-color var(--dur-quick) var(--ease-out-quint), background var(--dur-quick) var(--ease-out-quint)",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: value[key],
                  border: "1px solid var(--neutral)",
                  boxShadow: on
                    ? "0 0 0 2px color-mix(in oklab, var(--mint-deep) 35%, transparent)"
                    : "none",
                  transition: "box-shadow var(--dur-quick) var(--ease-out-quint)",
                }}
              />
              <span
                className="font-mono"
                style={{
                  ...LABEL_STYLE,
                  color: on ? "var(--mint-deep)" : "var(--ink)",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active-slot hint */}
      <p
        style={{
          fontSize: "var(--type-xs)",
          color: "var(--slate-ink)",
          marginBottom: "var(--space-4)",
          lineHeight: 1.5,
        }}
      >
        {activeSlot.hint}
      </p>

      {/* Saturation / value square */}
      <div
        onPointerDown={onSvDown}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 300,
          height: 164,
          borderRadius: 8,
          border: "1px solid var(--neutral)",
          cursor: disabled ? "default" : "crosshair",
          touchAction: "none",
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueHex})`,
        }}
        role="slider"
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        aria-valuetext={`saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            width: 18,
            height: 18,
            borderRadius: 999,
            transform: "translate(-50%, -50%)",
            border: "3px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.35)",
            background: current,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Hue strip */}
      <div
        onPointerDown={onHueDown}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 300,
          height: 16,
          marginTop: "var(--space-3)",
          borderRadius: 999,
          border: "1px solid var(--neutral)",
          cursor: disabled ? "default" : "pointer",
          touchAction: "none",
          background:
            "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
        }}
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: `${(hsv.h / 360) * 100}%`,
            top: "50%",
            width: 20,
            height: 20,
            borderRadius: 999,
            transform: "translate(-50%, -50%)",
            border: "3px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.35)",
            background: hueHex,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Hex input + swatch */}
      <div
        className="flex items-center gap-3"
        style={{ marginTop: "var(--space-4)" }}
      >
        <span
          aria-hidden
          style={{
            width: 28,
            height: 28,
            flexShrink: 0,
            borderRadius: 6,
            background: current,
            border: "1px solid var(--neutral)",
          }}
        />
        <label className="inline-flex items-center gap-2">
          <span className="sr-only">Hex value</span>
          <input
            value={shownHex}
            onFocus={() => {
              setEditingHex(true);
              setHexDraft(current);
            }}
            onChange={(e) => {
              setEditingHex(true);
              setHexDraft(e.target.value);
            }}
            onBlur={onHexCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            spellCheck={false}
            maxLength={7}
            className="font-mono"
            style={{
              width: 100,
              padding: "6px 10px",
              fontSize: "var(--type-xs)",
              textTransform: "uppercase",
              color: "var(--ink)",
              background: "transparent",
              border: "1px solid var(--neutral)",
              borderRadius: 4,
              outline: "none",
            }}
          />
        </label>
      </div>

      {/* Quick starting points — one click fills the active slot */}
      <div style={{ marginTop: "var(--space-4)" }}>
        <span
          className="font-mono block"
          style={{ ...LABEL_STYLE, marginBottom: "var(--space-2)" }}
        >
          Or start from
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {SUGGESTIONS.map((hex) => {
            const on = current.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                aria-label={`Use ${hex}`}
                title={hex}
                data-cursor="view"
                onClick={() => applyHex(hex)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: hex,
                  border: "2px solid",
                  borderColor: on ? "var(--ink)" : "transparent",
                  outline: "1px solid var(--neutral)",
                  outlineOffset: 1,
                  cursor: "pointer",
                  transform: on ? "scale(1.14)" : "scale(1)",
                  transition:
                    "transform var(--dur-quick) var(--ease-out-quint), border-color var(--dur-quick) var(--ease-out-quint)",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
