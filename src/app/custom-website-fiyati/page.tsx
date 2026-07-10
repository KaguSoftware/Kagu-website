/*
  §4.2 — /custom-website-fiyati (TR, pricing · commercial).
  Cluster: "custom website fiyatı" ve türevleri. EN eşleniği: /custom-website-pricing.
  Fiyatlar tek kaynaktan gelir: src/components/start-project/catalog.ts.
*/

import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import {
  SeoHero,
  SeoSection,
  P,
  A,
  SeoList,
  PriceTable,
  FaqSection,
  CtaBand,
} from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  pageMetadata,
  serviceJsonLd,
  webPageJsonLd,
  breadcrumbJsonLd,
  type FaqItem,
} from "@/lib/seo";
import {
  WEBSITE_TYPES,
  FEATURES,
  formatPrice,
  BRANDING_PRICE,
} from "@/components/start-project/catalog";

const PATH = "/custom-website-fiyati";
const EN_PATH = "/custom-website-pricing";
const TITLE = "Custom Website Fiyatı · Kagu";
const DESCRIPTION =
  "Custom website fiyatları: paket bazlı gerçek fiyatlar, tasarım süreci ve maliyeti etkileyen faktörler. Kagu ile küçük işletmeler için özel web sitesi çözümleri.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  lang: "tr",
  enPath: EN_PATH,
  trPath: PATH,
});

const FAQS: FaqItem[] = [
  {
    q: "Custom website fiyatı ne kadar?",
    a: "Custom website fiyatı, proje kapsamına ve gereksinimlere göre değişir, Kagu ile özel teklif alabilirsiniz. Başlangıç paketleri 30.000 ₺ (portfolyo) ile 80.000 ₺ (e-ticaret) arasındadır. Rezervasyon, çok dillilik veya admin paneli gibi eklentiler kapsama göre fiyata eklenir. Proje oluşturucu ile seçimlerinizin anlık toplamını görebilirsiniz.",
  },
  {
    q: "Custom website nasıl yapılır?",
    a: "Custom website, uzman bir ekip tarafından tasarlanır ve geliştirilir, Kagu ile profesyonel çözümler sunuyoruz. Süreç dört adımdan oluşur: ihtiyacı dinleriz, çözümü haritalarız, Next.js ve Supabase ile geliştiririz ve canlıya alıp teslim ederiz. Tasarım hazır şablondan değil, işletmenizin gerçek iş akışından çıkar.",
  },
  {
    q: "Custom website için ne kadar süre gerekir?",
    a: "Custom website süresi, proje karmaşıklığına ve gereksinimlere göre değişir, Kagu ile hızlı ve kaliteli çözümler sunuyoruz. Üretim haftalar içinde canlıya alınır; çeyrek yıllara yayılmaz. Kapsam netleştikten sonra teklifle birlikte size net bir zaman planı iletilir.",
  },
];

