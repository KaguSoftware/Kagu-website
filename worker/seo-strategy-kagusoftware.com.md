# SEO build brief — kagusoftware.com

You are an expert SEO engineer working inside the codebase of **kagusoftware.com** (Kagu). Execute this brief completely: apply the technical fixes, set up the SEO infrastructure files, and create/update the pages. Everything below was derived from the live site, the live search results, and a technical audit run on 2026-07-09.

## 0. Ground rules

1. Detect the framework first (Next.js App Router / Pages Router / other) and use its native idioms for metadata, robots, and sitemaps.
2. Reuse the existing design system, layout, and components — new pages must look native to the site, not bolted on.
3. Never invent business facts (prices, timelines, certifications, addresses). Pull them from the codebase or existing copy; where a fact is unknown, write `TODO(owner): …` and move on.
4. Work in reviewable chunks, in this order: infrastructure files (§7) → technical fixes (§6) → pages (§4).

## 1. What this site is

- **Brand:** Kagu
- **Sector:** Software — Boutique Operator Software
- **Core value proposition (lead with this on every page):** Custom-built software for boutique operators, focusing on what actually solves the problem
- **Audience:** Small teams and boutique operators in the hospitality and service industries
- **Market:** Istanbul, global · **Languages:** tr, en, ar
- **Offerings:** Custom websites; Digital tools; Full-stack platforms; Admin systems; Multilingual support
- **Problems it solves:** Reducing paperwork for teams; Streamlining operations; Improving customer experience; Simplifying complex systems
- **Differentiators:** Vertical depth; Small team focus; Production-oriented delivery; No awards or unnecessary features

Current intent coverage: informational — The site provides an overview of Kagu's services, mission, and values, as well as case studies and examples of their work; commercial — The site allows visitors to compare Kagu's services with others, and highlights their unique approach and focus on boutique operators; transactional — The site has a 'Start a project' section where visitors can estimate the cost of their project and send it over for further discussion, but it lacks a direct checkout or payment option; navigational — The site clearly owns its brand and has a consistent title and branding throughout.

## 2. Search landscape (live evidence)

These real searches were checked against the search results:

