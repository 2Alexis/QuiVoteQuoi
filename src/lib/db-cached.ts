import { unstable_cache } from "next/cache";
import {
  deputes,
  groupes,
  siegesActuels,
  uidsTitulaires,
  legislatures,
  compositionActuelle,
  professionsParGroupe,
  positionsGroupes,
  deputesPourComparaison,
} from "./db";

// Cache de données (Data Cache de Next) pour les requêtes des pages de liste
// /deputes et /groupes. Ces pages sont `force-dynamic` (elles lisent des
// searchParams) : sans ce cache, chaque clic ré-interroge la base SQLite de
// 221 Mo, et le premier accès après un moment d'inactivité paie des lectures
// disque à froid (les pages de la base sont sorties du cache de l'OS) — d'où le
// « ça rame puis c'est rapide ». Les résultats ne dépendent que de la
// législature (données figées jusqu'au prochain déploiement), donc on les met
// en cache avec revalidation en arrière-plan : après la première requête, la
// base n'est plus touchée sur le chemin critique, même après inactivité.
const CACHE = { revalidate: 3600 } as const;

export const legislaturesCached = unstable_cache(
  async () => legislatures(),
  ["legislatures"],
  CACHE
);

export const groupesCached = unstable_cache(
  async (leg: string) => groupes(leg),
  ["groupes"],
  CACHE
);

export const siegesActuelsCached = unstable_cache(
  async (leg: string) => siegesActuels(leg),
  ["siegesActuels"],
  CACHE
);

// uidsTitulaires renvoie un Set (non sérialisable par le cache) : on met en
// cache le tableau et l'appelant reconstruit le Set.
export const uidsTitulairesCached = unstable_cache(
  async (leg: string) => Array.from(uidsTitulaires(leg)),
  ["uidsTitulaires"],
  CACHE
);

export const deputesCached = unstable_cache(
  async (
    search: string | undefined,
    groupeUid: string | undefined,
    leg: string,
    numDept: string | undefined
  ) => deputes(search, groupeUid, leg, numDept),
  ["deputes"],
  CACHE
);

export const compositionActuelleCached = unstable_cache(
  async (leg: string) => compositionActuelle(leg),
  ["compositionActuelle"],
  CACHE
);

export const professionsParGroupeCached = unstable_cache(
  async (leg: string) => professionsParGroupe(leg),
  ["professionsParGroupe"],
  CACHE
);

export const positionsGroupesCached = unstable_cache(
  async (leg: string) => positionsGroupes(leg),
  ["positionsGroupes"],
  CACHE
);

export const deputesPourComparaisonCached = unstable_cache(
  async (leg: string) => deputesPourComparaison(leg),
  ["deputesPourComparaison"],
  CACHE
);
