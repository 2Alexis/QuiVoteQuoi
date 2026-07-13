import {
  compositionActuelle,
  professionsParGroupe,
  legislatures,
  positionsGroupes,
  deputesPourComparaison,
} from "@/lib/db";
import { selectFigures } from "@/components/GroupeViz";
import { GroupesClient, type GroupesLegData } from "./GroupesClient";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

// Page mise en cache (ISR, régénérée en arrière-plan) : plus de `force-dynamic`.
// Les données sont figées jusqu'au prochain déploiement, donc on pré-rend la
// coquille + les deux législatures une fois pour toutes ; le filtrage / le
// basculement de législature se fait côté client. Résultat : servie depuis le
// cache statique comme l'accueil, elle ne subit plus la latence de réveil à froid.
export const revalidate = 3600;

export const metadata: Metadata = pageMeta({
  title: "Groupes parlementaires",
  description:
    "Les groupes parlementaires de l'Assemblée nationale : composition, cohésion interne des votes et orientation politique.",
  path: "/groupes",
});

export default function GroupesPage() {
  const legs = legislatures();
  const data: Record<string, GroupesLegData> = {};
  for (const leg of legs) {
    const gs = compositionActuelle(leg);
    const positions = positionsGroupes(leg);
    data[leg] = {
      gs,
      total: gs.reduce((a, g) => a + (g.n ?? 0), 0),
      positions,
      figures: selectFigures(positions, deputesPourComparaison(leg)),
      profs: professionsParGroupe(leg),
    };
  }
  return <GroupesClient legs={legs} data={data} />;
}
