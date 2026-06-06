"use client";

/*
  Team roster — interactive layer for /team.

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
      className={`kagu-profile${open ? " is-open" : ""}`}
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
          <h3
            className="display"
            style={{
              fontSize: "var(--type-2xl)",
              lineHeight: 1.05,
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            {member.name}
          </h3>
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

export function TeamRoster({
  members,
  initialOpen,
}: {
  members: RosterMember[];
  initialOpen: string | null;
}) {
  const [open, setOpen] = useState<string | null>(initialOpen);
  const scrolledTo = useRef<string | null>(null);

  // Deep link (?member=slug): bring the opened card into view on first paint.
  useEffect(() => {
    if (!open || scrolledTo.current === open) return;
    scrolledTo.current = open;
    const el = document.getElementById(`member-${open}`);
    if (!el) return;
    requestAnimationFrame(() =>
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" })
    );
  }, [open]);

  const toggle = (slug: string) => {
    setOpen((cur) => {
      const next = cur === slug ? null : slug;
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("member", next);
      else url.searchParams.delete("member");
      // Shallow URL update — shareable link without a reload/refetch.
      window.history.replaceState(null, "", url);
      return next;
    });
  };

  return (
    <>
      <div
        className={`kagu-roster${open ? " is-selecting" : ""}`}
        style={{ marginTop: "var(--space-12)" }}
      >
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            open={open === member.slug}
            onToggle={toggle}
          />
        ))}
      </div>
      <style>{`
        .kagu-roster {
          /* widths the cards and their hover-bio share */
          --kagu-card-w: clamp(150px, 17vw, 200px);
          --kagu-bio-w: clamp(240px, 26vw, 360px);
          /* one shared timing so open and close move in lockstep (no jump) */
          --kagu-bio-ease: 520ms cubic-bezier(0.6, 0.01, 0.05, 0.95);
          display: flex;
          flex-wrap: nowrap;
          justify-content: center;
          align-items: flex-start;
          gap: var(--space-10);
        }
        .kagu-profile { flex: 0 0 auto; }
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
        /* Phone: no hover — stack each card over its bio, bio always shown. */
        @media (max-width: 767px) {
          .kagu-roster {
            flex-direction: column;
            align-items: stretch;
            gap: var(--space-12);
          }
          .kagu-profile-row {
            flex-direction: column;
            align-items: flex-start;
            opacity: 1 !important;
            filter: none !important;
          }
          .kagu-profile-card { width: 100%; }
          .kagu-profile-bio { width: auto !important; overflow: visible; }
          .kagu-profile-bio-inner {
            width: auto;
            padding-left: 0;
            padding-top: var(--space-5);
            opacity: 1 !important;
            transform: none !important;
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
