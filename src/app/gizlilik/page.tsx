import type { Metadata } from "next";
import { LegalShell, type LegalDocument } from "@/components/legal/Legal";
import { seller, orPlaceholder } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Gizlilik Sözleşmesi · Kagu",
  description:
    "Kagu gizlilik ve kişisel verilerin korunması (KVKK) politikası. Kagu's privacy and personal data protection policy.",
};

const NAME = orPlaceholder(seller.legalName, "Ad Soyad / Ünvan");

const tr: LegalDocument = {
  sections: [
    {
      heading: "1. Veri Sorumlusu",
      blocks: [
        `Kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla "${NAME}" tarafından, bu metinde açıklanan amaç ve şartlarla işlenmektedir.`,
        "Veri sorumlusunun iletişim bilgileri bu sayfanın başındaki satıcı bilgileri kutusunda yer almaktadır.",
      ],
    },
    {
      heading: "2. İşlenen Kişisel Veriler",
      blocks: [
        "Site ve hizmetlerimizi kullanmanıza bağlı olarak aşağıdaki kişisel veriler işlenebilir:",
        {
          list: [
            "Kimlik ve iletişim verileri: ad-soyad, e-posta, şirket/proje bilgisi ve iletişim formları aracılığıyla ilettiğiniz mesaj içerikleri.",
            "İşlem/sipariş verileri: satın alınan hizmet, tutar ve sipariş kayıtları.",
            "Teknik veriler: IP adresi, tarayıcı/cihaz bilgisi ve ziyaret istatistikleri (analitik).",
          ],
        },
        "Ödeme/kart bilgileriniz Satıcı tarafından görüntülenmez ve saklanmaz; ödeme işlemleri doğrudan lisanslı ödeme kuruluşu iyzico tarafından gerçekleştirilir.",
      ],
    },
    {
      heading: "3. İşleme Amaçları",
      blocks: [
        {
          list: [
            "Taleplerinizin ve sözleşmesel ilişkinin yürütülmesi, hizmetin sunulması.",
            "Ödeme işlemlerinin gerçekleştirilmesi ve iade/iptal süreçlerinin yönetilmesi.",
            "İletişim taleplerinizin yanıtlanması.",
            "Hukuki yükümlülüklerin yerine getirilmesi ve Site'nin güvenliği ile iyileştirilmesi.",
          ],
        },
      ],
    },
    {
      heading: "4. Hukuki Sebepler",
      blocks: [
        "Kişisel verileriniz, KVKK'nın 5. maddesinde yer alan; bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması, hukuki yükümlülüğün yerine getirilmesi, veri sorumlusunun meşru menfaati ve gerektiğinde açık rızanıza dayalı hukuki sebeplerle işlenir.",
      ],
    },
    {
      heading: "5. Aktarım",
      blocks: [
        "Kişisel verileriniz, hizmetin sağlanması amacıyla ve gerekli olduğu ölçüde; ödeme hizmeti sağlayıcısı (iyzico) ile barındırma/altyapı hizmet sağlayıcılarımıza (örn. Vercel, Supabase) aktarılabilir. Bu aktarımlar KVKK'nın 8. ve 9. maddelerine uygun olarak gerçekleştirilir; bazı sağlayıcıların sunucuları yurt dışında bulunabilir.",
      ],
    },
    {
      heading: "6. Saklama Süresi",
      blocks: [
        "Kişisel verileriniz, işlendikleri amaç için gerekli olan süre boyunca ve ilgili mevzuatta öngörülen yasal saklama süreleri kadar muhafaza edilir; sürenin sona ermesi hâlinde silinir, yok edilir veya anonim hâle getirilir.",
      ],
    },
    {
      heading: "7. Çerezler",
      blocks: [
        "Site'nin çalışması ve ziyaret istatistiklerinin (analitik) ölçülmesi amacıyla sınırlı sayıda çerez kullanılabilir. Tarayıcı ayarlarınızdan çerezleri yönetebilir veya engelleyebilirsiniz.",
      ],
    },
    {
      heading: "8. Haklarınız (KVKK m.11)",
      blocks: [
        "KVKK'nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını öğrenme, eksik/yanlış işlenmişse düzeltilmesini, şartları oluştuğunda silinmesini/yok edilmesini isteme ve işlemenin kanuna aykırı olması nedeniyle doğan zararın giderilmesini talep etme haklarına sahipsiniz.",
        `Haklarınızı kullanmak için ${seller.email} adresine başvurabilirsiniz.`,
      ],
    },
    {
      heading: "9. İletişim",
      blocks: [
        `Gizlilik uygulamalarımıza ilişkin sorularınız için ${seller.email} adresinden bize ulaşabilirsiniz.`,
      ],
    },
  ],
};

