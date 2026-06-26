/*
  Shared presentation for the legal/policy pages (Mesafeli Satış, Teslimat &
  İade, Gizlilik). Server component — content is static.

  Each page passes two parallel documents (Turkish + English). The Turkish
  document is rendered first (primary, required by Turkish consumer law), then
  a language divider, then the English translation. The seller identity card is
  rendered once from the shared `seller` config in src/lib/legal.ts.
*/

import { SiteFooter } from "@/components/layout/SiteFooter";
import {
  seller,
  orPlaceholder,
  LEGAL_UPDATED,
  formatLegalDate,
} from "@/lib/legal";

export type LegalBlock = string | { list: string[] };
export type LegalSection = { heading: string; blocks: LegalBlock[] };
export type LegalDocument = { sections: LegalSection[] };

const MUTED = "var(--slate-ink)";

function SellerCard() {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Ünvan / Name", value: orPlaceholder(seller.legalName, "Ad Soyad / Ünvan") },
    {
      label: "Adres / Address",
      value: [orPlaceholder(seller.address, "Adres"), seller.city, seller.country]
        .filter(Boolean)
        .join(", "),
    },
    { label: "E-posta / Email", value: seller.email },
    { label: "Telefon / Phone", value: orPlaceholder(seller.phone, "Telefon") },
    {
      label: "Vergi Dairesi / No",
      value: `${orPlaceholder(seller.taxOffice, "Vergi Dairesi")} · ${orPlaceholder(
        seller.taxNumber,
        "Vergi No / TCKN",
      )}`,
    },
    { label: "Web", value: seller.website },
    ...(seller.kep ? [{ label: "KEP", value: seller.kep }] : []),
  ];

  return (
    <dl
      style={{
        border: "1px solid var(--neutral)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-6)",
        display: "grid",
        gap: "var(--space-4)",
        maxWidth: "64ch",
      }}
    >
      <dt
        className="font-mono"
        style={{
          fontSize: "var(--type-xs)",
          letterSpacing: "var(--tracking-eyebrow)",
          textTransform: "uppercase",
          color: "var(--mint-deep)",
        }}
      >
        Satıcı / Sağlayıcı · Seller / Provider
      </dt>
      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-1 sm:grid-cols-[14rem_1fr] gap-1 sm:gap-4">
            <dt
              className="font-mono"
              style={{
                fontSize: "var(--type-xs)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: MUTED,
              }}
            >
              {r.label}
            </dt>
            <dd style={{ fontSize: "var(--type-md)", color: "var(--ink)", wordBreak: "break-word" }}>
              {r.value}
            </dd>
          </div>
        ))}
      </div>
    </dl>
  );
}

/** Renders one language version of a legal document. */
export function LegalRender({ doc }: { doc: LegalDocument }) {
  return (
    <div style={{ display: "grid", gap: "var(--space-16)" }}>
      {doc.sections.map((section, i) => (
        <section key={section.heading}>
          <span
            className="font-mono block"
            style={{
              fontSize: "var(--type-xs)",
              color: "var(--mint-deep)",
              letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase",
              marginBottom: "var(--space-3)",
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <h2
            className="display"
            style={{
              fontSize: "var(--type-2xl)",
              lineHeight: 1.1,
              marginBottom: "var(--space-5)",
              maxWidth: "32ch",
            }}
          >
            {section.heading}
          </h2>
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            {section.blocks.map((block, j) =>
              typeof block === "string" ? (
                <p
                  key={j}
                  style={{
                    fontSize: "var(--type-md)",
                    lineHeight: 1.7,
                    color: "var(--ink)",
                    maxWidth: "70ch",
                  }}
                >
                  {block}
                </p>
              ) : (
                <ul
                  key={j}
                  style={{
                    display: "grid",
                    gap: "var(--space-2)",
                    maxWidth: "70ch",
                    paddingLeft: "var(--space-5)",
                    listStyle: "disc",
                  }}
                >
                  {block.list.map((item, k) => (
                    <li
                      key={k}
                      style={{
                        fontSize: "var(--type-md)",
                        lineHeight: 1.6,
                        color: "var(--ink)",
                      }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

export function LegalShell({
  titleTr,
  titleEn,
  tr,
  en,
}: {
  titleTr: string;
  titleEn: string;
  tr: LegalDocument;
  en: LegalDocument;
}) {
  return (
    <>
      {/* Hero */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pt-(--space-32) pb-(--space-16)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <span className="eyebrow block" style={{ marginBottom: "var(--space-6)" }}>
            Yasal · Legal · Güncelleme {formatLegalDate(LEGAL_UPDATED, "tr-TR")}
          </span>
          <h1
            className="display"
            style={{ fontSize: "var(--type-6xl)", lineHeight: 0.95, maxWidth: "18ch" }}
          >
            {titleTr}
          </h1>
          <p
            style={{
              marginTop: "var(--space-5)",
              fontSize: "var(--type-lg)",
              color: MUTED,
              maxWidth: "48ch",
            }}
          >
            {titleEn}
          </p>
        </div>
      </section>

      {/* Seller identity */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pb-(--space-16)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <SellerCard />
        </div>
      </section>

      {/* Turkish document */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pb-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <LangDivider label="Türkçe" />
          <LegalRender doc={tr} />
        </div>
      </section>

      {/* English document */}
      <section
        style={{ background: "var(--mint-pale)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <LangDivider label="English" />
          <LegalRender doc={en} />
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

function LangDivider({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-4"
      style={{ marginBottom: "var(--space-12)" }}
    >
      <span
        className="font-mono"
        style={{
          fontSize: "var(--type-xs)",
          letterSpacing: "var(--tracking-eyebrow)",
          textTransform: "uppercase",
          color: "var(--mint-deep)",
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: "var(--neutral)" }} aria-hidden />
    </div>
  );
}
