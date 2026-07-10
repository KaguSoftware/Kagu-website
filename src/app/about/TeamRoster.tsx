"use client";

/*
  Team roster — interactive layer for the /about page's team section.

  Each profile is a vertical column (avatar + meta). The bio lives in a
  zero-width panel to the right that expands on hover (preview) OR when the card
  is "pinned" open via click/keyboard. Because the panel is in normal flex flow,
  growing it reflows the roster and pushes siblings aside (no overlap, no JS for
  the motion — pure CSS width transition).

  Pinned state is mirrored to the URL as `?member=<slug>` so every member has a
  shareable deep link (e.g. for a per-person QR card). Loading such a URL opens
  the matching card and scrolls it into view.
*/

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SectionRise } from "@/components/motion/SectionRise";
import type { TeamMember } from "@/lib/content";

export type RosterMember = TeamMember & { slug: string };

const SEGMENT_LABEL: Record<TeamMember["segment"], string> = {
  cofounder: "Cofounder",
  senior_associate: "Senior Associate",
  associate: "Associate",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Round headshot — image when provided, an elegant initials disc otherwise. */
function Avatar({ member, size }: { member: TeamMember; size: string }) {
  return (
    <div
      className="kagu-profile-avatar"
      style={{
        width: size,
        height: size,
        // em-based initials scale with the disc size
        fontSize: size,
        flex: "0 0 auto",
        position: "relative",
        borderRadius: "9999px",
        overflow: "hidden",
        background: "var(--mint-pale)",
        border: "1px solid var(--neutral)",
      }}
    >
      {member.image ? (
        <Image
          src={member.image}
          alt={member.name}
          fill
          sizes="(max-width: 768px) 160px, 200px"
          style={{ objectFit: "cover" }}
        />
      ) : (
        <span
          aria-hidden
          className="display"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.36em",
            color: "var(--slate-ink)",
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          {initials(member.name)}
        </span>
      )}
    </div>
  );
}

function MemberCard({
  member,
  open,
  onToggle,
}: {
  member: RosterMember;
  open: boolean;
  onToggle: (slug: string) => void;
}) {
  const clickable = !!member.bio;
  return (
    <SectionRise
      as="article"
      amount={0.3}
      className={`kagu-profile kagu-profile--${member.segment}${open ? " is-open" : ""}`}
    >
      <div
        id={`member-${member.slug}`}
        className="kagu-profile-row"
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-expanded={clickable ? open : undefined}
        aria-label={
          clickable
            ? `${member.name}, ${SEGMENT_LABEL[member.segment]} — ${
                open ? "hide" : "show"
              } bio`
            : undefined
        }
        data-cursor={clickable ? "view" : undefined}
        onClick={clickable ? () => onToggle(member.slug) : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(member.slug);
                }
              }
            : undefined
        }
        style={{ cursor: clickable ? "pointer" : "default" }}
      >
        <div className="kagu-profile-card flex flex-col items-center text-center">
          <Avatar member={member} size="var(--kagu-card-w)" />
          <div
            className="flex flex-col items-center"
            style={{
              gap: "var(--space-3)",
              marginTop: "var(--space-6)",
              marginBottom: "var(--space-3)",
            }}
          >
            <span
              className="font-mono"
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: "var(--type-xs)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: "var(--mint-deep)",
                border: "1px solid var(--mint-deep)",
                borderRadius: "9999px",
                padding: "3px 10px",
                lineHeight: 1,
              }}
            >
              {SEGMENT_LABEL[member.segment]}
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: "var(--type-xs)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: "var(--mint-deep)",
              }}
            >
              {member.role}
            </span>
          </div>
          {/* h2, not h3 — member names sit directly under the page h1, and a
              skipped heading level fails the document-outline audit. */}
          <h2
            className="display"
            style={{
              fontSize: "var(--type-2xl)",
              lineHeight: 1.05,
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            {member.name}
          </h2>
        </div>
        {member.bio ? (
          <div className="kagu-profile-bio">
            <div className="kagu-profile-bio-inner">
              <p
                style={{
                  fontSize: "var(--type-md)",
                  lineHeight: 1.7,
                  color: "var(--ink)",
                  textAlign: "left",
                }}
              >
                {member.bio}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </SectionRise>
  );
}

/* Absolute layout top of an element (sum of offsetTop up the chain). Ignores
   CSS transforms, so the entrance animation can't skew the measurement. */
function layoutTop(el: HTMLElement) {
  let top = 0;
  for (
    let node: HTMLElement | null = el;
    node;
    node = node.offsetParent as HTMLElement | null
  ) {
    top += node.offsetTop;
  }
  return top;
}

/* Scroll the selected card so its whole avatar clears the sticky header and
   sits just beneath it — but never so far that the footer takes over the view.
   (Forcing a low member to the very top exceeds the page's max scroll, so the
   browser would otherwise clamp to the bottom: the "refresh jumps to footer".) */
function scrollMemberToTop(slug: string) {
  const el = document.getElementById(`member-${slug}`);
  if (!el) return;
  const header = document.querySelector("header.sticky");
  const navH = header ? header.getBoundingClientRect().height : 64;
  // 16px breathing room below the nav so the full circle shows.
  let target = layoutTop(el) - navH - 16;
  // Cap so the viewport bottom never passes the footer's top.
  const footer = document.querySelector<HTMLElement>("footer");
  if (footer) target = Math.min(target, layoutTop(footer) - window.innerHeight);
  window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
}

export function TeamRoster({
  members,
  initialOpen,
}: {
  members: RosterMember[];
  initialOpen: string | null;
}) {
  const [open, setOpen] = useState<string | null>(initialOpen);
  const scrollTimer = useRef<number | null>(null);

  // Bring the selected card's photo to the top of the viewport. Deferred one
  // tick so React commits first — the outgoing card closes instantly (see the
  // mobile CSS), so by the time we measure there's no pending shift to chase.
  const selectAndScroll = (slug: string) => {
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => scrollMemberToTop(slug), 0);
  };

  // Deep link (?member=slug): scroll to the opened card on first paint.
  useEffect(() => {
    if (initialOpen) selectAndScroll(initialOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpen]);

  const toggle = (slug: string) => {
    const next = open === slug ? null : slug;
    setOpen(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("member", next);
    else url.searchParams.delete("member");
    // Shallow URL update — shareable link without a reload/refetch.
    window.history.replaceState(null, "", url);
    if (next) selectAndScroll(next);
  };

  // Max 4 members per row — overflow starts a new centered row beneath.
  const rows: RosterMember[][] = [];
  for (let i = 0; i < members.length; i += 4) rows.push(members.slice(i, i + 4));

  return (
    <>
      <div
        className={`kagu-roster${open ? " is-selecting" : ""}`}
        style={{ marginTop: "var(--space-12)" }}
      >
        {rows.map((row) => (
          <div className="kagu-roster-row" key={row[0].id}>
            {row.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                open={open === member.slug}
                onToggle={toggle}
              />
            ))}
          </div>
        ))}
      </div>
      <style>{`
        .kagu-roster {
          /* widths the cards and their hover-bio share */
          --kagu-card-w: clamp(150px, 16vw, 196px);
          --kagu-bio-w: clamp(240px, 26vw, 360px);
          /* one shared timing so open and close move in lockstep (no jump) */
          --kagu-bio-ease: 520ms cubic-bezier(0.6, 0.01, 0.05, 0.95);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          /* tight row gap — the vertical scatter offsets supply the air */
          gap: clamp(var(--space-8), 5vw, var(--space-16));
        }
        /*
          Scattered composition: up to 4 members per row, rows drifting
          left / right alternately, each member dropped to a different
          baseline. The offsets are plain margins (not transforms), so the
          hover-bio still reflows siblings and deep-link scroll still
          measures true layout positions.
        */
        .kagu-roster-row {
          display: flex;
          flex-wrap: nowrap;
          align-items: flex-start;
          gap: clamp(var(--space-10), 7vw, var(--space-20));
        }
        @media (min-width: 768px) {
          .kagu-roster-row:nth-child(odd) {
            align-self: flex-start;
            margin-left: clamp(0px, 3vw, 56px);
          }
          .kagu-roster-row:nth-child(even) {
            align-self: flex-end;
            margin-right: clamp(0px, 5vw, 88px);
          }
          /* A lone member on the final row sits off-center, not dead-center. */
          .kagu-roster-row:has(> .kagu-profile:only-child) {
            align-self: center;
            margin-left: clamp(0px, 8vw, 120px);
          }
          /* Falling diagonal on odd rows… */
          .kagu-roster-row:nth-child(odd) .kagu-profile:nth-child(2) {
            margin-top: clamp(40px, 7vw, 104px);
          }
          .kagu-roster-row:nth-child(odd) .kagu-profile:nth-child(3) {
            margin-top: clamp(16px, 3vw, 48px);
          }
          .kagu-roster-row:nth-child(odd) .kagu-profile:nth-child(4) {
            margin-top: clamp(48px, 8vw, 120px);
          }
          /* …mirrored rising diagonal on even rows. */
          .kagu-roster-row:nth-child(even) .kagu-profile:nth-child(1) {
            margin-top: clamp(32px, 6vw, 88px);
          }
          .kagu-roster-row:nth-child(even) .kagu-profile:nth-child(3) {
            margin-top: clamp(48px, 8vw, 120px);
          }
          .kagu-roster-row:nth-child(even) .kagu-profile:nth-child(4) {
            margin-top: clamp(16px, 3vw, 48px);
          }
        }
        .kagu-profile { flex: 0 0 auto; }
        /* Scale signals seniority: cofounders read first. */
        .kagu-profile--cofounder {
          --kagu-card-w: clamp(176px, 19vw, 236px);
        }
        .kagu-profile--associate {
          --kagu-card-w: clamp(136px, 14vw, 176px);
        }
        .kagu-profile-row {
          display: flex;
          align-items: flex-start;
          outline: none;
          transition: opacity var(--kagu-bio-ease),
            filter var(--kagu-bio-ease);
        }
        .kagu-profile-row:focus-visible {
          outline: 2px solid var(--mint-deep);
          outline-offset: 6px;
          border-radius: 8px;
        }
        .kagu-profile-card {
          flex: 0 0 auto;
          width: var(--kagu-card-w);
        }
        /* Selected effect: once a card is pinned, the others recede so the
           chosen one is clearly the subject. */
        .kagu-roster.is-selecting .kagu-profile:not(.is-open) .kagu-profile-row {
          opacity: 0.38;
          filter: saturate(0.7);
        }
        /* The selected (deep-linked) member gets an accent ring + glow. */
        .kagu-profile-avatar {
          transition: box-shadow var(--kagu-bio-ease);
        }
        .kagu-profile.is-open .kagu-profile-avatar {
          box-shadow: 0 0 0 3px var(--mint-deep),
            0 0 28px -4px var(--mint-deep);
        }
        /* Bio panel: collapsed to zero width, expands rightward — pushing the
           rest of the roster aside. Hover previews ONLY while nothing is pinned;
           once a card is selected, hover can't open a second one. */
        .kagu-profile-bio {
          flex: 0 0 auto;
          width: 0;
          overflow: hidden;
          transition: width var(--kagu-bio-ease);
        }
        .kagu-roster:not(.is-selecting) .kagu-profile:hover .kagu-profile-bio,
        .kagu-profile.is-open .kagu-profile-bio {
          width: var(--kagu-bio-w);
        }
        .kagu-profile-bio-inner {
          width: var(--kagu-bio-w);
          padding-left: var(--space-8);
          opacity: 0;
          transform: translateX(-12px);
          transition: opacity var(--kagu-bio-ease),
            transform var(--kagu-bio-ease);
        }
        .kagu-roster:not(.is-selecting) .kagu-profile:hover .kagu-profile-bio-inner,
        .kagu-profile.is-open .kagu-profile-bio-inner {
          opacity: 1;
          transform: none;
        }
        /* Phone: no hover — stack each card over its bio. The bio reveals
           vertically and only for the selected (tapped) card. */
        @media (max-width: 767px) {
          .kagu-roster {
            align-items: stretch;
            gap: var(--space-12);
          }
          /* No scatter on phones — one calm column (the desktop drift and
             offsets are scoped to min-width: 768px above). */
          .kagu-roster-row {
            flex-direction: column;
            align-items: stretch;
            gap: var(--space-12);
          }
          .kagu-profile-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .kagu-profile-card { width: 100%; }
          /* Collapse vertically (grid-rows 0fr→1fr) instead of horizontally.
             The transition lives only on the open state, so OPENING animates
             while the outgoing card closes instantly — no over-time vertical
             shift, so scroll-to-top lands on the photo right away. */
          .kagu-profile-bio {
            width: auto !important;
            display: grid;
            grid-template-rows: 0fr;
            overflow: hidden;
          }
          .kagu-profile.is-open .kagu-profile-bio {
            grid-template-rows: 1fr;
            transition: grid-template-rows var(--kagu-bio-ease);
          }
          .kagu-profile-bio-inner {
            width: auto;
            min-height: 0;
            padding-left: 0;
            padding-top: var(--space-5);
            transform: none !important;
            opacity: 0;
          }
          .kagu-profile.is-open .kagu-profile-bio-inner {
            opacity: 1 !important;
            transition: opacity var(--kagu-bio-ease);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .kagu-profile-bio,
          .kagu-profile-bio-inner,
          .kagu-profile-avatar { transition: none; }
        }
      `}</style>
    </>
  );
}
