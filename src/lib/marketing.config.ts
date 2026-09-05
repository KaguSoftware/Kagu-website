/*
  Constants for the marketing branch (/marketing).

  Kept out of the page so the number, the prefilled message and the budget
  bands are edited in one place rather than hunted for in JSX.
*/

/**
 * WhatsApp number for the marketing branch, digits only, country code first,
 * no "+" or spaces — the format wa.me expects (e.g. "905535531792").
 *
 * TODO(owner): fill this in. While it is empty the WhatsApp buttons are not
 * rendered at all, so the page never ships a dead or wrong-number link.
 * Deliberately NOT defaulted to the company phone in src/lib/legal.ts: that
 * line is the legal contact, and marketing enquiries should not land on it
 * by accident.
 */
export const MARKETING_WHATSAPP_NUMBER = "";

/** Prefilled first message, in the site's language. */
export const MARKETING_WHATSAPP_MESSAGE =
  "Hi, I saw the marketing page on your site and I'd like to talk.";

/**
 * wa.me link with the message prefilled, or null while the number is unset.
 * Callers must handle null — see the TODO above.
 */
export function whatsappHref(): string | null {
  const number = MARKETING_WHATSAPP_NUMBER.replace(/\D/g, "");
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(MARKETING_WHATSAPP_MESSAGE)}`;
}

/**
 * Monthly ad-budget bands for the lead form's select. Quoted in lira, the
 * currency businesses here actually plan ad spend in. These qualify a lead;
 * they are not prices — what Kagu charges is a conversation, never a figure
 * on this page.
 */
export const AD_BUDGET_RANGES = [
  "Not decided yet",
  "Under ₺20,000 / month",
  "₺20,000 – ₺50,000 / month",
  "₺50,000 – ₺100,000 / month",
  "Over ₺100,000 / month",
] as const;

export type AdBudgetRange = (typeof AD_BUDGET_RANGES)[number];
