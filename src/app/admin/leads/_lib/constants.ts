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

/* Badge classes per job status (dark theme: paper bg, ink text). */
export const JOB_STATUS_CLASSES: Record<JobStatus, string> = {
  pending: "border-neutral text-slate-ink",
  running: "border-mint-deep text-mint-deep",
  done: "border-[#3fb27f] text-[#3fb27f]",
  failed: "border-[#e5594e] text-[#e5594e]",
  cancel_requested: "border-[#d9a13b] text-[#d9a13b]",
  cancelled: "border-neutral text-slate-ink",
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
  new: "border-neutral text-slate-ink",
  queued: "border-mint-deep text-mint-deep",
  contacted: "border-[#d9a13b] text-[#d9a13b]",
  replied: "border-[#3fb27f] text-[#3fb27f]",
  meeting: "border-[#3fb27f] text-[#3fb27f]",
  won: "border-[#3fb27f] bg-[#3fb27f]/10 text-[#3fb27f]",
  lost: "border-[#e5594e] text-[#e5594e]",
  do_not_contact: "border-[#e5594e] text-[#e5594e]",
};

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  rejected: "Rejected",
  sent: "Sent",
};

export const MESSAGE_STATUS_CLASSES: Record<MessageStatus, string> = {
  draft: "border-neutral text-slate-ink",
  approved: "border-[#3fb27f] text-[#3fb27f]",
  rejected: "border-[#e5594e] text-[#e5594e]",
  sent: "border-mint-deep text-mint-deep",
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
  informational: "border-neutral text-slate-ink",
  commercial: "border-mint-deep text-mint-deep",
  transactional: "border-[#3fb27f] text-[#3fb27f]",
  navigational: "border-[#d9a13b] text-[#d9a13b]",
};

/* Finding-severity badge styling for the embedded audit report. */
export const SEO_AUDIT_SEVERITY_CLASSES: Record<string, string> = {
  error: "border-[#e5594e] text-[#e5594e]",
  warn: "border-[#d9a13b] text-[#d9a13b]",
  info: "border-neutral text-slate-ink",
};

/* Score → tone, shared by the jobs table and the report page. */
export function seoAuditScoreClass(score: number): string {
  if (score >= 90) return "text-[#3fb27f]";
  if (score >= 70) return "text-[#d9a13b]";
  return "text-[#e5594e]";
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
  easy: "border-[#3fb27f] text-[#3fb27f]",
  medium: "border-[#d9a13b] text-[#d9a13b]",
  hard: "border-[#e5594e] text-[#e5594e]",
};
