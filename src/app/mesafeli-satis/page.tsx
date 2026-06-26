import type { Metadata } from "next";
import { LegalShell, type LegalDocument } from "@/components/legal/Legal";
import { seller, orPlaceholder } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi · Kagu",
  description:
    "Kagu üzerinden sunulan dijital/yazılım hizmetlerinin satışına ilişkin mesafeli satış sözleşmesi. Distance sales agreement for digital/software services sold via Kagu.",
};

const NAME = orPlaceholder(seller.legalName, "Ad Soyad / Ünvan");

const tr: LegalDocument = {
  sections: [
    {
      heading: "1. Taraflar",
      blocks: [
        `İşbu Mesafeli Satış Sözleşmesi; bir tarafta "${NAME}" (bundan sonra "Satıcı" olarak anılacaktır) ile diğer tarafta ${seller.website} internet sitesi (bundan sonra "Site") üzerinden sipariş veren müşteri (bundan sonra "Alıcı") arasında, aşağıda belirtilen hüküm ve şartlar çerçevesinde elektronik ortamda kurulmuştur.`,
        "Satıcının tam kimlik ve iletişim bilgileri bu sayfanın başında yer alan satıcı bilgileri kutusunda gösterilmiştir.",
      ],
    },
    {
      heading: "2. Sözleşmenin Konusu",
      blocks: [
        "İşbu Sözleşme'nin konusu, Alıcı'nın Site üzerinden elektronik ortamda siparişini verdiği, nitelikleri ve satış bedeli aşağıda ve sipariş/ödeme ekranında belirtilen dijital hizmet ve/veya yazılım hizmetlerinin satışı ve ifası ile tarafların 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca hak ve yükümlülüklerinin belirlenmesidir.",
      ],
    },
    {
      heading: "3. Sözleşme Konusu Hizmet ve Bedel",
      blocks: [
        "Satışa konu hizmetin türü, kapsamı, süresi ve tüm vergiler dâhil toplam satış bedeli, ödeme öncesinde sipariş/ödeme ekranında Alıcı'ya açıkça gösterilir. Alıcı, ödeme adımını onaylamadan önce bu bilgileri teyit etmiş sayılır.",
        "Fiyatlar, aksi belirtilmedikçe Türk Lirası (TL) cinsindendir ve KDV dâhildir.",
      ],
    },
    {
      heading: "4. Ödeme",
      blocks: [
        "Ödemeler, lisanslı ödeme kuruluşu iyzico altyapısı üzerinden, Visa ve MasterCard kredi/banka kartları ile güvenli (SSL) bağlantı üzerinden tahsil edilir.",
        "Alıcı'nın kart bilgileri Satıcı tarafından görüntülenmez, kaydedilmez ve saklanmaz; ödeme işlemleri doğrudan iyzico tarafından gerçekleştirilir.",
      ],
    },
    {
      heading: "5. Hizmetin İfası / Teslimat",
      blocks: [
        "Hizmet niteliği gereği dijital/elektronik ortamda ifa edilir. Ödemenin onaylanmasının ardından, hizmete erişim, kurulum veya başlangıç (onboarding) Satıcı tarafından Alıcı'ya elektronik olarak sağlanır.",
        "Teslimat ve ifa süreleri ile iptal/iade koşullarının ayrıntıları için Teslimat ve İade Şartları sayfasına bakınız.",
      ],
    },
    {
      heading: "6. Cayma Hakkı",
      blocks: [
        "Alıcı, kural olarak hizmetin ifasına ilişkin sözleşmelerde, sözleşmenin kurulduğu tarihten itibaren 14 (on dört) gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin cayma hakkına sahiptir.",
        `Cayma hakkı, ${seller.email} adresine yazılı bildirim (e-posta) gönderilmek suretiyle, süresi içinde kullanılabilir.`,
      ],
    },
    {
      heading: "7. Cayma Hakkının Kullanılamayacağı Haller",
      blocks: [
        "Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi uyarınca, aşağıdaki hallerde Alıcı cayma hakkını kullanamaz:",
        {
          list: [
            "Alıcı'nın onayı ile ifasına başlanan ve 14 günlük süre dolmadan tamamlanan hizmetler.",
            "Alıcı'nın istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan, kişiye özel/sipariş üzerine üretilen (örn. özel yazılım geliştirme) hizmet ve içerikler.",
            "Elektronik ortamda anında ifa edilen ve gayrimaddi (fiziki olmayan) dijital içeriklerin Alıcı'nın onayı ile sunulmaya başlanması.",
          ],
        },
        "Bu kapsamdaki hizmetlerde, ifaya başlanmadan önce Alıcı'nın açık onayı alınır ve Alıcı cayma hakkını kaybedeceği hususunda bilgilendirilir.",
      ],
    },
    {
      heading: "8. Uyuşmazlıkların Çözümü",
      blocks: [
        "İşbu Sözleşme'nin uygulanmasında, Ticaret Bakanlığı'nca her yıl ilan edilen parasal sınırlar dâhilinde Alıcı'nın yerleşim yerindeki veya işlemin yapıldığı yerdeki Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir.",
      ],
    },
    {
      heading: "9. Yürürlük",
      blocks: [
        "Alıcı, Site üzerinden siparişini onayladığında işbu Sözleşme'nin tüm şartlarını okuduğunu, anladığını ve kabul ettiğini beyan eder. İşbu Sözleşme, siparişin onaylanması ile yürürlüğe girer.",
      ],
    },
  ],
};

