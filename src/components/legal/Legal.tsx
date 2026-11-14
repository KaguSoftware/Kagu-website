/*
  Shared presentation for the legal/policy pages (Mesafeli Satış, Teslimat &
  İade, Gizlilik). Server component — content is static.

  Each page passes two parallel documents (Turkish + English). The Turkish
  document is rendered first (primary, required by Turkish consumer law), then
  a language divider, then the English translation. The seller identity card is
  rendered once from the shared `seller` config in src/lib/legal.ts.
*/

import {
  seller,
  orPlaceholder,
  LEGAL_UPDATED,
  formatLegalDate,
} from "@/lib/legal";
import "./legal.css";

export type LegalBlock = string | { list: string[] };
export type LegalSection = { heading: string; blocks: LegalBlock[] };
export type LegalDocument = { sections: LegalSection[] };

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
    <dl className="lg-seller glass">
      <dt className="lg-label">Satıcı / Sağlayıcı · Seller / Provider</dt>
      <div className="lg-seller__rows">
        {rows.map((r) => (
          <div key={r.label} className="lg-seller__row">
            <dt className="lg-label">{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </div>
    </dl>
  );
}

/** Renders one language version of a legal document. */
export function LegalRender({ doc }: { doc: LegalDocument }) {
  return (
    <div className="lg-doc">
      {doc.sections.map((section, i) => (
        <section key={section.heading} className="lg-sec">
          <span className="lg-label">§ {String(i + 1).padStart(2, "0")}</span>
          <h2 className="lg-h2">{section.heading}</h2>
          <div className="lg-text">
            {section.blocks.map((block, j) =>
              typeof block === "string" ? (
                <p key={j}>{block}</p>
              ) : (
                <ul key={j}>
                  {block.list.map((item, k) => (
                    <li key={k}>{item}</li>
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
    <div className="lg">
      <section className="site-wrap lg-hero">
        <span className="lg-label">
          Yasal · Legal · Güncelleme{" "}
          {/* machine-readable date for the "content is dateable" audit */}
          <time dateTime={LEGAL_UPDATED}>{formatLegalDate(LEGAL_UPDATED, "tr-TR")}</time>
        </span>
        <h1 className="lg-h1">{titleTr}</h1>
        <p className="lg-sub">{titleEn}</p>
        <SellerCard />
      </section>

      <section className="site-wrap lg-lang">
        <LangDivider label="Türkçe" />
        <LegalRender doc={tr} />
      </section>

      <section className="site-wrap lg-lang">
        <LangDivider label="English" />
        <LegalRender doc={en} />
      </section>
    </div>
  );
}

function LangDivider({ label }: { label: string }) {
  return (
    <div className="lg-div">
      <span className="lg-label">{label}</span>
      <span className="lg-div__line" aria-hidden="true" />
    </div>
  );
}