export default function CustomWebsiteFiyatiPage() {
  const [portfolio, service, restaurant, ecommerce] = [
    WEBSITE_TYPES.find((t) => t.id === "portfolio")!,
    WEBSITE_TYPES.find((t) => t.id === "service")!,
    WEBSITE_TYPES.find((t) => t.id === "restaurant")!,
    WEBSITE_TYPES.find((t) => t.id === "ecommerce")!,
  ];
  const feature = (id: string) => FEATURES.find((f) => f.id === id)!;

  return (
    // TR page inside the EN root layout — declare the content language here.
    <div lang="tr">
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "tr" })}
      />
      <JsonLd
        data={serviceJsonLd({
          name: "Custom Website (Özel Web Sitesi)",
          description:
            "Butik operatörler ve küçük işletmeler için özel tasarlanan, Next.js ve Supabase ile geliştirilen web siteleri.",
          path: PATH,
          lang: "tr",
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Custom Website Fiyatı", path: PATH },
        ])}
      />

      <SeoHero
        eyebrow="Fiyatlandırma · Custom Website"
        title="Custom website fiyatı: gerçek rakamlar, net kapsam."
        lede="Özel web sitesi fiyatları gizli değil. Kagu'da her paket gerçek bir fiyatla listelenir; kapsam değişirse fiyat da şeffaf biçimde değişir. Bu sayfada paket fiyatlarını, tasarım sürecini ve maliyeti belirleyen faktörleri bulacaksınız."
        langSwitchHref={EN_PATH}
        langSwitchLabel="View in English"
      />

      <SeoSection index={0} eyebrow="Fiyatlar" title="Custom website fiyatları">
        <P>
          Kagu&apos;da custom website fiyatları site türüne göre {formatPrice(portfolio.basePrice)}{" "}
          ile {formatPrice(ecommerce.basePrice)} arasında başlar. Her paket; tasarım, geliştirme,
          yayına alma ve teslimi kapsar. Fiyatlar Türk Lirası cinsindendir ve KDV dâhildir.
        </P>
        <PriceTable
          headers={["Site türü", "Kime uygun", "Başlangıç fiyatı"]}
          rows={[
            [portfolio.label, "Stüdyolar, portfolyolar, vaka çalışmaları", formatPrice(portfolio.basePrice)],
            [service.label, "Klinikler, salonlar, ajanslar — talep toplayan siteler", formatPrice(service.basePrice)],
            [restaurant.label, "Restoranlar — menü, atmosfer, rezervasyon", formatPrice(restaurant.basePrice)],
            [ecommerce.label, "Katalog, sepet ve ödeme akışıyla online mağazalar", formatPrice(ecommerce.basePrice)],
          ]}
          note="Fiyatlar TL cinsindendir, KDV dâhildir. Ödemeler iyzico altyapısıyla Visa/MasterCard üzerinden güvenle alınır."
        />
        <P>
          Kesin rakam için{" "}
          <A href="/start-project">proje oluşturucuda paketinizi kurup anlık fiyat</A> görebilir
          veya <A href="/contact">bize yazarak</A> özel teklif isteyebilirsiniz. 24 saat içinde
          yanıt veriyoruz.
        </P>
      </SeoSection>

      <SeoSection index={1} eyebrow="Neden" title="Neden custom website?">
        <P>
          Custom website, hazır şablonların aksine işletmenizin gerçek iş akışına göre tasarlanan
          ve yalnızca ihtiyacınız olan özellikleri içeren web sitesidir. Şablon site kurucular
          genel çözümler sunar; butik bir işletmenin rezervasyon akışı, çok dilli müşteri kitlesi
          veya kendine özgü operasyonu genellikle bu kalıplara sığmaz.
        </P>
        <P>
          Kagu butik operatörlere odaklanır: küçük ekipler, konaklama ve hizmet sektörleri.
          Sitenizle birlikte işleyişinizi de düşünürüz — örneğin talepleri yapılandırılmış
          WhatsApp veya Telegram mesajı olarak almak, ya da içeriği kendi{" "}
          <A href="/admin-sistemleri">admin panelinizden</A> yönetmek. Gereksiz özellik satmayız;
          işi çözen en küçük sistemi kurarız.
        </P>
      </SeoSection>

      <SeoSection index={2} eyebrow="Süreç" title="Custom website tasarım süreci">
        <P>
          Custom website tasarım süreci Kagu&apos;da dört adımdan oluşur ve üretim haftalar içinde
          canlıya alınır. Her adımın çıktısı somuttur; ne aldığınızı her aşamada görürsünüz.
        </P>
        <SeoList
          ordered
          items={[
            <>
              <strong>Dinleme.</strong> Neyi kolaylaştırmak istediğinizi konuşuruz — formdan değil,
              işleyişinizden yola çıkarız.
            </>,
            <>
              <strong>Haritalama.</strong> Kapsamı, sayfaları ve özellikleri netleştirip fiyat ve
              zaman planıyla birlikte size sunarız.
            </>,
            <>
              <strong>Geliştirme.</strong> Siteyi Next.js ve Supabase ile kurarız; tasarım
              markanıza göre sıfırdan yapılır.
            </>,
            <>
              <strong>Teslim.</strong> Site canlıya alınır ve yönetim tamamen size geçer — teslim,
              bize ihtiyacınızın bittiği andır.
            </>,
          ]}
        />
      </SeoSection>

      <SeoSection index={3} eyebrow="Maliyet" title="Custom website maliyetini ne belirler?">
        <P>
          Custom website maliyetini üç faktör belirler: site türü, seçilen özellikler ve tasarım
          derinliği. Baz paket sitenin iskeletini karşılar; ihtiyacınız olan eklentiler net
          fiyatlarla üzerine eklenir.
        </P>
        <PriceTable
          headers={["Eklenti", "Ne sağlar", "Fiyat"]}
          rows={[
            [feature("cms").label, "İçeriği geliştiriciye ihtiyaç duymadan kendiniz yönetin", `+ ${formatPrice(feature("cms").price)}`],
            [feature("booking").label, "Takvim, saat aralıkları, onaylar", `+ ${formatPrice(feature("booking").price)}`],
            [feature("multilang").label, "Her sayfa, ihtiyacınız olan her dilde", `+ ${formatPrice(feature("multilang").price)}`],
            [feature("payments").label, "Kart ve yerel yöntemlerle online ödeme", `+ ${formatPrice(feature("payments").price)}`],
            [feature("seo").label, "Teknik SEO, yapılandırılmış veri, site haritaları", `+ ${formatPrice(feature("seo").price)}`],
            ["Marka kimliği", "Renk seçmek yerine kimliği biz tasarlarız", `+ ${formatPrice(BRANDING_PRICE)}`],
          ]}
          note="Tüm eklenti fiyatları güncel kataloğumuzdan gelir; tam liste proje oluşturucudadır."
        />
        <P>
          Çok dilli bir site planlıyorsanız{" "}
          <A href="/multilingual-support-fiyat">multilingual destek fiyatları</A> sayfasında
          ayrıntılar var. Sitenin ötesinde yönetim paneli ve iş akışı gerekiyorsa{" "}
          <A href="/full-stack-platform-maliyeti">full stack platform maliyeti</A> sayfası doğru
          başlangıç noktası.
        </P>
      </SeoSection>

      <SeoSection index={4} eyebrow="Örnekler" title="Custom website örnekleri">
        <P>
          Kagu&apos;nun custom website örnekleri konaklama ve hizmet sektörlerinden gelir; hepsi
          üretimde, gerçek müşterilerle çalışan sitelerdir. Turizm, vize danışmanlığı ve yeme-içme
          gibi alanlarda müşteriye açık site ile operatörün kullandığı admin panelini aynı veri
          tabanı üzerinde kuruyoruz.
        </P>
        <P>
          Yayında olan projeleri ekran görüntüleri ve kapsam notlarıyla birlikte{" "}
          <A href="/work">işlerimiz sayfasında</A> inceleyebilirsiniz. Butik işletmenize hangi
          dijital araçların uyduğunu görmek için{" "}
          <A href="/butik-operatoler-dijital-arac">butik operatörler için dijital araçlar</A>{" "}
          rehberine göz atın.
        </P>
      </SeoSection>

      <FaqSection index={5} title="Sıkça sorulan sorular" faqs={FAQS} />

      <CtaBand
        title="Paketinizi kurun, fiyatı anında görün."
        href="/start-project"
        label="Fiyat hesapla"
        secondaryHref="/proje-baslat"
        secondaryLabel="Süreci okuyun"
      />

      <SiteFooter />
    </div>
  );
}
