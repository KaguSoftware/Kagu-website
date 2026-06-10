/*
  Worker-local types. The union types are DUPLICATED from
  ../../src/lib/supabase/database.types.ts on purpose: the worker is
  self-contained (own tsconfig, own deps, deployable as a bare folder), so it
  doesn't import from the Next app. If you change the schema, update BOTH
  files and supabase/leads_module.sql.
*/

export type JobStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "cancel_requested"
  | "cancelled";

export type PipelineStatus =
  | "new"
  | "queued"
  | "contacted"
  | "replied"
  | "meeting"
  | "won"
  | "lost"
  | "do_not_contact";

export type MessageStatus = "draft" | "approved" | "rejected" | "sent";
export type MessageChannel = "email" | "whatsapp";
export type MessageLanguage = "tr" | "ar" | "en";

export type AuditFlag =
  | "no_website"
  | "facebook_only"
  | "linktree_only"
  | "no_ssl"
  | "not_mobile_friendly"
  | "slow_site"
  | "active_ig_no_website";

export interface ScrapeJobRow {
  id: string;
  category: string;
  district: string;
  status: JobStatus;
  progress: number;
  leads_found: number;
  error: string | null;
  requested_by: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

/* What crawlMaps extracts straight off the Google Maps results feed. */
export interface RawLead {
  place_id: string;
  name: string;
  category: string | null;
  district: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website_url: string | null;
  rating: number | null;
  review_count: number | null;
}

/* What enrichLead adds by auditing the lead's web presence. */
export interface Enrichment {
  audit_flags: AuditFlag[];
  review_themes: string[];
  instagram_handle: string | null;
  instagram_followers: number | null;
  screenshot_url: string | null;
}

export interface DraftMessage {
  channel: MessageChannel;
  language: MessageLanguage;
  subject: string | null;
  body: string;
  variant_label: string;
}
