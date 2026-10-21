"use client";

/*
  Group header on /work. The title and a "What's inside" link open a detail
  dialog (a centred card on desktop, a bottom sheet on phones). Native
  <dialog> gives focus trapping and Escape; everything visible is custom.
*/
import { NavLink } from "@/components/site/NavLink";
import { useRef } from "react";
import type { ProductGroup } from "@/lib/productGroups";
import { GroupIcon } from "./GroupIcon";

export function GroupHead({ group: g }: { group: ProductGroup }) {
  const ref = useRef<HTMLDialogElement>(null);

  const open = () => {
    ref.current?.showModal();
    document.documentElement.style.overflow = "hidden";
  };
  const close = () => ref.current?.close();

  return (
    <div className="work-ghead">
      <GroupIcon piece={g.piece} className="work-ic" />
      <h2 id={`g-${g.id}`}>
        <button type="button" className="work-title" onClick={open} aria-haspopup="dialog">
          {g.title}
        </button>
      </h2>
      <p>{g.line}</p>
      <ul className="work-tags">
        {g.tags.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <button type="button" className="work-more" onClick={open} aria-haspopup="dialog">
        What&rsquo;s inside <span aria-hidden="true">&rarr;</span>
      </button>

      <dialog
        ref={ref}
        className="gd"
        aria-labelledby={`gd-${g.id}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onClose={() => {
          document.documentElement.style.overflow = "";
        }}
      >
        <div className="gd__card">
          <button type="button" className="gd__x" onClick={close} aria-label="Close">
            <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <GroupIcon piece={g.piece} className="gd__ic" />
          <h3 id={`gd-${g.id}`} className="gd__title">
            {g.title}
          </h3>
          <p className="gd__intro">{g.more.intro}</p>
          <ul className="gd__list">
            {g.more.items.map((it) => (
              <li key={it.title}>
                <span className="gd__name">{it.title}</span>
                <span className="gd__text">{it.text}</span>
              </li>
            ))}
          </ul>
          <p className="gd__note">{g.more.note}</p>
          <NavLink href="/contact" className="site-btn gd__cta">
            Let&rsquo;s talk
          </NavLink>
        </div>
      </dialog>
    </div>
  );
}
