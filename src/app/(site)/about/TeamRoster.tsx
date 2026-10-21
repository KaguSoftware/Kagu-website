"use client";

/*
  Team grid + member sheet. Tapping a member opens a custom dialog (bottom
  sheet on phones). The open member is mirrored to the URL as `?member=<slug>`
  so every person has a shareable deep link (QR cards); loading such a URL
  opens that member. Each card keeps id="member-<slug>".
*/

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TeamMember } from "@/lib/content";
import "@/components/site/about/about.css";

export type RosterMember = TeamMember & { slug: string };

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Photo({ member, sizes }: { member: TeamMember; sizes: string }) {
  return member.image ? (
    <Image src={member.image} alt={member.name} fill sizes={sizes} />
  ) : (
    <span className="member__init" aria-hidden>
      {initials(member.name)}
    </span>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function Sheet({
  member,
  onClose,
}: {
  member: RosterMember;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // html has scrollbar-gutter: stable
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const items = panel.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="sheet" onKeyDown={onKeyDown}>
      <div className="sheet__scrim" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        className="sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-name"
      >
        <button
          type="button"
          className="sheet__close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
        <div className="sheet__photo">
          <Photo member={member} sizes="(max-width: 760px) 80vw, 300px" />
        </div>
        <div>
          <h2 id="sheet-name" className="sheet__name">
            {member.name}
          </h2>
          <p className="sheet__role">{member.role}</p>
          {member.bio ? <p className="sheet__bio">{member.bio}</p> : null}
        </div>
      </div>
    </div>
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
  const lastTrigger = useRef<string | null>(initialOpen);

  // Deep link: bring the card into view behind the sheet.
  useEffect(() => {
    if (!initialOpen) return;
    document
      .getElementById(`member-${initialOpen}`)
      ?.scrollIntoView({ block: "center" });
  }, [initialOpen]);

  const setMember = useCallback((next: string | null) => {
    setOpen(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("member", next);
    else url.searchParams.delete("member");
    window.history.replaceState(null, "", url);
  }, []);

  const close = useCallback(() => {
    setMember(null);
    const slug = lastTrigger.current;
    if (slug) {
      requestAnimationFrame(() =>
        document.getElementById(`member-${slug}`)?.focus({ preventScroll: true }),
      );
    }
  }, [setMember]);

  const active = members.find((m) => m.slug === open) ?? null;

  return (
    <>
      <ul className="about-grid">
        {members.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              id={`member-${m.slug}`}
              className="member"
              aria-haspopup="dialog"
              onClick={() => {
                lastTrigger.current = m.slug;
                setMember(m.slug);
              }}
            >
              <span className="member__frame">
                <Photo
                  member={m}
                  sizes="(max-width: 760px) 50vw, 280px"
                />
              </span>
              <span className="member__name">{m.name}</span>
              <span className="member__role">{m.role}</span>
            </button>
          </li>
        ))}
      </ul>
      {active ? <Sheet member={active} onClose={close} /> : null}
    </>
  );
}
