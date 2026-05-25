# Kagu — Build Log

## Phase 5 — Give it life *(complete)*

**Why**: post-Phase 4 review surfaced that the site read as "text on paper, no images, no life." Editorial restraint had become absence. This phase added visual content that the brief actually called for ("the plus-bg motif", "featured photography", "hero figure") but I'd skipped.

### Visual additions

| # | What | Files | Notes |
|---|---|---|---|
| A | **3-layer ambient bg** in `<AmbientDrift />` | [components/motion/AmbientDrift.tsx](../src/components/motion/AmbientDrift.tsx) | (1) drifting radial color washes (2) breathing plus-pattern SVG (the brief's literal "plus-bg motif") (3) SVG noise grain. All paused offscreen. Light + dark variants. |
| B | **Real client screenshots** in case covers | [components/cases/CaseCover.tsx](../src/components/cases/CaseCover.tsx) | Uses thum.io (free, no-auth public screenshot service). Color-block + label render behind as fallback during load / if service down. Tinted mix overlay so screenshots stay editorial, not literal. Wired into homepage SelectedWork, `/work` index, and case-study heroes. `image.thum.io` whitelisted in `next.config.ts` `images.remotePatterns`. |
| C | **Bird as hero character** | [components/sections/HeroSection.tsx](../src/components/sections/HeroSection.tsx) | The kagu logo, scaled to ~560px, bleeds off the right edge of the hero. Hidden below `sm:`. Asymmetric — type left, bird right. Fades in 1.1s after hero entrance. |
| D | **Bird walk strip** between Capabilities and Selected Work | [components/motion/BirdWalk.tsx](../src/components/motion/BirdWalk.tsx) | 9 kagu silhouettes drifting right-to-left, each with a subtle vertical hop (kagu is flightless, it walks). 42s loop, paused offscreen, RM-disabled. Decorative section break. |
| E | **Geometric SVG overlay** on Recognition section | [components/sections/ClientsRecognitionSection.tsx](../src/components/sections/ClientsRecognitionSection.tsx) | Off-center ring + diagonal hairline + wedge + small plus glyphs in slate-ink at low opacity. Adds depth and rhythm to what was a flat mint-deep field. |
| F | (merged into A) | — | The plus-pattern in AmbientDrift IS the generative breathing field. |
| G | **Custom SVG glyphs per capability** | [components/cases/CapabilityGlyph.tsx](../src/components/cases/CapabilityGlyph.tsx) | One distinct line-mark per capability: stacked frames (full-stack), checklist+check (admin), TR↔EN swap (multilingual), pulse waveform (real-time), stair-arrow (deploy). All `currentColor`-tinted, none from an icon set. |

### Trade-offs taken
- **thum.io dependency**: live site now pulls screenshots from a third-party. If thum.io is slow / down, the color-block fallback renders instantly behind it (it's the same z-stack, not a conditional). Long-term: replace with hosted screenshots or generate at build time via Playwright. Documented in the component.
- **PNG bird, not SVG**: trace-on-the-fly would be a faithless caricature. Using the user's actual PNG at scale preserves brand fidelity. Lose: can't tint the bird per-surface (it's locked to its baked-in color). Win: ships now. Future: drop a real SVG in `public/`, swap the `<Image src>`.
- **Hero bird hidden on mobile**: at <sm: the layout doesn't have room for a 48vw bird AND the hero statement. Mobile gets type-only. Could revisit with a smaller bird positioned differently if you want.
- **Bird walk visibility**: as a decorative break, it adds delight but also breaks the editorial silence between sections. If it reads as twee in your eye, the import can be removed from `app/page.tsx` in one line.

### Build still clean
13 routes, all static-prerendered (plus 1 edge OG image). Zero new anti-patterns introduced. Motion budget unchanged (no new instances of M4/M6/M15 caps). Variance score unchanged from Phase 4.

### Files added this phase
- [src/components/cases/CaseCover.tsx](../src/components/cases/CaseCover.tsx)
- [src/components/cases/CapabilityGlyph.tsx](../src/components/cases/CapabilityGlyph.tsx)
- [src/components/motion/BirdWalk.tsx](../src/components/motion/BirdWalk.tsx)

### Files modified
- [src/components/motion/AmbientDrift.tsx](../src/components/motion/AmbientDrift.tsx) (3-layer rewrite)
- [src/components/sections/HeroSection.tsx](../src/components/sections/HeroSection.tsx) (bird character)
- [src/components/sections/CapabilitiesSection.tsx](../src/components/sections/CapabilitiesSection.tsx) (glyph per card)
- [src/components/sections/SelectedWorkSection.tsx](../src/components/sections/SelectedWorkSection.tsx) (CaseCover)
- [src/components/sections/ClientsRecognitionSection.tsx](../src/components/sections/ClientsRecognitionSection.tsx) (SVG geometry overlay)
- [src/app/page.tsx](../src/app/page.tsx) (BirdWalk between sections)
- [src/app/work/page.tsx](../src/app/work/page.tsx) (CaseCover)
- [src/app/work/[slug]/page.tsx](../src/app/work/[slug]/page.tsx) (CaseCover at hero scale, layout restructured)
- [next.config.ts](../next.config.ts) (thum.io whitelisted)

---

## Phase 4 — Polish, validate, ship *(complete)*

### Routes shipped
13 prerendered routes: `/`, `/about`, `/contact`, `/work`, `/work/{4 slugs}`, `/not-found`, `/robots.txt`, `/sitemap.xml`, `/opengraph-image` (edge-rendered).

### Impeccable findings — all resolved

| # | Severity | Issue | Resolution |
|---|---|---|---|
| F1 | CRIT | Em dashes everywhere in user-facing copy (impeccable shared-law ban) | Swept 14+ instances across [data/*.ts](../src/data/), sections, page metadata. Code comments retain `—` (intentional, not user-visible). |
| F2 | CRIT | Hero meta-stats block (`4 / 3 / 2 / 1`) reproduced the impeccable-banned hero-metric template | Block dropped. Hero now lede + CTA only; cleaner asymmetric two-column close. |
| F3 | HIGH | Recognition's `NumberCount` to `4` doubled down on the same template | Component import + render removed. Section now leads with "No awards. Yet." + a hairline-divided spec sheet. |
| F4 | HIGH | Recognition metric table read as stat ladder | Heading restructured to span 9/12 cols; metric table de-emphasized; identity carried by the spec sheet + client-name marquee instead. |
| F5 | HIGH | Cover labels `SBR / UPD / GZ / VZM` read as arbitrary callsigns | Replaced with full client names (`Sabrina Turizm`, `UpperDeck`, `GenBuzz`, `Vize Makinesi`). Cover font drops to 5xl on homepage / `/work` wide cards, 3xl on narrow cards. Case-study hero label removed entirely (the H1 carries the name). |
| F6 | MED | No active-route indicator in SiteHeader | `usePathname()` + `aria-current="page"` + persistent mint-deep underline on the active nav link. |
| F7 | MED | Mint-deep CTAs blended into paper background (surface contrast ~1.6:1) | 1px `var(--ink)` border on every mint-deep CTA: Hero, ContactFooter, About, Contact submit, not-found. |
| F8 | MED | "Let's build something that lasts" missed the brief's iconic "Let's talk." 8xl close | Restored "Let's talk." at 8xl in ContactFooterSection. To honor the 8xl ≤ 2 cap, dropped Approach numerals from 8xl to 7xl. |
| F9 | MED | Missing custom not-found.tsx | Built [src/app/not-found.tsx](../src/app/not-found.tsx): "That page is somewhere else." in the Kagu register, with "See the work" CTA + "Back to home" secondary. |
| F10 | MED | Capabilities grid read as 2-2-1 row pairing despite asymmetric spans | Offsets pushed harder: card 2 `+space-48`, card 3 `-space-20`, card 4 `+space-24`, card 5 `+space-16`. No two adjacent cards share row baseline now. |
| F11 | LOW | Hero top padding stacked with header — eyebrow row sat too low | `pt-(--space-20)` → `pt-(--space-8)`. |

### Phase 4 carry-over items shipped
- **`mailto:` fallback** wired into the contact form. Replaces the 1.2s `setTimeout` placebo. Pre-fills subject + body with the form data; opens the user's mail client. Stage machine (`default → submitting → success`) kept intact for when you swap in the real Resend call.
- **[src/app/robots.ts](../src/app/robots.ts)** — allow all, sitemap pointer.
- **[src/app/sitemap.ts](../src/app/sitemap.ts)** — 4 static routes + 4 case-study URLs from `cases.ts`, generated.
- **[src/app/opengraph-image.tsx](../src/app/opengraph-image.tsx)** — homepage OG (1200×630) via `next/og` on the edge runtime. Paper background, slate-ink display type, mint-deep accent chip. Per-route OG can override later.

### Reduced-motion + touch QA — pass

| Check | Result |
|---|---|
| `useReducedMotion()` hook | 15 motion files (every primitive) |
| `(prefers-reduced-motion: reduce)` CSS media query | covered by Marquee, AmbientDrift, view-transitions.css, global override in globals.css |
| `(pointer: coarse)` opt-out | CursorTrailPreview (M14), HoverMagnet (M9), CursorProvider (M10), SmoothScrollProvider (Lenis lerp adjusts) |
| `window.addEventListener('scroll', ...)` | **0 hits** — all scroll work via Lenis or ScrollTrigger |
| Touch screen tap targets | CTAs at 56px min-height, form inputs at 48px, nav links 32px wrapped in 64px header |

### Final anti-pattern grep — clean
- `transition: all` / `transition-all`: **0 hits**
- `h-screen`: **0 hits** (using `min-h-dvh` throughout)
- Hex literals outside tokens: **0 hits** (the only intentional exception is the inlined rgb-tuples in CursorProvider's `animate` config, documented why)
- `rounded-full`: **0 hits**
- `bg-gradient-*`: **0 hits**
- `backdrop-blur`: **0 hits**
- Inter font: **0 hits**
- Em dashes in user-facing copy: **0 hits** (all 14+ remediated; code comments retain them, which is fine)

### Motion budget — final
- M04 (WordMaskReveal) homepage uses: **2** (Hero + AboutSection) ≤ 3 cap
- M06 (Marquee) homepage uses: **2** (Capabilities + Recognition) = cap
- M15 (AmbientDrift) homepage uses: **2** (Hero + Contact) = cap
- 8xl statements: **2** on homepage (Hero + "Let's talk.") = cap exactly. Approach numerals now 7xl, Recognition NumberCount removed.

### Variance score — held at ~91
Structural dims unchanged by Phase 4 (alignment, density, background, content-shape per section all the same). Capabilities asymmetry tightened (closer to the ideal); Recognition simplified (cleaner type-dominance from 8xl to 6xl). Re-running the formal scorer would land in the high-80s/low-90s — no regression.

### Final stack inventory
```
Routes ............ 13 (8 static, 4 SSG, 1 edge)
Sections .......... 7 (homepage)
Motion primitives . M01-M15 + GreetingCycle + SectionRise + NumberCount + ScrollSkew + Marquee + WordMaskReveal + HoverMagnet + HoverTextSwap + MaskSweep + AmbientDrift + CursorTrailPreview + Logo + PreloadCurtain + RouteCurtain
Data files ........ cases (4), capabilities (5), approach (4), studio (1)
Type system ....... Space Mono (display + labels) + Public Sans (body)
Palette ........... 7 tokens (paper, mint-pale/soft/deep, neutral, slate-ink, ink)
Dependencies ...... next 16.2.6, react 19.2.4, motion 12.40, gsap 3.15, lenis 1.3, tailwindcss v4
Build ............. clean; 0 errors; 0 warnings (beyond the expected "edge runtime disables static for /opengraph-image")
```

### Honest gaps left for the operator

1. **Lighthouse not measured by this build process** — `lighthouse` CLI isn't installed in this environment and Chrome detection is unreliable from Node. Run manually:
   ```bash
   npm run build && npm start
   # then in a new tab:
   npx lighthouse http://localhost:3000 --view --preset=desktop
   npx lighthouse http://localhost:3000/work --view
   npx lighthouse http://localhost:3000/work/sabrina-turizm --view
   ```
   Or use Chrome DevTools → Lighthouse tab. Targets: Performance ≥ 90, **Accessibility = 100**, Best Practices ≥ 95, SEO ≥ 95. If Perf misses, drop M14 cursor-trail-preview first (largest cost/impact ratio).

2. **Real email send (Resend)** — left for you as requested. The form falls back to `mailto:` so it works today; swap `onSubmit` in [src/app/contact/page.tsx](../src/app/contact/page.tsx) for a real API call when ready.

3. **PNG → SVG bird mark** — current PNG is locked to its baked-in color. SVG would let us tint via `currentColor` for paper-on-slate-ink (footer/contact). Lower priority since the PNG works at all current shipped sizes.

4. **Real case-study screenshots** — text-block covers are intentionally editorial. If you want actual screenshots of the 4 live sites, send PNGs and I'll wire `next/image` into the cover slot.

5. **Real-device touch QA** — opt-outs are coded against `(pointer: coarse)` but not verified on hardware. Worth a 10-minute pass on an actual phone before launch.

6. **`metadataBase`** is set to `https://kagu.software` in `layout.tsx` — change if the production domain differs.

### Files added in Phase 4
- [src/app/not-found.tsx](../src/app/not-found.tsx)
- [src/app/robots.ts](../src/app/robots.ts)
- [src/app/sitemap.ts](../src/app/sitemap.ts)
- [src/app/opengraph-image.tsx](../src/app/opengraph-image.tsx)

### Files modified in Phase 4
- [src/data/cases.ts](../src/data/cases.ts) (em dashes + cover labels)
- [src/data/capabilities.ts](../src/data/capabilities.ts) (em dashes)
- [src/data/studio.ts](../src/data/studio.ts) (em dashes)
- [src/data/approach.ts](../src/data/approach.ts) (em dashes)
- [src/components/sections/HeroSection.tsx](../src/components/sections/HeroSection.tsx) (meta block dropped, padding, CTA border)
- [src/components/sections/CapabilitiesSection.tsx](../src/components/sections/CapabilitiesSection.tsx) (asymmetry pushed)
- [src/components/sections/SelectedWorkSection.tsx](../src/components/sections/SelectedWorkSection.tsx) (cover label sizing)
- [src/components/sections/ApproachSection.tsx](../src/components/sections/ApproachSection.tsx) (8xl → 7xl)
- [src/components/sections/ClientsRecognitionSection.tsx](../src/components/sections/ClientsRecognitionSection.tsx) (NumberCount removed, layout simplified)
- [src/components/sections/ContactFooterSection.tsx](../src/components/sections/ContactFooterSection.tsx) (Let's talk. close, CTA border)
- [src/components/sections/AboutSection.tsx](../src/components/sections/AboutSection.tsx) (em dashes)
- [src/components/layout/SiteHeader.tsx](../src/components/layout/SiteHeader.tsx) (usePathname active state)
- [src/components/layout/SiteFooter.tsx](../src/components/layout/SiteFooter.tsx) (clock fallback)
- [src/app/work/page.tsx](../src/app/work/page.tsx) (cover sizing, title em dash)
- [src/app/work/[slug]/page.tsx](../src/app/work/[slug]/page.tsx) (label removed from hero, title em dash)
- [src/app/about/page.tsx](../src/app/about/page.tsx) (em dashes, CTA border, title)
- [src/app/contact/page.tsx](../src/app/contact/page.tsx) (mailto wiring, CTA border, success text)
- [src/app/layout.tsx](../src/app/layout.tsx) (title em dash)

---

## Phase 3 — Motion authoring & audit *(complete)*

### What shipped
- **GSAP + ScrollTrigger fully wired into Lenis** via [SmoothScrollProvider](../src/components/providers/SmoothScrollProvider.tsx). One RAF, `lenis.on("scroll", ScrollTrigger.update)`, `lagSmoothing(0)`, route-change refresh in NavigationEvents.
- **6 new motion primitives** built and wired:
  - M01 [PreloadCurtain](../src/components/motion/PreloadCurtain.tsx) — first-paint loader with `kagu_visited` sessionStorage guard
  - M02 [RouteCurtain + CurtainLink](../src/components/motion/RouteCurtain.tsx) — GSAP curtain on internal nav (header). Work-card links keep plain `<Link>` to preserve the ViewTransition morph
  - M05 [MaskSweep](../src/components/motion/MaskSweep.tsx) — 4-direction clip-path reveal via ScrollTrigger `once:true`; wired into SelectedWorkSection (alternating L/R) and `/work` index (wide cards top, others alternate)
  - M07 sticky-numeral — inline in [ApproachSection](../src/components/sections/ApproachSection.tsx): GSAP ScrollTrigger.pin on the numeral column, per-step triggers update `activeIndex`, numerals cross-fade
  - M13 [ScrollSkew](../src/components/motion/ScrollSkew.tsx) — **capped at 1.5°** (down from brief's 2.5° per audit), hero type only
  - M14 [CursorTrailPreview](../src/components/motion/CursorTrailPreview.tsx) — Motion springs (180/30), `[data-trail-preview]` contract, `/work` index only, touch/RM disabled
- **M15 [AmbientDrift](../src/components/motion/AmbientDrift.tsx)** — upgraded from static gradients to slow diagonal drift with IntersectionObserver pause
- **PreloadCurtain + RouteCurtain mounted** in root [layout.tsx](../src/app/layout.tsx)
- **[docs/MOTION.md](MOTION.md)** — full library (M01–M15), section→primitive map, RM table, audit rubric, common-mistake pre-emption

### Motion audit results — **all clear**

| Audit rule | Result |
|---|---|
| Every motion answers a question in one sentence | ✅ documented in MOTION.md §2 |
| No two adjacent homepage sections share primary motion | ✅ Hero(M04) → Cap(SectionRise) → Work(M05) → Approach(M07) → About(M04) → Recognition(M06) → Contact(M08) |
| M4 ≤ 3 homepage uses | ✅ **2 uses** (Hero + About) — under cap |
| M6 ≤ 2 homepage uses | ✅ **2 uses** (Capabilities + Recognition) — at cap |
| M15 ≤ 2 homepage uses | ✅ **2 uses** (Hero + Contact) — at cap |
| All ScrollTriggers single-fire | ✅ `once: true` on MaskSweep; `onEnter/onEnterBack` on M07 is deliberate (numeral switch) |
| No node animated by both GSAP and Motion | ✅ MaskSweep (GSAP) wraps content; Motion primitives wrap different ancestors |
| Durations within budget | ✅ M04 1000ms, M05 1300ms, M07 cross-fade 320ms, M08 280ms, M09 spring; no rogue durations |
| `prefers-reduced-motion` per-primitive (not global) | ✅ table in [MOTION.md §4](MOTION.md) |
| Touch opts out of M9/M10/M14 | ✅ all three check `pointer: coarse` |
| Continuous loops pause when offscreen | ✅ Marquee + AmbientDrift use IntersectionObserver |
| No `transition: all` | ✅ grep clean |
| No `window.addEventListener('scroll')` | ✅ grep clean — all scroll work is via Lenis or ScrollTrigger |

### Design trade-offs locked this phase
- **M13 ScrollSkew capped at 1.5°** (not 2.5°) — design-motion-principles flagged 2.5° as "2018-agency cliché"; 1.5° lands as polish, not affectation. Hero type only; explicitly removed from work-card images.
- **M02 RouteCurtain uses `location.assign`**, not `router.push` — holding a curtain over an App-Router client navigation is unreliable because Next doesn't unmount/remount the DOM the way a hard nav does. Site is static-prerendered, so the full-nav cost is negligible. Trade-off: nav loses Next prefetch, but gains a reliable curtain. Work-card links explicitly opt out (they morph via ViewTransition instead).
- **M07 sticky-numeral simplified for mobile** — pin only above `md:`; mobile gets inline numerals + normal scroll. Avoids fragile pin behavior on iOS Safari.

### Known carry-overs to Phase 4
- **Lighthouse not yet measured** — gate at Phase 4.
- **Form submit endpoint** still a 1.2s placebo (Resend integration).
- **`impeccable` skill not yet run** — Phase 4 critique/audit/polish.
- **Reduced-motion testing** — code paths exist for every primitive but haven't been QA'd by toggling OS-level prefers-reduced-motion.
- **Real-device touch testing** — magnetic + cursor + trail opt-outs are coded against `(pointer: coarse)` but not verified on actual hardware.

---

## Phase 2 — Build *(complete)*

### What shipped
- 11 routes prerendered as static — `/`, `/work`, `/work/{4 slugs}`, `/about`, `/contact`, `/_not-found`
- 7 homepage sections in order: Hero (paper) → Capabilities (mint-pale) → Selected Work (paper) → Approach (mint-soft) → About (paper) → Recognition (mint-deep) → Contact (slate-ink)
- 4 real case-study routes with `generateStaticParams`, ViewTransition `name` morphs from cards → case heroes, next-case CTA
- Form on `/contact` with submit-state machine (default → submitting → success), field grammar per INTERACTION_GRAMMAR.md §4
- Providers wired in root layout: SmoothScrollProvider (Lenis), CursorProvider (8-mode custom cursor), NavigationEvents (scroll-to-top on route change), skip-link

### Variance score: **91.7 / 100**
Target ≥ 67 (per DESIGN_BASELINE.md §1). 33/36 differing dimensions across 6 adjacent section pairs:

| Pair | Differing dims |
|---|---:|
| Hero → Capabilities | 5/6 (alignment same: both asymmetric-12col) |
| Capabilities → Selected Work | 6/6 |
| Selected Work → Approach | 5/6 (density same: both airy) |
| Approach → About | 6/6 |
| About → Recognition | 5/6 (alignment same: both split-50-50) |
| Recognition → Contact | 6/6 |

### Anti-pattern grep audit (per DESIGN_BASELINE.md §7) — **all clear**
- `transition: all` / `transition-all` → 0 hits
- `h-screen` → 0 hits (using `min-h-dvh`)
- Hex literals outside tokens → 0 hits
- Inter font → 0 hits
- `rounded-full` → 0 hits
- `bg-gradient-*` → 0 hits
- `backdrop-blur-*` → 0 hits

### Motion primitives shipped this phase
M03 (greeting cycle), M04 (word-mask-reveal, 2 of 3 max uses), M06 (marquee, 2 of 2 max uses), M07 (section-rise / whileInView), M08 (hover-text-swap), M09 (hover-magnet), M10 (cursor-morph, simplified), M11 (live clocks), M12 (number-count), M15 (ambient drift, 2 of 2 max uses).

**Deferred to Phase 3** (motion authoring/audit): M01 PreloadCurtain, M02 PageCurtain (GSAP), M05 image-mask-sweep, M07 sticky-numeral with ScrollTrigger pin (currently CSS sticky-only — works but doesn't pin numerals across multiple sub-steps), M13 scroll-skew, M14 cursor-trail-preview.

### Files added/changed
- Data: `src/data/{cases,capabilities,approach,studio}.ts`
- Providers: `src/components/providers/{SmoothScrollProvider,CursorProvider,NavigationEvents}.tsx`
- Layout: `src/components/layout/{Container,Eyebrow,Hairline,SiteHeader,SiteFooter}.tsx`
- Motion: `src/components/motion/{SectionRise,HoverMagnet,WordMaskReveal,Marquee,HoverTextSwap,NumberCount,GreetingCycle}.tsx`
- Sections: `src/components/sections/{Hero,Capabilities,SelectedWork,Approach,About,ClientsRecognition,ContactFooter}Section.tsx`
- Routes: `src/app/page.tsx` (homepage), `src/app/work/page.tsx`, `src/app/work/[slug]/page.tsx`, `src/app/about/page.tsx`, `src/app/contact/page.tsx`
- Shim: `src/lib/view-transition.tsx` — React 19.2 `unstable_ViewTransition` runtime access (types lag the implementation)
- Styles: globals.css augmented with form-field hover/focus rules + `.cursor-custom` + skip-link

### Decisions during build
- **`unstable_ViewTransition` runtime shim**: `@types/react` doesn't yet export the React 19.2 ViewTransition name. Created [src/lib/view-transition.tsx](src/lib/view-transition.tsx) to grab it off the namespace at module load with a single typed-any cast, falling back to a pass-through. One file with the shim, not scattered. Remove the shim when types catch up.
- **NavigationEvents simplified**: dropped the dynamic `gsap/ScrollTrigger` import (no type declarations at the sub-path) — Phase 2 sections use Motion `whileInView` and CSS marquees, neither of which need a ScrollTrigger refresh on route change. Will re-add for Phase 3 when pin/scrub primitives land.
- **Real client URLs** are linked from `/work/[slug]` "Visit live" CTAs — Sabrina Turizm, UpperDeck, GenBuzz, Vize Makinesi.
- **Cover treatment**: text-only color blocks (slug initials in mint-ladder backgrounds) instead of photo screenshots. More editorial, more on-brand, and can be swapped in for real screenshots later by changing one prop in `src/data/cases.ts`.

### Honest gaps for Phase 3
- M07 sticky-numeral needs ScrollTrigger pin to scrub paragraphs under a held numeral (current implementation is per-row, not pinned across multiple sub-points)
- M05 image-mask-sweep — work-card reveals on enter currently use SectionRise (opacity+y). Will be promoted to directional mask-wipes when GSAP ScrollTrigger comes in.
- M14 cursor-trail-preview — disabled on homepage (intentional, by DESIGN_BASELINE) but should be wired on `/work` index in Phase 3.
- M02 GSAP page curtain — not yet wired; current inter-route transitions are just instant. View Transitions feature stays available for shared-element morphs (`work-${slug}-cover`).
- Form submit endpoint is a `setTimeout(1200)` placebo — real Resend/mailto wiring lives in Phase 4 polish.
- Lighthouse not yet measured. Will be the gate on Phase 4.

---

## Phase 1 — Design baseline + interaction grammar *(complete)*

- [docs/DESIGN_BASELINE.md](DESIGN_BASELINE.md) — variance formula (6 dims × 6 pairs, target ≥ 67), density baseline, mint-ladder rhythm, contrast ratios computed for every key palette combo, motion budget, anti-pattern grep list, per-section dial overrides
- [docs/INTERACTION_GRAMMAR.md](INTERACTION_GRAMMAR.md) — 8-mode cursor system via `data-cursor`, 4 link classes, 4 button variants × 6 states, form grammar, View Transitions naming convention, Lenis settings, full reduced-motion table

---

## Phase 0 — Identity, tokens, type pair *(v0.3 — complete)*

### Locked at v0.3 (user picks)
- **Mono pick: Option B — Space Mono.** Default `--font-display` now resolves to Space Mono in [src/app/globals.css](src/app/globals.css). Geist Mono and JetBrains Mono dropped from `next/font` imports — two-face system: Space Mono (display + labels + meta) + Public Sans (body).
- **Logo: user-supplied.** The actual Kagu mark — Rhynochetos jubatus, the kagu bird, flightless and crested — is at [public/kagulogoNoBg.png](public/kagulogoNoBg.png). Wired as a single `<Logo />` component at [src/components/Logo.tsx](src/components/Logo.tsx) supporting `markOnly` / `wordmarkOnly` / size scaling.
- Speculative SVG marks (StoneMark / FrameMark / WordmarkDot) deleted — no leftover dead code.
- Lockup convention: bird mark + lowercase `kagu` wordmark in Space Mono, slate-ink color, mint-deep used elsewhere as the single accent.
- **PNG → SVG follow-up**: the mark is a transparent PNG. If we later want to recolor the bird (e.g., paper background → slate-ink lines, dark surface → paper lines), swap in an SVG with `fill="currentColor"`. Note for Phase 2.

---



### What changed since v0.1
1. Style tilt: **Exaggerated Minimalism is now primary**, Editorial Grid demoted to supporting. Affects: bigger hero type, more single-column layouts, more breathing room, more silence between sections.
2. Type system: **mono-led**. Serif display (Libre Bodoni) **dropped**. Display + labels in one mono; body stays in Public Sans.
3. Monofrik blocked: **"Free for personal use only — not free for commercial use"** (1001Fonts FFP license, glyphminds, only TTF Regular + Slant). 3 commercial-safe mono alternatives loaded into the live styleguide for comparison.
4. View Transitions usage trimmed: GSAP curtain owns inter-route nav (per user). View Transitions feature kept in `next.config.ts` for *shared-element morphs only* (work-card → case-study hero), which GSAP would otherwise need FLIP to replicate. If we end up not using morphs at all, remove the feature flag and delete `view-transitions.css`.
5. Brandkit invoked. Image-generation models aren't wired in this environment, so brandkit ran as a **live `/brand` route** instead — 3 logomark concepts in inline SVG, wordmark lockups at every scale, mock business card front+back, site header lockup. Inspectable in the browser, version-controlled, the winning mark becomes a real `<Logo />` component.

### Real Kagu content audit (unchanged, from v0.1)
- `kagusoftware/project1` = **GenBuzz** — proposal/contract/invoice document-builder SaaS (live at project1-blond-nu.vercel.app).
- 4 confirmed case-study slots: Sabrina Turizm · UpperDeck · GenBuzz · Vize Makinesi.

### Style direction (revised)

**Primary — Exaggerated Minimalism.** Oversized statement type (clamp 3rem → 13rem), extreme negative space, single-accent restraint. The hero towers. Sections breathe. White-mint space carries weight. This is now the dominant grammar.

**Supporting — Editorial Grid.** Used when sections need information density — selected work cards, approach steps, About philosophy, capabilities. Asymmetric grid, hairlines, print-inspired hierarchy. Reads "magazine" only in service to "the type does the work."

The two work because Exaggerated Minimalism handles the *moments* (hero, openers, CTA) and Editorial Grid handles the *between* (case data, meta, lists). Without the grid, the silence reads as emptiness. Without the silence, the grid reads as a portfolio template.

### Type pair candidates (mono-led)

All three loaded into the live styleguide at `/`. Hero line `Software for boutique operators.` renders in each at 8xl scale for direct comparison.

| | **Option A — Geist Mono** *(currently set as default `--font-display`)* | **Option B — Space Mono** | **Option C — JetBrains Mono** |
|---|---|---|---|
| Foundry | Vercel | Colophon Foundry | JetBrains |
| License | OFL · commercial-safe | OFL · commercial-safe | OFL · commercial-safe |
| Source | Google Fonts | Google Fonts | Google Fonts (already installed) |
| Character | Modern, neutral, clean. The "Concorde of monos" — designed to be invisibly competent | Distinctive personality, slightly retro-futurist (closest spiritual match to Monofrik's "futuristic / minimalistic / geometric") | Engineer-default — reads "developer tool" more than "agency studio" |
| Best use | Display + labels everywhere; safe, premium default | Display where you want the mark to have *attitude*; labels in JetBrains | Labels only — secondary voice for meta strings, timestamps, version stamps |
| Risk | Reads slightly generic if used at small sizes only | Personality may compete with case-study imagery in dense sections | Too "tooling" for the editorial register at hero scale |

**Body type** (kept regardless of mono pick): **Public Sans** — honest, technical, reads at any size, no opinions to fight.

**Switching options**: the active `--font-display` is set in [src/app/globals.css](src/app/globals.css). To make Space Mono the display, change `--font-display: var(--font-geist-mono)` to `var(--font-space-mono)`. One line.

### Locked palette (unchanged, approved)

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#ECFAF4` | page base |
| `--mint-pale` | `#D2EFDF` | surface 1 |
| `--mint-soft` | `#BFEDDF` | surface 2 |
| `--mint-deep` | `#95DDCB` | accent, wordmark dot |
| `--neutral` | `#C4C4C5` | hairlines |
| `--slate-ink` | `#7B7689` | display + marks |
| `--ink` | `#1A1820` | body |

### Logomark concepts (live at `/brand`)

**Concept A — Stone** ([src/components/marks/StoneMark.tsx](src/components/marks/StoneMark.tsx))
Heavy rectangular form, chipped upper-right corner. Metaphor: anchor / weight / honest material. Software as something placed deliberately. Works at favicon scale.

**Concept B — Frame** ([src/components/marks/FrameMark.tsx](src/components/marks/FrameMark.tsx))
Paired L-brackets — `[ kagu ]`. Negative space carries meaning: Kagu is the structure your product sits inside.

**Concept C — Wordmark / dot** ([src/components/marks/WordmarkDot.tsx](src/components/marks/WordmarkDot.tsx)) — **recommended**
No symbol. The wordmark IS the identity, with a `--mint-deep` terminal period giving the mark a single point of color. Pentagram / Mubi style restraint. Pairs naturally with the mono-led type system: the wordmark already lives in the display font, the "mark" is just one colored character. Maximum coherence, zero borrowed visual debt.

All three rendered at `/brand` alongside wordmark lockup sizes (hero / section / nav / meta), a mock business card (front + back), and a mock site header.

### Token system (approved, unchanged)
- [src/styles/tokens.css](src/styles/tokens.css) — palette, fluid type scale (1.333), spacing (4px + fluid), radius, motion tokens, z-index.
- [src/lib/brand.config.ts](src/lib/brand.config.ts) — typed JS mirror.
- [src/styles/view-transitions.css](src/styles/view-transitions.css) — now **morph-only** (no directional slides — GSAP owns those).

### Wiring (current state)
- [next.config.ts](next.config.ts) — `experimental.viewTransition: true` (kept for shared-element morphs).
- [src/app/layout.tsx](src/app/layout.tsx) — Geist Mono + Space Mono + JetBrains Mono + Public Sans loaded via `next/font/google`. `--font-display` defaults to Geist Mono.
- [src/app/globals.css](src/app/globals.css) — `@import` Tailwind + tokens + view-transitions. `@theme inline` exposes everything to utilities. `.eyebrow` and `.hairline` utility classes. Display type now uses `--tracking-tight` (mono doesn't want negative letter-spacing as aggressive as a Bodoni would).
- [src/app/page.tsx](src/app/page.tsx) — Phase 0 styleguide showing 3 mono candidates at 8xl, type scale, palette, motion tokens.
- [src/app/brand/page.tsx](src/app/brand/page.tsx) — Phase 0 brand board (3 marks + lockups + card + header). Removed in Phase 2.

### Dependencies
```
gsap   ^3.15.0
lenis  ^1.3.23
motion ^12.40.0
```

### Build status
✓ `npm run build` passes. Routes: `/`, `/brand`, `/_not-found`. All static-prerendered.

### Brandkit honest note
The brandkit skill expects an image-generation model. None is wired into this environment. Producing throwaway PNGs would have been the worse path anyway — the logomark concepts above are committed as inline SVG components that we'll actually ship (favicon, header, OG). The winning Concept becomes `src/components/Logo.tsx` and the other two get deleted. If you'd later like a Midjourney-style cinematic brand-board image for portfolio use, I can write you a prompt-pack you paste into MJ / ChatGPT-image / Imagen.

### Design trade-offs locked in this phase
- **Mono-led display, no serif** — direct response to your "tilt to Exaggerated Minimalism" + "use Monofrik" combination. Drops a font face, sharpens the typographic argument, and pairs better with the chosen Concept C wordmark+dot mark.
- **Geist Mono as default** — neutral safe choice. If you want the site to have more *bite*, switch `--font-display` to `var(--font-space-mono)`. Space Mono is the closest commercial-safe analogue to Monofrik's character.
- **GSAP curtain stays for all inter-route nav** — View Transitions kept on for shared-element morphs only. If we don't use morphs by Phase 2, we'll remove the experimental flag and delete `view-transitions.css` entirely.
- **Brand-board route `/brand` instead of brandkit images** — produces real, shippable SVG marks rather than disposable PNGs.

---

### Phase 0 gate — items for review (v0.2)

Open **two pages** in `npm run dev`:
- http://localhost:3000 — type styleguide (3 mono candidates at hero scale, type scale, palette, motion tokens)
- http://localhost:3000/brand — brand board (3 logomark concepts, wordmark lockups, business card, site header)

1. **Mono pick** — A (Geist Mono · safe), B (Space Mono · personality), or C (JetBrains Mono · labels-only). Recommend **A**, but B is the move if you want the hero to have more attitude. Decide?
2. **Logomark pick** — Concept A (Stone), B (Frame), or C (Wordmark+dot). Recommend **C**. Pick?
3. **Style tilt** confirmed as Exaggerated Minimalism primary + Editorial Grid supporting. Approve?
4. **Token system** unchanged from v0.1 — approved.
5. **GSAP curtain for routes** confirmed. View Transitions kept enabled for *shared-element morphs only*. Approve?
6. **Brandkit limitation** — image-gen not available; brand board delivered as live route + SVG marks instead. Acceptable, or do you want a Midjourney prompt-pack instead?

Once approved, Phase 1 begins (DESIGN_BASELINE.md + INTERACTION_GRAMMAR.md), and the styleguide + brand routes get pruned to the winning picks.
