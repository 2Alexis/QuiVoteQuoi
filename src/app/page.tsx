import type { Metadata } from "next";
import Link from "next/link";
import { stats, compositionActuelle, scrutins } from "@/lib/db";
import { formatNumber, formatDate, sortBadge, groupBloc } from "@/lib/ui";
import { GroupBadge, VoteBar, Hemicycle } from "@/components/bits";
import { ScrutinCard } from "@/components/ScrutinCard";

export const dynamic = "force-static";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

const BLOCS = [
  { key: "ext-gauche", label: "Extrême gauche", color: "#7A0C1E" },
  { key: "gauche", label: "Gauche", color: "#C8102E" },
  { key: "centre", label: "Bloc central", color: "#E7A100" },
  { key: "droite", label: "Droite", color: "#2563AC" },
  { key: "ext-droite", label: "Extrême droite", color: "#1B345E" },
  { key: "autre", label: "Divers / NI", color: "#8A96A3" },
] as const;

export default function Home() {
  const s = stats();
  const gs = compositionActuelle();
  const derniers = scrutins({ perPage: 6 }).rows;
  const totalSieges = gs.reduce((a, g) => a + (g.n ?? 0), 0);
  const blocs = BLOCS.map((b) => ({
    ...b,
    n: gs.filter((g) => groupBloc(g.abrege) === b.key).reduce((a, g) => a + (g.n ?? 0), 0),
  })).filter((b) => b.n > 0);

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            L&apos;Assemblée nationale, enfin lisible.
          </h1>
          <p className="text-lg text-[var(--muted)]">
            Difficile de savoir ce que votent vraiment les députés. QuiVoteQuoi rend chaque scrutin,
            chaque vote et chaque prise de position clairs et comparables — à partir de l&apos;open
            data officiel.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {[
              "Tous les scrutins publics",
              "Le vote de chaque député",
              "Comparez députés et groupes",
            ].map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent-strong)]"
                >
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link href="/comparateur" className="btn-primary">
              <span aria-hidden>⇄</span> Comparer les votes
            </Link>
            <Link href="/scrutins" className="btn-secondary">
              Voir les derniers scrutins
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Députés", value: s.deputes, href: "/deputes" },
            { label: "Scrutins", value: s.scrutins, href: "/scrutins" },
            { label: "Votes enregistrés", value: s.votes, href: "/scrutins" },
            { label: "Groupes", value: s.groupes, href: "/groupes" },
          ].map((c) => (
            <Link key={c.label} href={c.href} className="card p-4 transition-shadow hover:shadow-sm">
              <div className="stat-num text-2xl font-bold sm:text-3xl">{formatNumber(c.value)}</div>
              <div className="text-sm text-[var(--muted)]">{c.label}</div>
            </Link>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)]">
          Données officielles de l&apos;Assemblée nationale, à jour au {formatDate(s.lastDate)}.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Composition de l&apos;Assemblée</h2>
          <Link href="/groupes" className="text-sm text-[var(--muted)] link-accent">
            Tous les groupes →
          </Link>
        </div>
        <div className="card grid gap-6 p-5 lg:grid-cols-2">
          <div className="space-y-4">
            <Hemicycle groupes={gs} />
            {blocs.length > 0 && (
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {blocs.map((b) => (
                  <li key={b.key} className="inline-flex items-center gap-1.5 text-xs">
                    <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                    <span className="font-medium">{b.label}</span>
                    <span className="text-[var(--muted)]">{b.n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm font-medium">Groupes parlementaires</span>
              <span className="text-xs text-[var(--muted)]">{totalSieges} sièges</span>
            </div>
            <ul className="space-y-1.5">
              {gs.map((g) => (
                <li key={g.uid}>
                  <Link
                    href={`/groupes/${g.uid}`}
                    className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-[var(--background)]"
                  >
                    <GroupBadge abrege={g.abrege} libelle={g.libelle} />
                    <span className="flex-1 truncate text-sm">{g.libelle}</span>
                    <span className="stat-num text-sm font-semibold">{g.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Derniers scrutins</h2>
          <Link href="/scrutins" className="text-sm text-[var(--muted)] link-accent">
            Tout voir →
          </Link>
        </div>
        <ul className="card divide-y divide-[var(--border)]">
          {derniers.map((sc) => {
            const b = sortBadge(sc.sort_code);
            return (
              <li key={sc.uid}>
                <Link
                  href={`/scrutins/${sc.uid}`}
                  className="block p-4 hover:bg-[var(--background)] transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-[var(--muted)]">
                      {formatDate(sc.date)} · n°{sc.numero}
                    </span>
                    <span className={`badge ${b.cls}`}>{b.label}</span>
                  </div>
                  <ScrutinCard titre={sc.titre} className="mt-1" />
                  <div className="mt-2 flex items-center gap-3">
                    <VoteBar
                      pour={sc.pour ?? 0}
                      contre={sc.contre ?? 0}
                      abstention={sc.abstentions ?? 0}
                    />
                    <span className="whitespace-nowrap text-xs text-[var(--muted)]">
                      {sc.pour} pour · {sc.contre} contre
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
