/*
  §4.7 — /admin-sistemleri (TR, guide · informational).
  Cluster: "butik operatörler için admin sistemleri", "admin sistemleri nedir" vb.
  EN eşleniği: /admin-systems. Fiyat referansları catalog.ts'ten gelir.
*/

import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import {
  SeoHero,
  SeoSection,
  P,
  A,
  SeoList,
  FaqSection,
  CtaBand,
} from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  pageMetadata,
  webPageJsonLd,
  breadcrumbJsonLd,
  type FaqItem,
} from "@/lib/seo";
import { FEATURES, formatPrice } from "@/components/start-project/catalog";

const PATH = "/admin-sistemleri";
const EN_PATH = "/admin-systems";
const TITLE = "Admin Sistemleri — Butik Operatörler için · Kagu";
const DESCRIPTION =
  "Butik operatörler için admin sistemleri rehberi: nedir, nasıl çalışır, neden önemlidir? Otel yönetimi ve hizmet sektörü için özel admin paneli çözümleri — Kagu.";

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
    q: "Butik operatörler için admin sistemleri nedir?",
    a: "Butik operatörler için admin sistemleri, iş süreçlerini kolaylaştıran ve verimliliği artıran özel yazılımlardır. İçerik, talep, rezervasyon ve müşteri verisi tek panelden yönetilir; ekip geliştiriciye ihtiyaç duymadan siteyi ve operasyonu günceller. Kagu'da admin sistemi, müşteriye açık site ile aynı veri tabanı üzerinde kurulur.",
  },
  {
    q: "Admin sistemleri nasıl çalışır?",
    a: "Admin sistemleri, işletmenin tüm bölümlerini bir araya getirerek, iş süreçlerini otomatikleştirir ve kolaylaştırır. Tek bir panelden içerik düzenlenir, gelen talepler görülür, rezervasyonlar yönetilir. Panelde yapılan her değişiklik, aynı veri tabanını kullanan müşteri sitesine anında yansır — elle senkronlama yoktur.",
  },
  {
    q: "Butik işletmeler için admin sistemleri neden önemlidir?",
    a: "Butik işletmeler için admin sistemleri, maliyetleri azaltarak ve verimliliği artırarak, işletmenin büyümesine katkıda bulunur. Kağıt ve Excel üzerinde yürüyen işler sistemde toplanınca çift veri girişi ve kayıp mesajlar ortadan kalkar. Küçük ekip, rutin işleri sisteme bırakıp müşteriye zaman ayırır.",
  },
];

