/*
  §4.4 — /full-stack-platform-maliyeti (TR, pricing · commercial).
  Cluster: "full stack platform nedir / maliyeti / geliştirme" ve türevleri.
  EN eşleniği: /full-stack-platform-cost. Fiyatlar catalog.ts'ten gelir.
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
} from "@/components/start-project/catalog";

const PATH = "/full-stack-platform-maliyeti";
const EN_PATH = "/full-stack-platform-cost";
const TITLE = "Full Stack Platform Maliyeti · Kagu";
const DESCRIPTION =
  "Full stack platform nedir, maliyeti neye göre değişir? Butik işletmeler için gerçek fiyat kalemleri, geliştirme süreci ve örnekler — Kagu'dan rehber.";

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
    q: "Full stack platform maliyeti nedir?",
    a: "Full stack platform maliyeti, işletmenizin büyüklüğüne, gereksinimlerine ve kullanılan teknolojiye göre değişebilir. Kagu'da temel site paketleri 30.000–80.000 ₺ aralığında başlar; admin paneli, üyelik, ödeme ve raporlama gibi platform bileşenleri net fiyatlarla eklenir. Kapsam netleşince tek seferlik, sürprizsiz bir toplam alırsınız.",
  },
  {
    q: "Full stack platform nasıl geliştirilir?",
    a: "Full stack platform geliştirmek için, uzman bir ekip ve doğru bir planlama gerekir. Kagu'da süreç ihtiyacın dinlenmesiyle başlar; kapsam haritalanır, müşteri tarafı ve admin tarafı aynı veri tabanı üzerinde geliştirilir ve üretim haftalar içinde canlıya alınır. Teslimle birlikte yönetim tamamen size geçer.",
  },
  {
    q: "Full stack platform için hangi teknolojiler kullanılır?",
    a: "Full stack platform geliştirmek için, çeşitli programlama dilleri ve framework'ler kullanılır. Kagu'nun standart yığını Next.js (React tabanlı web framework'ü), Supabase (veri tabanı ve kimlik doğrulama) ve Vercel'dir (barındırma). Bu yığın; hızlı geliştirme, güvenli kimlik yönetimi ve düşük işletme maliyeti sağlar.",
  },
];

export default function FullStackPlatformMaliyetiPage() {
  const ecommerce = WEBSITE_TYPES.find((t) => t.id === "ecommerce")!;
  const portfolio = WEBSITE_TYPES.find((t) => t.id === "portfolio")!;
  const feature = (id: string) => FEATURES.find((f) => f.id === id)!;

  return (
    // TR page inside the EN root layout — declare the content language here.
    <div lang="tr">
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "tr" })}
      />
      <JsonLd
        data={serviceJsonLd({
          name: "Full Stack Platform",
          description:
            "Butik işletmeler için müşteri tarafı ve admin tarafı aynı veri tabanında çalışan tam kapsamlı platformlar.",
          path: PATH,
          lang: "tr",
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Full Stack Platform Maliyeti", path: PATH },
        ])}
      />

      <SeoHero
        eyebrow="Fiyatlandırma · Full Stack Platform"
        title="Full stack platform maliyeti, kalem kalem."
        lede="Full stack platform fiyatları çoğu yerde 'projeye göre değişir' diye geçiştirilir. Bu sayfada tersini yapıyoruz: platformu oluşturan bileşenleri, her birinin gerçek fiyatını ve toplam maliyeti neyin belirlediğini açıkça listeliyoruz."
        langSwitchHref={EN_PATH}
        langSwitchLabel="View in English"
      />

      <SeoSection index={0} eyebrow="Tanım" title="Full stack platform nedir?">
        <P>
          Full stack platform, bir işletmenin hem müşteriye açık yüzünü (web sitesi, rezervasyon,
          ödeme) hem de iç operasyonunu (admin paneli, içerik yönetimi, raporlama) tek sistemde
          birleştiren yazılımdır. &quot;Full stack&quot; terimi ön yüz ve arka ucun — görünen site
          ile veri tabanı ve iş mantığının — birlikte geliştirilmesini anlatır.
        </P>
        <P>
          Butik bir işletme için bunun pratik anlamı şudur: müşterinin gördüğü site ile ekibin
          kullandığı <A href="/admin-sistemleri">admin sistemi</A> aynı veri tabanını paylaşır;
          hiçbir bilgi iki kez girilmez, hiçbir liste elle senkronlanmaz.
        </P>
      </SeoSection>

      <SeoSection index={1} eyebrow="Maliyet" title="Full stack platform maliyeti">
        <P>
          Full stack platform maliyeti Kagu&apos;da baz paket artı bileşen fiyatlarından oluşur;
          baz paketler {formatPrice(portfolio.basePrice)} ile {formatPrice(ecommerce.basePrice)}{" "}
          arasında başlar. Fiyatlar TL cinsindendir ve KDV dâhildir. Aşağıdaki tablo platformlarda
          en sık kullanılan bileşenleri gösterir.
        </P>
        <PriceTable
          headers={["Platform bileşeni", "Ne sağlar", "Fiyat"]}
          rows={[
            [feature("cms").label, "İçerik ve operasyon yönetimi — platformun admin tarafı", `+ ${formatPrice(feature("cms").price)}`],
            [feature("auth").label, "Kayıt, giriş, şifre sıfırlama, profiller", `+ ${formatPrice(feature("auth").price)}`],
            [feature("booking").label, "Takvim, saat aralıkları, onaylar", `+ ${formatPrice(feature("booking").price)}`],
            [feature("payments").label, "Kart ve yerel yöntemlerle güvenli tahsilat", `+ ${formatPrice(feature("payments").price)}`],
            [feature("analytics").label, "Trafik ve dönüşüm içgörüleri", `+ ${formatPrice(feature("analytics").price)}`],
            [feature("llm").label, "AI sohbet, çeviri, akıllı taslaklar", `+ ${formatPrice(feature("llm").price)}`],
            [feature("pdf").label, "Sunucuda üretilen, tek tıkla indirilen belgeler", `+ ${formatPrice(feature("pdf").price)}`],
          ]}
          note="Fiyatlar TL, KDV dâhil. Tam bileşen listesi ve anlık toplam için proje oluşturucuyu kullanın."
        />
      </SeoSection>

      <SeoSection index={2} eyebrow="Süreç" title="Full stack platform geliştirme süreci">
        <P>
          Full stack platform geliştirme süreci Kagu&apos;da dört adımdır ve üretim haftalar içinde
          canlıya alınır; çeyrek yıllara yayılmaz. Platform tek seferde değil, kullanılabilir
          parçalar halinde teslim edilir — ekibiniz sistemi geliştirme bitmeden kullanmaya başlar.
        </P>
        <SeoList
          ordered
          items={[
            <>
              <strong>Dinleme.</strong> Operasyonunuzu ve neyin yavaşlattığını anlarız.
            </>,
            <>
              <strong>Haritalama.</strong> Bileşenleri, veri modelini ve öncelik sırasını
              netleştirip fiyatla birlikte sunarız.
            </>,
            <>
              <strong>Geliştirme.</strong> Müşteri tarafı ve admin tarafı Next.js + Supabase
              üzerinde birlikte kurulur.
            </>,
            <>
              <strong>Teslim.</strong> Platform canlıya alınır, yönetim size geçer; ihtiyaç oldukça
              yeni bileşen eklenir.
            </>,
          ]}
        />
      </SeoSection>

      <SeoSection index={3} eyebrow="Örnekler" title="Full stack platform örnekleri ve kullanım alanları">
        <P>
          Full stack platform örnekleri arasında rezervasyonlu tur satışı, vize başvuru takibi ve
          içerik üretim panelleri sayılabilir — üçü de Kagu&apos;nun üretimde çalışan projeleridir.
          Turizmde müşteri paket seçer, ekip aynı sistemden voucher ve tur planı üretir; vize
          danışmanlığında başvuru durumu tek panelden izlenir.
        </P>
        <P>
          Bu projelerin ekran görüntüleri ve kapsam notları <A href="/work">işlerimiz</A>{" "}
          sayfasında. Hangi araçların butik işletmenize uyduğunu{" "}
          <A href="/butik-operatoler-dijital-arac">dijital araçlar rehberinde</A> bulabilirsiniz.
        </P>
      </SeoSection>

      <SeoSection index={4} eyebrow="Fayda" title="Full stack platform ile butik işletmelere faydalar">
        <P>
          Full stack platformun butik işletmeye üç somut faydası vardır: kağıt işini azaltır,
          operasyonu tek ekranda toplar ve müşteri deneyimini hızlandırır. Çift veri girişi
          ortadan kalkar; talepler, rezervasyonlar ve içerik aynı yerden yönetilir.
        </P>
        <P>
          Küçük ekipler için bunun anlamı zamandır: raporu Excel&apos;de birleştiren, mesajları
          klasörlerde arayan kişi işine döner. Sistemin sınavı, ekibin onu yoğun bir cuma gecesi
          kullanıp kullanmadığıdır — platformlarımızı bu ölçüte göre tasarlıyoruz.
        </P>
      </SeoSection>

      <SeoSection index={5} eyebrow="Faktörler" title="Full stack platform maliyetini etkileyen faktörler">
        <P>
          Full stack platform maliyetini dört faktör etkiler: bileşen sayısı, özel iş akışlarının
          karmaşıklığı, dil sayısı ve entegrasyonlar. Her faktör tabloda gördüğünüz net fiyat
          kalemlerine karşılık gelir; gizli kalem yoktur.
        </P>
        <SeoList
          items={[
            <>
              <strong>Bileşen sayısı</strong> — üyelik, ödeme, rezervasyon gibi her modül ayrı
              fiyatlanır.
            </>,
            <>
              <strong>Özel iş akışları</strong> — size özgü süreçler (ör. voucher üretimi) kapsama
              göre teklife eklenir.
            </>,
            <>
              <strong>Dil sayısı</strong> — çok dillilik {formatPrice(feature("multilang").price)}
              &apos;den başlar; ayrıntılar{" "}
              <A href="/multilingual-support-fiyat">multilingual destek fiyatları</A> sayfasında.
            </>,
            <>
              <strong>Entegrasyonlar</strong> — WhatsApp, Telegram, ödeme sağlayıcıları gibi dış
              sistem bağlantıları.
            </>,
          ]}
        />
        <P>
          Yalnızca web sitesine ihtiyacınız varsa{" "}
          <A href="/custom-website-fiyati">custom website fiyatı</A> sayfası daha doğru bir
          başlangıç noktası olabilir.
        </P>
      </SeoSection>

      <FaqSection index={6} title="Sıkça sorulan sorular" faqs={FAQS} />

      <CtaBand
        title="Platformunuzu kalem kalem fiyatlandırın."
        href="/start-project"
        label="Fiyat hesapla"
        secondaryHref="/proje-baslat"
        secondaryLabel="Süreci okuyun"
      />

      <SiteFooter />
    </div>
  );
}
