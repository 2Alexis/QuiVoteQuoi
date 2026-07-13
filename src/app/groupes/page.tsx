import Link from "next/link";
import {
  compositionActuelle,
  professionsParGroupe,
  legislatures,
  positionsGroupes,
  deputesPourComparaison,
  DEFAULT_LEG,
} from "@/lib/db";
import { LegSwitcher } from "@/components/bits";
import { GroupLogo } from "@/components/GroupLogo";
import { selectFigures } from "@/components/GroupeViz";
import { GroupesAnalyseLazy } from "@/components/GroupesAnalyseLazy";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Groupes parlementaires",
  description:
    "Les groupes parlementaires de l'Assemblée nationale : composition, cohésion interne des votes et orientation politique.",
  path: "/groupes",
});

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
  const legs = legislatures();
  const profs = professionsParGroupe(leg);
  const positions = positionsGroupes(leg);
  // Têtes d'affiche calculées côté serveur : seules les figures retenues (et non
  // les ~577 députés) sont transmises à la section analytique différée.
  const figures = selectFigures(positions, deputesPourComparaison(leg));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Groupes politiques</h1>
          <p className="text-sm text-[var(--muted)]">
            {gs.length} groupes · {total} sièges
          </p>
        </div>
        <LegSwitcher current={leg} base="/groupes" legislatures={legs} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {gs.map((g) => (
          <Link
            key={g.uid}
            href={`/groupes/${g.uid}`}
            className="card flex items-center gap-4 p-4 transition hover:scale-[1.02] hover:shadow-sm"
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

      <GroupesAnalyseLazy positions={positions} figures={figures} profs={profs} />
    </div>
  );
}
