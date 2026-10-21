import { Geist, Newsreader } from "next/font/google";

/* Public-site fonts. Shared by the (site) layout and the root not-found page. */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  weight: ["300", "400"],
  style: ["normal", "italic"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const siteFontVars = `${newsreader.variable} ${geist.variable}`;
