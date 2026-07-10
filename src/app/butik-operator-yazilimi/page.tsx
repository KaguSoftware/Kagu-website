/*
  TR counterpart of the homepage cluster (§4.1) — "butik operatör yazılımı".
  The EN version is the homepage itself; the two are paired via hreflang.
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
  serviceJsonLd,
  webPageJsonLd,
  breadcrumbJsonLd,
  type FaqItem,
} from "@/lib/seo";

const PATH = "/butik-operator-yazilimi";
const TITLE = "Butik Operatör Yazılımı · Kagu";
const DESCRIPTION =
  "Butik operatörler için özel yazılım: operasyonu sadeleştiren, müşteri deneyimini iyileştiren web siteleri, dijital araçlar ve admin sistemleri — Kagu.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  lang: "tr",
  enPath: "/",
  trPath: PATH,
});

const FAQS: FaqItem[] = [
  {
    q: "Kagu butik operatörler için ne tür yazılımlar sunuyor?",
    a: "Kagu; custom web siteleri, dijital araçlar, full-stack platformlar ve admin sistemleri sunar — hepsi çok dilli destekle. Her projede müşteriye açık yüz ile operatörün kullandığı admin, aynı veri tabanı üzerinde kurulur; konaklama ve hizmet sektöründeki küçük ekipler tüm operasyonu tek yerden yönetir.",
  },
  {
    q: "Kagu'nun yazılımları butik operatörlere nasıl yardımcı olur?",
    a: "Kagu'nun yazılımları kağıt işini azaltır, operasyonu sadeleştirir ve müşteri deneyimini iyileştirir. Excel tablolarında, WhatsApp yazışmalarında ve kağıt defterlerde yaşayan işler tek sisteme taşınır: talepler yapılandırılmış gelir, rezervasyonlar kendi kendini yönetir, içerik geliştiriciye ihtiyaç duymadan güncellenir.",
  },
  {
    q: "Kagu'yu diğer yazılım sağlayıcılardan ayıran nedir?",
    a: "Kagu'yu ayıran; sektör derinliği, küçük ekip odağı, üretime dönük teslimat ve gereksiz özellik satmamasıdır. Konaklama ve hizmet dikeylerinde çalışırız — bir sistemin sınavı, ekibin onu yoğun bir cuma gecesi kullanıp kullanmadığıdır. Üretimi haftalar içinde canlıya alırız, çeyrek yıllara yaymayız.",
  },
];

export default function ButikOperatorYazilimiPage() {
  return (
    // TR page inside the EN root layout — declare the content language here.
    <div lang="tr">
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "tr" })}
      />
      <JsonLd
        data={serviceJsonLd({
          name: "Butik Operatör Yazılımı",
          description: DESCRIPTION,
          path: PATH,
          lang: "tr",
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Butik Operatör Yazılımı", path: PATH },
        ])}
      />

      <SeoHero
        eyebrow="Kagu · Est. 2025 · İstanbul"
        title="Butik operatörler için yazılım."
        lede="Butik bir işletmenin yazılımı, kurumsal paketlerin küçültülmüş hali olmamalı. Kagu; otel, tur operatörü, klinik ve stüdyo gibi küçük ekipler için işi gerçekten çözen özel yazılımlar geliştirir — İstanbul'dan, Türkçe, İngilizce ve Arapça dâhil çok dilli."
        langSwitchHref="/"
        langSwitchLabel="View in English"
      />

      <SeoSection index={0} eyebrow="Tanım" title="Butik operatör yazılımı nedir?">
        <P>
          Butik operatör yazılımı; konaklama ve hizmet sektöründeki küçük ekiplerin operasyonunu
          yürüten, müşteriye açık web sitesi ile dijital araçları ve admin sistemini tek çatıda
          birleştiren özel yazılımdır. Hazır paketlerden farkı, işletmenin kendi iş akışına göre
          tasarlanması ve kullanılmayacak özellik içermemesidir.
        </P>
        <P>
          Hangi araçların işletmenize uyduğunu görmek için{" "}
          <A href="/butik-operatoler-dijital-arac">butik operatörler için dijital araçlar</A>{" "}
          rehberiyle başlayabilirsiniz.
        </P>
      </SeoSection>

      <SeoSection index={1} eyebrow="Fayda" title="Kagu'nun yazılımı butik operatörlere nasıl yardım eder?">
        <P>
          Kagu&apos;nun yazılımı üç şeyi hedefler: kağıt işini azaltmak, operasyonu sadeleştirmek
          ve müşteri deneyimini iyileştirmek. Dağınık araçlarda yürüyen iş tek sisteme taşınır;
          ekip rutin işi sisteme bırakıp müşteriye döner.
        </P>
        <SeoList
          items={[
            <>
              Talepler yapılandırılmış kayıt olarak düşer — WhatsApp veya Telegram&apos;a da
              bağlanır.
            </>,
            <>
              Rezervasyon, takvim ve onaylar kendi kendini yönetir.
            </>,
            <>
              İçerik, <A href="/admin-sistemleri">admin sisteminden</A> geliştiriciye ihtiyaç
              duymadan güncellenir.
            </>,
            <>
              Site; Türkçe, İngilizce, Arapça dâhil{" "}
              <A href="/multilingual-support-fiyat">birden çok dilde</A> yayın yapar.
            </>,
          ]}
        />
      </SeoSection>

      <SeoSection index={2} eyebrow="Özellikler" title="Kagu'nun özel yazılımlarının temel özellikleri">
        <P>
          Her Kagu projesinin çekirdeği aynıdır: müşteriye açık site ile operatör admin&apos;i aynı
          veri tabanında çalışır, hiçbir bilgi iki kez girilmez. Üzerine ihtiyaca göre rezervasyon,
          ödeme, üyelik ve raporlama eklenir; kapsam büyüdükçe sistem{" "}
          <A href="/full-stack-platform-maliyeti">full-stack platforma</A> dönüşür.
        </P>
        <P>
          Teknoloji yığını Next.js, Supabase ve Vercel&apos;dir. Fiyatlar şeffaftır: paketler ve
          eklentiler <A href="/custom-website-fiyati">custom website fiyatı</A> sayfasında gerçek
          rakamlarla listelenir.
        </P>
      </SeoSection>

      <SeoSection index={3} eyebrow="Neden Kagu" title="Neden Kagu ile çalışmalısınız?">
        <P>
          Kagu&apos;yu diğer sağlayıcılardan ayıran dört şey vardır: sektör derinliği, küçük ekip
          odağı, üretime dönük teslimat ve gereksiz özellik satmaması. Ödül duvarı yok, duyuru
          trafiği yok — sadece üretimde çalışan sistemler.
        </P>
        <P>
          Üretim haftalar içinde canlıya alınır ve teslimle birlikte yönetim tamamen size geçer.
          Üretimdeki projeleri <A href="/work">işlerimiz</A> sayfasında, ekibi{" "}
          <A href="/about">hakkımızda</A> sayfasında görebilirsiniz. Süreci merak ediyorsanız{" "}
          <A href="/proje-baslat">proje başlatma</A> sayfası adım adım anlatır.
        </P>
      </SeoSection>

      <FaqSection index={4} title="Sıkça sorulan sorular" faqs={FAQS} />

      <CtaBand
        title="İşinizi kolaylaştıracak yazılımı konuşalım."
        href="/proje-baslat"
        label="Proje başlat"
        secondaryHref="/contact"
        secondaryLabel="Bize yazın"
      />

      <SiteFooter />
    </div>
  );
}
