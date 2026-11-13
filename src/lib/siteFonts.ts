import { Geist, JetBrains_Mono, Maname, Newsreader } from "next/font/google";

/* Public-site fonts. Shared by the (site) layout and the root not-found page. */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  weight: ["300", "400"],
  style: ["normal", "italic"],
});

/* Headline font on the public site (regular weight only, no italic). Newsreader stays for the admin. */
const maname = Maname({
  variable: "--font-maname",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  weight: "400",
});

/* Monospace, for ASCII art and small labels only. */
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  weight: ["400", "500", "700"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const siteFontVars = `${newsreader.variable} ${maname.variable} ${jetbrains.variable} ${geist.variable}`;
