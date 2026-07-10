import type { Metadata } from "next";
import { LegalShell, type LegalDocument } from "@/components/legal/Legal";
import { seller } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Teslimat ve İade Şartları · Kagu",
  description:
    "Kagu dijital/yazılım hizmetleri için teslimat, iptal ve iade koşulları. Delivery, cancellation and refund terms for Kagu's digital/software services.",
  alternates: { canonical: "/teslimat-iade" },
};

const tr: LegalDocument = {
  sections: [
    {
      heading: "1. Teslimat ve Hizmetin İfası",
      blocks: [
        "Kagu üzerinden satın alınan hizmetler, fiziksel ürün niteliğinde olmayıp dijital/yazılım hizmetleridir. Bu nedenle teslimat, elektronik ortamda hizmetin ifası, erişim sağlanması veya kuruluma/başlangıca (onboarding) başlanması yoluyla gerçekleşir.",
        "Ödemenin onaylanmasının ardından, hizmete erişim veya proje başlangıcı, ilgili hizmetin niteliğine göre makul süre içinde Alıcı'ya e-posta yoluyla iletilir. Süreli (abonelik) hizmetlerde ifa, satın alınan dönem boyunca devam eder.",
      ],
    },
    {
      heading: "2. İptal",
      blocks: [
        `Hizmetin ifasına henüz başlanmamış olması kaydıyla, Alıcı siparişini ${seller.email} adresine e-posta göndererek iptal edebilir ve ödediği bedelin tamamının iadesini talep edebilir.`,
      ],
    },
    {
      heading: "3. İade ve Geri Ödeme",
      blocks: [
        "Onaylanan iade ve iptal talepleri, ödemenin yapıldığı karta ve aynı ödeme yöntemi (iyzico) üzerinden gerçekleştirilir. Geri ödeme, talebin onaylanmasını izleyen en geç 14 (on dört) gün içinde başlatılır.",
        "Geri ödeme tutarının kart hesabına yansıma süresi, ilgili banka/kart kuruluşunun işlem sürelerine bağlı olarak değişebilir; bu süre Satıcı'nın kontrolü dışındadır.",
      ],
    },
    {
      heading: "4. Cayma Hakkı ve İstisnalar",
      blocks: [
        "Alıcı, kural olarak sözleşmenin kurulduğu tarihten itibaren 14 gün içinde cayma hakkına sahiptir. Ancak Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi uyarınca; Alıcı'nın onayı ile ifasına başlanan hizmetlerde, kişiye özel/sipariş üzerine hazırlanan yazılım hizmetlerinde ve anında ifa edilen dijital içeriklerde cayma hakkı kullanılamaz.",
        "İfaya başlanmış kişiye özel projelerde, başlangıç ücreti/avans ile fiilen yapılmış çalışmalara ilişkin bedeller iade kapsamı dışında olabilir.",
        "Ayrıntılar için Mesafeli Satış Sözleşmesi sayfasına bakınız.",
      ],
    },
    {
      heading: "5. İletişim",
      blocks: [
        `İptal, iade ve cayma taleplerinizi ${seller.email} adresine iletebilirsiniz. Talepleriniz en kısa sürede değerlendirilerek tarafınıza dönüş yapılır.`,
      ],
    },
  ],
};

const en: LegalDocument = {
  sections: [
    {
      heading: "1. Delivery & Performance",
      blocks: [
        "Services purchased through Kagu are digital/software services, not physical products. Delivery therefore takes place by performing the service electronically, providing access, or beginning setup/onboarding.",
        "After payment is confirmed, access or project start is sent to the Buyer by e-mail within a reasonable time depending on the nature of the service. For subscription (term) services, performance continues throughout the purchased period.",
      ],
    },
    {
      heading: "2. Cancellation",
      blocks: [
        `Provided that performance of the service has not yet begun, the Buyer may cancel the order by sending an e-mail to ${seller.email} and request a full refund of the amount paid.`,
      ],
    },
    {
      heading: "3. Refunds",
      blocks: [
        "Approved refund and cancellation requests are processed to the card used for payment, via the same payment method (iyzico). The refund is initiated within 14 (fourteen) days at the latest following approval of the request.",
        "The time for the refunded amount to appear on the card account may vary depending on the processing times of the relevant bank/card institution and is beyond the Seller's control.",
      ],
    },
    {
      heading: "4. Right of Withdrawal & Exceptions",
      blocks: [
        "As a rule, the Buyer has a right of withdrawal within 14 days from the conclusion of the contract. However, under Article 15 of the Regulation on Distance Contracts, the right of withdrawal cannot be exercised for services whose performance has begun with the Buyer's consent, for custom/made-to-order software services, and for digital content delivered instantly.",
        "For custom projects already underway, amounts corresponding to the setup fee/deposit and to work actually performed may fall outside the scope of refunds.",
        "For details, please see the Distance Sales Agreement page.",
      ],
    },
    {
      heading: "5. Contact",
      blocks: [
        `You can send cancellation, refund and withdrawal requests to ${seller.email}. Your requests will be reviewed and answered as soon as possible.`,
      ],
    },
  ],
};

export default function TeslimatIadePage() {
  return (
    <LegalShell
      titleTr="Teslimat ve İade Şartları"
      titleEn="Delivery & Return Terms"
      tr={tr}
      en={en}
    />
  );
}
