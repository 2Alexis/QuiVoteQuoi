"use client";

import dynamic from "next/dynamic";
import type { GroupePos, DeputeFig } from "@/components/GroupeViz";
import type { ProfessionsTable } from "@/lib/db";

// Chargement différé des sections analytiques de /groupes : rendues côté client
// après hydratation, elles ne pèsent plus sur le rendu serveur de la page (le
// serveur n'envoie d'abord que la liste des groupes → premier octet plus rapide).
const GroupesAnalyse = dynamic(
  () => import("@/components/GroupesAnalyse").then((m) => m.GroupesAnalyse),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="h-64 w-full animate-pulse rounded-2xl bg-[var(--surface)]" />
        <div className="h-48 w-full animate-pulse rounded-2xl bg-[var(--surface)]" />
      </div>
    ),
  }
);

export function GroupesAnalyseLazy(props: {
  positions: GroupePos[];
  figures: Record<string, DeputeFig[]>;
  profs: ProfessionsTable;
}) {
  return <GroupesAnalyse {...props} />;
}
