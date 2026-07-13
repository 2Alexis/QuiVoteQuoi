import { deputes, groupes, legislatures, siegesActuels, uidsTitulaires } from "@/lib/db";
import departementsData from "@/data/departements.json";
import { groupOrder } from "@/lib/ui";
import { DeputesClient, type DeputesLegData, type DeputeLite } from "./DeputesClient";
import type { DeptAgg } from "@/components/FranceMap";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

// Page mise en cache (ISR, régénérée en arrière-plan) : plus de `force-dynamic`.
// On pré-rend la coquille + les données des législatures une fois ; recherche,
// filtres, pagination et carte se font côté client. Servie depuis le cache statique
// comme l'accueil, elle ne subit plus la latence de réveil à froid après inactivité.
export const revalidate = 3600;

export const metadata: Metadata = pageMeta({
  title: "Députés",
  description:
    "La liste des députés de l'Assemblée nationale : groupe politique, circonscription, participation et votes de chacun.",
  path: "/deputes",
});

const METRO_CODES = new Set(departementsData.departements.map((d) => d.code));

function buildLegData(leg: string): DeputesLegData {
  const list = deputes(undefined, undefined, leg, undefined);
  const titulaires = uidsTitulaires(leg);
  const deputies: DeputeLite[] = list.map((d) => ({
    uid: d.uid,
    prenom: d.prenom ?? "",
    nom: d.nom ?? "",
    groupe_abrege: d.groupe_abrege ?? null,
    groupe_libelle: d.groupe_libelle ?? null,
    dept: d.dept ?? null,
    num_circo: d.num_circo ?? null,
    cause_fin: d.cause_fin ?? null,
    groupe_uid: d.groupe_uid ?? null,
    num_dept: d.num_dept ?? null,
    titulaire: titulaires.has(d.uid),
  }));

  const gs = groupes(leg);
  const groups = gs.map((x) => ({ uid: x.uid, abrege: x.abrege, libelle: x.libelle }));

  // Agrégats par département (siège = titulaire actuel), pour colorer la carte.
  const sieges = siegesActuels(leg);
  const acc: Record<string, { nom: string | null; n: number; byGroup: Record<string, number> }> = {};
  for (const s of sieges) {
    const code = s.num_dept ?? "?";
    const t = (acc[code] ??= { nom: s.dept, n: 0, byGroup: {} });
    t.n += 1;
    const key = s.abrege ?? "NI";
    t.byGroup[key] = (t.byGroup[key] ?? 0) + 1;
  }
  const aggregats: Record<string, DeptAgg> = {};
  const outreMer: DeputesLegData["outreMer"] = [];
  for (const [code, t] of Object.entries(acc)) {
    const dom = Object.entries(t.byGroup).sort((a, b) => b[1] - a[1])[0];
    const abrege = dom ? dom[0] : null;
    aggregats[code] = { n: t.n, abrege, libelle: t.nom };
    if (!METRO_CODES.has(code)) outreMer.push({ code, nom: t.nom, n: t.n, abrege });
  }
  outreMer.sort((a, b) => a.code.localeCompare(b.code));

  // Légende : groupes majoritaires effectivement présents sur la carte.
  const libelleParAbrege = new Map(gs.map((x) => [x.abrege, x.libelle]));
  const legende = [
    ...new Set(
      Object.values(aggregats)
        .map((a) => a.abrege)
        .filter((x): x is string => !!x)
    ),
  ]
    .sort((a, b) => groupOrder(a) - groupOrder(b))
    .map((ab) => ({ abrege: ab, libelle: libelleParAbrege.get(ab) ?? ab }));

  return { deputies, groups, aggregats, legende, outreMer };
}

export default function DeputesPage() {
  const legs = legislatures();
  const data: Record<string, DeputesLegData> = {};
  for (const leg of legs) data[leg] = buildLegData(leg);
  return (
    <DeputesClient
      legs={legs}
      data={data}
      mapWidth={departementsData.width}
      mapHeight={departementsData.height}
    />
  );
}
