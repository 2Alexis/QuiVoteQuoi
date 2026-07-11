import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { BrandLogo } from "@/components/BrandMark";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "QuiVoteQuoi — les votes de l'Assemblée nationale",
    template: "%s · QuiVoteQuoi",
  },
  description:
    "Comparez et explorez les scrutins, les votes, les députés et les groupes de l'Assemblée nationale française. Données open data officielles.",
  applicationName: SITE_NAME,
  keywords: [
    "Assemblée nationale",
    "députés",
    "scrutins",
    "votes",
    "groupes parlementaires",
    "open data",
    "politique française",
  ],
  authors: [{ name: SITE_NAME }],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "fr_FR",
    title: "QuiVoteQuoi — les votes de l'Assemblée nationale",
    description:
      "Comparez et explorez les scrutins, les votes, les députés et les groupes de l'Assemblée nationale française. Données open data officielles.",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuiVoteQuoi — les votes de l'Assemblée nationale",
    description:
      "Explorez et comparez les votes de l'Assemblée nationale — données open data officielles.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-5 px-5 py-3">
            <BrandLogo className="shrink-0" />
            <Nav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
