/*
  Hand-written to match the schema in the Supabase SQL Editor seed block.
  Keep in sync with the SQL: if you alter a table, update the matching Row/Insert/Update here.
  (Or regenerate later via: npx supabase gen types typescript --project-id <ref>.)
*/

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CoverBg =
  | "mint-pale"
  | "mint-soft"
  | "mint-deep"
  | "slate-ink"
  | "paper";

export type DeviceKind = "desktop" | "mobile";

export type StackPlacement = "hero_marquee" | "stack_lineage";

export type AboutKind = "mission" | "paragraph" | "principle" | "metric";

export type TeamSegment = "cofounder" | "senior_associate" | "associate";

export type Clock = { city: string; tz: string; utc: string };

// Lead generation module (supabase/leads_module.sql)
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

export type InquiryStatus = "new" | "contacted" | "archived";

export type AuditFlag =
  | "no_website"
  | "facebook_only"
  | "linktree_only"
  | "no_ssl"
  | "not_mobile_friendly"
  | "slow_site"
  | "active_ig_no_website";

// SEO keyword research module (supabase/seo_module.sql)
export type SeoKeywordIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational";

/** One organic result the SEO worker learned from (seo_jobs.organic jsonb). */
export type SeoOrganicResult = {
  rank: number;
  title: string;
  url: string;
  domain: string;
};

// SEO site-audit module (supabase/seo_audit_module.sql). These mirror
// worker/src/audit.ts (AuditReport et al.) — the worker writes the whole
// report as one jsonb blob on seo_audit_jobs.report.
export type SeoAuditSeverity = "error" | "warn" | "info";

export type SeoAuditCategoryScore = {
  category: string;
  label: string;
  score: number | null; // null = no applicable checks (e.g. render failed)
};

export type SeoAuditMetrics = {
  ttfbMs: number | null;
  lcpMs: number | null;
  cls: number | null;
  loadMs: number | null;
  pageWeightBytes: number | null;
  requestCount: number | null;
};

export type SeoAuditPage = {
  url: string;
  finalUrl: string;
  httpStatus: number;
  renderOk: boolean;
  score: number;
  categories: SeoAuditCategoryScore[];
  metrics: SeoAuditMetrics;
  error?: string;
};

export type SeoAuditFinding = {
  category: string;
  label: string; // stable check name, e.g. "Legible font sizes"
  severity: SeoAuditSeverity;
  issue: string; // what is wrong, with the numbers found
  why: string; // why this matters for SEO
  fix: string; // the concrete code-level change
  specifics: string[]; // exact offending parts, [path]-prefixed in site mode
  pages: string[]; // page paths this issue was found on
};

export type SeoAuditReport = {
  url: string;
  siteHost: string;
  fetchedAt: string;
  maxPages: number;
  pages: SeoAuditPage[];
  score: number;
  categories: SeoAuditCategoryScore[];
  findings: SeoAuditFinding[];
  passed: string[];
};

// SEO strategy module (supabase/seo_strategy_module.sql). These mirror
// worker/src/strategy.ts (StrategyReport et al.) — the worker writes the
// whole report, master prompt included, as one jsonb blob on
// seo_strategy_jobs.report. The embedded audit reuses SeoAuditReport.
export type SeoStrategyIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational";

export type SeoStrategyUnderstanding = {
  brand: string;
  sector: string;
  subSector: string;
  coreValueProposition: string;
  languages: string[];
  audience: string;
  locations: string;
  offerings: string[];
  problemsSolved: string[];
  differentiators: string[];
  intentNotes: Record<SeoStrategyIntent, string>;
};

export type SeoStrategyEvidence = {
  query: string;
  intent: SeoStrategyIntent;
  language: string;
  siteRank: number | null; // null = not in the top results
  results: Array<{ rank: number; title: string; domain: string }>;
  winners: Array<{ rank: number; title: string; headings: string }>;
  suggestions: string[]; // real typed queries from autocomplete
  error?: string;
};

export type SeoStrategyGscRow = {
  query: string;
  topPage: string;
  clicks: number;
  impressions: number;
  position: number;
};

export type SeoStrategyHead = {
  keyword: string;
  intent: SeoStrategyIntent;
  winnability: "easy" | "medium" | "hard";
  rationale: string;
};

export type SeoStrategyFaq = { question: string; answerGuidance: string };

export type SeoStrategyPage = {
  action: "create" | "update";
  slug: string;
  title: string;
  metaDescription: string;
  pageType: string;
  intent: SeoStrategyIntent;
  language: string;
  headKeyword: string;
  tailQueries: string[];
  entities: string[];
  faq: SeoStrategyFaq[];
  outline: string[];
};

