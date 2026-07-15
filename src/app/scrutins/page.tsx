import { scrutins, legislatures, categoriesScrutins } from "@/lib/db";
import { ScrutinsClient } from "./ScrutinsClient";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

// Page 100 % statique (générée au build, comme l'accueil). Les données sont figées
// jusqu'au redéploiement nocturne, donc pas de `revalidate` : sinon la page serait
// régénérée toutes les heures à l'exécution pour rien, et cette régénération (après
// inactivité, plan gratuit) ralentissait les premières navigations. On pré-rend la
// coquille + la 1re page par défaut ; la liste faisant des milliers de lignes, on ne
// l'embarque pas côté client : recherche, filtres et pagination passent par
// /api/scrutins (qui réutilise la même requête serveur).
export const dynamic = "force-static";

export const metadata: Metadata = pageMeta({
  title: "Scrutins",
  description:
    "Tous les scrutins publics de l'Assemblée nationale : résultat, votes par groupe et orientation gauche-droite.",
  path: "/scrutins",
});

export default function ScrutinsPage() {
  const legs = legislatures();
  // Décompte par catégorie de l'état PAR DÉFAUT (lois + budget), pour que les chips
  // affichent d'emblée les vrais chiffres du jeu filtré, pas le total tous scrutins.
  const catsByLeg: Record<string, { categorie: string; n: number }[]> = {};
  for (const leg of legs)
    catsByLeg[leg] = categoriesScrutins({ leg, loisOnly: true, includeBudget: true });

  const first = scrutins({
    leg: legs[0],
    loisOnly: true,
    includeBudget: true,
    page: 1,
    perPage: 25,
  });

  return (
    <ScrutinsClient
      legs={legs}
      catsByLeg={catsByLeg}
      initial={{ rows: first.rows, total: first.total, pages: first.pages, page: first.page }}
    />
  );
}