export default function AdminSistemleriPage() {
  const cms = FEATURES.find((f) => f.id === "cms")!;
  const booking = FEATURES.find((f) => f.id === "booking")!;
  const analytics = FEATURES.find((f) => f.id === "analytics")!;

  return (
    // TR page inside the EN root layout — declare the content language here.
    <div lang="tr">
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "tr" })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Admin Sistemleri", path: PATH },
        ])}
      />

      <SeoHero
        eyebrow="Rehber · Admin Sistemleri"
        title="Butik operatörler için admin sistemleri."
        lede="İşletmenizi WhatsApp geçmişi, Excel tabloları ve kağıt defterlerle yönetiyorsanız, bu rehber size göre. Admin sistemlerinin ne olduğunu, nasıl çalıştığını ve butik bir işletmeye neden zaman kazandırdığını örneklerle anlatıyoruz."
        langSwitchHref={EN_PATH}
        langSwitchLabel="View in English"
      />

      <SeoSection index={0} eyebrow="Tanım" title="Butik operatörler için admin sistemleri nedir?">
        <P>
          Butik operatörler için admin sistemleri, küçük bir ekibin içeriği, talepleri,
          rezervasyonları ve müşteri verisini tek panelden yönetmesini sağlayan özel yazılımlardır.
          Kurumsal ERP sistemlerinden farkı ölçeğidir: yalnızca işletmenin gerçekten kullandığı
          ekranlar kurulur, eğitim gerektirmeyecek kadar sade tutulur.
        </P>
        <P>
          Kagu&apos;da admin sistemi hiçbir zaman tek başına düşünülmez: müşteriye açık site ile
          aynı veri tabanını paylaşır. Sitenin fiyatlandırmasını{" "}
          <A href="/custom-website-fiyati">custom website fiyatı</A> sayfasında bulabilirsiniz;
          admin paneli eklentisi {formatPrice(cms.price)}&apos;dir.
        </P>
      </SeoSection>

      <SeoSection index={1} eyebrow="Nasıl" title="Admin sistemleri nasıl çalışır?">
        <P>
          Admin sistemleri, işletmenin dağınık araçlarda yürüyen işlerini tek veri tabanında
          toplayarak çalışır: panelde yapılan her değişiklik müşteri sitesine anında yansır,
          siteden gelen her talep panele düşer. Elle kopyalama ve senkronlama tamamen ortadan
          kalkar.
        </P>
        <SeoList
          items={[
            <>
              <strong>İçerik yönetimi</strong> — sayfaları, fiyatları ve duyuruları geliştiriciye
              ihtiyaç duymadan güncelleyin ({formatPrice(cms.price)}).
            </>,
            <>
              <strong>Talep kutusu</strong> — site ve formlardan gelen başvurular yapılandırılmış
              kayıt olarak panelde toplanır.
            </>,
            <>
              <strong>Rezervasyon yönetimi</strong> — takvim, saat aralıkları ve onaylar (
              {formatPrice(booking.price)}).
            </>,
            <>
              <strong>Raporlama</strong> — trafik ve dönüşüm içgörüleri ({formatPrice(analytics.price)}).
            </>,
          ]}
        />
      </SeoSection>

      <SeoSection index={2} eyebrow="Neden" title="Butik işletmeler için admin sistemleri neden önemlidir?">
        <P>
          Butik işletmeler için admin sistemleri önemlidir, çünkü küçük ekiplerde herkesin zamanı
          operasyona gider ve kağıt işi doğrudan müşteriye ayrılan zamandan çalar. Talebi
          Excel&apos;e geçiren, voucher&apos;ı Word&apos;de hazırlayan, listeyi WhatsApp&apos;tan
          arayan kişi aslında işini iki kez yapıyordur.
        </P>
        <P>
          Sistemde toplanmış operasyonun ikinci faydası süreklilik: bilgi kişilere değil sisteme
          bağlıdır; ekip değişse de süreç kalır. Admin sistemi, daha kapsamlı bir{" "}
          <A href="/full-stack-platform-maliyeti">full stack platformun</A> da çekirdeğidir —
          ödeme, üyelik ve raporlama onun üzerine eklenir.
        </P>
      </SeoSection>

      <SeoSection index={3} eyebrow="Otel" title="Otel yönetimi için admin sistemleri çözümleri">
        <P>
          Otel yönetimi için admin sistemleri; oda ve deneyim içeriğini, rezervasyon taleplerini
          ve müşteri iletişimini tek panelde toplar. Resepsiyon yoğunken sistemin sınavı başlar:
          panel, cuma gecesi doluluk baskısı altında da kullanılabilir olmalıdır.
        </P>
        <P>
          Kagu konaklama sektörüne odaklanır ve otel admin panellerini müşteri sitesiyle birlikte
          kurar — müsaitlik sitede, talepler panelde, ikisi aynı veri. Butik otelinize uygun diğer
          araçlar için <A href="/butik-operatoler-dijital-arac">dijital araçlar rehberine</A>{" "}
          bakın.
        </P>
      </SeoSection>

      <SeoSection index={4} eyebrow="Hizmet" title="Hizmet sektörü için admin sistemleri çözümleri">
        <P>
          Hizmet sektörü için admin sistemleri; klinik, salon, ajans ve danışmanlık gibi randevu
          ve talep yönetimi yoğun işletmelerde kullanılır. Tipik kurulum: siteden gelen talepler
          panelde kuyruğa düşer, ekip durumu günceller, müşteri bilgilendirilir.
        </P>
        <P>
          Üretimde çalışan örneklerimiz arasında vize danışmanlığı için başvuru takibi ve turizm
          için voucher/tur planı üretimi var — ikisini de <A href="/work">işlerimiz</A> sayfasında
          inceleyebilirsiniz. Kendi sisteminizi kurmak için{" "}
          <A href="/proje-baslat">proje başlatma sürecini</A> okuyun.
        </P>
      </SeoSection>

      <FaqSection index={5} title="Sıkça sorulan sorular" faqs={FAQS} />

      <CtaBand
        title="Operasyonunuzu tek panelde toplayalım."
        href="/proje-baslat"
        label="Proje başlat"
        secondaryHref="/contact"
        secondaryLabel="Bize yazın"
      />

      <SiteFooter />
    </div>
  );
}