/* A business ranking for the commercial/transactional searches — crawled
   and profiled by the worker. Absent on reports from before the feature. */
export type SeoStrategyCompetitor = {
  domain: string;
  bestRank: number;
  appearsFor: string[];
  pagesRead: number;
  summary: string;
  keywordsTargeted: string[];
  angles: string[];
  gaps: string[];
};

/* The market read across every crawled competitor — money SERPs plus
   dedicated provider-finding scans. Absent on reports from before the
   feature. */
export type SeoStrategyMarket = {
  scanQueries: string[];
  summary: string;
  tableStakes: string[];
  standardAngles: string[];
  openings: string[];
};

/* Written by the "Verify pages" server action, not the worker: which planned
   slugs answer 2xx on the live site. Reset whenever the worker rewrites the
   report (a re-run replaces the whole jsonb blob). */
export type SeoStrategyPageCheck = {
  checkedAt: string;
  results: Array<{ slug: string; ok: boolean; status: number | null }>;
};

export type SeoStrategyReport = {
  url: string;
  host: string;
  fetchedAt: string;
  understanding: SeoStrategyUnderstanding;
  searchesChecked: SeoStrategyEvidence[];
  gsc: SeoStrategyGscRow[] | null; // null = Search Console not configured
  competitors?: SeoStrategyCompetitor[];
  market?: SeoStrategyMarket | null; // null = stage failed or found nothing
  headKeywords: SeoStrategyHead[];
  pages: SeoStrategyPage[];
  duplicatesRemoved: number;
  audit: SeoAuditReport | null; // null = skipped or failed
  prompt: string; // the master prompt — the deliverable
  pageCheck?: SeoStrategyPageCheck; // added by the admin's "Verify pages" action
};

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          client_id: string;
          slug: string;
          project: string;
          sector: string | null;
          year: string | null;
          role: string | null;
          stack: string[];
          url: string | null;
          lede: string | null;
          body: string[];
          cover_bg: CoverBg;
          cover_label: string;
          thumbnail: string | null;
          device: DeviceKind | null;
          is_featured: boolean;
          featured_order: number | null;
          sort_order: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          slug: string;
          project: string;
          sector?: string | null;
          year?: string | null;
          role?: string | null;
          stack?: string[];
          url?: string | null;
          lede?: string | null;
          body?: string[];
          cover_bg: CoverBg;
          cover_label: string;
          thumbnail?: string | null;
          device?: DeviceKind | null;
          is_featured?: boolean;
          featured_order?: number | null;
          sort_order?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          slug?: string;
          project?: string;
          sector?: string | null;
          year?: string | null;
          role?: string | null;
          stack?: string[];
          url?: string | null;
          lede?: string | null;
          body?: string[];
          cover_bg?: CoverBg;
          cover_label?: string;
          thumbnail?: string | null;
          device?: DeviceKind | null;
          is_featured?: boolean;
          featured_order?: number | null;
          sort_order?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      project_features: {
        Row: {
          id: string;
          project_id: string;
          image: string;
          title: string;
          description: string;
          device: DeviceKind | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          project_id: string;
          image: string;
          title: string;
          description: string;
          device?: DeviceKind | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          project_id?: string;
          image?: string;
          title?: string;
          description?: string;
          device?: DeviceKind | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_features_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      capabilities: {
        Row: {
          id: string;
          slug: string | null;
          title: string;
          body: string;
          detail: string[];
          sort_order: number;
        };
        Insert: {
          id?: string;
          slug?: string | null;
          title: string;
          body: string;
          detail?: string[];
          sort_order?: number;
        };
        Update: {
          id?: string;
          slug?: string | null;
          title?: string;
          body?: string;
          detail?: string[];
          sort_order?: number;
        };
        Relationships: [];
      };
      stack_tokens: {
        Row: {
          id: string;
          label: string;
          href: string | null;
          placement: StackPlacement;
          sort_order: number;
        };
        Insert: {
          id?: string;
          label: string;
          href?: string | null;
          placement: StackPlacement;
          sort_order?: number;
        };
        Update: {
          id?: string;
          label?: string;
          href?: string | null;
          placement?: StackPlacement;
          sort_order?: number;
        };
        Relationships: [];
      };
      awards: {
        Row: {
          id: string;
          title: string;
          year: string | null;
          issuer: string | null;
          url: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          title: string;
          year?: string | null;
          issuer?: string | null;
          url?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          title?: string;
          year?: string | null;
          issuer?: string | null;
          url?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      about_blocks: {
        Row: {
          id: string;
          kind: AboutKind;
          title: string | null;
          body: string | null;
          value: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          kind: AboutKind;
          title?: string | null;
          body?: string | null;
          value?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          kind?: AboutKind;
          title?: string | null;
          body?: string | null;
          value?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      approach_steps: {
        Row: {
          id: string;
          number: string;
          title: string;
          body: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          number: string;
          title: string;
          body: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          number?: string;
          title?: string;
          body?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: string;
          singleton: boolean;
          founded: string | null;
          location: string | null;
          email: string | null;
          domain: string | null;
          timezone: string | null;
          clocks: Clock[];
          updated_at: string;
        };
        Insert: {
          id?: string;
          singleton?: boolean;
          founded?: string | null;
          location?: string | null;
          email?: string | null;
          domain?: string | null;
          timezone?: string | null;
          clocks?: Clock[];
          updated_at?: string;
        };
        Update: {
          id?: string;
          singleton?: boolean;
          founded?: string | null;
          location?: string | null;
          email?: string | null;
          domain?: string | null;
          timezone?: string | null;
          clocks?: Clock[];
          updated_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          id: string;
          name: string;
          role: string;
          bio: string | null;
          image_url: string | null;
          segment: TeamSegment;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          role: string;
          bio?: string | null;
          image_url?: string | null;
          segment?: TeamSegment;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: string;
          bio?: string | null;
          image_url?: string | null;
          segment?: TeamSegment;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      scrape_jobs: {
        Row: {
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
        };
        Insert: {
          id?: string;
          category: string;
          district: string;
          status?: JobStatus;
          progress?: number;
          leads_found?: number;
          error?: string | null;
          requested_by?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          category?: string;
          district?: string;
          status?: JobStatus;
          progress?: number;
          leads_found?: number;
          error?: string | null;
          requested_by?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
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
          instagram_handle: string | null;
          instagram_followers: number | null;
          audit_flags: AuditFlag[];
          review_themes: string[];
          screenshot_url: string | null;
          lead_score: number;
          pipeline_status: PipelineStatus;
          notes: string | null;
          source_job_id: string | null;
          contacted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          place_id: string;
          name: string;
          category?: string | null;
          district?: string | null;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          phone?: string | null;
          website_url?: string | null;
          rating?: number | null;
          review_count?: number | null;
          instagram_handle?: string | null;
          instagram_followers?: number | null;
          audit_flags?: AuditFlag[];
          review_themes?: string[];
          screenshot_url?: string | null;
          lead_score?: number;
          pipeline_status?: PipelineStatus;
          notes?: string | null;
          source_job_id?: string | null;
          contacted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          place_id?: string;
          name?: string;
          category?: string | null;
          district?: string | null;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          phone?: string | null;
          website_url?: string | null;
          rating?: number | null;
          review_count?: number | null;
          instagram_handle?: string | null;
          instagram_followers?: number | null;
          audit_flags?: AuditFlag[];
          review_themes?: string[];
          screenshot_url?: string | null;
          lead_score?: number;
          pipeline_status?: PipelineStatus;
          notes?: string | null;
          source_job_id?: string | null;
          contacted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      learnings: {
        Row: {
          id: string;
          title: string;
          summary: string;
          body: string;
          tags: string[];
          author_email: string;
          author_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          summary?: string;
          body?: string;
          tags?: string[];
          author_email: string;
          author_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          summary?: string;
          body?: string;
          tags?: string[];
          author_email?: string;
          author_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lead_messages: {
        Row: {
          id: string;
          lead_id: string;
          channel: MessageChannel;
          language: MessageLanguage;
          subject: string | null;
          body: string;
          variant_label: string | null;
          status: MessageStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          channel?: MessageChannel;
          language?: MessageLanguage;
          subject?: string | null;
          body: string;
          variant_label?: string | null;
          status?: MessageStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          channel?: MessageChannel;
          language?: MessageLanguage;
          subject?: string | null;
          body?: string;
          variant_label?: string | null;
          status?: MessageStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_messages_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_jobs: {
        Row: {
          id: string;
          seed: string;
          region: string;
          language: string;
          status: JobStatus;
          progress: number;
          keywords_found: number;
          ads_skipped: number;
          pages_crawled: number;
          organic: SeoOrganicResult[];
          error: string | null;
          requested_by: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          seed: string;
          region?: string;
          language?: string;
          status?: JobStatus;
          progress?: number;
          keywords_found?: number;
          ads_skipped?: number;
          pages_crawled?: number;
          organic?: SeoOrganicResult[];
          error?: string | null;
          requested_by?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          seed?: string;
          region?: string;
          language?: string;
          status?: JobStatus;
          progress?: number;
          keywords_found?: number;
          ads_skipped?: number;
          pages_crawled?: number;
          organic?: SeoOrganicResult[];
          error?: string | null;
          requested_by?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      seo_keywords: {
        Row: {
          id: string;
          job_id: string;
          keyword: string;
          score: number;
          frequency: number | null;
          pages: number | null;
          title_hits: number | null;
          heading_hits: number | null;
          meta_hits: number | null;
          refined: boolean;
          intent: string | null;
          rationale: string | null;
          rank: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          keyword: string;
          score?: number;
          frequency?: number | null;
          pages?: number | null;
          title_hits?: number | null;
          heading_hits?: number | null;
          meta_hits?: number | null;
          refined?: boolean;
          intent?: string | null;
          rationale?: string | null;
          rank?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          keyword?: string;
          score?: number;
          frequency?: number | null;
          pages?: number | null;
          title_hits?: number | null;
          heading_hits?: number | null;
          meta_hits?: number | null;
          refined?: boolean;
          intent?: string | null;
          rationale?: string | null;
          rank?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seo_keywords_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "seo_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_audit_jobs: {
        Row: {
          id: string;
          url: string;
          max_pages: number;
          status: JobStatus;
          progress: number;
          score: number | null;
          pages_audited: number;
          issues_found: number;
          report: SeoAuditReport | null;
          error: string | null;
          requested_by: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          max_pages?: number;
          status?: JobStatus;
          progress?: number;
          score?: number | null;
          pages_audited?: number;
          issues_found?: number;
          report?: SeoAuditReport | null;
          error?: string | null;
          requested_by?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          max_pages?: number;
          status?: JobStatus;
          progress?: number;
          score?: number | null;
          pages_audited?: number;
          issues_found?: number;
          report?: SeoAuditReport | null;
          error?: string | null;
          requested_by?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      seo_strategy_jobs: {
        Row: {
          id: string;
          url: string;
          context: string | null;
          serp_queries: number;
          audit_pages: number;
          status: JobStatus;
          progress: number;
          pages_planned: number;
          demand_queries: number;
          audit_score: number | null;
          report: SeoStrategyReport | null;
          error: string | null;
          requested_by: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          context?: string | null;
          serp_queries?: number;
          audit_pages?: number;
          status?: JobStatus;
          progress?: number;
          pages_planned?: number;
          demand_queries?: number;
          audit_score?: number | null;
          report?: SeoStrategyReport | null;
          error?: string | null;
          requested_by?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          context?: string | null;
          serp_queries?: number;
          audit_pages?: number;
          status?: JobStatus;
          progress?: number;
          pages_planned?: number;
          demand_queries?: number;
          audit_score?: number | null;
          report?: SeoStrategyReport | null;
          error?: string | null;
          requested_by?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      seo_tracked_keywords: {
        Row: {
          id: string;
          host: string;
          keyword: string;
          language: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          host: string;
          keyword: string;
          language?: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          host?: string;
          keyword?: string;
          language?: string;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      seo_rank_snapshots: {
        Row: {
          id: string;
          tracked_id: string;
          rank: number | null;
          checked_at: string;
        };
        Insert: {
          id?: string;
          tracked_id: string;
          rank?: number | null;
          checked_at?: string;
        };
        Update: {
          id?: string;
          tracked_id?: string;
          rank?: number | null;
          checked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seo_rank_snapshots_tracked_id_fkey";
            columns: ["tracked_id"];
            isOneToOne: false;
            referencedRelation: "seo_tracked_keywords";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_requests: {
        Row: {
          id: string;
          name: string;
          email: string;
          company: string | null;
          message: string;
          status: InquiryStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          company?: string | null;
          message: string;
          status?: InquiryStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          company?: string | null;
          message?: string;
          status?: InquiryStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      project_inquiries: {
        Row: {
          id: string;
          website_type: string;
          features: string[];
          base_price: number;
          features_price: number;
          total_price: number;
          currency: string;
          name: string;
          email: string;
          company: string | null;
          notes: string | null;
          status: InquiryStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          website_type: string;
          features?: string[];
          base_price: number;
          features_price: number;
          total_price: number;
          currency?: string;
          name: string;
          email: string;
          company?: string | null;
          notes?: string | null;
          status?: InquiryStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          website_type?: string;
          features?: string[];
          base_price?: number;
          features_price?: number;
          total_price?: number;
          currency?: string;
          name?: string;
          email?: string;
          company?: string | null;
          notes?: string | null;
          status?: InquiryStatus;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      cover_bg: CoverBg;
      device_kind: DeviceKind;
    };
    CompositeTypes: Record<never, never>;
  };
}

// Convenience helpers
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
