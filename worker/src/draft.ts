import { config } from "./config.js";
import type { DraftMessage, Enrichment, RawLead } from "./types.js";

/*
  draftMessages — generate outreach drafts for one lead.

  Real implementation: one Groq chat-completion per lead (OpenAI-compatible
  API, plain fetch — no SDK dependency). The response is forced to JSON via
  response_format, parsed defensively anyway, and retried once on malformed
  output. If drafting fails — or no GROQ_API_KEY is configured — the lead is
  saved without drafts; the panel works fine without them. Temperature is
  kept low: the value is in factual specificity, not flair.
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

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

let warnedNoKey = false;

export async function draftMessages(
  lead: RawLead,
  enrichment: Enrichment
): Promise<DraftMessage[]> {
  if (config.mockMode) return mockDrafts(lead, enrichment);

  if (!config.groqApiKey) {
    if (!warnedNoKey) {
      console.warn("[draft] GROQ_API_KEY not set — skipping draft generation.");
      warnedNoKey = true;
    }
    return [];
  }

  const prompt = PROMPT_TEMPLATE
    .replace("{{name}}", lead.name)
    .replace("{{category}}", lead.category ?? "business")
    .replace("{{district}}", lead.district ?? "Istanbul")
    .replace("{{rating}}", lead.rating != null ? String(lead.rating) : "unknown")
    .replace("{{review_count}}", lead.review_count != null ? String(lead.review_count) : "unknown")
    .replace("{{audit_flags}}", enrichment.audit_flags.join(", ") || "none recorded")
    .replace("{{review_themes}}", enrichment.review_themes.join(", ") || "none recorded")
    .replace("{{language}}", config.draftLanguage);

  // One retry on malformed output, then skip drafting for this lead.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.groqApiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: config.groqModel,
          temperature: 0.3,
          max_tokens: 1024,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        throw new Error(`Groq API ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("Groq response had no message content");

      const parsed = JSON.parse(text) as {
        subject?: string;
        body?: string;
        whatsapp_variant?: string;
      };
      if (!parsed.body || !parsed.whatsapp_variant) {
        throw new Error("parsed JSON is missing body/whatsapp_variant");
      }

      return [
        {
          channel: "email",
          language: config.draftLanguage,
          subject: parsed.subject || null,
          body: parsed.body,
          variant_label: "Email A",
        },
        {
          channel: "whatsapp",
          language: config.draftLanguage,
          subject: null,
          body: parsed.whatsapp_variant,
          variant_label: "WhatsApp",
        },
      ];
    } catch (err) {
      console.warn(`[draft] attempt ${attempt} failed for ${lead.place_id}:`, err);
    }
  }
  return [];
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
