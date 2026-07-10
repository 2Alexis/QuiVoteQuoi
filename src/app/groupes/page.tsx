import Link from "next/link";
import {
  compositionActuelle,
  professionsParGroupe,
  legislatures,
  positionsGroupes,
  deputesPourComparaison,
  DEFAULT_LEG,
} from "@/lib/db";
import { LegSwitcher, ProfessionsGroupes } from "@/components/bits";
import { GroupLogo } from "@/components/GroupLogo";
import { MdsMap, CohesionInterne, TetesAffiche } from "@/components/GroupeViz";

export const dynamic = "force-dynamic";

export default async function GroupesPage({
  searchParams,
}: {
  searchParams: Promise<{ leg?: string }>;
}) {
  const sp = await searchParams;
  const leg = sp.leg || DEFAULT_LEG;
  // Composition instantanée (un titulaire courant par circonscription) plutôt que
  // le cumul des passages : les effectifs affichés reflètent les 577 sièges réels.
  const gs = compositionActuelle(leg);
  const total = gs.reduce((a, g) => a + (g.n ?? 0), 0);
  const profs = professionsParGroupe(leg);
  const positions = positionsGroupes(leg);
  const deputesCompare = deputesPourComparaison(leg);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Groupes politiques</h1>
          <p className="text-sm text-[var(--muted)]">
            {gs.length} groupes · {total} sièges
          </p>
        </div>
        <LegSwitcher current={leg} base="/groupes" legislatures={legislatures()} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {gs.map((g) => (
          <Link
            key={g.uid}
            href={`/groupes/${g.uid}`}
            className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-sm"
          >
            <GroupLogo abrege={g.abrege} libelle={g.libelle} size={52} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{g.libelle}</div>
              <div className="text-xs text-[var(--muted)]">
                {g.abrege} · {g.n} députés
              </div>
            </div>
          </Link>
        ))}
      </div>

      {positions.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-5">
            <h2 className="mb-1 text-lg font-semibold">Cartographie des groupes</h2>
            <p className="mb-3 text-xs text-[var(--muted)]">
              Positionnement 2D (MDS) : deux groupes sont proches lorsqu&apos;ils votent de la même
              façon. La taille reflète le nombre de députés.
            </p>
            <MdsMap positions={positions} />
          </section>
          <section className="card p-5">
            <h2 className="mb-1 text-lg font-semibold">Cohésion interne</h2>
            <p className="mb-3 text-xs text-[var(--muted)]">
              Part des députés du groupe suivant la position majoritaire, en moyenne sur tous les
              scrutins.
            </p>
            <CohesionInterne positions={positions} />
          </section>
        </div>
      )}

      {positions.length > 0 && (
        <section className="card space-y-3 p-5">
          <div>
            <h2 className="text-lg font-semibold">Têtes d&apos;affiche</h2>
            <p className="text-xs text-[var(--muted)]">
              Quelques figures connues de chaque groupe (cliquez pour voir leur fiche et leurs
              statistiques de vote).
            </p>
          </div>
          <TetesAffiche positions={positions} deputes={deputesCompare} />
        </section>
      )}

      {profs.categories.length > 0 && (
        <section className="card space-y-3 p-5">
          <div>
            <h2 className="text-lg font-semibold">Catégories socio-professionnelles</h2>
            <p className="text-sm text-[var(--muted)]">
              Part de chaque catégorie INSEE (dernier métier déclaré) au sein de chaque groupe.
            </p>
          </div>
          <ProfessionsGroupes table={profs} />
          <p className="text-xs text-[var(--muted)]">
            Source : catégorie socio-professionnelle INSEE (famille) des fiches d&apos;acteurs de
            l&apos;Assemblée nationale. Lecture en colonne : chaque pourcentage indique la part des
            députés du groupe relevant de la catégorie.
          </p>
        </section>
      )}
    </div>
  );
}
