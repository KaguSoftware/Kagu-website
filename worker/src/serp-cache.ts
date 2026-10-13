import { config } from "./config.js";
import type { SerpPage } from "./seo.js";

/*
  SERP cache — one live SERP fetch per (query, region, language, depth) per day.

  The strategy tool, rank tracking and repeated keyword runs keep asking the
  same questions; every Serper call spends a free-tier credit and every DDG
  call risks a rate limit. Two layers:

    1. in-process Map — always on, capped (oldest dropped first), so a long-
       running worker can't grow it without bound;
    2. Supabase `seo_serp_cache` (supabase/seo_serp_cache_module.sql) — shares
       hits across processes/runs. Strictly best-effort: no creds (the CLIs run
       without Supabase), table not created yet, or any DB error → behave as a
       miss and carry on. A cache problem must never fail a SERP call.

  Only successful responses are stored. Entries remember their `source`, so
  the caller can refuse a DuckDuckGo hit when Serper (real Google) is
  available.
*/

const MEMORY_CAP = 2000;
const DB_TIMEOUT_MS = 3000;
const PRUNE_AFTER_DAYS = 7;

interface MemoryEntry {
  page: SerpPage;
  fetchedAt: number;
}

const memory = new Map<string, MemoryEntry>();

export type CacheHit = { page: SerpPage; layer: "memory" | "db" };

/* ------------------------------------------------------------------------ */
/* Key                                                                      */
/* ------------------------------------------------------------------------ */

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

/* Serper bills ≤10 results as one credit and the scrape asks for
   min(topN, 10), so every topN ≤ 10 shares one bucket; deeper requests
   bucket by tens. The caller slices a hit back down to the topN it wanted. */
export function topNBucket(topN: number): number {
  return topN <= 10 ? 10 : Math.ceil(topN / 10) * 10;
}

/* Source-agnostic on purpose: a key names the *question*, the entry records
   which engine answered it. */
export function serpCacheKey(
  query: string,
  region: string,
  language: string,
  topN: number
): string {
  return [
    "serp",
    normalizeQuery(query),
    region.trim().toLowerCase(),
    language.trim().toLowerCase(),
    topNBucket(topN),
  ].join("|");
}

function ttlMs(): number {
  return config.seoSerpCacheHours * 60 * 60 * 1000;
}

/* ------------------------------------------------------------------------ */
/* Layer 1 — memory                                                         */
/* ------------------------------------------------------------------------ */

export function memoryGet(key: string, now = Date.now()): SerpPage | null {
  const e = memory.get(key);
  if (!e) return null;
  if (now - e.fetchedAt > ttlMs()) {
    memory.delete(key);
    return null;
  }
  return e.page;
}

export function memorySet(key: string, page: SerpPage, fetchedAt = Date.now()): void {
  // Re-insert so Map order stays oldest-first (insertion order).
  memory.delete(key);
  memory.set(key, { page, fetchedAt });
  while (memory.size > MEMORY_CAP) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
}

/* Test hooks. */
export function memoryClear(): void {
  memory.clear();
}
export function memorySize(): number {
  return memory.size;
}
export const SERP_MEMORY_CAP = MEMORY_CAP;

/* ------------------------------------------------------------------------ */
/* Layer 2 — Supabase (dormant without creds or before the SQL is applied)  */
/* ------------------------------------------------------------------------ */

type Db = (typeof import("./db.js"))["db"];

let dbDormant = false;
let dbClient: Db | null = null;
let pruned = false;

/* Same contract as rank-tracking.ts: PostgrestError is a plain object. */
function isMissingTable(err: unknown): boolean {
  const m =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  return /PGRST205|Could not find the table|does not exist/i.test(m);
}

function goDormant(why: "missing" | "nocreds"): void {
  if (!dbDormant && why === "missing") {
    console.log(
      "[seo] seo_serp_cache_module.sql not applied yet — DB SERP cache dormant (memory cache still on)"
    );
  }
  dbDormant = true;
}

