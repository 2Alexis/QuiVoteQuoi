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

// Page 100 % statique (générée au build, comme l'accueil). Les données étant figées
// jusqu'au prochain déploiement, `revalidate` ne ferait que régénérer la page à
// l'exécution toutes les heures sans rien changer — et cette régénération, après
// inactivité sur le plan gratuit, ralentissait les premières navigations. On pré-rend
// donc la coquille + les deux législatures une fois ; filtrage et bascule côté client.
export const dynamic = "force-static";

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
