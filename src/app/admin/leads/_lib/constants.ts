import type {
  AuditFlag,
  JobStatus,
  MessageStatus,
  PipelineStatus,
} from "@/lib/supabase/database.types";

/* All 39 Istanbul districts, used for the scrape-request form and list filter. */
export const ISTANBUL_DISTRICTS = [
  "Adalar",
  "Arnavutköy",
  "Ataşehir",
  "Avcılar",
  "Bağcılar",
  "Bahçelievler",
  "Bakırköy",
  "Başakşehir",
  "Bayrampaşa",
  "Beşiktaş",
  "Beykoz",
  "Beylikdüzü",
  "Beyoğlu",
  "Büyükçekmece",
  "Çatalca",
  "Çekmeköy",
  "Esenler",
  "Esenyurt",
  "Eyüpsultan",
  "Fatih",
  "Gaziosmanpaşa",
  "Güngören",
  "Kadıköy",
  "Kağıthane",
  "Kartal",
  "Küçükçekmece",
  "Maltepe",
  "Pendik",
  "Sancaktepe",
  "Sarıyer",
  "Silivri",
  "Sultanbeyli",
  "Sultangazi",
  "Şile",
  "Şişli",
  "Tuzla",
  "Ümraniye",
  "Üsküdar",
  "Zeytinburnu",
] as const;

/* Seed suggestions for the category <datalist> — free text is allowed. */
export const CATEGORY_SUGGESTIONS = [
  "dentist",
  "dental clinic",
  "hair salon",
  "barber",
  "beauty salon",
  "restaurant",
  "cafe",
  "patisserie",
  "gym",
  "pilates studio",
  "physiotherapy clinic",
  "veterinary clinic",
  "law firm",
  "accounting firm",
  "real estate agency",
  "car repair shop",
  "furniture store",
  "jewelry store",
  "wedding venue",
  "language school",
] as const;

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: "Pending",
  running: "Running",
  done: "Done",
  failed: "Failed",
  cancel_requested: "Cancelling…",
  cancelled: "Cancelled",
};

/* Pill tone modifiers (used with the base `ld-pill` class, see leads.css). */
export const JOB_STATUS_CLASSES: Record<JobStatus, string> = {
  pending: "ld-pill--neutral",
  running: "ld-pill--info",
  done: "ld-pill--ok",
  failed: "ld-pill--bad",
  cancel_requested: "ld-pill--warn",
  cancelled: "ld-pill--neutral",
};

export const PIPELINE_STATUS_LABELS: Record<PipelineStatus, string> = {
  new: "New",
  queued: "Queued",
  contacted: "Contacted",
  replied: "Replied",
  meeting: "Meeting",
  won: "Won",
  lost: "Lost",
  do_not_contact: "Do not contact",
};

export const PIPELINE_STATUS_CLASSES: Record<PipelineStatus, string> = {
  new: "ld-pill--neutral",
  queued: "ld-pill--info",
  contacted: "ld-pill--warn",
  replied: "ld-pill--ok",
  meeting: "ld-pill--ok",
  won: "ld-pill--ok",
  lost: "ld-pill--bad",
  do_not_contact: "ld-pill--bad",
};

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  rejected: "Rejected",
  sent: "Sent",
};

export const MESSAGE_STATUS_CLASSES: Record<MessageStatus, string> = {
  draft: "ld-pill--neutral",
  approved: "ld-pill--ok",
  rejected: "ld-pill--bad",
  sent: "ld-pill--info",
};

export const AUDIT_FLAG_LABELS: Record<AuditFlag, string> = {
  no_website: "No website",
  facebook_only: "Facebook only",
  linktree_only: "Linktree only",
  no_ssl: "No SSL",
  not_mobile_friendly: "Not mobile-friendly",
  slow_site: "Slow site",
  active_ig_no_website: "Active IG, no website",
};

export const AUDIT_FLAGS = Object.keys(AUDIT_FLAG_LABELS) as AuditFlag[];

export const PIPELINE_STATUSES = Object.keys(
  PIPELINE_STATUS_LABELS
) as PipelineStatus[];

export const LEADS_PAGE_SIZE = 50;

/* ------------------------------------------------------------------------ */
/* SEO                                                                       */
/* ------------------------------------------------------------------------ */

/* Search-intent badge styling (Groq labels keywords with these). Unknown /
   free-text intents fall back to the neutral style. */
export const SEO_INTENT_CLASSES: Record<string, string> = {
  informational: "ld-pill--neutral",
  commercial: "ld-pill--info",
  transactional: "ld-pill--ok",
  navigational: "ld-pill--warn",
};

/* Finding-severity badge styling for the embedded audit report. */
export const SEO_AUDIT_SEVERITY_CLASSES: Record<string, string> = {
  error: "ld-pill--bad",
  warn: "ld-pill--warn",
  info: "ld-pill--neutral",
};

/* Score → tone, shared by the jobs table and the report page. */
export function seoAuditScoreClass(score: number): string {
  if (score >= 90) return "ld-t-ok";
  if (score >= 70) return "ld-t-warn";
  return "ld-t-bad";
}

/* Same thresholds as a tone name (ProgressBar / ld-meter fill). */
export function seoAuditScoreTone(score: number): "ok" | "warn" | "bad" {
  if (score >= 90) return "ok";
  if (score >= 70) return "warn";
  return "bad";
}

/* ------------------------------------------------------------------------ */
/* SEO strategy                                                              */
/* ------------------------------------------------------------------------ */

/* Live SERP checks per run — each is a SERP fetch + autocomplete probes. */
export const SEO_STRATEGY_SERP_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 4, label: "4 searches (quick)" },
  { value: 6, label: "6 searches" },
  { value: 10, label: "10 searches (standard)" },
  { value: 16, label: "16 searches (deep)" },
];

/* Embedded audit depth (each page = full throttled mobile render, ≈20s). */
export const SEO_STRATEGY_AUDIT_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: "Skip the audit" },
  { value: 3, label: "3 pages (quick)" },
  { value: 6, label: "6 pages (standard)" },
  { value: 12, label: "12 pages (deep)" },
];

/* Winnability badge styling (graded against the current SERP, assuming a
   low-authority domain). */
export const SEO_STRATEGY_WINNABILITY_CLASSES: Record<string, string> = {
  easy: "ld-pill--ok",
  medium: "ld-pill--warn",
  hard: "ld-pill--bad",
};