const en: LegalDocument = {
  sections: [
    {
      heading: "1. Parties",
      blocks: [
        `This Distance Sales Agreement is concluded electronically between "${NAME}" (the "Seller") and the customer placing an order through the ${seller.website} website (the "Buyer"), under the terms set out below.`,
        "The Seller's full identity and contact details are shown in the seller information box at the top of this page.",
      ],
    },
    {
      heading: "2. Subject",
      blocks: [
        "This Agreement governs the sale and provision of the digital and/or software services ordered electronically by the Buyer through the website, the characteristics and price of which are stated below and on the order/checkout screen, and determines the parties' rights and obligations under Turkish Consumer Protection Law No. 6502 and the Regulation on Distance Contracts.",
      ],
    },
    {
      heading: "3. Service and Price",
      blocks: [
        "The type, scope, duration and total price (including all taxes) of the service are displayed clearly to the Buyer on the order/checkout screen before payment. By confirming the payment step, the Buyer is deemed to have reviewed this information.",
        "Unless otherwise stated, prices are in Turkish Lira (TRY) and include VAT.",
      ],
    },
    {
      heading: "4. Payment",
      blocks: [
        "Payments are collected via the licensed payment institution iyzico, using Visa and MasterCard credit/debit cards over a secure (SSL) connection.",
        "The Buyer's card details are not viewed, recorded or stored by the Seller; payment is processed directly by iyzico.",
      ],
    },
    {
      heading: "5. Performance / Delivery",
      blocks: [
        "Given its nature, the service is performed digitally/electronically. After the payment is confirmed, access, setup or onboarding is provided to the Buyer electronically by the Seller.",
        "For details of delivery/performance timelines and cancellation/refund conditions, please see the Delivery & Return Terms page.",
      ],
    },
    {
      heading: "6. Right of Withdrawal",
      blocks: [
        "As a rule, for service contracts the Buyer has the right to withdraw within 14 (fourteen) days from the conclusion of the contract, without giving any reason and without paying any penalty.",
        `The right of withdrawal may be exercised within that period by sending written notice (e-mail) to ${seller.email}.`,
      ],
    },
    {
      heading: "7. Exceptions to the Right of Withdrawal",
      blocks: [
        "Pursuant to Article 15 of the Regulation on Distance Contracts, the Buyer cannot exercise the right of withdrawal in the following cases:",
        {
          list: [
            "Services whose performance has started with the Buyer's consent and is completed before the 14-day period expires.",
            "Goods/services and content prepared in line with the Buyer's requests or personal needs, i.e. custom / made-to-order (e.g. bespoke software development).",
            "Intangible (non-physical) digital content delivered instantly and supplied with the Buyer's consent.",
          ],
        },
        "For such services, the Buyer's express consent is obtained before performance begins, and the Buyer is informed that the right of withdrawal will be lost.",
      ],
    },
    {
      heading: "8. Dispute Resolution",
      blocks: [
        "Within the monetary limits announced annually by the Turkish Ministry of Trade, the Consumer Arbitration Committees and Consumer Courts at the Buyer's place of residence or at the place of the transaction have jurisdiction over the application of this Agreement.",
      ],
    },
    {
      heading: "9. Effectiveness",
      blocks: [
        "By confirming an order through the website, the Buyer declares that they have read, understood and accepted all terms of this Agreement. This Agreement enters into force upon confirmation of the order.",
      ],
    },
  ],
};

export default function MesafeliSatisPage() {
  return (
    <LegalShell
      titleTr="Mesafeli Satış Sözleşmesi"
      titleEn="Distance Sales Agreement"
      tr={tr}
      en={en}
    />
  );
}
