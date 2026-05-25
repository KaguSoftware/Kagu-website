# Kagu — Design Baseline

Source of truth for the Phase 2 build. Every section is checked against this file
before it's considered done. Built on top of locked palette / type / motion.

**Dials (calibrated against taste-skill defaults of 8 / 6 / 4):**
- `DESIGN_VARIANCE`: **9** — Exaggerated Minimalism + Editorial Grid demands asymmetric, headline-led layouts, massive whitespace zones, no symmetric reflexes.
- `MOTION_INTENSITY`: **6** — purposeful only. Slow editorial reveals, not magic-physics. Brief explicitly says 700–1400ms on hero moves, not 300ms.
- `VISUAL_DENSITY`: **3** — agency restraint. Art-gallery mode. Confidence signaled through what's missing, not what's there.

---

## 1. Variance score formula

Each section is scored across **6 dimensions**:

| Dim | Options |
|---|---|
| `alignment` | `left` · `right` · `split-50-50` · `asymmetric-12col` · `center` (used **once max**) · `staggered-offset` |
| `density` | `airy` · `medium` · `dense` |
| `background` | `paper` · `mint-pale` · `mint-soft` · `mint-deep` · `slate-ink` |
| `type-dominance` | `8xl-hero` · `6xl-display` · `4xl-section` · `2xl-heading` · `mono-meta` · `body-only` |
| `primary-motion` | one of M1–M15 (from MOTION.md) |
| `content-shape` | `single-statement` · `grid-list` · `editorial-columns` · `marquee-strip` · `card-stack` · `numbered-steps` · `media-bleed` |

**Rule**: every adjacent section pair (Hero↔Capabilities, Capabilities↔Selected Work, …, Recognition↔Contact) must differ on **≥ 3 of 6** dimensions.

**Score formula**:
```
variance = (sum over 6 adjacent pairs of: dimensions_that_differ) / 36 × 100
```
6 pairs × 6 dims = 36 max differences. Target: **≥ 67** (= avg 4 differing dims per pair). Floor: **60**. Below 60 = fail, refactor.

---

## 2. Density baseline (Art-gallery mode)

| Metric | Target |
|---|---|
| Min vertical padding per section | `--section-y` (clamps 80px → 144px) |
| Min between sections at variance boundary (when background changes) | `--space-32` extra above next section |
| Body line length | `45–65ch` (`max-w-[55ch]` typical) |
| Meta / mono line length | `30–50ch` |
| Hero : body type-size ratio | **≥ 6×** (e.g., 8xl ≈ 158px : md ≈ 18px = 8.8×) — confidence signal |
| Body never below | `--type-base` (16px floor) |
| Hairline weight | `1px` only — never 2px |
| Max distinct elements per section (above the fold of section) | **5** |
| Max colors per section (excl. images) | **3** (paper + 1 mint surface + 1 type color) |
| Vertical rhythm | grid `gap` always in `--space-*` tokens — never literal `gap-7` |

**`min-h-[100dvh]` on hero only.** Other sections size to content + section padding. Never `h-screen`.

---

## 3. Background rhythm (the mint ladder)

The 4-step ladder `paper → mint-pale → mint-soft → mint-deep` (plus `slate-ink` for the inverse mood) is what differentiates sections. Default homepage assignment:

| # | Section | Background | Why |
|---|---|---|---|
| 1 | Hero | `paper` | the brand sits at 0; quietest surface, type does the work |
| 2 | Capabilities | `mint-pale` | first lift; signals "what we do" is a distinct register |
| 3 | Selected Work | `paper` | return to baseline — work imagery carries the color |
| 4 | Approach | `mint-soft` | second lift; concept territory, slower reading |
| 5 | About / Studio | `paper` | quiet for principles + bio |
| 6 | Clients & Recognition | `mint-deep` | only fully-saturated section; honest metrics + logo strip |
| 7 | Contact / Footer | `slate-ink` | inversion: paper on dark for the close |