- `butik operatörler için yazılım` (informational) — **not in the top results**; currently won by dijimo.com.tr (#1), butiksoft.com (#2), venturats.com (#3)
- `custom website fiyatı` (commercial) — **not in the top results**; currently won by elementor.com (#1), softtr.com (#2), webflow.com (#3)
- `build your site Kagu` (transactional) — **not in the top results**; currently won by kagu-website.vercel.app (#1), buildyoursite.com (#2), buildyoursite.com (#3)
- `Kagu software for boutique operators` (navigational) — we rank **#2**; currently won by kagu-website.vercel.app (#1), kagusoftware.com (#2), kagusoftware.com (#3)
- `İstanbul'da butik operatörler için dijital araçlar` (informational) — **not in the top results**; currently won by braverytechnology.com (#1), leindigital.com (#2), nuvecore.com (#3)
- `full-stack platform maliyeti` (commercial) — **not in the top results**; currently won by dev.to (#1), gartner.com (#2), developer.gen.tr (#3)
- `start a project Kagu` (transactional) — we rank **#1**; currently won by kagusoftware.com (#1), kagu-website.vercel.app (#2), kagusoftware.com (#3)
- `Kagu work` (navigational) — we rank **#3**; currently won by kagu-website.vercel.app (#1), kagu-website.vercel.app (#2), kagusoftware.com (#3)
- `butik operatörler için admin sistemleri` (informational) — **not in the top results**; currently won by butiksistem.com (#1), butiksoft.com (#2), butiksoft.com (#3)
- `multilingual support fiyat teklifi` (commercial) — **not in the top results**; currently won by hizmetgo.app (#1), jotform.com (#2), jotform.com (#3)

Where the site is absent, the pages in §4 exist to change that. Where it already ranks, the fixes and content upgrades protect and improve the position. In addition, **53 real typed queries** were collected from Google Autocomplete around these topics — §4 tail queries marked ✓ come from that verified demand, not from inference.

_Search Console is not connected — connect it (worker/README.md) to ground future briefs in the site's own impression data._

### The market (competitor sites were crawled)

Found via the commercial/transactional searches above plus provider-finding market scans — informational and navigational SERPs excluded, those winners aren't the same business:

**kagu-website.vercel.app** (best rank #1; found via `build your site Kagu`, `start a project Kagu`) — Kagu sells custom websites and digital tools to boutique operators, focusing on Next.js and Supabase platforms for hospitality and service businesses.
- Targets: Custom websites; Digital tools; Full-stack platforms; Admin systems; Multilingual support; Boutique operators; Hospitality; Service businesses
- Leads with: Small team focus; Production-oriented; No awards or announcements, just delivery; Vertical depth compounds; Six things done well
- Gaps to exploit: Lack of pricing information; No clear process for handling complex projects; Limited information on support and maintenance services

**elementor.com** (best rank #1; found via `custom website fiyatı`) — Elementor offers a website builder and design tools for web creators, focusing on ease of use, flexibility, and professional results.
- Targets: Website builder; Web creation; Design tools; WordPress; Drag and drop; No code needed
- Leads with: Powerful and easy to use; Complete creative control; Fast and efficient; Professional standard
- Gaps to exploit: Limited focus on boutique operators or specific industries; No clear emphasis on multilingual support; Pricing plans may not be suitable for small teams or businesses

**Market read:** The market for website building and digital tools is competitive, with various players offering different solutions and focuses. Kagu stands out with its emphasis on boutique operators, Next.js, and Supabase platforms, but faces competition from more generalist website builders like Elementor. Openings exist for Kagu to differentiate itself through its small team focus, production-oriented approach, and multilingual support.

- **Table stakes** (every competitor offers these — a money page missing them loses by default): Custom website building; Digital tools and platforms; Ease of use and flexibility; Professional results and support; Pricing transparency
- **Standard angles** (repeated across the market — claiming them no longer differentiates): Powerful and easy to use; Complete creative control; Fast and efficient; Professional standard
- **Openings** (nobody covers these well — lead with them): Small team focus and boutique operator expertise; Production-oriented approach and delivery; Multilingual support and internationalization; Custom solutions for specific industries or needs; Transparent pricing and flexible plans

A topic several competitors target is table stakes — the matching §4 page must cover it at least as completely as they do. Their gaps and the market openings are the differentiation: work each one into the relevant §4 page's copy and FAQ.

## 3. Head keywords to own

Winnability assumes a small, low-authority domain: "easy" means the current top results include forums/UGC/thin pages a new page can outrank; "hard" means established brands own the SERP — win those through the easier clusters first.

| Keyword | Intent | Winnability | Why |
| --- | --- | --- | --- |
| Boutique Operator Software | navigational | medium | Kagu already ranks #2 for 'Kagu software for boutique operators' and has a consistent brand presence, making it a viable candidate for a navigational head topic. |
| Custom Website Fiyat | commercial | medium | The search query 'custom website fiyatı' has a mix of website builders and pricing pages in the top results, indicating an opportunity for Kagu to provide a more tailored solution for boutique operators, addressing the gap in pricing information noted in the market overview. |
| Butik Operatörler Dijital Araçlar | informational | easy | The top results for 'İstanbul'da butik operatörler için dijital araçlar' include digital marketing agencies and general information pages, providing an opportunity for Kagu to create a targeted guide for boutique operators in Istanbul, leveraging the opening for small team focus and multilingual support. |
| Full Stack Platform Maliyeti | commercial | medium | The search query 'full-stack platform maliyeti' has a mix of technical and pricing-related results, indicating a need for a clear and comprehensive pricing page for full-stack platforms tailored to boutique operators, addressing the gap in pricing transparency. |
| Start a Project | transactional | easy | Kagu already ranks #1 for 'start a project Kagu', indicating a strong foundation for a transactional head topic that can be expanded to include more project starting options and guidance for boutique operators. |
| Multilingual Support Fiyat | commercial | easy | The search query 'multilingual support fiyat teklifi' has results that are mostly unrelated to boutique operators or software, providing an opportunity for Kagu to offer targeted multilingual support services and pricing, leveraging the opening for multilingual support. |
| Admin Sistemleri | informational | easy | The top results for 'butik operatörler için admin sistemleri' include general admin system providers and some off-topic pages, indicating an opportunity for Kagu to create a guide or overview of admin systems specifically for boutique operators, addressing the gap in industry-specific solutions. |

## 4. Pages to create or update

Each page owns one **intent cluster**: a head topic plus representative queries. The queries are demand evidence — modern search retrieval (Google's ranking systems, AI Overviews, answer engines) matches passages by MEANING, entities, and topical completeness, not by exact phrase matching. So a page wins its cluster by fully covering its meaning, not by echoing the query strings. **Do not merge pages, and never let two pages cover the same cluster** — the assignments below are final and already deduplicated.

### 4.1 UPDATE `/`
- type: landing · intent: navigational · language: en
- head keyword: **Boutique Operator Software**
- `<title>` (≤60 chars): Boutique Operator Software
- meta description (70–160 chars): Custom-built software for boutique operators, streamlining operations and improving customer experience
- representative queries in this page's cluster (demand evidence — satisfy these searchers' MEANING; do not paste the strings; each cluster is exclusive to this page):
  - "Kagu software for boutique operators"
  - "Kagu work"
  - "Kagu"
  - "Boutique operator software solutions"
  - "Custom software for small teams"
  - "Boutique hospitality software"
  - "Service industry software solutions"
- entities & concepts the page must cover (topical completeness — this is what makes the page retrievable for queries nobody predicted): Custom-built software; Boutique operators; Small teams; Hospitality industry; Service industry; Istanbul; Global; Admin systems; Multilingual support; Digital tools
- outline (H2 headings, in order — each question-style heading gets an answer-first passage per §5):
  1. What is Boutique Operator Software?
  2. How Kagu's Software Helps Boutique Operators
  3. Key Features of Kagu's Custom-Built Software
  4. Benefits of Partnering with Kagu
  5. Why Choose Kagu for Your Software Needs?
- FAQ section (visible on the page AND mirrored verbatim in FAQPage JSON-LD):
  - Q: "What kind of software does Kagu offer for boutique operators?"
    → the first sentence of the answer must state: Kagu offers custom-built software, including custom websites, digital tools, full-stack platforms, and admin systems, all with multilingual support.
  - Q: "How does Kagu's software help boutique operators?"
    → the first sentence of the answer must state: Kagu's software helps boutique operators by reducing paperwork, streamlining operations, and improving customer experience.
  - Q: "What sets Kagu apart from other software providers?"
    → the first sentence of the answer must state: Kagu's vertical depth, small team focus, production-oriented delivery, and lack of unnecessary features set it apart from other software providers.

### 4.2 CREATE `/custom-website-fiyati`
- type: pricing · intent: commercial · language: tr
- head keyword: **Custom Website Fiyat**
- `<title>` (≤60 chars): Custom Website Fiyat
- meta description (70–160 chars): Özel web sitesi fiyatlarını keşfedin, Kagu ile küçük işletmeler için custom website çözümleri
- representative queries in this page's cluster (demand evidence — satisfy these searchers' MEANING; do not paste the strings; each cluster is exclusive to this page):
  - "custom website fiyatı"
  - "custom website builder" ✓ (verified: people type this into Google)
  - "custom website tasarım"
  - "custom website maliyeti"
  - "custom website örnekleri"
  - "custom website için gerekenler"
  - "custom website fiyat hesapla"
  - "custom website" ✓ (verified: people type this into Google)
- entities & concepts the page must cover (topical completeness — this is what makes the page retrievable for queries nobody predicted): Custom website; Fiyat; Kagu; Küçük işletmeler; Özel web sitesi; Tasarım; Maliyet; Süreç; İhtiyaçlar; Alternatifler
- outline (H2 headings, in order — each question-style heading gets an answer-first passage per §5):
  1. Custom Website Fiyatları
  2. Neden Custom Website?
  3. Custom Website Tasarım Süreci
  4. Custom Website Maliyeti
  5. Custom Website Örnekleri
  6. Sıkça Sorulan Sorular
- FAQ section (visible on the page AND mirrored verbatim in FAQPage JSON-LD):
  - Q: "Custom website fiyatı ne kadar?"
    → the first sentence of the answer must state: Custom website fiyatı, proje kapsamına ve gereksinimlere göre değişir, Kagu ile özel teklif alabilirsiniz.
  - Q: "Custom website nasıl yapılır?"
    → the first sentence of the answer must state: Custom website, uzman bir ekip tarafından tasarlanır ve geliştirilir, Kagu ile profesyonel çözümler sunuyoruz.
  - Q: "Custom website için ne kadar süre gerekir?"
    → the first sentence of the answer must state: Custom website süresi, proje karmaşıklığına ve gereksinimlere göre değişir, Kagu ile hızlı ve kaliteli çözümler sunuyoruz.

### 4.3 CREATE `/butik-operatoler-dijital-arac`
- type: guide · intent: informational · language: tr
- head keyword: **Butik Operatörler Dijital Araçlar**
- `<title>` (≤60 chars): Butik Operatörler Dijital Araçlar
- meta description (70–160 chars): Butik operatörler için özel dijital araçlar, İstanbul'da çözüm üretiyoruz. Butik operatörlerin işini kolaylaştıran yazılımlar
- representative queries in this page's cluster (demand evidence — satisfy these searchers' MEANING; do not paste the strings; each cluster is exclusive to this page):
  - "İstanbul'da butik operatörler için dijital araçlar"
  - "butik operatörler için yazılım"
  - "butik işletmeler için dijital çözümler"
  - "dijital araçlar butik otel işletmeleri"
  - "butik operatörler için özel yazılım çözümleri"
  - "butik işletmelerde dijital dönüşüm"
  - "butik operatörler için teknoloji çözümleri"
- entities & concepts the page must cover (topical completeness — this is what makes the page retrievable for queries nobody predicted): Butik operatörler; Dijital araçlar; Yazılım; İstanbul; Otel işletmeleri; Dijital dönüşüm; Teknoloji çözümleri; Özel yazılım çözümleri
- outline (H2 headings, in order — each question-style heading gets an answer-first passage per §5):
  1. Butik Operatörler İçin Dijital Araçlar Nelerdir?
  2. Butik İşletmelerde Dijital Dönüşüm
  3. Butik Operatörler İçin Özel Yazılım Çözümleri
  4. İstanbul'da Butik Operatörler İçin Dijital Araçlar
  5. Butik Otel İşletmeleri İçin Dijital Çözümler
- FAQ section (visible on the page AND mirrored verbatim in FAQPage JSON-LD):
  - Q: "Butik operatörler için dijital araçlar nelerdir?"
    → the first sentence of the answer must state: Butik operatörler için dijital araçlar, iş süreçlerini kolaylaştıran ve verimliliği artıran özel yazılımlardır.
  - Q: "Butik işletmelerde dijital dönüşüm nasıl yapılır?"
    → the first sentence of the answer must state: the direct factual answer
  - Q: "Butik operatörler için özel yazılım çözümleri nelerdir?"
    → the first sentence of the answer must state: Butik operatörler için özel yazılım çözümleri, butik işletmelerin özel ihtiyaçlarına göre tasarlanan ve geliştirilen yazılımlardır.

### 4.4 CREATE `/full-stack-platform-maliyeti`
- type: pricing · intent: commercial · language: tr
- head keyword: **Full Stack Platform Maliyeti**
- `<title>` (≤60 chars): Full Stack Platform Maliyeti
- meta description (70–160 chars): Kagu'dan full stack platform maliyeti ve çözümleri. Boutique işletmeler için özel yazılımlar.
- representative queries in this page's cluster (demand evidence — satisfy these searchers' MEANING; do not paste the strings; each cluster is exclusive to this page):
  - "full stack platform nedir"
  - "full stack platform geliştirme"
  - "full stack platform örnekleri"
  - "full stack platform fiyatları"
  - "full stack platform için gerekenler"
  - "full-stack platform" ✓ (verified: people type this into Google)
  - "full stack platform meaning" ✓ (verified: people type this into Google)
  - "full stack platform engineer" ✓ (verified: people type this into Google)
- entities & concepts the page must cover (topical completeness — this is what makes the page retrievable for queries nobody predicted): Full Stack Platform; Maliyet; Boutique İşletmeler; Özel Yazılımlar; Kagu; İstanbul; Global; Custom Websites; Digital Tools; Admin Sistemleri
- outline (H2 headings, in order — each question-style heading gets an answer-first passage per §5):
  1. Full Stack Platform Nedir?
  2. Full Stack Platform Maliyeti
  3. Full Stack Platform Geliştirme Süreci
  4. Full Stack Platform Örnekleri ve Kullanım Alanları
  5. Full Stack Platform İle Boutique İşletmelere Faydalar
  6. Full Stack Platform Maliyetini Etkileyen Faktörler
- FAQ section (visible on the page AND mirrored verbatim in FAQPage JSON-LD):
  - Q: "Full stack platform maliyeti nedir?"
    → the first sentence of the answer must state: Full stack platform maliyeti, işletmenizin büyüklüğüne, gereksinimlerine ve kullanılan teknolojiye göre değişebilir.
  - Q: "Full stack platform nasıl geliştirilir?"
    → the first sentence of the answer must state: Full stack platform geliştirmek için, uzman bir ekip ve doğru bir planlama gerekir.
  - Q: "Full stack platform için hangi teknolojiler kullanılır?"
    → the first sentence of the answer must state: Full stack platform geliştirmek için, çeşitli programlama dilleri ve framework'ler kullanılır.

### 4.5 UPDATE `/start-project`
- type: service · intent: transactional · language: en
- head keyword: **Start a Project**
- `<title>` (≤60 chars): Start Project
- meta description (70–160 chars): Begin your custom software project with Kagu, experts in boutique operator solutions
- representative queries in this page's cluster (demand evidence — satisfy these searchers' MEANING; do not paste the strings; each cluster is exclusive to this page):
  - "start a project Kagu"
  - "start a project with custom software"
  - "start a project in hospitality"
  - "start a project management system"
  - "start a project with small team"
  - "how to start a project"
  - "start a project with full-stack platform"
  - "start a project with claude code" ✓ (verified: people type this into Google)
- entities & concepts the page must cover (topical completeness — this is what makes the page retrievable for queries nobody predicted): Custom-built software; Boutique operators; Hospitality industry; Service industry; Small teams; Istanbul; Global; Admin systems; Multilingual support; Full-stack platforms
- outline (H2 headings, in order — each question-style heading gets an answer-first passage per §5):
  1. Getting Started with Your Custom Software Project
  2. Understanding Your Needs: How Kagu Listens and Maps Out a Solution
  3. The Process of Starting a Project with Kagu
  4. What to Expect: Timeline, Price Factors, and Requirements
  5. Why Choose Kagu for Your Boutique Operator Software Needs
- FAQ section (visible on the page AND mirrored verbatim in FAQPage JSON-LD):
  - Q: "How do I start a project with Kagu?"
    → the first sentence of the answer must state: To start a project with Kagu, begin by contacting us to discuss your custom software needs and requirements.
  - Q: "What is the process of starting a project?"
    → the first sentence of the answer must state: The process of starting a project with Kagu involves listening to your needs, mapping out a solution, shipping the product, and handing over the final result.
  - Q: "What kind of projects does Kagu handle?"
    → the first sentence of the answer must state: Kagu handles custom-built software projects for boutique operators in the hospitality and service industries, including custom websites, digital tools, and full-stack platforms.

### 4.6 CREATE `/multilingual-support-fiyat`
- type: pricing · intent: commercial · language: tr
- head keyword: **Multilingual Support Fiyat**
- `<title>` (≤60 chars): Multilingual Support Fiyat
- meta description (70–160 chars): Kagu'dan multilingual destek fiyat teklifi alın, işletmenizi büyütün — TODO: rewrite to 70–160 chars in the page's language (draft is 68)
- representative queries in this page's cluster (demand evidence — satisfy these searchers' MEANING; do not paste the strings; each cluster is exclusive to this page):
  - "multilingual support fiyat teklifi"
  - "fiyat teklif formu pdf" ✓ (verified: people type this into Google)
  - "what is multilingual support" ✓ (verified: people type this into Google)
  - "multilingual destek fiyatları"
  - "çift dilli destek fiyatı"
  - "çok dilli destek hizmeti fiyatı"
- entities & concepts the page must cover (topical completeness — this is what makes the page retrievable for queries nobody predicted): Kagu; multilingual destek; fiyat teklifi; çift dilli destek; çok dilli destek; işletme; bürokrasi; dijital araçlar; İstanbul
- outline (H2 headings, in order — each question-style heading gets an answer-first passage per §5):
  1. Multilingual Destek Nedir?
  2. Multilingual Destek Fiyatları
  3. Fiyat Teklif Formu Oluşturma
  4. Multilingual Destek Hizmetleri
  5. İşletmenize Uygun Fiyat Teklifi
- FAQ section (visible on the page AND mirrored verbatim in FAQPage JSON-LD):
  - Q: "Multilingual destek nedir?"
    → the first sentence of the answer must state: Multilingual destek, birden fazla dilde destek hizmeti sunan bir sistemdir.
  - Q: "Multilingual destek fiyatı nasıl belirlenir?"
    → the first sentence of the answer must state: Multilingual destek fiyatı, destek gereksinimlerine ve işletmenin büyüklüğüne göre belirlenir.
  - Q: "Fiyat teklif formu nasıl oluşturulur?"
    → the first sentence of the answer must state: Fiyat teklif formu, Kagu'nun resmi web sitesinde bulunan fiyat teklif formu oluşturucu ile oluşturulabilir.

### 4.7 CREATE `/admin-sistemleri`
- type: guide · intent: informational · language: tr
- head keyword: **Admin Sistemleri**
- `<title>` (≤60 chars): Admin Sistemleri
- meta description (70–160 chars): Butik operatörler için özel admin sistemleri çözümleri, Kagu ile işinizi kolaylaştırın
- representative queries in this page's cluster (demand evidence — satisfy these searchers' MEANING; do not paste the strings; each cluster is exclusive to this page):
  - "butik operatörler için admin sistemleri"
  - "otel yönetimi için admin sistemleri"
  - "hizmet sektörü için admin sistemleri"
  - "butik işletmeler için özel yazılım çözümleri"
  - "admin sistemleri nedir"
  - "admin sistemleri faydaları"
- entities & concepts the page must cover (topical completeness — this is what makes the page retrievable for queries nobody predicted): Kagu; butik operatörler; admin sistemleri; otel yönetimi; hizmet sektörü; özel yazılım çözümleri; işletme yönetimi; verimlilik artırma; maliyet azaltma
- outline (H2 headings, in order — each question-style heading gets an answer-first passage per §5):
  1. Butik Operatörler için Admin Sistemleri Nedir?
  2. Admin Sistemleri Nasıl Çalışır?
  3. Butik İşletmeler için Admin Sistemleri Neden Önemlidir?
  4. Otel Yönetimi için Admin Sistemleri Çözümleri
  5. Hizmet Sektörü için Admin Sistemleri Çözümleri
- FAQ section (visible on the page AND mirrored verbatim in FAQPage JSON-LD):
  - Q: "Butik operatörler için admin sistemleri nedir?"
    → the first sentence of the answer must state: Butik operatörler için admin sistemleri, iş süreçlerini kolaylaştıran ve verimliliği artıran özel yazılımlardır.
  - Q: "Admin sistemleri nasıl çalışır?"
    → the first sentence of the answer must state: Admin sistemleri, işletmenin tüm bölümlerini bir araya getirerek, iş süreçlerini otomatikleştirir ve kolaylaştırır.
  - Q: "Butik işletmeler için admin sistemleri neden önemlidir?"
    → the first sentence of the answer must state: Butik işletmeler için admin sistemleri, maliyetleri azaltarak ve verimliliği artırarak, işletmenin büyümesine katkıda bulunur.

## 5. Writing rules — every page, non-negotiable

These rules make pages semantically complete for modern retrieval, make sentences liftable verbatim into Google AI Overviews and AI assistants (ChatGPT/Perplexity/Claude), and convert humans.

1. **Write for meaning, not for strings.** Cover the cluster's questions and entities completely, in natural language with natural variation. Never repeat a keyword mechanically — retrieval is semantic, so phrase repetition adds nothing and reads as spam to modern rankers. A heading should clearly address a question from §4; natural phrasing beats verbatim query text.
2. **Answer first.** Under every question-style H2, the FIRST sentence must fully answer the question and stand alone out of context: name the subject explicitly (never open with "It", "We", or "This"), make one claim, stay under ~40 words. Elaboration comes after, never before — this is the passage AI Overviews lift.
3. **One fact per sentence.** Prices, timeframes, counts, and requirements each get their own short sentence — extractable units, not comma chains.
4. **Topical completeness.** Each page must cover every item in its §4 entities list — the offering, its attributes, process, price factors, who it's for, alternatives. That coverage is what lets one page rank for the whole cluster, including queries nobody predicted.
5. **Structure for extraction.** Numbered lists for steps and processes, tables for comparisons and prices, bold for key terms. Paragraphs of 2–3 sentences max.
6. **FAQ answers are 40–80 words**, self-contained, and open with a direct yes/no/number/definition. The visible Q&A text and the FAQPage JSON-LD must match verbatim — Google cross-checks, and a mismatch voids rich-result eligibility.
7. **Real facts only** (ground rule 3). A fabricated price lifted into an AI Overview is worse than no snippet.
8. **Language discipline.** Write each page entirely in its `language` from §4 — no mixed-language pages; keep terminology consistent with how its audience actually talks about the topic.
9. **Internal links as a topic cluster.** Link the informational pages to their money page and back, with descriptive anchors — never "click here". Every §4 page needs at least two internal links pointing at it; search engines read that link structure as topical authority.

## 6. Technical fixes (from the site audit)

Technical audit score: **89/100** across 6 audited page(s). Apply every fix below (ordered most severe first). "Where" lists the exact offending elements found.
**6.1 [ERROR] Legible font sizes** — On 6 of 6 pages — 67 of 257 text elements render below 12px on mobile.
- Fix: Use ≥12px (ideally 16px) for body text on mobile — check the elements below for the classes to change.
- Where: [/] span.kagu-hero__meta-sep "· Est. 2025 · Istanbul" — 11.5px; [/] span.eyebrow.inline-flex "02What we build" — 11.1px; [/] span "02" — 11.1px; [/] span "What we build" — 11.1px
- Pages: /, /work, /about, /contact, /start-project, /mesafeli-satis
**6.2 [ERROR] Total page weight** — Page transfers 5.3 MB over 26 requests.
- Fix: Compress/resize the heaviest assets below, lazy-load below-the-fold media, drop unused scripts. Target ≤1.5 MB.
- Where: [/work] Thumbnail.png (image, 4603 KB); [/work] ThumbnailVize.png (image, 456 KB); [/work] 0hyqels39~h4u.js (script, 71 KB); [/work] 0~hqkep2lt.jm.js (script, 63 KB)
- Pages: /work
**6.3 [WARN] Canonical URL** — On 6 of 6 pages — No <link rel="canonical">.
- Fix: Add <link rel="canonical" href="https://kagusoftware.com"> to <head>.
- Pages: /, /work, /about, /contact, /start-project, /mesafeli-satis
**6.4 [WARN] Structured data present** — On 6 of 6 pages — No JSON-LD structured data on the page.
- Fix: Add a JSON-LD block: LocalBusiness/Organization with name, address, phone, opening hours — or Product/FAQPage/Service as fits the page.
- Pages: /, /work, /about, /contact, /start-project, /mesafeli-satis
**6.5 [WARN] Width/height attributes** — On 3 of 6 pages — 4 of 6 images lack width/height attributes.
- Fix: Set width and height attributes (or CSS aspect-ratio) on every <img>.
- Where: [/] <img src="…image">; [/] <img src="…image">; [/] <img src="…image">; [/] <img src="…image">
- Pages: /, /work, /about
**6.6 [WARN] <title> length** — On 2 of 6 pages — <title> is 11 characters — too short to carry a keyword and brand.
- Fix: Expand it to 'Primary Keyword – Brand' (15–60 chars).
- Where: [/work] <title> "Work · Kagu"; [/about] <title> "About · Kagu"
- Pages: /work, /about
**6.7 [WARN] Enough text content** — On 2 of 6 pages — Only ~219 words of visible text.
- Fix: Add real copy: what the business does, services, prices, location, FAQs. Aim for 300+ useful words.
- Pages: /work, /contact
**6.8 [WARN] No skipped heading levels** — Heading hierarchy skips levels in 1 place(s).
- Fix: Don't jump levels — a subsection of an <h1> section should be <h2>, not <h3>. Use CSS for sizing, headings for structure.
- Where: [/about] h1 → h3 at "Majed Ahdab"; [/about] — page outline —; [/about] h1 "Thepeoplebehindthework."; [/about]     h3 "Majed Ahdab"
- Pages: /about
**6.9 [WARN] Tap target size** — 15 of 73 links/buttons are smaller than 40×40px on mobile.
- Fix: Give interactive elements ~44×44px touch area (padding counts) or more spacing between them.
- Where: [/start-project] button — 25×25px; [/start-project] button — 22×22px; [/start-project] button — 22×22px; [/start-project] button — 22×22px
- Pages: /start-project
**6.10 [WARN] CLS — layout shift** — Cumulative layout shift is 0.125 (good ≤ 0.1) — content jumps around while loading.
- Fix: Set width/height on images and embeds, reserve space for banners/ads, don't insert content above existing content.
- Pages: /
**6.11 [WARN] LCP — largest contentful paint** — LCP is 2.5s on a throttled mobile connection (good ≤ 2.5s, poor > 4s).
- Fix: Optimize the LCP element below: compress/preload it if it's an image, inline critical CSS, defer non-essential JS.
- Where: [/work] LCP element: h1.kagu-work__h1.display
- Pages: /work
**6.12 [WARN] No oversized image files** — 2 image(s) over 300 KB.
- Fix: Resize to the displayed dimensions and serve WebP/AVIF — typically 60–90% smaller.
- Where: [/work] Thumbnail.png — 4603 KB; [/work] ThumbnailVize.png — 456 KB
- Pages: /work
**6.13 [WARN] Answer-first passages under question headings** — 1 of 1 question-style heading(s) lack a liftable, answer-first passage.
- Fix: Under each question heading, make the FIRST sentence fully answer the question and stand alone: name the subject explicitly, make one claim, stay under ~40 words. Elaborate after, never before.
- Where: [/about] "How we work." — no answer text directly under the heading
- Pages: /about
**6.14 [WARN] Content readable without JavaScript** — Only ~59% of the page's text exists in the raw HTML — the rest is built by JavaScript.
- Fix: Server-render (SSR/SSG) the main copy — answer passages and FAQs above all — so it's in the initial HTML response.
- Pages: /contact
**6.15 [INFO] llms.txt present** — On 6 of 6 pages — No llms.txt found for the site.
- Fix: Serve a plain-text/markdown llms.txt at the site root: one line per key page — `- [Title](https://…): what it answers`.
- Pages: /, /work, /about, /contact, /start-project, /mesafeli-satis
**6.16 [INFO] <h1> relates to <title>** — On 3 of 6 pages — The <h1> shares no significant word with the <title>.
- Fix: Align them on the page's core keyword (they shouldn't be identical, just clearly about the same thing).
- Where: [/about] <title> "About · Kagu"; [/about] <h1> "Thepeoplebehindthework."; [/contact] <title> "Kagu · Software for boutique operators"; [/contact] <h1> "Let's talk."
- Pages: /about, /contact, /start-project
**6.17 [INFO] Content is dateable** — On 3 of 6 pages — No machine-readable dates (JSON-LD datePublished/dateModified, article:* meta, or <time datetime>) on a content-heavy page.
- Fix: Add dateModified/datePublished to the page's JSON-LD (or a visible <time datetime="…"> near the content).
- Pages: /, /about, /mesafeli-satis
**6.18 [INFO] Meta description length** — On 2 of 6 pages — Meta description is 33 characters — too short to fill the snippet.
- Fix: Rewrite to 70–160 chars including the primary keyword.
- Where: [/work] "Selected work from Kagu Software."; [/mesafeli-satis] "Kagu üzerinden sunulan dijital/yazılım hizmetlerinin satışına ilişkin mesafeli satış sözleşmesi. Distance sales agreemen…"
- Pages: /work, /mesafeli-satis
**6.19 [INFO] Question-style content exists** — On 2 of 6 pages — No question-style headings (FAQ-like sections) found on the page.
- Fix: Add a short FAQ section: 2–5 real customer questions as <h2>/<h3>, each answered in the first sentence below it.
- Pages: /, /start-project
Already passing (don't regress these): Exactly one <h1> · No empty headings · <title> present · Meta description present · <html lang> attribute · Charset declared · Social preview tags · Content present in raw HTML (SSR) · Viewport meta tag · No horizontal overflow · TTFB — server response time · Request count · Render-blocking resources · Text compression · Alt text on images · Page returns HTTP 200 · Served over HTTPS · No noindex · robots.txt allows this page · Short redirect chain · URL listed in sitemap.xml · HTTP/2 enabled · No broken internal links · Descriptive anchor text · No insecure http:// subresources · AI crawlers allowed · Lazy loading

## 7. SEO infrastructure files

**robots** — `app/robots.ts` in Next.js App Router (otherwise a static `public/robots.txt`), producing:

```
User-agent: *
Allow: /

# AI / answer-engine crawlers — explicitly allowed so the site can be
# read and cited by AI Overviews and assistants.
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://kagusoftware.com/sitemap.xml
```

**sitemap** — `app/sitemap.ts` (or generated `sitemap.xml`) listing every indexable page **including every §4 page**, with real `lastModified` dates. Declare it in robots as above.

**llms.txt** — serve at `https://kagusoftware.com/llms.txt` (static file in `public/`). AI assistants use it as a curated map of the site:

```
# Kagu
> Kagu — Software (Boutique Operator Software). Custom websites, Digital tools, Full-stack platforms, Admin systems. Serving Istanbul, global.

## Pages
- [Home](https://kagusoftware.com/): what Kagu does and who it serves
- [Boutique Operator Software](https://kagusoftware.com/): Custom-built software for boutique operators, streamlining operations and improving customer experience
- [Custom Website Fiyat](https://kagusoftware.com/custom-website-fiyati): Özel web sitesi fiyatlarını keşfedin, Kagu ile küçük işletmeler için custom website çözümleri
- [Butik Operatörler Dijital Araçlar](https://kagusoftware.com/butik-operatoler-dijital-arac): Butik operatörler için özel dijital araçlar, İstanbul'da çözüm üretiyoruz. Butik operatörlerin işini kolaylaştıran yazılımlar
- [Full Stack Platform Maliyeti](https://kagusoftware.com/full-stack-platform-maliyeti): Kagu'dan full stack platform maliyeti ve çözümleri. Boutique işletmeler için özel yazılımlar.
- [Start Project](https://kagusoftware.com/start-project): Begin your custom software project with Kagu, experts in boutique operator solutions
- [Multilingual Support Fiyat](https://kagusoftware.com/multilingual-support-fiyat): Kagu'dan multilingual destek fiyat teklifi alın, işletmenizi büyütün
- [Admin Sistemleri](https://kagusoftware.com/admin-sistemleri): Butik operatörler için özel admin sistemleri çözümleri, Kagu ile işinizi kolaylaştırın
```

**Per-page metadata** — on every page (including existing ones): a self-referencing canonical, the unique `<title>` and meta description from §4, `og:title` / `og:description` / `og:image` (1200×630) and `twitter:card`. Because the site serves tr + en + ar, add `hreflang` alternates linking each language version pair, plus `x-default`.

**Structured data (JSON-LD)** —
- Sitewide: `Organization` (name, url, logo, `sameAs` social profiles; use `LocalBusiness` with address/geo/openingHours if there is a physical presence in Istanbul, global).
- Service/product landing pages (§4): `Service` or `Product` with name, description, provider, `areaServed`.
- Every page with a visible FAQ section: `FAQPage` mirroring the on-page Q&A verbatim.
- Pages deeper than one level: `BreadcrumbList`.

## 8. Off-page authority — owner checklist (append to the TODO list you output)

On-page work alone rarely beats established domains: most "hard" keywords in §3 are hard because of domain authority, which is built off-page. These are OWNER actions, not code — append each as `TODO(owner): …` to the final TODO list so nothing is lost:

1. **Google Business Profile** (critical for Istanbul, global searches with local intent): claim/create the profile, set the primary category to match §1, add photos, list the §1 offerings as services, and keep name/address/phone identical to the site. Ask every satisfied client for a review with a direct review link; reply to all of them.
2. **Citations**: list the business (with identical name/address/phone and a link) in the market's relevant directories — the general ones plus the sector's own, in tr where the directory supports it. Consistency matters more than volume.
3. **Starter backlinks**: links from real, related sites — clients ("built by" credit), partners and suppliers, local chambers/associations, event or community sponsorships, and profile pages (GitHub/portfolio/social) pointing at the site. Never buy bulk links; a handful of real ones beats hundreds of junk ones.
4. **Review velocity**: a repeatable ask-for-review step in the delivery process (email/WhatsApp template with the direct link) so reviews accumulate steadily instead of in bursts.

## 9. Anti-duplication rules

1. Each intent cluster in §4 belongs to exactly one page — the assignment is final. Never create a second page whose *meaning* overlaps an existing cluster, even with different wording; semantic retrieval treats them as duplicates competing against each other.
2. Before creating any §4 "create" page, search the codebase for existing pages/sections already covering its head topic. If one exists, upgrade it in place (treat it as "update") instead of shipping a competitor to your own page.
3. If two existing pages already overlap on a topic, merge them into the stronger URL and 301-redirect the weaker one.
4. One canonical page per topic × intent × language. Language variants cross-reference via hreflang, never via duplicated same-language content.
5. Every page's title and meta description must be unique across the site.

## 10. Acceptance checklist

- [ ] Every §4 page is live, in the sitemap, and reachable through at least two internal links with descriptive anchors.
- [ ] Every §4 page: exactly one `<h1>`, title ≤ 60 chars, meta description 70–160 chars, self-referencing canonical.
- [ ] Every §4 cluster question is answered by a self-contained, answer-first passage (§5 rule 2), and every §4 entities list is fully covered (§5 rule 4).
- [ ] FAQPage JSON-LD matches the visible FAQ text verbatim on every page that has one.
- [ ] robots, sitemap, and llms.txt are deployed and reachable at their URLs.
- [ ] All §6 audit fixes are applied and none of the "already passing" checks regressed.
- [ ] No two pages target the same query; no duplicated titles/descriptions (§9).
- [ ] Every §8 off-page item appears as a TODO(owner) line in the final TODO list.
- [ ] All remaining `TODO(owner):` markers are collected in a list for the owner to fill in.
