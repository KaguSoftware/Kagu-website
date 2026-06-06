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
