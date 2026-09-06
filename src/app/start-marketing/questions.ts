/*
  The /start-marketing questionnaire, as data.

  Everything about a question lives here once — its label, its control, whether
  it is required, what it offers. The form renders from this array and the
  enquiry we receive is formatted from the same array, so the summary in the
  inbox is always in the order the questions were asked. Adding a question is
  an entry in BLOCKS; it needs no change in StartMarketingForm.tsx.

  Budget bands are NOT redefined here — they come from src/lib/marketing.config
  so this page and the short form on /marketing qualify leads on one scale.
*/

import { AD_BUDGET_RANGES } from "@/lib/marketing.config";

/* ------------------------------- the fields ------------------------------ */

export type FieldId =
  // 01 — the business
  | "business"
  | "kind"
  | "kindOther"
  | "city"
  | "website"
  | "platform"
  | "instagram"
  | "tiktok"
  | "channel"
  // 02 — what you want
  | "goal"
  | "audience"
  | "budget"
  | "adsNow"
  | "content"
  | "tried"
  // 03 — getting started
  | "meta"
  | "timing"
  | "name"
  | "role"
  | "email"
  | "phone"
  | "notes";

/** `choice` renders tappable chips; everything else is a native control. */
export type FieldKind =
  | "choice"
  | "select"
  | "text"
  | "email"
  | "tel"
  | "url"
  | "textarea";

export interface Field {
  id: FieldId;
  /** The question. Doubles as the <label> and as the line label in the inbox. */
  label: string;
  kind: FieldKind;
  required?: boolean;
  /** choice + select only. */
  options?: readonly string[];
  /** Chip columns from `sm` up. One column reads as cards, for longer options. */
  columns?: 1 | 2 | 3;
  placeholder?: string;
  /** Short suffix on the label — "Optional" and the like. */
  hint?: string;
  /** A plain-language line under the control, for questions people stall on. */
  help?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "url";
  rows?: number;
  /**
   * Conditional questions. The field renders (and is validated) only while the
   * named field holds `equals`, or holds anything at all when `filled`.
   */
  showIf?: { field: FieldId; equals?: string; filled?: true };
}

export interface Block {
  id: string;
  /** "01" — matches the numbered-step grammar on /start-project. */
  number: string;
  title: string;
  /** One line under the block heading. */
  intro: string;
  fields: readonly Field[];
}

