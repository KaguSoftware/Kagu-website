import { config } from "./config.js";
import type { DraftMessage, Enrichment, RawLead } from "./types.js";

/*
  draftMessages — generate outreach drafts for one lead.

  REAL IMPLEMENTATION (TODO):
  - Call an LLM with PROMPT_TEMPLATE below, interpolating the lead's facts.
  - Parse the strict-JSON response; on malformed output retry once, then skip
    drafting for this lead (the panel works fine without drafts).
  - Keep temperature low; the value is in factual specificity, not flair.
*/

export const PROMPT_TEMPLATE = `You write first-contact outreach for a small Istanbul web studio.

Facts about the business (use ONLY these — never invent details):
- Name: {{name}}
- Category: {{category}} in {{district}}, Istanbul
- Rating: {{rating}} from {{review_count}} Google reviews
- Web presence problems: {{audit_flags}}
- What reviewers mention: {{review_themes}}

Write in {{language}} (tr = Turkish, ar = Arabic, en = English).

Rules:
- 60–100 words for the email body; the WhatsApp variant may be shorter.
- Pick ONE problem from the audit flags and make it the single angle.
- Respectful, concrete, zero hype words ("amazing", "unlock", "skyrocket").
- Mention one specific positive fact (rating or a review theme) so it reads
  researched, not blasted.
- End with a low-pressure question, not a pitch to buy.

Respond with STRICT JSON, nothing else:
{"subject": "...", "body": "...", "whatsapp_variant": "..."}`;

export async function draftMessages(
  lead: RawLead,
  enrichment: Enrichment
): Promise<DraftMessage[]> {
  if (config.mockMode) return mockDrafts(lead, enrichment);

  throw new Error(
    "draftMessages is not implemented yet — run with MOCK_MODE=1 or wire up an LLM call using PROMPT_TEMPLATE (see worker/src/draft.ts)."
  );
}

function mockDrafts(lead: RawLead, enrichment: Enrichment): DraftMessage[] {
  const angle = enrichment.audit_flags[0] ?? "no_website";
  const body =
    `Merhaba ${lead.name},\n\n` +
    `Google'da ${lead.review_count ?? 0} yorumla ${lead.rating ?? "-"} puana sahipsiniz — ` +
    `bu, ${lead.district ?? "İstanbul"} için ciddi bir başarı. ` +
    `[MOCK draft — angle: ${angle}] Yine de sizi arayan yeni müşteriler şu anda ` +
    `derli toplu bir web sitesi bulamıyor. Küçük işletmeler için hızlı, sade siteler yapıyoruz.\n\n` +
    `Kısa bir örnek göndermemizi ister misiniz?`;

  return [
    {
      channel: "email",
      language: "tr",
      subject: `${lead.name} için kısa bir not`,
      body,
      variant_label: "Email A",
    },
    {
      channel: "whatsapp",
      language: "tr",
      subject: null,
      body: `Merhaba ${lead.name}! ${lead.review_count ?? 0} yorumdaki puanınız harika. [MOCK — ${angle}] Web siteniz olmadığını fark ettik; küçük işletmelere sade siteler yapıyoruz. Bir örnek paylaşabilir miyiz?`,
      variant_label: "WhatsApp",
    },
  ];
}
