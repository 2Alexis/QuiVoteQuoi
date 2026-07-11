import {
  deputesPourComparaison,
  positionsGroupes,
  matriceAccord,
  orientationGroupesParCategorie,
  orientationDeputesParCategorie,
  condamnationsParGroupe,
  condamnationsParLegislature,
  legislatures,
  LEGISLATURE_LABEL,
} from "@/lib/db";
import ComparateurClient, { type LegData, type CondamInfo } from "./ComparateurClient";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Comparateur de votes",
  description:
    "Comparez les votes de deux députés ou de deux groupes de l'Assemblée nationale, thème par thème.",
  path: "/comparateur",
});

// Page identique pour tous les visiteurs : elle ne lit ni searchParams, ni
// cookies, ni en-têtes, et ses données ne changent qu'au rebuild nocturne de la
// base (qui redéclenche un déploiement). On la laisse donc en génération
// STATIQUE (prérendue une fois au build) au lieu de la recalculer à chaque
// requête : le gros payload (~1,25 Mo) n'est sérialisé qu'une seule fois, et
// chaque visite est servie en HTML statique (~sous 100 ms au lieu de ~1,5 s).

export default function ComparateurPage() {
  const legs = legislatures();
  const data: Record<string, LegData> = {};
  for (const leg of legs) {
    const condamDeputes: Record<string, CondamInfo[]> = {};
    for (const c of condamnationsParLegislature(leg)) {
      (condamDeputes[c.uid] ??= []).push({
        infraction: c.infraction,
        date: c.date,
        wikipedia_url: c.wikipedia_url,
        wikidata_qid: c.wikidata_qid,
      });
    }
    data[leg] = {
      label: LEGISLATURE_LABEL[leg] ?? `Législature ${leg}`,
      deputes: deputesPourComparaison(leg),
      positions: positionsGroupes(leg),
      accord: matriceAccord(leg),
      orientGroupes: orientationGroupesParCategorie(leg),
      orientDeputes: orientationDeputesParCategorie(leg),
      condamGroupes: condamnationsParGroupe(leg),
      condamDeputes,
    };
  }
  // Figé au build (page statique) et passé en props : sert uniquement à afficher
  // la durée en ANNÉES des mandats présidentiels (ex. Macron), donc une fraîcheur
  // « au dernier déploiement » suffit largement. Passer la valeur depuis le
  // serveur garantit aussi une hydratation identique côté client.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  return <ComparateurClient legs={legs} data={data} now={now} />;
}
