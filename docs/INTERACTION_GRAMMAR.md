# Kagu — Interaction Grammar

Source of truth for every interactive element. Cross-references
[DESIGN_BASELINE.md](DESIGN_BASELINE.md) for spacing/contrast/anti-patterns
and `MOTION.md` (Phase 3) for primitive definitions M1–M15.

---

## 1. Cursor states (M10 — `cursor-morph`)

Single custom cursor, JS-driven, spring-followed. Default cursor hidden via
`cursor: none` on `html` (not `body` — let inputs keep their native cursor
via the rule below). All transitions use `var(--ease-arc)` over `var(--dur-quick)` (280ms).

| Mode | Pixel size | Fill | Fires on (selector) |
|---|---|---|---|
| `default` | 6 dot | `--ink` | base; anywhere not matching below |
| `nav-link` | 14 dot, `--mint-deep` ring 1px | `--ink` | `nav a, [data-cursor="nav"]` |
| `view` | 56 × 24 pill, label "view" in Space Mono uppercase | `--mint-deep` fill, `--slate-ink` text | `[data-cursor="view"]` — work cards, case-study covers |
| `read` | 56 × 24 pill, label "read" | `--mint-deep` fill, `--slate-ink` text | `[data-cursor="read"]` — long-form links, case-study body excerpts |
| `ring` | 80 ring, 1.5px stroke | stroke `--slate-ink`, fill `transparent` | `[data-cursor="ring"]` — image-only hovers, featured photography |
| `drag` | 64 ring + small inner dot | `--mint-deep` | `[data-cursor="drag"]` — horizontal-scroll case (Selected Work mid-page break) |
| `hidden` | — | — | `input, textarea, select, [contenteditable], [data-cursor="hidden"]` — native cursor restored |
| `disabled` | 14 dot with diagonal slash | `--neutral` | `[aria-disabled="true"], button:disabled` |

**Rules**
- Cursor mode resolution is **closest-match wins** — the cursor reads `data-cursor` walking up the DOM, stopping at the first match.
- Z-index: `var(--z-cursor)` (90) — above all UI, below curtain (`var(--z-curtain)` = 100).
- Mix-blend-mode `difference` is **not used** — it reads cheap on icy paper. Solid fills only.
- **Touch detection**: on `pointer: coarse` media query OR `'ontouchstart' in window`, the cursor element is unmounted and `html { cursor: auto }`.

**Reduced-motion fallback**: the custom cursor element is not mounted at all. Native cursor only. `[data-cursor="view"]` etc. fall back to `cursor: pointer`.

---

## 2. Link grammar

Four classes. Each has a distinct underline behavior. **Never** an unstyled underline.

| Class | Underline (rest) | Hover | Active | Focus-visible | Cursor mode |
|---|---|---|---|---|---|
| `link-cta` (primary CTA: "Let's talk", "View work") | none | M8 text-swap (60ms after enter) + M9 magnet + sweeping `--mint-deep` underline grows L→R over `--dur-quick` | translate `0 1px`, no scale | mint-deep ring | `view` |
| `link-inline` (inline body links, anchor refs) | persistent 1px `--neutral` hairline | hairline becomes 1px `--mint-deep`, color shifts to `--slate-ink` over `--dur-instant` | `translate-y-px` | mint-deep ring | `default` |
| `link-nav` (site header) | none | M13 underline-sweep: 1px `--mint-deep` sweeps L→R from `0` to `100%` width over 220ms `--ease-arc` | underline holds at 100%, no fill | mint-deep ring offset 6px | `nav-link` |
| `link-meta` (footer, hairline lists, breadcrumbs) | persistent dotted hairline `--neutral` | dotted becomes solid `--mint-deep`, color `--slate-ink` → `--ink` | `translate-y-px` | mint-deep ring | `default` |

**Visited links**: no visited color change — agency context doesn't reward visited UX, and visited color would fight the palette. Document this choice in BUILD_LOG.

