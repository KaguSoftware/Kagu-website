/*
  TR counterpart of /start-project (§4.5) — "proje başlat" cluster in Turkish.
  Describes the intake process; the interactive builder itself lives at
  /start-project. Paired via hreflang.
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
import {
  WEBSITE_TYPES,
  formatPrice,
} from "@/components/start-project/catalog";

const PATH = "/proje-baslat";
const EN_PATH = "/start-project";
const TITLE = "Proje Başlat — Özel Yazılım Projesi · Kagu";
const DESCRIPTION =
  "Kagu ile özel yazılım projenizi başlatın: süreç, zaman çizelgesi ve fiyat faktörleri. Paketinizi kurun, anlık fiyat görün — 24 saat içinde yanıt.";

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
    q: "Kagu ile proje nasıl başlatılır?",
    a: "Kagu ile proje başlatmak için önce bize ihtiyacınızı anlatırsınız — iki yol var: proje oluşturucuda paketinizi kurup anlık fiyatla göndermek, ya da doğrudan yazışarak başlamak. İki yol da aynı ekibe ulaşır; yazılımı geliştiren ekip, mesajınıza 24 saat içinde yanıt veren ekiptir.",
  },
  {
    q: "Proje başlatma süreci nasıl işler?",
    a: "Proje başlatma süreci dört adımdır: ihtiyacınızı dinleriz, çözümü haritalarız, ürünü geliştirip canlıya alırız ve sonucu size teslim ederiz. Hiçbir şey, kapsamı ve fiyatı görüp onaylamadan önce geliştirilmez; teslimle birlikte sistemin yönetimi tamamen size geçer.",
  },
  {
    q: "Kagu ne tür projeler üstlenir?",
    a: "Kagu; konaklama ve hizmet sektöründeki butik operatörler için custom web siteleri, dijital araçlar ve full-stack platformlar geliştirir. Her projede müşteriye açık yüz ile operatör admin'i aynı veri tabanında kurulur; çok dilli destek her pakete eklenebilir.",
  },
];

export default function ProjeBaslatPage() {
  const cheapest = WEBSITE_TYPES.reduce((a, b) => (a.basePrice < b.basePrice ? a : b));
  const priciest = WEBSITE_TYPES.reduce((a, b) => (a.basePrice > b.basePrice ? a : b));

  return (
    // TR page inside the EN root layout — declare the content language here.
    <div lang="tr">
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "tr" })}
      />
      <JsonLd
        data={serviceJsonLd({
          name: "Proje Başlatma",
          description:
            "Özel yazılım projesi başlangıcı: paket oluşturucu ile anlık fiyat, veya doğrudan görüşmeyle kapsam çalışması.",
          path: PATH,
          lang: "tr",
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Proje Başlat", path: PATH },
        ])}
      />

      <SeoHero
        eyebrow="Başlangıç · Proje"
        title="Özel yazılım projenizi başlatın."
        lede="Bir yazılım projesine başlamak, aylarca sürecek toplantılar gerektirmemeli. Kagu'da iki yol var: paketinizi oluşturucuda kurup anlık fiyat görürsünüz, ya da bize yazar ve konuşarak başlarsınız. Bu sayfa süreci, zaman çizelgesini ve fiyat faktörlerini anlatıyor."
        langSwitchHref={EN_PATH}
        langSwitchLabel="View in English"
      />

      <SeoSection index={0} eyebrow="Başlangıç" title="Projenize nasıl başlarsınız?">
        <P>
          Kagu ile projeye başlamanın en hızlı yolu <A href="/start-project">proje oluşturucudur</A>:
          site türünüzü seçer, ihtiyacınız olan bileşenleri ekler ve canlı önizlemeyle birlikte
          anlık fiyat görürsünüz. Seçiminizi tek tıkla gönderirsiniz; yapılandırılmış bir talep
          olarak bize ulaşır.
        </P>
        <P>
          Önce konuşmayı tercih ediyorsanız <A href="/contact">bize yazın</A> — Türkçe, İngilizce,
          Arapça, Farsça veya Rusça. 24 saat içinde yanıt veriyoruz.
        </P>
      </SeoSection>

      <SeoSection index={1} eyebrow="İhtiyaç" title="İhtiyacınızı nasıl anlıyoruz?">
        <P>
          Kagu her projeye neyi kolaylaştırmak istediğinizi dinleyerek başlar ve bunu çözen en
          küçük sistemi haritalar. Sorularımız somuttur: veriyi kim giriyor, kim okuyor, yoğun bir
          cuma gecesi ne oluyor? Cevaplar; kapsam, fiyat ve zaman planı olarak size geri döner.
        </P>
        <P>
          Kapsamı ve fiyatı görüp onaylamadan hiçbir şey geliştirilmez. Sürpriz kalem yoktur;
          bütün eklentiler <A href="/custom-website-fiyati">fiyat sayfasında</A> listelidir.
        </P>
      </SeoSection>

      <SeoSection index={2} eyebrow="Süreç" title="Proje süreci: dört adım">
        <P>
          Kagu&apos;da proje süreci dört adımdır ve erken aşamadan itibaren çalışan yazılım
          görürsünüz. Teslim, sürecin sonu değil hedefidir: sistem tamamen sizin yönetiminize
          geçer.
        </P>
        <SeoList
          ordered
          items={[
            <>
              <strong>Dinleme.</strong> Operasyonunuzu ve neyin yavaşlattığını anlarız.
            </>,
            <>
              <strong>Haritalama.</strong> Somut kapsam, fiyat ve zaman planı alırsınız.
            </>,
            <>
              <strong>Geliştirme.</strong> Next.js ve Supabase üzerinde kurup canlıya alırız —
              haftalar içinde, çeyrek yıllara yaymadan.
            </>,
            <>
              <strong>Teslim.</strong> Yönetim tamamen ekibinize geçer; teslim, bize ihtiyacınızın
              bittiği andır.
            </>,
          ]}
        />
      </SeoSection>

      <SeoSection index={3} eyebrow="Beklentiler" title="Ne beklemelisiniz: süre, fiyat faktörleri, gereksinimler">
        <P>
          Üretim yazılımını haftalar içinde bekleyin; paket fiyatları{" "}
          {formatPrice(cheapest.basePrice)} ({cheapest.label}) ile {formatPrice(priciest.basePrice)}{" "}
          ({priciest.label}) arasında başlar. Fiyatlar TL cinsindendir, KDV dâhildir; ödemeler
          iyzico altyapısıyla güvenle alınır.
        </P>
        <P>
          Sizden istediğimiz teknik doküman değil, kendi operasyonunuzun bilgisidir. Admin paneli
          veya ödeme içeren kapsamlar için{" "}
          <A href="/full-stack-platform-maliyeti">full stack platform maliyeti</A> sayfası bileşen
          fiyatlarını gösterir; çok dilli site için{" "}
          <A href="/multilingual-support-fiyat">multilingual destek fiyatları</A>na bakın.
        </P>
      </SeoSection>

      <SeoSection index={4} eyebrow="Neden Kagu" title="Butik operatör yazılımında neden Kagu?">
        <P>
          Kagu&apos;yu seçmenin nedeni odak ve derinliktir: yalnızca butik operatörlerle çalışan,
          teslim ettiği her sistemi üretimde tutan küçük bir İstanbul stüdyosu. Gereksiz özellik
          satmayız; işi çözen en küçük sistemi kurarız.
        </P>
        <P>
          Üretimdeki projeler <A href="/work">işlerimiz</A> sayfasında; yazılımın kimler için ne
          çözdüğünü <A href="/butik-operator-yazilimi">butik operatör yazılımı</A> sayfasında
          bulabilirsiniz.
        </P>
      </SeoSection>

      <FaqSection index={5} title="Sıkça sorulan sorular" faqs={FAQS} />

      <CtaBand
        title="Paketinizi kurun, fiyatı anında görün."
        href="/start-project"
        label="Oluşturucuyu aç"
        secondaryHref="/contact"
        secondaryLabel="Bize yazın"
      />

      <SiteFooter />
    </div>
  );
}
