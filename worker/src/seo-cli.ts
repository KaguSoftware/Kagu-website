/*
  CLI for the SEO keyword tool. Usage:

    npm run seo -- "dentist istanbul"
    npm run seo -- --json "saç ekimi"        # machine-readable
    MOCK_MODE=1 npm run seo -- "dentist"      # offline, no Google/Groq

  Prints the top organic results it learned from, then a ranked keyword table.
  When GROQ_API_KEY is set, the Groq-refined keyword list is shown too;
  otherwise the heuristic ranking stands on its own.
*/

import { researchKeywords, type SeoReport } from "./seo.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonOut = args.includes("--json");
  const seed = args.filter((a) => a !== "--json").join(" ").trim();

  if (!seed) {
    console.error('Usage: npm run seo -- "<seed query>"   (add --json for raw output)');
    process.exit(1);
  }

  const report = await researchKeywords(seed);

  if (jsonOut) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }

  printReport(report);
}

function printReport(r: SeoReport): void {
  const line = "─".repeat(64);
  console.log("");
  console.log(line);
  console.log(`SEO keywords for: "${r.seed}"`);
  console.log(
    `region=${r.region}  language=${r.language}  ` +
      `organic=${r.organic.length}  sponsored skipped=${r.adsSkipped}  ` +
      `pages crawled=${r.pagesCrawled}`
  );
  console.log(line);

  console.log("\nTop organic results learned from:");
  for (const o of r.organic) {
    console.log(`  ${String(o.rank).padStart(2)}. ${o.domain}  —  ${truncate(o.title, 60)}`);
  }

  if (r.refined && r.refined.length) {
    console.log("\nRecommended keywords (Groq-refined):");
    console.log(pad("KEYWORD", 34) + pad("INTENT", 15) + "WHY");
    for (const k of r.refined) {
      console.log(pad(truncate(k.keyword, 33), 34) + pad(k.intent, 15) + truncate(k.rationale, 40));
    }
    console.log("\nRaw on-page signal ranking (top 15):");
  } else {
    console.log("\nKeyword ranking (by on-page signal):");
  }

  console.log(
    pad("KEYWORD", 34) + pad("SCORE", 7) + pad("TITLE", 7) + pad("HEAD", 6) + pad("META", 6) + "PAGES"
  );
  for (const c of r.candidates.slice(0, r.refined ? 15 : r.candidates.length)) {
    console.log(
      pad(truncate(c.keyword, 33), 34) +
        pad(String(c.score), 7) +
        pad(String(c.titleHits), 7) +
        pad(String(c.headingHits), 6) +
        pad(String(c.metaHits), 6) +
        String(c.pages)
    );
  }
  console.log("");
}

function pad(s: string, width: number): string {
  return s.length >= width ? s + " " : s + " ".repeat(width - s.length);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("[seo] failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
);