**Rules**:
- No two adjacent sections share the same background.
- `slate-ink` and `mint-deep` each used **once per page max**.
- A background change is also a permission to switch primary motion + alignment (use it).

Case-study and `/about`, `/contact` routes inherit `paper`; subroutes earn their own ladder only if they justify it.

---

## 4. Type rhythm

| Step | Use | Allowed count per page |
|---|---|---|
| `--type-8xl` | hero statement OR a single section opener (the "Let's talk" close) | **≤ 2** |
| `--type-6xl` | section displays carrying a name (Approach number, About lead) | **≤ 3** |
| `--type-4xl` | sub-displays, work-card titles | unlimited within reason |
| `--type-2xl` | headings within a section | unlimited |
| `--type-lg` | leads, eyebrow-paired statements | unlimited |
| `--type-md / base` | body | unlimited; **md** preferred for long-form |
| `--type-sm` | meta, captions | unlimited |
| `--type-xs` | eyebrows + page-number labels (uppercase + `--tracking-eyebrow`, mono) | unlimited |

**Eyebrow convention**: `font-mono · text-xs · letter-spacing 0.18em · uppercase · slate-ink`. One eyebrow per section minimum — they're the navigation spine of the editorial grid.

**Tracking**: `--tracking-tight` (`-0.012em`) is the default on display. Avoid the over-tightened Bodoni-style `-0.05em` — Space Mono breaks at that.

---

## 5. Contrast targets (locked palette)

All ratios measured against WCAG 2.1.

| Foreground | Background | Ratio | Pass | Allowed for |
|---|---|---:|---|---|
| `ink` | `paper` | **15.5 : 1** | AAA | anything |
| `ink` | `mint-pale` | **13.7 : 1** | AAA | anything |
| `ink` | `mint-soft` | **13.3 : 1** | AAA | anything |
| `ink` | `mint-deep` | **11.6 : 1** | AAA | anything |
| `slate-ink` | `paper` | **4.0 : 1** | AA Large only | display ≥ 24px or ≥ 19px bold; **NEVER** body |
| `slate-ink` | `mint-pale` | **3.6 : 1** | AA Large | display only; if forced small, use `ink` |
| `slate-ink` | `mint-soft` | **3.5 : 1** | AA Large | display only |
| `slate-ink` | `mint-deep` | **3.0 : 1** | borderline | display ≥ 32px only; otherwise use `ink` |
| `paper` | `slate-ink` | **4.0 : 1** | AA Large | display + headings; for body on dark surface use `mint-pale` (≈ 4.2 : 1) or larger size |
| `mint-pale` | `slate-ink` | **4.2 : 1** | AA Large + body ≥ 18px bold | safe for meta on the dark contact section |

**Mandatory rules**:
- Body text on any light surface → **always `--ink`**, never `--slate-ink`.
- Display text in `--slate-ink` only when font-size ≥ `--type-2xl` (~30px+).
- On the `slate-ink` contact/footer section: headings in `paper`, body in `mint-pale`, meta in `mint-deep`.
- `neutral` (`#C4C4C5`) is for **hairlines only** — never type.

---

## 6. Motion baseline

- **Purposeful-only**: every animation must answer "what does this communicate?" If the answer is "it's animated", delete it.
- **Per-section budget**: 1 primary motion primitive + max 2 supporting. More than 3 = compression.
- **Adjacent-pair rule** (from MOTION.md): no two adjacent sections share their primary primitive.
- **Hero word-mask reveal (M4)** fires **once per session** (use `sessionStorage`), not on scroll-back.
- **Continuous infinite loops** (marquees, ambient drift) — capped at **2 instances per page**, and pause when the section is offscreen (`IntersectionObserver`).
- **No `transition-all`**, no Tailwind transitions without explicit `duration-*` AND `ease-*` overrides.
- **Hero entrance**: total time ≥ 1000ms with stagger. Anything under 600ms on hero feels twitchy.
- **All motion** has a `prefers-reduced-motion` fallback per MOTION.md.