**M8 text-swap mechanics** (CTA only): the link wraps its text twice inside an `overflow: hidden` cell. On hover, the visible copy translates `-100%`, the duplicate translates from `100%` to `0`. Total: 280ms, `--ease-arc`. Mid-air, **both copies blur 1px for 80ms** — masks pixel interpolation between Space Mono glyph positions. On leave, the swap reverses (don't snap-reset).

---

## 3. Button taxonomy

Three button shapes, no rounded-full anywhere by default. Radius from tokens: `--radius-none` (primary), `--radius-xs` (icon-only), `--radius-sm` (secondary). Hairline borders 1px.

### Sizes
| Size | Padding | Type | Min height (a11y) |
|---|---|---|---|
| `sm` | `--space-2 --space-4` (8 16) | `--type-xs` mono uppercase, tracking 0.18em | 44px (touch) |
| `md` | `--space-3 --space-5` (12 20) | `--type-sm` mono uppercase | 48px |
| `lg` | `--space-4 --space-8` (16 32) | `--type-md` mono uppercase | 56px |

### Variants × states

| Variant | Default | Hover | Active | Focus-visible | Disabled | Loading |
|---|---|---|---|---|---|---|
| **primary** (`--mint-deep` fill, `--ink` text) | flat fill, no shadow | M9 magnet (max 8px), label shifts to `--slate-ink`, fill stays | `translate-y-[1px]`, 120ms `--ease-snap` | 2px `--mint-deep` ring, 3px offset | fill `--neutral`, label `--slate-ink`, opacity 0.7, no magnet, cursor disabled | label slides up out of frame (M8), reveals shimmering dot row in Space Mono `· · ·` cycling 600ms |
| **secondary** (transparent, 1px `--slate-ink` border, `--ink` text) | flat | border thickens to 1.5px `--mint-deep`, label `--slate-ink`, M9 magnet | as primary | as primary | border `--neutral`, label `--neutral` | replace label with `· · ·` row, no magnet during loading |
| **ghost** (transparent, no border, `--ink` text) | flat | M13 underline-sweep beneath label, no fill | `translate-y-px` | ring as above, drawn as `outline` not `box-shadow` | label `--neutral` | label replaced with `· · ·` |
| **icon-only** (24×24 hit + 20px svg) | transparent | bg → `--mint-pale`, M9 magnet | inset shadow | ring as above, 2px offset (tighter) | opacity 0.4, no hover bg | icon swap to spinner-line (`stroke-dasharray` rotate) |

### Magnetic hover (M9) — assignment rules
- **Primary CTAs only** — hero CTA, "Let's talk" footer CTA, contact-form submit.
- **Work cards** get M9 at half pull strength (4px max).
- **Nav links do NOT** — magnet on top-row nav causes the whole header to feel unstable.
- Magnet disabled when `(pointer: coarse)`.

### Tactile press
All buttons: `:active { transform: translateY(1px); transition: transform 120ms var(--ease-snap); }`. No scale. Scale tells UI lie.

---

## 4. Form grammar

Inputs live in `.field` blocks. Label above input — **always**.

```
.field {
  display: grid;
  gap: var(--space-2);
  position: relative;
}
.field > label  →  --type-xs mono uppercase tracking-eyebrow color --slate-ink
.field > input  →  --type-md Public Sans color --ink, 48px tall
.field > .helper →  --type-xs body --slate-ink
.field > .error  →  --type-xs body --ink (red is wrong palette — color carries by weight + leading icon)
```

### Text input / textarea states

| State | Border | Background | Indicator |
|---|---|---|---|
| `default` | 1px `--neutral` bottom only | transparent | — |
| `hover` | 1px `--slate-ink` bottom | transparent | — |
| `focus` | 1.5px `--mint-deep` bottom | transparent | caret `--mint-deep` |
| `filled` | 1px `--slate-ink` bottom | transparent | label shrinks 0.85× and lifts to `--type-xs` over 180ms `--ease-arc` (CSS-only via `:has(input:not(:placeholder-shown))`) |
| `error` | 1.5px `--ink` bottom | `--mint-pale` 0.4 alpha wash | inline error 4px below input, prefixed by 1px hairline + small `!` glyph in Space Mono |
| `disabled` | dotted 1px `--neutral` | — | label opacity 0.5 |

No floating-label affectation **except** for the filled state shrink (above) — that one is editorial.

### Required marker
Append `*` to label in `--mint-deep`, with `aria-required="true"` on the input. No tooltip.

### Submit states (contact form)
| Stage | Label | Behavior |
|---|---|---|
| `default` | `Send` | primary button, M9 magnet, M8 text-swap on hover |
| `submitting` | `· · ·` cycling | M9 disabled, focus stays on button, surrounding fields go `aria-busy="true"` |
| `success` | `Sent —` (with mint-deep arrow → drawn as SVG line-draw 600ms `--ease-out-expo`) | button non-interactive 2s, form fields fade to `--slate-ink` at opacity 0.6, then route push to `/contact/sent` (or in-place success message) |
| `error` | `Try again` | button border becomes 1.5px `--ink`, inline error block appears above with M7 section-rise (200ms stagger from form bottom) |

### Inline error positioning
Always **directly below** the offending input, 4px gap, never floating tooltip. `aria-describedby` wires input → error id.

---

## 5. Focus system

- **Ring**: `outline: 2px solid var(--mint-deep); outline-offset: 3px; border-radius: 2px;` — applied globally via `:focus-visible` in `globals.css` (already shipped).
- **Never** use `outline: none` without paired `:focus-visible` replacement.
- **Skip link**: first focusable in `<body>` — visually hidden, becomes a 16px `--type-sm` mono link top-left on focus, jumps to `#main`.
- **`<main id="main">`** on every route.
- **Tab order**: header → main → footer. No `tabindex > 0` anywhere. Modal/curtain components trap focus via `inert` on background.
- **`:focus-within`** on `.field` lifts the label color to `--ink` and brightens the bottom border to `--slate-ink` — gives field-level affordance even before the input itself focuses.

---

## 6. Work card interactions

### Selected Work (homepage) + `/work` index

```
<Link
  href={`/work/${case.slug}`}
  data-cursor="view"
  className="work-card"
>
  <ViewTransition name={`work-${case.slug}-cover`}>
    <Image ... />
  </ViewTransition>
  <CaseMeta ... />
</Link>
```

**Rest state**: cover image at full opacity; meta block (client / project / year) hairline-separated below.

**Hover** (`(pointer: fine)` only):
- Cover gets a `--mint-deep / 20% alpha` overlay (`mix-blend-mode: multiply` to honor underlying photo).
- Meta block label `client` shifts color `--slate-ink → --ink`; year shifts opacity 0.6 → 1.
- M14 cursor-trail-preview fires only on `/work` index list, NOT homepage Selected Work (avoid double-cue with M5 reveals on the homepage). 80ms spring lag, 120×80 thumbnail.
- M9 magnet at half strength (4px max).
- Cursor mode `view`.

**Active/click**: brief 80ms scale `0.99` on the card (NOT the image), `--ease-snap`. Then route push with `transitionTypes={['nav-forward']}` so the morph carries direction.

**View Transitions naming convention**: `name={\`work-${slug}-cover\`}` on both the homepage card image AND the case-study hero. `share="morph"` to enable the blur-mid-flight. Site header gets `viewTransitionName: 'site-header'` so it doesn't slide.

**Case-study back link**: `<Link href="/work" transitionTypes={['nav-back']}>` to reverse the morph.

---

## 7. Scroll-linked behavior (Lenis + ScrollTrigger)

| Setting | Value |
|---|---|
| Lenis `lerp` | `0.1` desktop, `0.06` mobile (snappier on touch) |
| Lenis `smoothWheel` | `true` |
| Lenis `smoothTouch` | `false` (let native momentum scroll on touch) |
| Lenis `syncTouch` | `false` |
| Lenis `wheelMultiplier` | `1.0` |

**RAF loop ownership**: one `requestAnimationFrame` calls `lenis.raf(t)` then `ScrollTrigger.update()` in the same tick. `gsap.ticker.lagSmoothing(0)`. Documented in `SmoothScrollProvider.tsx`.

**Route change** (via `NavigationEvents`):
1. `lenis.scrollTo(0, { immediate: true })` — instant, no smooth-jump
2. `ScrollTrigger.refresh()` after `requestAnimationFrame` of the next paint
3. Reset section-entry flags (so M4/M5/M9 fire fresh on the new route)

**Marquee velocity coupling (M6)**: base linear speed `40px/sec`. Couple to Lenis `velocity` via `useTransform`: `speed = baseSpeed + Math.min(velocity * 0.4, 100)`. Reverse direction briefly on `velocity < -threshold`. Return to base over 800ms `--ease-out-quint` after `velocity` decays.

**Ambient drift (M15)**: diagonal at `0.02px/ms`. Auto-pause via `IntersectionObserver` when the host section is `0% intersecting`. Resume on re-entry. No GPU cost while offscreen.

**Section reveals (M4/M5/M9)**: fire on first 30% intersection. Track per-section in module-level `Set<string>` keyed by section id to prevent re-fires on scroll-back. Cleared on route change (above).

---

## 8. Mobile / touch behavior

Detect once at provider mount: `(pointer: coarse)` OR `'ontouchstart' in window`.

| System | Mobile/touch behavior |
|---|---|
| Custom cursor (M10) | unmounted entirely; `html { cursor: auto }` |
| Magnetic hover (M9) | disabled |
| Cursor-trail-preview (M14) | disabled — replaced by a static 24×24 chevron next to the link text on hover-equivalent (`:active`) |
| Work-card hover overlay | fires on `:active` for 200ms before route push, so user sees the mint wash confirm the tap |
| Marquee (M6) | velocity-coupling enabled (driven by native scroll velocity via Lenis); manual touch-drag pans the marquee at `0.6×` |
| Scroll-skew (M13) | disabled |
| Tap targets | minimum **44 × 44 CSS px**; spacing between adjacent tappables minimum `--space-3` |
| Nav | hamburger reveals full-screen panel; close button is icon-only `lg` button, top-right |
| Form inputs | font-size minimum `16px` to prevent iOS auto-zoom (`--type-base` clamp floor enforces this) |

---

## 9. Reduced-motion behavior

Detected via `useReducedMotion()` from Motion AND CSS `@media (prefers-reduced-motion: reduce)`. The JS hook is the source of truth for React-side decisions; the CSS query covers any escaped animations.

| Primitive | Reduced-motion replacement |
|---|---|
| M1 PreloadCurtain | skipped — content renders instantly |
| M2 Page curtain (route nav) | 150ms opacity crossfade (no slide, no curtain) |
| M3 i18n cycle | static (shows first language only) |
| M4 word-mask-reveal | 200ms opacity fade, no stagger |
| M5 image-mask-sweep | instant reveal |
| M6 marquee-velocity | static row, no auto-scroll |
| M7 sticky-numeral | normal scroll, no pin |
| M8 hover-text-swap | instant text swap on hover (or no swap if `prefers-reduced-motion` is strict) |
| M9 magnetic-pull | disabled |
| M10 cursor-morph | unmounted, native cursor |
| M11 live-clock | unchanged (no animation) |
| M12 page-curtain | becomes 150ms opacity fade |
| M13 scroll-skew | disabled |
| M14 cursor-trail-preview | disabled |
| M15 ambient-drift | disabled |

Form `submitting` `· · ·` still cycles in reduced-motion — it's communicating state, not decoration. Throttled to `step-end` ticks rather than continuous.

---

## 10. Anti-patterns — refuse on sight

**Interaction**
- `cursor: pointer` on non-interactive elements (lazy affordance)
- `:hover` styles with no `:focus-visible` equivalent
- `transition: all` on any element (use specific properties)
- Hover scale > 1.05, or any scale on text
- Generic spinning rings (use the `· · ·` Space Mono ticker or 600ms shimmer line)
- Toast notifications floating top-right with auto-dismiss countdown
- Modal that traps without `Escape` key handler + return focus to trigger
- Skip-link missing on any route
- Disabled buttons that look identical to enabled (must read disabled to a screen reader AND visually)

**Form**
- Labels inside inputs (placeholder-as-label)
- Inline error displayed as a tooltip
- Submit success that doesn't change focus or announce via `aria-live`
- Required marker that's color-only

**Cursor**
- Custom cursor without `prefers-reduced-motion` and `(pointer: coarse)` opt-outs
- Cursor that lags more than 80ms (feels broken, not designed)
- Cursor with `mix-blend-mode: difference` on this palette — reads cheap

**View Transitions / morph**
- A `ViewTransition` `name` used in only one place (no morph pair — wastes the transition cost)
- Morph between non-equivalent semantic elements (button → image) — disorienting

**Scroll**
- `window.addEventListener('scroll', ...)` — banned, use Lenis or ScrollTrigger
- Scroll-jacking that fights Lenis lerp
- Re-firing the same reveal on scroll back up

---

**The interaction layer is the most-touched layer.** A 200ms easing error compounds across a session. Land each rule once, here.
