import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  CoverBg,
  DeviceKind,
  Clock,
  TeamSegment,
} from "@/lib/supabase/database.types";

/* Public content layer. Reads from Supabase and maps rows back into the shapes
   the existing public components expect (Case, Capability, studio, approach).
   Keeping these shapes stable means the presentation components barely change. */

export type CaseFeature = {
  image: string;
  title: string;
  description: string;
  /** Describes what the screenshot shows. Falls back to `title` when unset. */
  alt?: string;
  device?: DeviceKind;
};

export type Case = {
  slug: string;
  client: string;
  project: string;
  sector: string;
  year: string;
  role: string;
  stack: readonly string[];
  url: string;
  lede: string;
  body: readonly string[];
  cover: { bg: CoverBg; label: string };
  thumbnail?: string;
  /** Describes what the cover screenshot shows. Falls back to `project` when unset. */
  thumbnailAlt?: string;
  features?: readonly CaseFeature[];
  device?: DeviceKind;
};

export type Capability = {
  id: string;
  title: string;
  body: string;
  detail: readonly string[];
};

export type ApproachStep = {
  number: string;
  title: string;
  body: string;
};

export type Award = {
  id: string;
  title: string;
  year: string | null;
  issuer: string | null;
  url: string | null;
};

export type Studio = {
  founded: string;
  location: string;
  timezone: string;
  email: string;
  domain: string;
  mission: string;
  principles: { title: string; body: string }[];
  metrics: { label: string; value: string }[];
  clocks: Clock[];
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string | null;
  segment: TeamSegment;
};

// project_features(*) rather than a column list on purpose: naming a column
// that doesn't exist yet fails the whole select, and getCases() swallows the
// error into [], which empties /work and un-prerenders every case page. The
// wildcard lets this deploy before or after supabase/case_alt_text.sql.
const PROJECT_SELECT = "*, clients(name), project_features(*)";

// The embedded row shape Supabase returns for PROJECT_SELECT.
type ProjectJoinRow = {
  slug: string;
  project: string;
  sector: string | null;
  year: string | null;
  role: string | null;
  stack: string[] | null;
  url: string | null;
  lede: string | null;
  body: string[] | null;
  cover_bg: CoverBg;
  cover_label: string;
  thumbnail: string | null;
  thumbnail_alt: string | null;
  device: DeviceKind | null;
  clients: { name: string } | null;
  project_features: {
    image: string;
    title: string;
    description: string;
    alt: string | null;
    device: DeviceKind | null;
    sort_order: number;
  }[];
};

function toCase(p: ProjectJoinRow): Case {
  return {
    slug: p.slug,
    client: p.clients?.name ?? "",
    project: p.project,
    sector: p.sector ?? "",
    year: p.year ?? "",
    role: p.role ?? "",
    stack: p.stack ?? [],
    url: p.url ?? "",
    lede: p.lede ?? "",
    body: p.body ?? [],
    cover: { bg: p.cover_bg, label: p.cover_label },
    thumbnail: p.thumbnail ?? undefined,
    thumbnailAlt: p.thumbnail_alt ?? undefined,
    device: p.device ?? undefined,
    features: (p.project_features ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f) => ({
        image: f.image,
        title: f.title,
        description: f.description,
        alt: f.alt ?? undefined,
        device: f.device ?? undefined,
      })),
  };
}

export async function getCases(): Promise<Case[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("is_published", true)
    .order("sort_order");
  return (data ?? []).map(toCase);
}

/** Featured projects for the homepage Selected Work section. */
export async function getFeaturedCases(): Promise<Case[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("featured_order");
  return (data ?? []).map(toCase);
}

export async function getCase(slug: string): Promise<Case | undefined> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data ? toCase(data) : undefined;
}

export async function getCapabilities(): Promise<Capability[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("capabilities")
    .select("*")
    .order("sort_order");
  return (data ?? []).map((c) => ({
    id: c.slug ?? c.id,
    title: c.title,
    body: c.body,
    detail: c.detail ?? [],
  }));
}

export async function getApproach(): Promise<ApproachStep[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("approach_steps")
    .select("*")
    .order("sort_order");
  return (data ?? []).map((s) => ({
    number: s.number,
    title: s.title,
    body: s.body,
  }));
}

export async function getAwards(): Promise<Award[]> {
  const supabase = createPublicClient();
  const { data } = await supabase.from("awards").select("*").order("sort_order");
  return (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    year: a.year,
    issuer: a.issuer,
    url: a.url,
  }));
}

export async function getStudio(): Promise<Studio> {
  const supabase = createPublicClient();
  const [{ data: settings }, { data: blocks }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("singleton", true).single(),
    supabase.from("about_blocks").select("*").order("sort_order"),
  ]);

  const all = blocks ?? [];
  const mission = all.find((b) => b.kind === "mission")?.body ?? "";
  const principles = all
    .filter((b) => b.kind === "principle")
    .map((b) => ({ title: b.title ?? "", body: b.body ?? "" }));
  const metrics = all
    .filter((b) => b.kind === "metric")
    .map((b) => ({ label: b.title ?? "", value: b.value ?? "" }));

  return {
    founded: settings?.founded ?? "",
    location: settings?.location ?? "",
    timezone: settings?.timezone ?? "",
    email: settings?.email ?? "",
    domain: settings?.domain ?? "",
    mission,
    principles,
    metrics,
    clocks: settings?.clocks ?? [],
  };
}

export async function getTeam(): Promise<TeamMember[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("team_members")
    .select("*")
    .order("sort_order");
  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    bio: m.bio ?? "",
    image: m.image_url ?? null,
    segment: m.segment,
  }));
}
