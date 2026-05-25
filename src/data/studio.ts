/*
  Studio block — replaces the brief's "team grid" since Kagu has no public
  team page. Honest metrics, not invented headshots.
*/

export const studio = {
  founded: "2025",
  location: "Istanbul, Türkiye",
  timezone: "UTC+3",
  email: "hello@kagu.software",
  domain: "kagu.software",

  mission:
    "Kagu builds Next.js + Supabase platforms for boutique operators in hospitality, tourism, and services. Small team. Real production work. No agency theatre.",

  principles: [
    {
      title: "We build what operates, not what demos",
      body:
        "If it doesn't survive a Friday-night shift, it's not done. Polish is for what the staff actually see every day.",
    },
    {
      title: "Production is the deliverable",
      body:
        "Not a kickoff deck. Not a Figma file. The thing live, on a real domain, with real users: that's the unit of progress.",
    },
    {
      title: "Vertical depth compounds",
      body:
        "We stay in hospitality, tourism, and operator tools. The fifth restaurant menu is faster, and better, than the first.",
    },
    {
      title: "Small team is the feature",
      body:
        "One throat to choke. No account managers. The people writing the code are the people in the meetings.",
    },
  ],

  metrics: [
    { label: "Production clients", value: "4" },
    { label: "Founded", value: "2025" },
    { label: "Based", value: "Istanbul, TR" },
    { label: "Stack lineage", value: "Next 16 · Supabase · Vercel" },
  ],

  clocks: [
    { city: "Istanbul", tz: "Europe/Istanbul", utc: "+03:00" },
    { city: "London", tz: "Europe/London", utc: "+00:00" },
    { city: "New York", tz: "America/New_York", utc: "-05:00" },
  ],
} as const;