export const BLOCKS: readonly Block[] = [
  {
    id: "business",
    number: "01",
    title: "The business",
    intro: "Who you are and where people already find you.",
    fields: [
      {
        id: "business",
        label: "Business name",
        kind: "text",
        required: true,
        autoComplete: "organization",
      },
      {
        id: "kind",
        label: "What kind of business",
        kind: "choice",
        required: true,
        columns: 2,
        options: [
          "Restaurant / café",
          "Retail or fashion brand",
          "Online store",
          "Service business",
          "Education / agency",
          "Other",
        ],
      },
      {
        id: "kindOther",
        label: "Tell us what kind",
        kind: "text",
        required: true,
        placeholder: "e.g. dental clinic",
        showIf: { field: "kind", equals: "Other" },
      },
      {
        id: "city",
        label: "City",
        kind: "text",
        required: true,
        autoComplete: "address-level2",
        placeholder: "Istanbul",
      },
      {
        id: "website",
        label: "Website or online store",
        kind: "url",
        hint: "Optional",
        inputMode: "url",
        autoComplete: "url",
        placeholder: "yourbusiness.com",
      },
      {
        id: "platform",
        label: "What is it built on",
        kind: "select",
        hint: "Optional",
        options: ["ikas", "Shopify", "WooCommerce", "Custom build", "Not sure"],
        showIf: { field: "website", filled: true },
      },
      {
        id: "instagram",
        label: "Instagram handle",
        kind: "text",
        required: true,
        placeholder: "@yourbusiness",
        inputMode: "text",
      },
      {
        id: "tiktok",
        label: "TikTok handle",
        kind: "text",
        hint: "Optional",
        placeholder: "@yourbusiness",
        inputMode: "text",
      },
      {
        id: "channel",
        label: "Do you sell online, in person, or both",
        kind: "choice",
        required: true,
        columns: 3,
        options: ["Online", "In person", "Both"],
      },
    ],
  },
  {
    id: "want",
    number: "02",
    title: "What you want",
    intro: "The part that decides whether we are a fit.",
    fields: [
      {
        id: "goal",
        label: "Main goal",
        kind: "choice",
        required: true,
        columns: 1,
        options: [
          "More sales online",
          "More walk-ins / foot traffic",
          "More leads or enquiries",
          "Grow the audience",
          "Not sure yet",
        ],
      },
      {
        id: "audience",
        label: "Who your customers are",
        kind: "text",
        required: true,
        placeholder: "women 20–35 in Istanbul who buy streetwear",
      },
      {
        id: "budget",
        label: "Monthly ad budget",
        kind: "select",
        required: true,
        options: AD_BUDGET_RANGES,
        help: "What you'd spend with Meta and TikTok, not what you'd pay us.",
      },
      {
        id: "adsNow",
        label: "Are you running ads now",
        kind: "choice",
        required: true,
        columns: 2,
        options: [
          "Yes, ourselves",
          "Yes, another agency",
          "No, never",
          "We tried and stopped",
        ],
      },
      {
        id: "content",
        label: "Who makes the content",
        kind: "choice",
        required: true,
        columns: 2,
        options: [
          "We have a content team",
          "We shoot it ourselves",
          "We need help producing it",
          "Not sure",
        ],
      },
      {
        id: "tried",
        label: "What have you tried that didn't work",
        kind: "textarea",
        hint: "Optional",
        rows: 3,
        placeholder: "Boosted posts for six months, lots of likes, no orders…",
        help: "Worth more than it looks — knowing what already failed saves us both a month.",
      },
    ],
  },
  {
    id: "start",
    number: "03",
    title: "Getting started",
    intro: "The practical bits, then we'll call you.",
    fields: [
      {
        id: "meta",
        label: "Do you have a Meta Business account, ad account and pixel",
        kind: "choice",
        required: true,
        columns: 2,
        options: ["Yes, all set up", "Some of it", "No", "Not sure"],
        help: "Most people don't know, and “Not sure” is a perfectly good answer — we check it with you on the call.",
      },
      {
        id: "timing",
        label: "When do you want to start",
        kind: "choice",
        required: true,
        columns: 3,
        options: ["This month", "Next month", "Just exploring"],
      },
      {
        id: "name",
        label: "Your name",
        kind: "text",
        required: true,
        autoComplete: "name",
      },
      {
        id: "role",
        label: "Role at the business",
        kind: "text",
        hint: "Optional",
        autoComplete: "organization-title",
        placeholder: "Owner",
      },
      {
        id: "email",
        label: "Email",
        kind: "email",
        required: true,
        autoComplete: "email",
        inputMode: "email",
      },
      {
        id: "phone",
        label: "Phone / WhatsApp",
        kind: "tel",
        required: true,
        autoComplete: "tel",
        inputMode: "tel",
      },
      {
        id: "notes",
        label: "Anything else we should know",
        kind: "textarea",
        hint: "Optional",
        rows: 4,
      },
    ],
  },
];

export const FIELDS: readonly Field[] = BLOCKS.flatMap((block) => block.fields);

export type Values = Record<FieldId, string>;
export type Errors = Partial<Record<FieldId, string>>;

export const EMPTY_VALUES: Values = Object.fromEntries(
  FIELDS.map((field) => [field.id, ""])
) as Values;

/* ------------------------------ conditionals ----------------------------- */

/** Is this question on screen right now? Hidden questions are never validated. */
export function isVisible(field: Field, values: Values): boolean {
  const condition = field.showIf;
  if (!condition) return true;
  const other = values[condition.field].trim();
  if (condition.filled) return other.length > 0;
  return other === condition.equals;
}

export function visibleFields(values: Values): Field[] {
  return FIELDS.filter((field) => isVisible(field, values));
}

