# Kagu — Motion Library

Source of truth for every animation on the site. Any motion that contradicts
this file is a bug. Cross-references [DESIGN_BASELINE.md](DESIGN_BASELINE.md) §6
(motion budget rules) and [INTERACTION_GRAMMAR.md](INTERACTION_GRAMMAR.md) §9
(reduced-motion behavior).

**Dials (locked at design baseline):** VARIANCE 9 / MOTION 6 / DENSITY 3.

---

## 1. Tokens (committed to [src/styles/tokens.css](../src/styles/tokens.css))

```
ease-arc        cubic-bezier(0.6, 0.01, 0.05, 0.95)   confident state changes
ease-out-expo   cubic-bezier(0.16, 1, 0.3, 1)         long, elegant entrances
ease-out-quint  cubic-bezier(0.22, 1, 0.36, 1)        general entrances
ease-curtain    cubic-bezier(0.76, 0, 0.24, 1)        masks, wipes, page transitions
ease-snap       cubic-bezier(0.4, 0, 0.2, 1)          press/release confirms only

dur-instant   160ms     dur-quick   280ms    dur-base    600ms
dur-reveal   1000ms     dur-mask   1300ms    dur-loader 2200ms

stag-word   60ms     stag-line  120ms    stag-block 200ms    stag-list 80ms

spring-magnetic   stiffness 200, damping 25, mass 1
spring-drag       stiffness 180, damping 30, mass 1
```

Components consume eases from `--ease-*` CSS vars or `easeCss` / `ease` from
[src/lib/brand.config.ts](../src/lib/brand.config.ts).

---

## 2. Library — what shipped (M01 → M16)

