"use client";

import { useState } from "react";
import Link from "next/link";
import { LegSwitcher } from "@/components/bits";
import { GroupLogo } from "@/components/GroupLogo";
import { GroupesAnalyseLazy } from "@/components/GroupesAnalyseLazy";
import type { GroupePos, DeputeFig } from "@/components/GroupeViz";
import type { ProfessionsTable } from "@/lib/db";

export interface GroupesLegData {
  gs: { uid: string; abrege: string | null; libelle: string | null; n?: number }[];
  total: number;
  positions: GroupePos[];
  figures: Record<string, DeputeFig[]>;
  profs: ProfessionsTable;
}

// Rendu client de /groupes : la page-coquille est statique (ISR), et le
// basculement de législature se fait ici sans aller-retour serveur — les données
// des deux législatures sont déjà chargées. Ainsi la page n'est plus `force-dynamic`
// et ne se « refroidit » plus après inactivité (comme l'accueil, elle est en cache).
export function GroupesClient({
  legs,
  data,
}: {
  legs: string[];
  data: Record<string, GroupesLegData>;
}) {
  const [leg, setLeg] = useState(legs[0]);
  const d = data[leg] ?? data[legs[0]];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Groupes politiques</h1>
          <p className="text-sm text-[var(--muted)]">
            {d.gs.length} groupes · {d.total} sièges
          </p>
        </div>
        {legs.length > 1 && <LegSwitcher current={leg} legislatures={legs} onSelect={setLeg} />}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {d.gs.map((g) => (
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

      <GroupesAnalyseLazy positions={d.positions} figures={d.figures} profs={d.profs} />
    </div>
  );
}
