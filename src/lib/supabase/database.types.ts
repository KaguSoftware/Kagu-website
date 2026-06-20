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
