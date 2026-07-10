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

export const dynamic = "force-dynamic";

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
  // Server Component rendu à la requête (force-dynamic) : cet instant est figé
  // dans les props envoyées au client, donc identique à l'hydratation.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  return <ComparateurClient legs={legs} data={data} now={now} />;
}
