"use client";

/*
  Slide-over drawer for a single lead. Detail fields, external links, the
  worker's screenshot, an optimistic pipeline-status dropdown, debounced
  notes autosave, and a lazy Messages panel.
*/

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { PipelineStatus, Tables } from "@/lib/supabase/database.types";
import { updateLeadNotes, updateLeadPipelineStatus } from "../../_actions/leads";
import { adminToast } from "../../_components/toast";
import { CustomSelect } from "../../_components/ui";
import {
  AUDIT_FLAG_LABELS,
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
} from "../_lib/constants";
import { LeadMessagesPanel } from "./LeadMessagesPanel";
import { LeadSeoAction } from "./LeadSeoAction";

type Lead = Tables<"leads">;

const STATUS_OPTIONS = PIPELINE_STATUSES.map((s) => ({
  value: s,
  label: PIPELINE_STATUS_LABELS[s],
}));

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="ld-link ld-link--accent"
    >
      {children}
    </a>
  );
}

/* Optimistic dropdown. The parent keys this by lead id + server status, so a
   server refresh with a new value simply remounts it — no sync effect. */
function StatusDropdown({ lead }: { lead: Lead }) {
  const [value, setValue] = useState<PipelineStatus>(lead.pipeline_status);
  const [, startTransition] = useTransition();

  const change = (next: PipelineStatus) => {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updateLeadPipelineStatus(lead.id, next);
      if (!result.ok) {
        setValue(previous);
        adminToast("error", result.error);
      }
    });
  };

  return (
    <div className="w-44">
      <CustomSelect
        value={value}
        onChange={(v) => change(v as PipelineStatus)}
        options={STATUS_OPTIONS}
        aria-label="Pipeline status"
      />
    </div>
  );
}

function NotesField({ lead }: { lead: Lead }) {
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = (text: string) => {
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const result = await updateLeadNotes(lead.id, text);
      if (result.ok) setSaved(true);
      else adminToast("error", result.error);
    }, 800);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <span className="eyebrow">Notes</span>
        <span className="ld-small">{saved ? "Saved" : "Saving…"}</span>
      </div>
      <div className="kagu-field">
        <textarea
          key={lead.id}
          rows={4}
          defaultValue={lead.notes ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Internal notes…"
          aria-label="Notes"
          className="w-full resize-y"
        />
      </div>
    </div>
  );
}

export function LeadDrawer({
  lead,
  onClose,
}: {
  lead: Lead | null;
  onClose: () => void;
}) {
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    if (!lead) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lead, onClose]);

  return (
    <AnimatePresence>
      {lead && (
        <motion.div
          className="ld-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={`Lead: ${lead.name}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.aside
            className="ld-drawer__panel"
            onClick={(e) => e.stopPropagation()}
            initial={reduced ? { opacity: 0 } : { x: 64, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { x: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { x: 64, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Keyed by lead: tab and dropdown state reset per lead without sync effects. */}
            <DrawerBody key={lead.id} lead={lead} onClose={onClose} />
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DrawerBody({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [tab, setTab] = useState<"details" | "messages">("details");
  const mapsHref = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(lead.place_id)}`;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="ld-drawer__title">{lead.name}</h2>
          <p className="ld-small ld-num mt-2">
            {[lead.category, lead.district].filter(Boolean).join(" · ")} · score{" "}
            <span className="text-ink">{lead.lead_score}</span>
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="ld-close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="ld-subtabs" role="tablist">
        {(["details", "messages"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="ld-subtab"
          >
            {t === "details" ? "Details" : "Messages"}
          </button>
        ))}
      </div>

      {tab === "details" ? (
        <div className="mt-6 flex flex-col gap-7">
          <div className="flex items-center justify-between gap-4">
            <span className="eyebrow">Pipeline</span>
            <StatusDropdown key={lead.pipeline_status} lead={lead} />
          </div>

          {lead.screenshot_url && (
            // Plain <img>: the screenshots bucket is public and these
            // are internal one-off captures — no next/image pipeline.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lead.screenshot_url}
              alt={`Website screenshot of ${lead.name}`}
              className="ld-shot"
            />
          )}

          <dl className="ld-dl">
            <DetailRow label="Website">
              {lead.website_url ? (
                <ExternalLink href={lead.website_url}>
                  {lead.website_url.replace(/^https?:\/\//, "")}
                </ExternalLink>
              ) : (
                <span className="ld-t-bad">None — hottest signal</span>
              )}
            </DetailRow>
            <DetailRow label="Instagram">
              {lead.instagram_handle ? (
                <ExternalLink href={`https://instagram.com/${lead.instagram_handle}`}>
                  @{lead.instagram_handle}
                  {lead.instagram_followers != null
                    ? ` (${lead.instagram_followers.toLocaleString("en-US")})`
                    : ""}
                </ExternalLink>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Phone">{lead.phone ?? "—"}</DetailRow>
            <DetailRow label="Address">{lead.address ?? "—"}</DetailRow>
            <DetailRow label="Rating">
              {lead.rating != null
                ? `${lead.rating} · ${lead.review_count ?? 0} reviews`
                : "—"}
            </DetailRow>
            <DetailRow label="Maps">
              <ExternalLink href={mapsHref}>Open listing</ExternalLink>
            </DetailRow>
            {lead.contacted_at && (
              <DetailRow label="Contacted">
                {new Date(lead.contacted_at).toLocaleString("en-GB")}
              </DetailRow>
            )}
          </dl>

          <LeadSeoAction lead={lead} />

          {lead.audit_flags.length > 0 && (
            <div>
              <span className="eyebrow mb-2 block">Audit flags</span>
              <div className="ld-chips">
                {lead.audit_flags.map((flag) => (
                  <span key={flag} className="ld-tag">
                    {AUDIT_FLAG_LABELS[flag]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {lead.review_themes.length > 0 && (
            <div>
              <span className="eyebrow mb-2 block">Review themes</span>
              <div className="ld-chips">
                {lead.review_themes.map((theme) => (
                  <span key={theme} className="ld-tag ld-tag--quiet">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          <NotesField lead={lead} />
        </div>
      ) : (
        <LeadMessagesPanel leadId={lead.id} />
      )}
    </>
  );
}