**Spam signals (refactor immediately)**:
- The same primitive on > 3 sections.
- Every element on screen animating on enter.
- Scroll-jacking that fights Lenis.
- Hover transforms ≥ 4px (translation budget is `±8px` total, springs preferred).

---

## 7. Anti-patterns — refuse on sight

Grep / visual audit checklist. Any hit = refactor.

**CSS / Tailwind**
- [ ] `transition: all` / `transition-all` anywhere
- [ ] `transition-*` without paired `duration-*` and `ease-*`
- [ ] `h-screen` (use `min-h-dvh`)
- [ ] `rounded-full` on a non-circular element; `rounded-xl` everywhere by default
- [ ] `bg-gradient-*` on text — banned
- [ ] `bg-gradient-to-br from-purple-* to-blue-*` — banned (AI-default look)
- [ ] `backdrop-blur` / glassmorphism panels
- [ ] `box-shadow` with default RGB (must be tinted to surface)
- [ ] `#000000`, `#ffffff` — only tokens allowed

**Type / layout**
- [ ] `font-family: Inter` — banned (we have Space Mono + Public Sans)
- [ ] Centered hero + two CTAs (the SaaS cliché)
- [ ] 3 equal cards in a row — banned; use asymmetric or 2-col zig-zag
- [ ] Gradient text fill on H1
- [ ] Hex literals in components (must come from tokens)
- [ ] `gap-7` / arbitrary spacing — must be `--space-*` token
- [ ] Body text in `--slate-ink` (display only)

**Motion**
- [ ] Generic `fade-in-up` on every scroll-in
- [ ] Default Framer Motion `initial / animate` without custom `ease`
- [ ] Decorative perpetual animation (sparkles, idle pulses on static UI)
- [ ] Hover scale > 1.05
- [ ] Re-firing reveals on scroll-back

**Content / data**
- [ ] Generic names ("John Doe"), filler verbs ("Elevate", "Seamless", "Unleash")
- [ ] Round numbers (`50%`, `99%`); use organic ("47.2%")
- [ ] Emoji icons — banned (skill rule)
- [ ] Unsplash links; placeholder.com — use `picsum.photos/seed/...`
- [ ] Fake testimonials with stock avatars

**A11y**
- [ ] Color as sole signal (always pair with a label or shape)
- [ ] Focus rings stripped without replacement
- [ ] `aria-label` missing on icon-only controls
- [ ] Custom cursor with no native-cursor fallback

---

## 8. Variance score checklist (fill per section in Phase 2)

```
Section: ____________________
Compared to: ________________  (previous section)

[ ] alignment       differs? prev: ______ this: ______
[ ] density         differs? prev: ______ this: ______
[ ] background      differs? prev: ______ this: ______
[ ] type-dominance  differs? prev: ______ this: ______
[ ] primary-motion  differs? prev: ______ this: ______
[ ] content-shape   differs? prev: ______ this: ______

Differing dims: ___/6   (target ≥ 3, ideal 4+)
```

Run the **full-page** variance after the 7th section: at least **24/36** differing dims across 6 adjacent pairs = **score ≥ 67**.

---

## 9. Section dial overrides (per-section calibrations)

| Section | VARIANCE | MOTION | DENSITY | Reason |
|---|---:|---:|---:|---|
| Hero | 9 | 7 | 2 | Statement + entrance set the ceiling |
| Capabilities | 7 | 5 | 4 | Information block; restrained motion |
| Selected Work | 9 | 6 | 3 | Asymmetric, alternating, image-led |
| Approach | 8 | 5 | 3 | Sticky numerals, paced reading |
| About / Studio | 6 | 4 | 4 | Quiet, prose-forward |
| Clients & Recognition | 8 | 6 | 5 | Marquee + counter — denser by design |
| Contact / Footer | 9 | 7 | 2 | Big close; high-contrast surface |

Homepage average target: VARIANCE 8, MOTION 6, DENSITY 3.

---

**Variance, motion, and density are competing forces.** When in doubt, cut. Restraint reads as confidence; clutter reads as compensation.
