import { Geist, Maname, Newsreader } from "next/font/google";

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

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const siteFontVars = `${newsreader.variable} ${maname.variable} ${geist.variable}`;