| ID | Name | File | Library | Notes |
|----|------|------|---------|-------|
| M01 | PreloadCurtain | [motion/PreloadCurtain.tsx](../src/components/motion/PreloadCurtain.tsx) | GSAP timeline | first-paint only; sessionStorage `kagu_visited` guard; full sequence ~2200ms |
| M02 | RouteCurtain + CurtainLink | [motion/RouteCurtain.tsx](../src/components/motion/RouteCurtain.tsx) | GSAP | mint-deep panel; raise + location.assign + peel via sessionStorage `kagu_curtain_active`; **NOT used on work-card links** (those morph via ViewTransition) |
| M03 | GreetingCycle | [motion/GreetingCycle.tsx](../src/components/motion/GreetingCycle.tsx) | Motion (AnimatePresence) | 7-language cross-fade, 1.6s interval, 200ms swap, single instance (hero only) |
| M04 | WordMaskReveal | [motion/WordMaskReveal.tsx](../src/components/motion/WordMaskReveal.tsx) | Motion | overflow-hidden per word + Y-translate; 1000ms, 60ms stagger, ease-out-expo |
| M05 | MaskSweep | [motion/MaskSweep.tsx](../src/components/motion/MaskSweep.tsx) | GSAP + ScrollTrigger | clip-path inset wipe in 4 directions; `once: true`; 1300ms, expo.inOut |
| M06 | Marquee | [motion/Marquee.tsx](../src/components/motion/Marquee.tsx) | CSS `@keyframes` | duplicated track, mask-gradient edges, `IntersectionObserver` pause when offscreen |
| M07 | sticky-numeral (inline) | [sections/ApproachSection.tsx](../src/components/sections/ApproachSection.tsx) | GSAP ScrollTrigger.pin + cross-fade | pins left numeral column for the steps stack; right column scrolls; activeIndex cross-fades 4 numerals |
| M08 | HoverTextSwap | [motion/HoverTextSwap.tsx](../src/components/motion/HoverTextSwap.tsx) | CSS transitions | duplicate text in overflow-hidden cell, blur 0.4px mid-flight, 280ms ease-arc |
| M09 | HoverMagnet | [motion/HoverMagnet.tsx](../src/components/motion/HoverMagnet.tsx) | Motion `useSpring` | radius 80–120px, max 8px pull (CTA) / 4px (work cards via strength=0.5) |
| M10 | CursorProvider | [providers/CursorProvider.tsx](../src/components/providers/CursorProvider.tsx) | Motion springs | 8 modes via `[data-cursor]`; touch + reduced-motion = unmounted |
| M11 | Live clocks (inline) | [layout/SiteFooter.tsx](../src/components/layout/SiteFooter.tsx) + [sections/ContactFooterSection.tsx](../src/components/sections/ContactFooterSection.tsx) | `setInterval(1000)` | `tabular-nums`, `suppressHydrationWarning`, no animation on tick |
| M12 | NumberCount | [motion/NumberCount.tsx](../src/components/motion/NumberCount.tsx) | Motion `animate()` | useInView once, 1400ms ease-out-quint |
| M13 | ScrollSkew | [motion/ScrollSkew.tsx](../src/components/motion/ScrollSkew.tsx) | RAF loop | **capped at 1.5°** (down from brief's 2.5° per audit); hero type only; decays to 0 after scroll stops |
| M14 | CursorTrailPreview | [motion/CursorTrailPreview.tsx](../src/components/motion/CursorTrailPreview.tsx) | Motion springs (180/30) | `/work` index only; spring lag ~80ms; touch + reduced-motion = disabled |
| M15 | AmbientDrift | [motion/AmbientDrift.tsx](../src/components/motion/AmbientDrift.tsx) | CSS @keyframes | 28s diagonal background-position drift; IntersectionObserver pause; light + dark variants |
| M16 | MarketingHeroHeadline | [marketing/HeroHeadline.tsx](../src/app/marketing/HeroHeadline.tsx) | Motion (AnimatePresence) | `/marketing` `<h1>` only; accent word cycles on its own line, 2800ms hold + 450ms masked Y-slide; hidden sizer holds the box so nothing reflows; `clip-path` top inset of 0.12em keeps the outgoing word off the line above; IntersectionObserver pause |

---

## 3. Section → primitive map (locked)

| Section | Primary | Supporting | Count |
|---|---|---|---|
| Hero | **M04** WordMaskReveal (use 1/3) | M03 GreetingCycle, M09 Magnet, M10 Cursor, M13 ScrollSkew (hero type only), M15 AmbientDrift (use 1/2) | hero entrance |
| Capabilities | **SectionRise** (M07 stand-in for cards) | M06 Marquee (use 1/2) | mid-rhythm |
| Selected Work | **M05** MaskSweep (alternating L/R) | M14 disabled here (avoid double-cue) | image-led |
| Approach | **M07** sticky-numeral (pin) | SectionRise per step | concept |
| About | **M04** WordMaskReveal (use 2/3) | SectionRise on principles grid | quiet prose |
| Clients & Recognition | **M06** Marquee (use 2/2) | M12 NumberCount, SectionRise | honest metrics |
| Contact / Footer | **M08** HoverTextSwap (email + CTA) | M09 Magnet, M11 Clocks, M15 AmbientDrift (use 2/2) | inverted close |
| `/work` index | **M05** MaskSweep + **M14** CursorTrailPreview | SectionRise | reveal-led |
| `/work/[slug]` | ViewTransition morph (work card → case hero) | SectionRise | continuity |
| `/about`, `/contact` | M04 + SectionRise | M11 in footer | calm |

**Variance rules — all passing:**
- ✅ No two adjacent sections share primary motion (Hero=M04 → Cap=SectionRise → Work=M05 → Approach=M07 → About=M04 → Recognition=M06 → Contact=M08 — all distinct adjacent pairs; M04 reuse at Hero↔About is non-adjacent)
- ✅ M04 used **3 times max** (Hero, About, About-route — that's our cap. Will refactor if a 4th instance is requested)
- ✅ M06 used **2 times max** (Capabilities stack marquee, Recognition client marquee)
- ✅ M15 used **2 times max** (Hero, Contact)
- ✅ No primitive used outside its assigned context

---

## 4. Reduced-motion behavior (full table)

Per [INTERACTION_GRAMMAR.md §9](INTERACTION_GRAMMAR.md). Implemented in components via
Motion's `useReducedMotion()` hook AND global CSS `@media (prefers-reduced-motion: reduce)`.

| Primitive | RM behavior |
|---|---|
| M01 PreloadCurtain | skipped entirely; flag set so subsequent visits also skip |
| M02 RouteCurtain | `window.location.assign(href)` immediately, no curtain animation |
| M03 GreetingCycle | static, shows first greeting only |
| M04 WordMaskReveal | 200ms opacity fade, no Y-translate, no stagger |
| M05 MaskSweep | `clip-path: inset(0)` set on mount — instant reveal |
| M06 Marquee | `animation: none` via CSS media query — static row |
| M07 sticky-numeral | ScrollTrigger.pin not created — numerals scroll inline with steps |
| M08 HoverTextSwap | renders single (no duplicate); no swap on hover |
| M09 HoverMagnet | passthrough wrapper; no spring follow |
| M10 CursorProvider | component returns null; native cursor only |
| M11 Live clocks | unchanged (timekeeping, not animation) |
| M12 NumberCount | final value set immediately |
| M13 ScrollSkew | RAF loop not started; no transform applied |
| M14 CursorTrailPreview | thumbnails never render |
| M15 AmbientDrift | CSS animation paused via media query |
| M16 MarketingHeroHeadline | index never advances — first word only, no slide |

Touch (`pointer: coarse`) opt-outs: M09, M10, M14.

---

## 5. Pre-build critique (preserved from design-motion-principles, Phase 3 kickoff)

Each primitive was checked before implementation:

- **M01** RIGHT — once-per-session, branded, earns 2.2s only because the curtain exits before content paints.
- **M05** RIGHT — clip-path is GPU-cheap; directions are intentional (top=arrival, R=forward, L=looking-back), not random.
- **M07** RIGHT — pin+scrub on a 4-step Approach is exactly where the editorial pattern earns its complexity. Each step held ≤ 80vh per audit.
- **M14** RIGHT — bounded to `/work` index, doesn't compete with M5 on homepage.
- **M13** REVISED — brief's 2.5° too cliché; **capped at 1.5°**, hero type only, dropped from work images.
- **M02** RIGHT — paired with CurtainLink so it never fires on links carrying ViewTransition `name=` pairs (work cards morph instead).

---

## 6. Post-build audit rubric — **all clear**

From design-motion-principles, checked against the built site:

| Rule | Status |
|---|---|
| Every motion answers a question in one sentence | ✅ documented per primitive above |
| No two adjacent sections share primary motion | ✅ verified in §3 |
| No primitive > 3× on the page; M4 ≤ 3 strictly | ✅ M4 = 3, M6 = 2, M15 = 2 |
| All scroll-triggered reveals single-fire | ✅ `once: true` on every ScrollTrigger.create + `viewport.once` on whileInView |
| No element animated by both GSAP and Motion | ✅ MaskSweep (GSAP) wraps content; SectionRise (Motion) is on different nodes |
| Durations: hero 700–1400ms, hovers 180–280ms, state ≤ 300ms | ✅ M01 hero 2200ms (loader exception), M04 1000ms, M05 1300ms, M08 280ms, M09 spring; no rogue durations |
| Easings reference --ease-* tokens, no rogue inline cubic-beziers | ✅ — minor exceptions in motion files use the same numerical tuples as tokens (documented) |
| `prefers-reduced-motion` handled per primitive (not global blanket) | ✅ table in §4 |
| Touch opts out of M9/M10/M14 | ✅ all three check `pointer: coarse` |
| Continuous loops pause when offscreen | ✅ Marquee + AmbientDrift use IntersectionObserver |
| No `transition: all`; Tailwind transitions paired with duration + ease | ✅ grep clean |
| FCP not blocked by motion JS — M01 exits within 2200ms ceiling | ✅ skip flag means subsequent loads have no curtain |

---

## 7. Common motion mistakes — pre-empted

From the kickoff critique, here's how each was handled:

1. **Re-firing reveals on scroll-back** → every ScrollTrigger uses `once: true`. M07 active-step uses `onEnter`+`onEnterBack` deliberately for the numeral switch (which IS supposed to update on scroll-back).
2. **GSAP + Motion fighting over the same node** → MaskSweep (GSAP) animates the wrapping `<div>`; Motion's SectionRise wraps a different ancestor. Audited — no node has both.
3. **ScrollTrigger.refresh() on route change** → NavigationEvents now calls it after the next 2 RAFs once `window.__kaguGsapReady`.
4. **Curtain easing applied to underlying page** → page content has no entrance animation when M01/M02 are playing; the curtain owns the visual handoff.
5. **RM = "skip animation"** → differentiated per primitive (table §4). M07 RM = unpin (still scrolls); M01 RM = skipped (no curtain, no delay).

---

## 8. Known limits / Phase 4 carry-over

- **M02 RouteCurtain uses `location.assign`** (full nav) rather than `router.push` because holding a curtain over a client-side App Router transition is unreliable. The site is static-prerendered so the full nav cost is acceptable; we lose Next prefetch on those links and the curtain is incompatible with the same-link View Transition morph. Work-card links use plain `<Link>` to keep the morph; nav uses `CurtainLink`. This is the documented trade-off, not a bug.
- **M07 sticky-numeral** on mobile collapses to inline numerals (per ApproachSection.tsx). ScrollTrigger.pin is only created above `md:`.
- **No Lighthouse score recorded yet** — gate at Phase 4.
- **Contact form submit endpoint** is still a 1.2s placebo — wired to real Resend in Phase 4.

---

**The motion layer is the most-fragile layer.** Land each rule once, here. If it isn't in this file, it isn't allowed in components.
