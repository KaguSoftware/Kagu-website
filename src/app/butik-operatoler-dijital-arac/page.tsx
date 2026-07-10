/*
  §4.3 — /butik-operatoler-dijital-arac (TR, guide · informational).
  Cluster: "İstanbul'da butik operatörler için dijital araçlar" ve türevleri.
  EN eşleniği: /digital-tools-for-boutique-operators.
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

const PATH = "/butik-operatoler-dijital-arac";
const EN_PATH = "/digital-tools-for-boutique-operators";
const TITLE = "Butik Operatörler için Dijital Araçlar · Kagu";
const DESCRIPTION =
  "Butik operatörler için dijital araçlar: rezervasyon, admin paneli, çok dilli site ve otomasyon. İstanbul'da butik işletmelerin işini kolaylaştıran yazılımlar.";

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
    q: "Butik operatörler için dijital araçlar nelerdir?",
    a: "Butik operatörler için dijital araçlar, iş süreçlerini kolaylaştıran ve verimliliği artıran özel yazılımlardır. Başlıcaları: müşteriye açık web sitesi, rezervasyon sistemi, operatörün kullandığı admin paneli, çok dilli içerik desteği ve WhatsApp/Telegram gibi kanallara bağlanan otomasyonlar. Doğru araç seti işletmenin gerçek iş akışına göre seçilir.",
  },
  {
    q: "Butik işletmelerde dijital dönüşüm nasıl yapılır?",
    a: "Butik işletmelerde dijital dönüşüm, en çok zaman kaybettiren tek bir sürecin yazılımla çözülmesiyle başlar ve adım adım genişletilir. Önce kağıt üzerinde veya dağınık araçlarla yürüyen iş tespit edilir, sonra bu işi çözen en küçük sistem kurulur. Büyük platform projeleri yerine haftalar içinde canlıya alınan odaklı çözümler daha hızlı sonuç verir.",
  },
  {
    q: "Butik operatörler için özel yazılım çözümleri nelerdir?",
    a: "Butik operatörler için özel yazılım çözümleri, butik işletmelerin özel ihtiyaçlarına göre tasarlanan ve geliştirilen yazılımlardır. Kagu'da bunlar custom website, admin sistemi, rezervasyon akışı, çok dilli destek ve tam kapsamlı full-stack platform olarak paketlenir. Hepsi aynı veri tabanı üzerinde, müşteri tarafı ve operatör tarafı birlikte çalışacak şekilde kurulur.",
  },
];

export default function ButikOperatorlerDijitalAracPage() {
  return (
    // TR page inside the EN root layout — declare the content language here.
    <div lang="tr">
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "tr" })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Butik Operatörler için Dijital Araçlar", path: PATH },
        ])}
      />

      <SeoHero
        eyebrow="Rehber · Dijital Araçlar"
        title="Butik operatörler için dijital araçlar."
        lede="Butik bir işletmeyi büyük zincirlerin yazılımlarıyla yönetmek zorunda değilsiniz. Bu rehber; rezervasyondan admin paneline, çok dilli siteden mesajlaşma otomasyonuna, butik operatörlerin işini gerçekten kolaylaştıran dijital araçları anlatıyor."
        langSwitchHref={EN_PATH}
        langSwitchLabel="View in English"
      />

      <SeoSection index={0} eyebrow="Tanım" title="Butik operatörler için dijital araçlar nelerdir?">
        <P>
          Butik operatörler için dijital araçlar, küçük ekiplerin günlük operasyonunu — rezervasyon,
          talep yönetimi, içerik güncelleme, müşteri iletişimi — tek elden yürütmesini sağlayan
          yazılımlardır. Kurumsal sistemlerin aksine, butik işletmenin kendi iş akışına göre
          şekillenirler; ekibin kullanmayacağı özellik içermezler.
        </P>
        <SeoList
          items={[
            <>
              <strong>Müşteriye açık web sitesi</strong> — markanızı anlatan ve talep toplayan yüz;
              fiyatlar için <A href="/custom-website-fiyati">custom website fiyatı</A> sayfasına bakın.
            </>,
            <>
              <strong>Admin paneli</strong> — içeriği, talepleri ve operasyonu tek ekrandan yönetin;
              ayrıntılar <A href="/admin-sistemleri">admin sistemleri rehberinde</A>.
            </>,
            <>
              <strong>Rezervasyon ve takvim</strong> — saat aralıkları, onaylar, hatırlatmalar.
            </>,
            <>
              <strong>Çok dilli destek</strong> — Türkçe, İngilizce, Arapça dâhil her sayfa her dilde.
            </>,
            <>
              <strong>Mesajlaşma otomasyonu</strong> — talepler yapılandırılmış WhatsApp veya
              Telegram mesajı olarak ekibinize düşer.
            </>,
          ]}
        />
      </SeoSection>

      <SeoSection index={1} eyebrow="Dönüşüm" title="Butik işletmelerde dijital dönüşüm">
        <P>
          Butik işletmelerde dijital dönüşüm, en çok kağıt ve mesaj trafiği üreten tek süreci
          yazılıma taşımakla başlar; büyük bir platform projesiyle değil. Voucher kesmek, tur planı
          hazırlamak, gelen talepleri Excel&apos;de takip etmek gibi işler genellikle ilk adaydır.
        </P>
        <P>
          Bu yaklaşımın avantajı hızdır: odaklı bir sistem haftalar içinde canlıya alınır ve ekip
          onu gerçekten kullanır. Kullanılan sistem veri üretir; sonraki adım o verinin üzerine
          kurulur. Kagu&apos;nun üretimdeki projeleri bu şekilde, adım adım büyüdü —{" "}
          <A href="/work">işlerimiz sayfasında</A> örnekleri görebilirsiniz.
        </P>
      </SeoSection>

      <SeoSection index={2} eyebrow="Çözümler" title="Butik operatörler için özel yazılım çözümleri">
        <P>
          Butik operatörler için özel yazılım çözümleri, hazır paketlerin sığmadığı yerde devreye
          girer: işletmenin kendi süreci yazılıma dönüştürülür. Kagu bu çözümleri müşteri tarafı ve
          operatör tarafı aynı veri tabanını paylaşacak şekilde kurar — site ile admin paneli asla
          birbirinden kopmaz.
        </P>
        <P>
          Kapsam siteden büyükse — örneğin ödeme, üyelik ve raporlama da gerekiyorsa — doğru model
          full-stack platformdur. Maliyet kalemlerini{" "}
          <A href="/full-stack-platform-maliyeti">full stack platform maliyeti</A> sayfasında
          şeffaf biçimde listeledik.
        </P>
      </SeoSection>

      <SeoSection index={3} eyebrow="İstanbul" title="İstanbul'da butik operatörler için dijital araçlar">
        <P>
          İstanbul&apos;da butik operatörler için dijital araçların en kritik özelliği çok
          dilliliktir: müşteri kitlesi Türkçe, İngilizce, Arapça, Farsça ve Rusça konuşur. Kagu
          İstanbul merkezli bir stüdyodur ve bu beş dilde iletişim kurar; kurduğumuz sistemler de
          aynı dillerde yayın yapabilir.
        </P>
        <P>
          Yerinde çalışmanın bir avantajı daha var: işletmenizi yerinde görür, süreci birlikte
          yürürüz. Turizm ve vize danışmanlığı gibi İstanbul yoğun sektörlerde üretimde çalışan
          sistemlerimiz var. Projenizi konuşmak için <A href="/contact">bize yazın</A> — 24 saat
          içinde yanıt veriyoruz.
        </P>
      </SeoSection>

      <SeoSection index={4} eyebrow="Otel" title="Butik otel işletmeleri için dijital çözümler">
        <P>
          Butik otel işletmeleri için dijital çözümler; oda ve deneyim sunumunu, rezervasyon
          akışını ve operasyon yönetimini tek sistemde toplar. Müşteri web sitesinden bakar ve
          rezervasyon talebi bırakır; ekip aynı verinin admin tarafından takvimi ve talepleri
          yönetir.
        </P>
        <P>
          Konaklama, Kagu&apos;nun odak sektörlerinden biridir: sistemin sınavı, ekibin onu cuma
          gecesi yoğunluğunda kullanıp kullanmadığıdır. Otel siteniz için başlangıç fiyatlarını{" "}
          <A href="/custom-website-fiyati">custom website fiyatı</A> sayfasında, süreci{" "}
          <A href="/proje-baslat">proje başlatma</A> sayfasında bulabilirsiniz.
        </P>
      </SeoSection>

      <FaqSection index={5} title="Sıkça sorulan sorular" faqs={FAQS} />

      <CtaBand
        title="İşinizi kolaylaştıracak aracı birlikte bulalım."
        href="/proje-baslat"
        label="Proje başlat"
        secondaryHref="/contact"
        secondaryLabel="Bize yazın"
      />

      <SiteFooter />
    </div>
  );
}
