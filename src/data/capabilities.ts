export type Capability = {
  id: string;
  title: string;
  body: string;
  detail: readonly string[];
};

export const capabilities: readonly Capability[] = [
  {
    id: "full-stack",
    title: "Full-stack platforms",
    body:
      "Customer-facing surface and operator-facing admin, built against one database. The product and the back-office are not separate projects.",
    detail: ["Next.js 16 · App Router", "Supabase · Postgres + Auth + Storage", "Vercel"],
  },
  {
    id: "admin",
    title: "Admin that staff use",
    body:
      "Role-based content systems that non-technical operators actually open. Less CMS, more form.",
    detail: ["Supabase RLS", "Custom editor per surface", "Audit + soft-delete by default"],
  },
  {
    id: "multilingual",
    title: "Multilingual by default",
    body:
      "Turkish + English first-class, not bolted on. Public copy and admin labels translated; routing per locale.",
    detail: ["Per-route locale", "Editorial translation, not auto-MT", "Right-to-left ready"],
  },
  {
    id: "realtime",
    title: "Real-time, where it matters",
    body:
      "Operator notifications via the channels the team already lives in: WhatsApp threads, Telegram channels, on-site dashboards.",
    detail: ["WhatsApp Business API", "Telegram bots", "Webhook + cron orchestration"],
  },
  {
    id: "deploy",
    title: "Ship to production, fast",
    body:
      "Vercel-first, free-tier compatible where possible. Production at the kickoff, not at the launch.",
    detail: ["Vercel · preview deploys", "Free-tier compatible", "Domain + CI on day one"],
  },
] as const;
