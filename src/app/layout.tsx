import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuiVoteQuoi — les votes de l'Assemblée nationale",
  description:
    "Comparez et explorez les scrutins, les votes, les députés et les groupes de l'Assemblée nationale française. Données open data officielles.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-5 px-5 py-3">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 font-bold tracking-tight"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
                ✓
              </span>
              <span className="text-lg">
                Qui<span className="text-[var(--accent)]">Vote</span>Quoi
              </span>
            </Link>
            <Nav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>
        <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto max-w-6xl px-5 py-6 text-sm text-[var(--muted)]">
            Données : open data de l&apos;Assemblée nationale (Licence Ouverte Etalab). Projet
            indépendant, non affilié à l&apos;Assemblée nationale.
          </div>
        </footer>
      </body>
    </html>
  );
}
