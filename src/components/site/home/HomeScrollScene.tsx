"use client";

/*
  One rAF-throttled passive scroll listener drives both the fixed background
  logo and the sink-and-rise hero (ported from the sample's paint()).
  Only transform / opacity / filter are written, directly to refs (no React
  re-renders per frame).
*/
import { NavLink } from "@/components/site/NavLink";
import { useEffect, useRef } from "react";
import { KaguMark } from "@/components/KaguMark";
import { HeroTrails, type TrailsControl } from "./HeroTrails";
import "./home.css";

const GROUPS = [
  { title: "Apps", text: "Phone, tablet, computer." },
  { title: "Platforms", text: "Run your business." },
  { title: "Hosting", text: "Handled for you." },
  { title: "AI", text: "Smart helpers." },
] as const;

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function HomeScrollScene() {
  const heroRef = useRef<HTMLElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLSpanElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const trailsCtl = useRef<TrailsControl>({ k: 0, box: null });

  useEffect(() => {
    const hero = heroRef.current;
    const spot = spotRef.current;
    const bg = bgRef.current;
    if (!hero || !spot || !bg) return;
    const text = textRef.current;
    const cue = cueRef.current;
    const cards = Array.from(cardsRef.current?.children ?? []) as HTMLElement[];
    const outlines = Array.from(bg.querySelectorAll<SVGElement>(".ol"));
    const cloud = bg.querySelector<SVGElement>(".cloud");
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let queued = false;
    let raf = 0;

    // iOS toolbars change innerHeight while scrolling; only re-measure on a real resize.
    let stableW = window.innerWidth;
    let stableH = window.innerHeight;
    const paint = () => {
      queued = false;
      const reduce = mq.matches;
      const vw = window.innerWidth;
      if (vw !== stableW || Math.abs(window.innerHeight - stableH) > 160) {
        stableW = vw;
        stableH = window.innerHeight;
      }
      const vh = stableH;
      const r = hero.getBoundingClientRect();
      const span = r.height - vh;
      const p = reduce ? 1 : clamp(-r.top / (span || 1));
      const k = easeOut(clamp(p / 0.6));

      const s = spot.getBoundingClientRect();
      let w0 = s.width || Math.min(520, vw * 0.72);
      let x0 = s.left;
      let y0 = s.top;
      const w1 = Math.min(1000, vw * 0.96);
      const h1 = (w1 * 486) / 1079;
      const x1 = (vw - w1) / 2;
      const y1 = (vh - h1) / 2;
      if (p >= 1 || reduce) {
        x0 = x1;
        y0 = y1;
        w0 = w1;
      }
      bg.style.width = `${lerp(w0, w1, k)}px`;
      bg.style.transform = `translate3d(${lerp(x0, x1, k)}px,${lerp(y0, y1, k)}px,0)`;
      // Stays an outline: lines thicken as it grows and blurs, so the shape still reads.
      bg.style.filter = k > 0.001 ? `blur(${k * 9}px)` : "none";
      bg.style.setProperty("--bg-stroke", `${1.6 + k * 22}px`);
      // On phones the big blurred logo clears away once the hero has scrolled past,
      // so the work list and closing read on clean paper.
      const gone = vw < 760 && !reduce ? clamp((vh - r.bottom) / (vh * 0.6)) : 0;
      const o = String((1 - k * 0.8) * (1 - gone));
      outlines.forEach((el) => (el.style.opacity = o));
      if (cloud) cloud.style.opacity = "0";
      bg.style.visibility = "visible";

      // keep-out box for the trails: logo spot + headline block, padded
      const tb = text?.getBoundingClientRect() ?? s;
      const bx = Math.min(s.left, tb.left) - 32;
      const by = Math.min(s.top, tb.top) - 32;
      trailsCtl.current.k = k;
      trailsCtl.current.box = {
        x: bx,
        y: by,
        w: Math.max(s.right, tb.right) + 32 - bx,
        h: Math.max(s.bottom, tb.bottom) + 32 - by,
      };

      if (reduce) {
        if (text) {
          text.style.opacity = "";
          text.style.transform = "";
        }
        cards.forEach((c) => {
          c.style.transform = "";
          c.style.opacity = "";
          c.style.filter = "";
        });
        return;
      }
      const t = clamp(p / 0.3);
      if (text) {
        text.style.opacity = String(1 - t);
        text.style.transform = `translate3d(0,${-t * 40}px,0)`;
      }
      if (cue) cue.style.opacity = String(clamp(1 - p * 10) * 0.6);
      // Four big words drift up over the blurred logo, one after another, coming into focus.
      cards.forEach((c, i) => {
        const e = easeOut(clamp((p - 0.14 - i * 0.09) / 0.36));
        c.style.transform = `translate3d(0,${(1 - e) * vh * 0.55}px,0)`;
        c.style.opacity = String(e);
        c.style.filter = e < 0.999 ? `blur(${(1 - e) * 14}px)` : "none";
        // invisible rows must not swallow taps meant for the hero buttons
        c.style.pointerEvents = e > 0.6 ? "auto" : "none";
      });
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        raf = requestAnimationFrame(paint);
      }
    };

    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    mq.addEventListener("change", onScroll);
    document.fonts?.ready.then(onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mq.removeEventListener("change", onScroll);
    };
  }, []);

  return (
    <>
      <HeroTrails control={trailsCtl} />
      <div className="bglogo" ref={bgRef} aria-hidden="true">
        <div className="bgin">
          <KaguMark variant="outline" piece="ribbon" className="ol L1" />
          <KaguMark variant="outline" piece="fold" className="ol L2" />
          <KaguMark variant="outline" piece="wing" className="ol L3" />
          <KaguMark className="cloud" />
        </div>
      </div>

      <section className="hero" ref={heroRef} aria-label="Kagu">
        <div className="hero__stick">
          <div className="hero__stage">
            <div className="hero__spot" ref={spotRef} />
            <div className="hero__text" ref={textRef}>
              <h1>
                Software, done <span className="pop">right</span>.
              </h1>
              <p className="hero__sub">Websites, apps and AI.</p>
              <div className="hero__acts">
                <NavLink className="site-btn" href="/contact">
                  Let&rsquo;s talk
                </NavLink>
                <NavLink className="site-btn site-btn--ghost" href="/work">
                  Our work
                </NavLink>
              </div>
            </div>
            <span className="hero__cue" ref={cueRef} aria-hidden="true" />
          </div>
          <div className="hero__rise">
            <div className="offer" ref={cardsRef}>
              {GROUPS.map((g) => (
                <NavLink key={g.title} className="offer__row" href="/work">
                  <span className="offer__word">{g.title}</span>
                  <span className="offer__line">{g.text}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
