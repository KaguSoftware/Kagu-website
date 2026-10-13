import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  process.env.SERPER_API_KEY = "";
  process.env.MOCK_MODE = "0";
  process.env.SEO_SERP_CACHE_HOURS = "";
});

import { mainText, visibleText } from "../src/seo.js";

const PROSE_1 = "İstanbul'da diş kliniği.";
const PROSE_2 = "Çağrı merkezi ğüşıöç";

const PAGE = `<!doctype html>
<html lang="tr">
<head>
  <title>Sayfa Basligi Head</title>
  <meta name="description" content="Meta aciklama">
  <style>.x { color: red }</style>
</head>
<body class="home">
  <header><div class="logo">LogoMetni</div><ul><li>Anasayfa</li><li>Hizmetler</li></ul></header>
  <nav><a href="/a">NavLinkBir</a><a href="/b">NavLinkIki</a></nav>
  <div role="navigation"><a href="/c">RolNavMetni</a></div>
  <div class="cookie-banner-x" id="cookie-banner">CerezBannerMetni kabul et</div>
  <div class="gdpr-consent">GdprRizaMetni</div>
  <aside>YanPanelMetni</aside>
  <script>var s = "<nav>"; document.write("</nav>"); var t = "ScriptIcerigi";</script>
  <h1>BaslikDisarida</h1>
  <main>
    <h2>AnaBaslik</h2>
    <p>${PROSE_1} ${PROSE_2}</p>
    <form><label>FormEtiketi</label><input placeholder="FormYerTutucu"><button>FormDugme</button></form>
    <button>HemenAraDugmesi</button>
    <p>SonParagraf burada.</p>
  </main>
  <footer><p>AltBilgiMetni telif hakki</p></footer>
</body>
</html>`;

describe("mainText", () => {
  it("keeps the main prose with Turkish characters intact", () => {
    const out = mainText(PAGE);
    expect(out).toContain(PROSE_1);
    expect(out).toContain(PROSE_2);
    expect(out).toContain("AnaBaslik");
    expect(out).toContain("SonParagraf burada.");
  });

  it("removes header / nav / role=navigation / aside / form / button / footer text", () => {
    const out = mainText(PAGE);
    for (const gone of [
      "LogoMetni",
      "Anasayfa",
      "Hizmetler",
      "NavLinkBir",
      "NavLinkIki",
      "RolNavMetni",
      "YanPanelMetni",
      "FormEtiketi",
      "FormYerTutucu",
      "FormDugme",
      "HemenAraDugmesi",
      "AltBilgiMetni",
    ]) {
      expect(out, gone).not.toContain(gone);
    }
  });

  it("removes cookie / consent / gdpr containers by class or id", () => {
    const out = mainText(PAGE);
    expect(out).not.toContain("CerezBannerMetni");
    expect(out).not.toContain("GdprRizaMetni");
  });

  it("drops scripts first so a <nav> / </nav> string inside JS cannot misalign removals", () => {
    const out = mainText(PAGE);
    expect(out).not.toContain("ScriptIcerigi");
    expect(out).not.toContain("document.write");
    // The unbalanced "<nav>" in the script would swallow the main content up to
    // the real </nav> if scripts were stripped after the structural passes.
    expect(out).toContain(PROSE_1);
  });

  it("excludes <head> content (title, meta, style)", () => {
    const out = mainText(PAGE);
    expect(out).not.toContain("Sayfa Basligi Head");
    expect(out).not.toContain("Meta aciklama");
    expect(out).not.toContain("color: red");
  });

  it("does not wipe the page when <body> itself has a cookie/consent class", () => {
    const html = `<html><body class="cookie-consent-enabled"><main><p>${PROSE_1}</p></main></body></html>`;
    expect(mainText(html)).toContain(PROSE_1);
    const withId = `<html><body id="gdpr-mode"><p>${PROSE_2}</p></body></html>`;
    expect(mainText(withId)).toContain(PROSE_2);
  });

  it("does not wipe the page when <html> or <main> carry a consent class", () => {
    const html = `<html class="cookie-ok"><body><main class="consent-aware"><p>${PROSE_1}</p></main></body></html>`;
    expect(mainText(html)).toContain(PROSE_1);
  });

  it("removing <header> does not eat an <h1> that lives outside it", () => {
    const html = `<body><header>MenuMetni</header><h1>DisBaslik</h1><p>Govde metni</p></body>`;
    const out = mainText(html);
    expect(out).toContain("DisBaslik");
    expect(out).toContain("Govde metni");
    expect(out).not.toContain("MenuMetni");
  });

  it("only matches whole tag names (<headline> / <navigator> are not chrome)", () => {
    const html = `<body><headline>HeadlineMetni</headline><navigator>NavigatorMetni</navigator><nav>GercekNav</nav></body>`;
    const out = mainText(html);
    expect(out).toContain("HeadlineMetni");
    expect(out).toContain("NavigatorMetni");
    expect(out).not.toContain("GercekNav");
  });

  it("handles uppercase tags and fragments without a <body>", () => {
    const out = mainText(`<NAV>UpperNav</NAV><p>Icerik burada</p><FOOTER>UpperFooter</FOOTER>`);
    expect(out).toContain("Icerik burada");
    expect(out).not.toContain("UpperNav");
    expect(out).not.toContain("UpperFooter");
  });

  it("returns an empty string for a page that is all chrome", () => {
    expect(mainText("<body><nav>a menu</nav><footer>a footer</footer></body>")).toBe("");
  });
});

describe("visibleText (unchanged behaviour)", () => {
  it("still includes nav / header / footer / cookie text", () => {
    const out = visibleText(PAGE);
    for (const kept of [
      "LogoMetni",
      "Anasayfa",
      "NavLinkBir",
      "RolNavMetni",
      "CerezBannerMetni",
      "GdprRizaMetni",
      "YanPanelMetni",
      "FormEtiketi",
      "HemenAraDugmesi",
      "AltBilgiMetni",
      PROSE_1,
      PROSE_2,
    ]) {
      expect(out, kept).toContain(kept);
    }
  });

  it("still strips scripts, styles and the <head>", () => {
    const out = visibleText(PAGE);
    expect(out).not.toContain("ScriptIcerigi");
    expect(out).not.toContain("color: red");
    expect(out).not.toContain("Sayfa Basligi Head");
  });
});