/* db.ts builds its client at import time and config's required() calls
   process.exit on missing creds — so check the env FIRST and only then import
   it lazily. No creds → silent, permanent no-op. Note config.ts auto-loads
   worker/.env, so on a machine with creds the CLIs share the same DB cache
   as the worker — deliberate: an ad-hoc `seo:strategy` and a later DB job for
   the same host then spend each Serper credit once. */
async function getDb(): Promise<Db | null> {
  if (dbDormant) return null;
  if (dbClient) return dbClient;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    goDormant("nocreds");
    return null;
  }
  try {
    dbClient = (await import("./db.js")).db;
  } catch {
    goDormant("nocreds");
    return null;
  }
  if (!pruned) {
    pruned = true;
    void prune(dbClient);
  }
  return dbClient;
}

function withTimeout<T>(p: PromiseLike<T>): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("SERP cache DB timeout")), DB_TIMEOUT_MS).unref()
    ),
  ]);
}

function handleDbError(err: unknown, op: string): void {
  if (isMissingTable(err)) return goDormant("missing");
  const msg =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  console.warn(`[seo] SERP cache ${op} failed (ignored): ${msg}`);
}

/* Once per process: entries older than a week are dead weight (TTL is a day
   by default). Fire-and-forget; failures are irrelevant. */
async function prune(client: Db): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - PRUNE_AFTER_DAYS * 86_400_000).toISOString();
    const { error } = await withTimeout(
      client.from("seo_serp_cache").delete().lt("fetched_at", cutoff)
    );
    if (error) handleDbError(error, "prune");
  } catch (err) {
    handleDbError(err, "prune");
  }
}

async function dbGet(key: string): Promise<{ page: SerpPage; fetchedAt: number } | null> {
  const client = await getDb();
  if (!client) return null;
  try {
    const { data, error } = await withTimeout(
      client
        .from("seo_serp_cache")
        .select("payload, source, fetched_at")
        .eq("key", key)
        .maybeSingle()
    );
    if (error) {
      handleDbError(error, "read");
      return null;
    }
    const row = data as { payload: unknown; source: string; fetched_at: string } | null;
    if (!row || !row.payload || typeof row.payload !== "object") return null;
    const fetchedAt = new Date(row.fetched_at).getTime();
    if (!Number.isFinite(fetchedAt) || Date.now() - fetchedAt > ttlMs()) return null;
    const page = row.payload as SerpPage;
    if (!Array.isArray(page.results) || page.results.length === 0) return null;
    return { page, fetchedAt };
  } catch (err) {
    handleDbError(err, "read");
    return null;
  }
}

async function dbSet(key: string, query: string, region: string, language: string, page: SerpPage): Promise<void> {
  const client = await getDb();
  if (!client) return;
  try {
    const { error } = await withTimeout(
      client.from("seo_serp_cache").upsert(
        {
          key,
          query: normalizeQuery(query),
          gl: region.trim().toLowerCase(),
          hl: language.trim().toLowerCase(),
          source: page.source,
          payload: page,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      )
    );
    if (error) handleDbError(error, "write");
  } catch (err) {
    handleDbError(err, "write");
  }
}

/* ------------------------------------------------------------------------ */
/* Public API (used by scrapeOrganicResults)                                */
/* ------------------------------------------------------------------------ */

/* `acceptable` lets the caller veto a hit (e.g. a DDG entry while Serper is
   available) — a vetoed entry is treated exactly like a miss. */
export async function serpCacheGet(
  key: string,
  acceptable: (page: SerpPage) => boolean
): Promise<CacheHit | null> {
  const mem = memoryGet(key);
  if (mem && acceptable(mem)) return { page: mem, layer: "memory" };

  const row = await dbGet(key);
  if (row && acceptable(row.page)) {
    memorySet(key, row.page, row.fetchedAt); // keep the original age
    return { page: row.page, layer: "db" };
  }
  return null;
}

export async function serpCacheSet(
  key: string,
  query: string,
  region: string,
  language: string,
  page: SerpPage
): Promise<void> {
  if (page.results.length === 0) return; // only successful answers
  // creditsUsed is the live call's price — a replay costs nothing.
  const stored: SerpPage = { ...page, creditsUsed: null };
  memorySet(key, stored);
  await dbSet(key, query, region, language, stored);
}
