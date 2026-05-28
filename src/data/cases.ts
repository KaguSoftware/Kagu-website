/*
  Real Kagu case studies. All four are shipped client projects.
  Cover treatment: text-only color blocks (mint ladder + slate-ink),
  not screenshots — fits the editorial register better than thumbnails.
  Replace coverColor with a Cloudinary/uploaded URL later if photos arrive.
*/

export type CaseFeature = {
  image: string;
  title: string;
  description: string;
  /** Override the case-level device for this single frame. Lets a mostly-mobile
   *  case end on a desktop admin shot, etc. */
  device?: "desktop" | "mobile";
};

export type Case = {
  slug: string;
  client: string;
  project: string;
  sector: string;
  year: string;
  role: string;
  stack: readonly string[];
  url: string;
  lede: string;
  body: readonly string[];
  cover: {
    bg: "mint-pale" | "mint-soft" | "mint-deep" | "slate-ink" | "paper";
    label: string;
  };
  thumbnail?: string;
  features?: readonly CaseFeature[];
  /** "mobile" renders screenshots inside a phone frame and drops the browser chrome. */
  device?: "desktop" | "mobile";
};

export const cases: readonly Case[] = [
  {
    slug: "sabrina-turizm",
    client: "Sabrina Turizm",
    project: "Boutique tourism platform",
    sector: "Hospitality · Tourism",
    year: "2025",
    role: "Design + build · platform + admin",
    stack: ["Next.js 16", "Supabase", "Vercel", "WhatsApp Business API"],
    url: "https://sabrinaturizm.com",
    lede:
      "Curated multi-day Turkish tours and private driver services, with a hand-tuned admin so Sabrina manages the catalog the way she always has: by hand, but faster.",
    body: [
      "Sabrina runs a small, opinionated tourism shop in Istanbul. The brief was not 'replace the team with software'; it was 'give the team less paperwork so they can spend more time with guests'.",
      "We built two surfaces against one database. Customers browse curated tours and request bookings; staff manage the catalog, pricing, fleet, and content from a role-based admin. Real WhatsApp threads carry the conversation; the platform just makes sure nothing falls through.",
      "The whole system runs on the Vercel + Supabase free tier comfortably, by design. Sabrina pays for hospitality, not for infrastructure.",
    ],
    cover: { bg: "mint-soft", label: "Sabrina Turizm" },
    thumbnail: "/cases/sabrina-turizm/Thumbnail.png",
    features: [
      {
        image: "/cases/sabrina-turizm/customPackageBuilder.png",
        title: "Custom package builder",
        description:
          "Guests assemble their own itinerary through a friendly UI with clear copy and explanatory motion — more travelers chose to build their own package than to take a group tour.",
      },
      {
        image: "/cases/sabrina-turizm/TourPlanAutoPDF.png",
        title: "Tour plan, auto-PDF",
        description:
          "The moment an admin finalizes a tour, the platform generates a downloadable PDF plan — saving both staff and guests a round-trip of emails.",
      },
      {
        image: "/cases/sabrina-turizm/WhatsappFullMessage.png",
        title: "Full-context WhatsApp handoff",
        description:
          "Selections become a structured WhatsApp message: guests don't have to remember what they picked, and staff don't have to re-collect details to quote.",
      },
      {
        image: "/cases/sabrina-turizm/VoucherGenerator.png",
        title: "Voucher generator with AI translation",
        description:
          "Admins generate vouchers in a click — autofilled from the booked package, with built-in AI translation so guests get their voucher in their own language.",
      },
    ],
  },
  {
    slug: "upperdeck",
    client: "UpperDeck",
    project: "Digital menu + POS",
    sector: "Restaurants · Hospitality",
    year: "2025",
    role: "Design + build · public menu + staff POS",
    stack: ["Next.js 16", "Supabase RLS", "Vercel", "Telegram Bot API"],
    url: "https://upperdeckk.com",
    lede:
      "An American diner in a Turkish market needed a menu customers could read on their phones, and a POS the team could read on a busy shift. Both, on one schema.",
    body: [
      "UpperDeck serves a mixed local + tourist crowd. Customers needed a fast, mobile-first menu: no app store, no QR-redirect ad farms, just the menu. Staff needed inventory + order management that didn't require a manager to be the only person who can change a price.",
      "Two front-ends, one Postgres. Supabase RLS handles the role boundary cleanly: line cooks can mark items 86'd, the manager can adjust pricing, the owner can see what sold yesterday. Orders flow to a Telegram channel the back-of-house already lives in.",
      "Built in five weeks. Live the day the lease started.",
    ],
    cover: { bg: "mint-pale", label: "UpperDeck" },
    thumbnail: "/cases/upperdeck/ThumbnailUp.png",
    device: "mobile",
    features: [
      {
        image: "/cases/upperdeck/Bell.png",
        title: "Call-a-waiter bell",
        description:
          "At peak hours, guests struggled to flag down a server. The bell sends a tap-to-call message straight to the floor — no waving, no missed bills, no confusion at the pass.",
      },
      {
        image: "/cases/upperdeck/Cart.png",
        title: "Persistent cart",
        description:
          "Customers don't have to remember the exact item name, add-ons, or modifiers they picked. The cart carries it, so the order lands at the waiter clean — no pause, no scroll-back, no re-asking.",
      },
      {
        image: "/cases/upperdeck/AddOns.png",
        title: "Quiet add-on suggestions",
        description:
          "Upsell prompts surface inside the existing flow as a small inline suggestion — never a pop-up. Order total rises without the guest feeling pushed.",
      },
      {
        image: "/cases/upperdeck/Hero.png",
        title: "Admin promotions",
        description:
          "Admins set a promotion once; the discount auto-applies to the product, and a quick scroll-to-product link skips the customer straight to the deal.",
        device: "desktop",
      },
    ],
  },
  {
    slug: "genbuzz",
    client: "GenBuzz",
    project: "Proposal & document builder",
    sector: "SaaS · Operator tools",
    year: "2026",
    role: "Design + build · full product",
    stack: ["Next.js 16", "Supabase", "Vercel", "PDF generation"],
    url: "https://project1-blond-nu.vercel.app",
    lede:
      "Freelancers and small agencies needed proposals that look like they came from a studio, in the time it takes to make coffee. GenBuzz is that.",
    body: [
      "Pick a document category: proposal, contract, invoice, letter. Pick a template. Drag in the sections you want. Plug in your project specifics, pricing tiers, timelines. Generate a clean PDF. Done.",
      "Where most builders trap users in their own templates, GenBuzz keeps the editing experience modular: every section is a re-orderable block; every block lives in the user's account so they can re-use it next quarter. Standard, Professional, Enterprise pricing tiers are first-class, because the template knows about packaging the way operators do.",
      "Auth via Supabase, persistence per user, one-click PDF export. The kind of tool you stop noticing because it stops being in your way.",
    ],
    cover: { bg: "slate-ink", label: "GenBuzz" },
    thumbnail: "/cases/genbuzz/ThumbnailGen.png",
    features: [
      {
        image: "/cases/genbuzz/MultiDocType.png",
        title: "Multi-document support",
        description:
          "Proposals, contracts, invoices, letters — every doc the operator runs on lives in one tool. No second tab, no second subscription.",
      },
      {
        image: "/cases/genbuzz/aiGeneration.jpg",
        title: "AI-drafted in seconds",
        description:
          "A one-sentence brief is enough. The model returns a full first draft of the requested document in seconds — ready to refine, not start from scratch.",
      },
      {
        image: "/cases/genbuzz/reorder.png",
        title: "Reorderable sections",
        description:
          "Drag sections to match a client's priorities — pricing first for some, timeline first for others. The doc bends to the pitch, not the other way around.",
      },
      {
        image: "/cases/genbuzz/MultiLang.png",
        title: "Multilingual generation + PDF",
        description:
          "Generate and export the same document in multiple languages with one click. The PDF lands ready to send — no copy/paste into a translator.",
      },
      {
        image: "/cases/genbuzz/saves.png",
        title: "Saved, shared, retrievable",
        description:
          "Every document is saved per user and surfaced to admins. Authors revisit and reuse; admins see the full library without asking around.",
      },
    ],
  },
  {
    slug: "vize-makinesi",
    client: "Vize Makinesi",
    project: "Visa consultation platform",
    sector: "Services · Immigration",
    year: "2025",
    role: "Design + build · platform + admin",
    stack: ["Next.js 16", "Supabase", "Vercel"],
    url: "https://vize-makinesi.vercel.app",
    lede:
      "A Turkish visa consultation business needed a public surface that explains the visa landscape clearly, and an admin that lets non-technical staff publish updates as policies change.",
    body: [
      "Visa policy moves fast. The site needed to be authoritative without being legalistic, and editable without being a CMS the team would resent.",
      "We built a structured content model around countries, visa types, and partnerships, so the public site reads like a guide, but the editing experience is a form, not a markdown editor. Staff publish a policy change in five minutes; consultants spend the time saved with clients.",
      "Multilingual (Turkish + English) by default, since the audience is half-and-half.",
    ],
    cover: { bg: "mint-deep", label: "Vize Makinesi" },
    thumbnail: "/cases/vize-makinesi/ThumbnailVize.png",
    features: [
      {
        image: "/cases/vize-makinesi/ClearInfo.png",
        title: "All visa info, one screen",
        description:
          "Requirements, documents, processing times, and fees collected in one structured view per country — applicants land on what they need without digging through a Q&A.",
      },
      {
        image: "/cases/vize-makinesi/Blog.png",
        title: "Short country briefs",
        description:
          "Bite-sized posts on each destination — climate, culture, recent policy changes, traveller tips. Helps applicants pick the right country to apply to, not just the right visa, and gives the site a reason to come back to between applications.",
      },
      {
        image: "/cases/vize-makinesi/embeddedCalculation.png",
        title: "Cascade rule, in-page",
        description:
          "The Cascade-rule eligibility check runs right on the site through a handful of clear inputs. Applicants get an immediate read; consultants stop being a calculator.",
      },
    ],
  },
] as const;

export function getCase(slug: string): Case | undefined {
  return cases.find((c) => c.slug === slug);
}
