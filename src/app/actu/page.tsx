import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/site";
import { scrutins } from "@/lib/db";
import { formatDate, sortBadge } from "@/lib/ui";
import { CategoriePill, OrientationPill, VoteBar } from "@/components/bits";
import { ScrutinCard } from "@/components/ScrutinCard";
import { ShareButtons } from "@/components/ShareButtons";

// Page « actu » : les votes marquants récents = les votes finaux sur des textes
// de loi entiers (adoption / rejet), par opposition aux amendements et articles.
// C'est la lecture éditoriale, prête à partager, de l'activité de l'Assemblée.
// Rendu en cache (ISR), revalidé au rythme des ingestions.
export const revalidate = 3600;

export const metadata: Metadata = pageMeta({
  title: "Votes marquants",
  description:
    "Les derniers textes de loi adoptés ou rejetés à l'Assemblée nationale : résultat du vote, orientation gauche-droite et détail scrutin par scrutin.",
  path: "/actu",
});

export default function Actu() {
  const rows = scrutins({ loisOnly: true, includeBudget: true, perPage: 30 }).rows;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Les votes marquants de l&apos;Assemblée nationale
        </h1>
        <p className="max-w-2xl text-[var(--muted)]">
          Quels textes de loi les députés ont-ils adoptés ou rejetés récemment ? Voici les votes
          sur l&apos;ensemble des projets et propositions de loi — les décisions qui font l&apos;actualité,
          chacune située sur l&apos;axe gauche-droite et détaillée vote par vote.
        </p>
        <ShareButtons title="Les votes marquants de l'Assemblée nationale — QuiVoteQuoi" />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Derniers textes votés</h2>
          <Link href="/scrutins" className="text-sm text-[var(--muted)] link-accent">
            Tous les scrutins →
          </Link>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Aucun vote disponible pour le moment.</p>
        ) : (
          <ul className="card divide-y divide-[var(--border)]">
            {rows.map((sc) => {
              const b = sortBadge(sc.sort_code);
              return (
                <li key={sc.uid}>
                  <Link
                    href={`/scrutins/${sc.uid}`}
                    className="block p-4 transition-colors hover:bg-[var(--background)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-[var(--muted)]">
                        {formatDate(sc.date)} · n°{sc.numero}
                      </span>
                      <span className={`badge ${b.cls}`}>{b.label}</span>
                    </div>
                    <div className="mt-1 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <ScrutinCard titre={sc.titre} className="min-w-0 flex-1" />
                      <div className="flex flex-wrap gap-1 sm:shrink-0 sm:justify-end">
                        <CategoriePill categorie={sc.categorie} />
                        <OrientationPill
                          categorie={sc.categorie}
                          orientation={sc.orientation}
                          score={sc.orientation_score}
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <VoteBar
                        pour={sc.pour ?? 0}
                        contre={sc.contre ?? 0}
                        abstention={sc.abstentions ?? 0}
                        nonvotant={sc.non_votants ?? 0}
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
        )}
      </section>
    </div>
  );
}
