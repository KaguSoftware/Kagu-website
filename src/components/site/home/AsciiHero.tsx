"use client";

/*
  Home hero. The Kagu mark, ray-traced live into ASCII as a turning white slab
  (logoProgram), over a chaotic monochrome field. Black & white only.

  The section is tall with a sticky stage. One rAF-throttled scroll listener
  writes progress into the field (k: the mark shatters) and moves the DOM
  layers; a slow interval mirrors live values into the glass readout.
*/
import { useEffect, useRef } from "react";
import { NavLink } from "@/components/site/NavLink";
import { GlAsciiField } from "@/components/ascii/gl/GlAsciiField";
import { logoProgram } from "@/components/ascii/logoProgram";
import "./ascii-hero.css";

const GROUPS = [
  { title: "Apps", text: "Phone, tablet, computer." },
  { title: "Platforms", text: "Run your business." },
  { title: "Hosting", text: "Handled for you." },
  { title: "AI", text: "Smart helpers." },
] as const;

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const fontSize = (w: number) => (w < 760 ? 8 : w < 1500 ? 9 : 10);
const deg = (n: number) => `${n < 0 ? "−" : "+"}${String(Math.round(Math.abs(n))).padStart(2, "0")}°`;

export function AsciiHero() {
  const heroRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const yawRef = useRef<HTMLElement>(null);
  const sunRef = useRef<HTMLElement>(null);
  const control = useRef<Record<string, number>>({ k: 0 });

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const text = textRef.current;
    const card = cardRef.current;
    const rows = Array.from(rowsRef.current?.children ?? []) as HTMLElement[];
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let queued = false;
    let raf = 0;
    let stableH = window.innerHeight;
    let stableW = window.innerWidth;

    const paint = () => {
      queued = false;
      if (window.innerWidth !== stableW || Math.abs(window.innerHeight - stableH) > 160) {
        stableW = window.innerWidth;
        stableH = window.innerHeight;
      }
      const vh = stableH;
      const r = hero.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh || 1));
      // header sits over the animating hero: swap its backdrop blur (re-blurred
      // every frame) for a plain translucent fill while it does
      document.documentElement.classList.toggle("hero-under-header", r.bottom > 80);
      const reduce = mq.matches;
      control.current.k = reduce ? 0 : easeOut(clamp(p / 0.66));

      const t = clamp(p / 0.26);
      if (text) {
        text.style.opacity = String(1 - t);
        text.style.transform = reduce ? "" : `translate3d(0,${-t * 48}px,0)`;
        text.style.pointerEvents = t > 0.6 ? "none" : "";
      }
      if (card) card.style.opacity = String(1 - clamp(p / 0.18));
      rows.forEach((row, i) => {
        const e = reduce ? (p > 0.2 ? 1 : 0) : easeOut(clamp((p - 0.2 - i * 0.08) / 0.32));
        row.style.opacity = String(e);
        row.style.transform = reduce ? "" : `translate3d(0,${(1 - e) * vh * 0.45}px,0)`;
        row.style.filter = reduce || e > 0.999 ? "none" : `blur(${(1 - e) * 10}px)`;
        row.style.pointerEvents = e > 0.6 ? "auto" : "none";
      });
    };
    const onScroll = () => {
      if (!queued) {
        queued = true;
        raf = requestAnimationFrame(paint);
      }
    };
    const readout = window.setInterval(() => {
      const c = control.current;
      if (yawRef.current && c.yaw !== undefined) yawRef.current.textContent = deg(c.yaw);
      if (sunRef.current && c.sun !== undefined) sunRef.current.textContent = deg(c.sun);
    }, 150);

    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    mq.addEventListener("change", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(readout);
      document.documentElement.classList.remove("hero-under-header");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mq.removeEventListener("change", onScroll);
    };
  }, []);

  return (
    <section className="ahero" ref={heroRef} aria-label="Kagu">
      <div className="ahero__stage">
        <GlAsciiField
          kind="hero"
          fallback={logoProgram}
          control={control}
          interactive
          fontSize={fontSize}
          maxCells={26000}
          fps={45}
          fontWeight={400}
          lineHeight={1.15}
          className="ahero__field"
        />
        <div className="ahero__veil" aria-hidden="true" />

        <div className="ahero__text site-wrap" ref={textRef}>
          <p className="ahero__eyebrow">Kagu Software, Istanbul</p>
          <h1>Software, done right.</h1>
          <div className="ahero__foot">
            <p className="ahero__sub">Websites, apps and AI. Built properly, and looked after.</p>
            <div className="ahero__acts">
              <NavLink className="site-btn" href="/contact">
                Let&rsquo;s talk
              </NavLink>
              <NavLink className="site-btn site-btn--ghost" href="/work">
                Our work
              </NavLink>
            </div>
          </div>
        </div>

        <div className="ahero__card glass" ref={cardRef} aria-hidden="true">
          <span className="ahero__card-k">Fig. 01: The mark</span>
          <span>
            Ray-traced in characters, live. Turn <b ref={yawRef}>+00°</b> · Light <b ref={sunRef}>+00°</b>
          </span>
        </div>

        <div className="ahero__rise site-wrap">
          <div className="ahero__rows" ref={rowsRef}>
            {GROUPS.map((g, i) => (
              <NavLink key={g.title} className="ahero__row" href="/work">
                <span className="ahero__idx" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="ahero__word">{g.title}</span>
                <span className="ahero__line">{g.text}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
