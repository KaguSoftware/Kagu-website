/*
  §4.6 — /multilingual-support-fiyat (TR, pricing · commercial).
  Cluster: "multilingual support fiyat teklifi", "çok dilli destek fiyatı" vb.
  EN eşleniği: /multilingual-support-pricing. Fiyatlar catalog.ts'ten gelir.
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
import { FEATURES, formatPrice } from "@/components/start-project/catalog";

const PATH = "/multilingual-support-fiyat";
const EN_PATH = "/multilingual-support-pricing";
const TITLE = "Multilingual Support Fiyat Teklifi · Kagu";
const DESCRIPTION =
  "Multilingual (çok dilli) destek fiyatları: sitenizi Türkçe, İngilizce ve Arapça dâhil birden çok dilde yayınlayın. Net fiyatlar ve hızlı teklif — Kagu.";

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
    q: "Multilingual destek nedir?",
    a: "Multilingual destek, birden fazla dilde destek hizmeti sunan bir sistemdir. Web sitesi bağlamında bu; her sayfanın, formun ve e-postanın müşterinin dilinde yayınlanması anlamına gelir. Kagu'da multilingual destek tam i18n altyapısıyla kurulur: dil seçimi, çeviri yönetimi ve Arapça-Farsça için sağdan sola (RTL) yerleşim dâhil.",
  },
  {
    q: "Multilingual destek fiyatı nasıl belirlenir?",
    a: "Multilingual destek fiyatı, destek gereksinimlerine ve işletmenin büyüklüğüne göre belirlenir. Kagu'da çok dillilik eklentisi 15.000 ₺'dir ve ihtiyacınız olan her dili kapsar; Arapça ve Farsça için sağdan sola (RTL) yerleşim desteği 10.000 ₺ ek fiyatla sunulur. Fiyatlar TL cinsindendir ve KDV dâhildir.",
  },
  {
    q: "Fiyat teklif formu nasıl oluşturulur?",
    a: "Fiyat teklif formu, Kagu'nun resmi web sitesinde bulunan fiyat teklif formu oluşturucu ile oluşturulabilir. Proje oluşturucuda site türünüzü seçer, çok dillilik dâhil istediğiniz özellikleri işaretlersiniz; toplam fiyat anlık olarak güncellenir. Seçimlerinizi tek tıkla bize gönderir, 24 saat içinde yanıt alırsınız.",
  },
];

export default function MultilingualSupportFiyatPage() {
  const multilang = FEATURES.find((f) => f.id === "multilang")!;
  const rtl = FEATURES.find((f) => f.id === "rtl")!;
  const llm = FEATURES.find((f) => f.id === "llm")!;

  return (
    // TR page inside the EN root layout — declare the content language here.
    <div lang="tr">
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "tr" })}
      />
      <JsonLd
        data={serviceJsonLd({
          name: "Multilingual Destek (Çok Dilli Site)",
          description:
            "Web sitelerinde tam i18n: her sayfa birden çok dilde, Arapça/Farsça için RTL yerleşim desteğiyle.",
          path: PATH,
          lang: "tr",
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Multilingual Support Fiyatı", path: PATH },
        ])}
      />

      <SeoHero
        eyebrow="Fiyatlandırma · Multilingual Destek"
        title="Multilingual destek fiyatı ve teklif süreci."
        lede="İstanbul'da müşteri kitlesi tek dil konuşmuyor. Bu sayfada çok dilli (multilingual) site desteğinin ne olduğunu, net fiyatını ve dakikalar içinde nasıl fiyat teklifi oluşturacağınızı bulacaksınız."
        langSwitchHref={EN_PATH}
        langSwitchLabel="View in English"
      />

      <SeoSection index={0} eyebrow="Tanım" title="Multilingual destek nedir?">
        <P>
          Multilingual destek, web sitenizin ve dijital araçlarınızın birden fazla dilde hizmet
          vermesidir: her sayfa, her form ve her otomatik e-posta müşterinin kendi dilinde görünür.
          Basit bir çeviri eklentisinden farkı, tam i18n altyapısıdır — dil seçimi URL düzeyinde
          yönetilir, arama motorları her dili ayrı sayfa olarak dizinler.
        </P>
        <P>
          Kagu ekip olarak Türkçe, İngilizce, Arapça, Farsça ve Rusça iletişim kurar; kurduğumuz
          sistemler ihtiyacınız olan her dilde yayın yapar. Arapça ve Farsça için yazı yönü
          sağdan sola çevrilir (RTL) ve tipografi buna göre ayarlanır.
        </P>
      </SeoSection>

      <SeoSection index={1} eyebrow="Fiyatlar" title="Multilingual destek fiyatları">
        <P>
          Multilingual destek Kagu&apos;da net fiyatlıdır: çok dillilik eklentisi{" "}
          {formatPrice(multilang.price)}, Arapça-Farsça için RTL yerleşim desteği ek{" "}
          {formatPrice(rtl.price)}. Fiyatlar TL cinsindendir ve KDV dâhildir; dil sayısına göre
          gizli çarpan yoktur.
        </P>
        <PriceTable
          headers={["Hizmet", "Kapsam", "Fiyat"]}
          rows={[
            [multilang.label, "Tam i18n — her sayfa, ihtiyacınız olan her dilde", `+ ${formatPrice(multilang.price)}`],
            [rtl.label, "Arapça ve Farsça — aynalanmış yerleşim ve tipografi", `+ ${formatPrice(rtl.price)}`],
            [llm.label, "AI destekli çeviri ve akıllı taslaklar (isteğe bağlı)", `+ ${formatPrice(llm.price)}`],
          ]}
          note="Eklenti fiyatlarıdır; site paketine eklenir. Site paketleri için custom website fiyatı sayfasına bakın."
        />
        <P>
          Multilingual destek tek başına satılmaz; bir site veya platform paketine eklenir. Paket
          fiyatları <A href="/custom-website-fiyati">custom website fiyatı</A> sayfasında,
          platform kapsamı <A href="/full-stack-platform-maliyeti">full stack platform maliyeti</A>{" "}
          sayfasındadır.
        </P>
      </SeoSection>

      <SeoSection index={2} eyebrow="Teklif" title="Fiyat teklif formu oluşturma">
        <P>
          Fiyat teklifi oluşturmak Kagu&apos;da üç adım sürer ve form doldurup beklemek
          gerektirmez: proje oluşturucuda seçiminizi yapar, anlık toplamı görür ve tek tıkla bize
          gönderirsiniz. Teklifiniz 24 saat içinde yanıtlanır.
        </P>
        <SeoList
          ordered
          items={[
            <>
              <A href="/start-project">Proje oluşturucuyu</A> açın ve site türünüzü seçin.
            </>,
            <>
              <strong>Multi-language</strong> özelliğini (gerekiyorsa <strong>RTL</strong> ile
              birlikte) işaretleyin; toplam fiyat anında güncellenir.
            </>,
            <>
              Seçimlerinizi gönderin — yapılandırılmış bir teklif talebi olarak bize ulaşır.
            </>,
          ]}
        />
      </SeoSection>

      <SeoSection index={3} eyebrow="Hizmetler" title="Multilingual destek hizmetleri">
        <P>
          Kagu&apos;nun multilingual destek hizmetleri kurulumla bitmez; dil altyapısı sitenin her
          katmanına işlenir. Kapsamda şunlar vardır: çok dilli içerik yapısı, dil bazlı SEO
          (hreflang etiketleri), RTL yerleşim, ve içeriği kendi panelinizden her dilde
          güncelleyebilmeniz.
        </P>
        <P>
          Çok dilli içeriği ekibinizin yönetebilmesi için{" "}
          <A href="/admin-sistemleri">admin sistemi</A> ile birlikte kurulum öneririz — her dilin
          içeriği tek panelden düzenlenir. Üretimdeki çok dilli örnekler için{" "}
          <A href="/work">işlerimiz</A> sayfasına bakın.
        </P>
      </SeoSection>

      <SeoSection index={4} eyebrow="Size uygun" title="İşletmenize uygun fiyat teklifi">
        <P>
          İşletmenize uygun fiyat teklifi, kaç dile ve hangi özelliklere ihtiyacınız olduğuna göre
          şekillenir; bu yüzden standart bir PDF listesi yerine anlık hesaplanan bir teklif
          veriyoruz. Bürokrasiyi sevmiyoruz: teklif süreci e-posta zincirine dönmez.
        </P>
        <P>
          Kararsızsanız <A href="/contact">bize yazın</A> — hangi dillerin ve hangi kapsamın size
          gerçekten gerekli olduğunu birlikte netleştirelim. Türkçe, İngilizce, Arapça, Farsça
          veya Rusça yazabilirsiniz; 24 saat içinde yanıt veriyoruz.
        </P>
      </SeoSection>

      <FaqSection index={5} title="Sıkça sorulan sorular" faqs={FAQS} />

      <CtaBand
        title="Çok dilli sitenizin fiyatını şimdi görün."
        href="/start-project"
        label="Teklif oluştur"
        secondaryHref="/contact"
        secondaryLabel="Bize yazın"
      />

      <SiteFooter />
    </div>
  );
}