/* ----------------------------- normalisation ----------------------------- */

/**
 * Accepts "@handle", "handle", "instagram.com/handle" or a full URL with
 * query string, and returns "@handle". Returns null if what is left over
 * isn't a handle — Instagram allows letters, digits, dots and underscores,
 * up to 30 characters.
 */
export function normaliseHandle(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  // Strip a full or partial URL down to its first path segment.
  value = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  value = value.replace(/^(?:instagram|tiktok)\.com\//i, "");
  value = value.split(/[/?#]/)[0];
  value = value.replace(/^@+/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(value)) return null;
  return `@${value}`;
}

/**
 * Adds the protocol people leave off ("kagu.com" → "https://kagu.com") and
 * confirms the result is a real http(s) URL with a dot in the host. Returns
 * null when it isn't.
 */
export function normaliseUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  // "localhost" and bare words are not what anyone means to type here.
  if (!/^[^.\s]+(\.[^.\s]+)+$/.test(url.hostname)) return null;
  return url.toString().replace(/\/$/, "");
}

/** Deliberately permissive — same rule as the short form on /marketing. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ------------------------------- validation ------------------------------ */

/**
 * One field's error, or undefined. Plain language, no "invalid input": the
 * message says what to do about it.
 */
export function validateField(field: Field, values: Values): string | undefined {
  const value = values[field.id].trim();

  if (!value) {
    if (!field.required) return undefined;
    switch (field.kind) {
      case "choice":
        return "Pick one — none of these are wrong answers.";
      case "select":
        return "Choose an option from the list.";
      default:
        return "This one we need.";
    }
  }

  switch (field.id) {
    case "email":
      return EMAIL_RE.test(value)
        ? undefined
        : "That doesn't look like an email address — check for a typo.";
    case "phone":
      return value.replace(/\D/g, "").length >= 7
        ? undefined
        : "That number looks too short to call back.";
    case "website":
      return normaliseUrl(value)
        ? undefined
        : "We couldn't read that as a web address. Something like yourbusiness.com.";
    case "instagram":
    case "tiktok":
      return normaliseHandle(value)
        ? undefined
        : "Just the handle is fine — @yourbusiness, or paste the profile link.";
    default:
      return undefined;
  }
}

/** Every error on screen, in the order the questions are asked. */
export function validateAll(values: Values): Errors {
  const errors: Errors = {};
  for (const field of visibleFields(values)) {
    const error = validateField(field, values);
    if (error) errors[field.id] = error;
  }
  return errors;
}

/* -------------------------- the enquiry we receive ----------------------- */

/** What the answer should read as in the inbox, normalised where we can. */
function answerFor(field: Field, values: Values): string {
  const value = values[field.id].trim();
  if (!value) return "—";
  if (field.id === "website") return normaliseUrl(value) ?? value;
  if (field.id === "instagram" || field.id === "tiktok")
    return normaliseHandle(value) ?? value;
  return value;
}

/**
 * The enquiry as labelled question-and-answer, in the order asked, grouped by
 * block. This is what lands in contact_requests.message (rendered with
 * whitespace-pre-wrap in /admin/requests) and in the fallback mail draft —
 * one format, so both read the same.
 */
export function formatEnquiry(values: Values): string {
  const lines: string[] = ["Marketing intake — sent from /start-marketing", ""];

  for (const block of BLOCKS) {
    const rendered = block.fields
      .filter((field) => isVisible(field, values))
      // Skip optional questions nobody answered rather than printing "—".
      .filter((field) => field.required || values[field.id].trim())
      .map((field) => `${field.label}: ${answerFor(field, values)}`);
    if (!rendered.length) continue;
    lines.push(`— ${block.number} · ${block.title} —`, ...rendered, "");
  }

  return lines.join("\n").trimEnd() + "\n";
}

/** Subject line for the fallback mail draft. */
export function enquirySubject(values: Values): string {
  const business = values.business.trim();
  const name = values.name.trim();
  return `Marketing intake: ${business || name || "new enquiry"}`;
}