const en: LegalDocument = {
  sections: [
    {
      heading: "1. Data Controller",
      blocks: [
        `Your personal data is processed by "${NAME}" as the data controller under the Turkish Personal Data Protection Law No. 6698 ("KVKK"), for the purposes and on the terms described in this notice.`,
        "The data controller's contact details are shown in the seller information box at the top of this page.",
      ],
    },
    {
      heading: "2. Personal Data Processed",
      blocks: [
        "Depending on your use of our website and services, the following personal data may be processed:",
        {
          list: [
            "Identity and contact data: name, e-mail, company/project details, and the content of messages you send via the contact forms.",
            "Transaction/order data: the service purchased, amount, and order records.",
            "Technical data: IP address, browser/device information, and visit statistics (analytics).",
          ],
        },
        "Your payment/card details are not viewed or stored by the Seller; payments are processed directly by the licensed payment institution iyzico.",
      ],
    },
    {
      heading: "3. Purposes of Processing",
      blocks: [
        {
          list: [
            "Handling your requests and the contractual relationship, and providing the service.",
            "Carrying out payment transactions and managing refund/cancellation processes.",
            "Responding to your contact requests.",
            "Fulfilling legal obligations and ensuring the security and improvement of the website.",
          ],
        },
      ],
    },
    {
      heading: "4. Legal Bases",
      blocks: [
        "Your personal data is processed on the legal bases set out in Article 5 of the KVKK, including: being directly related to the conclusion or performance of a contract, fulfilment of a legal obligation, the legitimate interests of the data controller, and, where required, your explicit consent.",
      ],
    },
    {
      heading: "5. Transfers",
      blocks: [
        "To provide the service and to the extent necessary, your personal data may be transferred to our payment service provider (iyzico) and to our hosting/infrastructure providers (e.g. Vercel, Supabase). These transfers are carried out in accordance with Articles 8 and 9 of the KVKK; some providers' servers may be located abroad.",
      ],
    },
    {
      heading: "6. Retention",
      blocks: [
        "Your personal data is retained for as long as necessary for the purpose for which it is processed and for the statutory retention periods required by the relevant legislation; upon expiry, it is deleted, destroyed or anonymised.",
      ],
    },
    {
      heading: "7. Cookies",
      blocks: [
        "A limited number of cookies may be used to operate the website and to measure visit statistics (analytics). You can manage or block cookies from your browser settings.",
      ],
    },
    {
      heading: "8. Your Rights (KVKK Art. 11)",
      blocks: [
        "Under Article 11 of the KVKK you have the right to: learn whether your personal data is processed; request information if it is; learn the purpose of processing; request correction of incomplete/incorrect data; request deletion/destruction where the conditions are met; and claim compensation for damages arising from unlawful processing.",
        `To exercise your rights, you may contact us at ${seller.email}.`,
      ],
    },
    {
      heading: "9. Contact",
      blocks: [
        `For questions about our privacy practices, you can reach us at ${seller.email}.`,
      ],
    },
  ],
};

export default function GizlilikPage() {
  return (
    <LegalShell
      titleTr="Gizlilik Sözleşmesi"
      titleEn="Privacy Policy"
      tr={tr}
      en={en}
    />
  );
}
