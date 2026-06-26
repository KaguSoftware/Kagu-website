/*
  Single source of truth for the seller's legal identity and the legal/policy
  links shown in the footer and on the legal pages
  (/mesafeli-satis, /teslimat-iade, /gizlilik).

  Entity type: ŞAHIS (sole proprietorship) — no MERSIS number is required.

  ⚠️  FILL IN every empty string below before going live / submitting to iyzico.
      Empty fields render on the public pages as a visible
      "[ … — doldurulacak ]" placeholder so nothing ships blank by accident.
*/

export const seller = {
  /** Trading name shown to customers. */
  tradeName: "Kagu Software",
  /** Full legal name of the sole proprietor (şahıs ad-soyad / işletme ünvanı). */
  legalName: "Majed Ahdab",
  /** Full registered address (sokak, no, mahalle, ilçe, il, posta kodu). */
  address:
    "Koza Mah. 1638. Sk. Koza Park AK Koza Burgazada A Blok No: 2 A İç Kapı No: 177, Esenyurt",
  city: "İstanbul",
  country: "Türkiye",
  /** Primary contact e-mail (used for KVKK/return requests too). */
  email: "contact@kagusoftware.com",
  /** Contact phone (+90 …). */
  phone: "+90 553 553 17 92",
  /** Public website (no protocol). */
  website: "kagusoftware.com",
  /** Vergi Dairesi (tax office). */
  taxOffice: "Esenyurt",
  /** Vergi No (VKN) — şahıs, no MERSIS. Read from the vergi levhası barcode. */
  taxNumber: "0100641040",
  /** KEP adresi — optional, leave blank if none. */
  kep: "",
} as const;

/** Date these documents were last reviewed (YYYY-MM-DD), shown to users. */
export const LEGAL_UPDATED = "2026-06-26";

/** Legal/policy links, surfaced in the footer of every page. */
export const legalLinks = [
  { href: "/about", tr: "Hakkımızda", en: "About" },
  { href: "/mesafeli-satis", tr: "Mesafeli Satış Sözleşmesi", en: "Distance Sales Agreement" },
  { href: "/teslimat-iade", tr: "Teslimat ve İade Şartları", en: "Delivery & Return Terms" },
  { href: "/gizlilik", tr: "Gizlilik Sözleşmesi", en: "Privacy Policy" },
] as const;

/**
 * Returns the value if filled, otherwise a visibly-marked placeholder so an
 * un-filled legal field is impossible to miss on the rendered page.
 */
export function orPlaceholder(value: string, label: string): string {
  return value.trim() ? value : `[ ${label} — doldurulacak ]`;
}

/** Human-readable "26 Haziran 2026" style date from a YYYY-MM-DD string. */
export function formatLegalDate(iso: string, locale: "tr-TR" | "en-GB" = "tr-TR"): string {
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
