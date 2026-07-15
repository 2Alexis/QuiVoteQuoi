import type { Position } from "./db";

// Couleurs approximatives des groupes politiques de l'AN (17e législature)
const GROUP_COLORS: Record<string, string> = {
  RN: "#1B345E",
  UDR: "#0B2A4A",
  DR: "#2563AC",
  EPR: "#E7A100",
  Dem: "#F58220",
  HOR: "#12A3C4",
  LIOT: "#8A7FB0",
  SOC: "#E5567A",
  "LFI-NFP": "#C8102E",
  EcoS: "#2E9E5B",
  GDR: "#A80C2E",
  NI: "#8A96A3",
};

// Photo officielle de l'AN : /tribun/{legislature}/photos/{numero}.jpg
// où numero = uid sans le préfixe « PA » (ex. PA841605 → 841605).
export function deputePhotoUrl(uid: string, leg: string | number): string {
  const num = uid.replace(/^PA/, "");
  return `https://www2.assemblee-nationale.fr/static/tribun/${leg}/photos/${num}.jpg`;
}

export function groupColor(abrege?: string | null): string {
  if (abrege && GROUP_COLORS[abrege]) return GROUP_COLORS[abrege];
  // hash de secours pour groupes inconnus
  let h = 0;
  for (const c of abrege ?? "?") h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 45%)`;
}

// Ordre gauche → droite pour l'hémicycle (17e et 16e législatures).
const GROUP_ORDER: Record<string, number> = {
  "LFI-NFP": 0,
  "LFI - NUPES": 0,
  GDR: 1,
  "GDR - NUPES": 1,
  EcoS: 2,
  "Ecolo - NUPES": 2,
  SOC: 3,
  LIOT: 4,
  Dem: 5,
  EPR: 6,
  RE: 6,
  HOR: 7,
  DR: 8,
  LR: 8,
  UDR: 9,
  RN: 10,
  NI: 11,
};

export function groupOrder(abrege?: string | null): number {
  return abrege && GROUP_ORDER[abrege] != null ? GROUP_ORDER[abrege] : 99;
}

// Grand bloc politique d'un groupe (pour le résumé de composition).
export function groupBloc(
  abrege?: string | null
): "gauche" | "centre" | "droite" | "ext-droite" | "autre" {
  const o = groupOrder(abrege);
  // LFI-NFP (ordre 0) comprise : c'est la gauche, pas l'« extrême gauche ».
  if (o <= 3) return "gauche";
  if (o === 5 || o === 6 || o === 7) return "centre";
  // DR (8) et UDR — Union des droites pour la République (9) : la droite.
  if (o === 8 || o === 9) return "droite";
  if (o === 10) return "ext-droite"; // RN
  return "autre";
}

export const POSITION_LABEL: Record<Position, string> = {
  pour: "Pour",
  contre: "Contre",
  abstention: "Abstention",
  nonvotant: "Non-votant",
};

export const POSITION_COLOR: Record<Position, string> = {
  pour: "#2E9E5B",
  contre: "#C8102E",
  abstention: "#E7A100",
  nonvotant: "#94A3B8",
};

// Lien vers l'analyse officielle du scrutin sur assemblee-nationale.fr
// (page qui renvoie elle-même vers le texte et le dossier législatif).
export function scrutinUrlOfficiel(legislature: string, numero: number): string {
  return `https://www.assemblee-nationale.fr/dyn/${legislature}/scrutins/${numero}`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const mois = [
    "janv.", "févr.", "mars", "avril", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc.",
  ];
  return `${parseInt(d, 10)} ${mois[parseInt(m, 10) - 1]} ${y}`;
}

export function formatNumber(n?: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR");
}

// Montant en euros, forme compacte : 8,9 M€, 320 k€, 540 €.
export function formatEuros(n?: number | null): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€`;
  if (abs >= 1e3) return `${(n / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k€`;
  return `${Math.round(n).toLocaleString("fr-FR")} €`;
}

export const CATEGORIE_COLORS: Record<string, string> = {
  "Santé": "#E5567A",
  "Social": "#9B6BB3",
  "Budget & fiscalité": "#E7A100",
  "Économie & travail": "#2563AC",
  "Environnement & énergie": "#2E9E5B",
  "Justice & sécurité": "#8A7FB0",
  "International & défense": "#0B2A4A",
  "Institutions & démocratie": "#12A3C4",
  "Éducation & culture": "#C8102E",
  Société: "#F58220",
  Autre: "#8A96A3",
};

export function categorieColor(cat?: string | null): string {
  return (cat && CATEGORIE_COLORS[cat]) || "#8A96A3";
}

// Axe gauche↔droite par thème. Doit rester synchronisé avec POLES de
// scripts/compute-stats.mjs. [pôle gauche (score<0), pôle droite (score>0)]
export const ORIENTATION_POLES: Record<string, [string, string]> = {
  "Santé": ["Accès aux soins élargi", "Restriction / économies"],
  "Social": ["Protection sociale renforcée", "Maîtrise des dépenses"],
  "Budget & fiscalité": ["Redistributif", "Allègements / capital"],
  "Économie & travail": ["Protège les salariés", "Favorable aux entreprises"],
  "Environnement & énergie": ["Écologie renforcée", "Assouplissement"],
  "Justice & sécurité": ["Libertés & droits", "Fermeté sécuritaire"],
  Société: ["Progressiste", "Conservateur"],
  "International & défense": ["Diplomatie & multilatéral", "Défense & souveraineté"],
  "Institutions & démocratie": ["Contre-pouvoirs / décentralisation", "Exécutif / centralisation"],
  "Éducation & culture": ["Service public renforcé", "Autonomie / budget maîtrisé"],
};
const ORIENTATION_POLE_DEFAULT: [string, string] = [
  "Orientation de gauche",
  "Orientation de droite",
];

// Renvoie le libellé de pôle correspondant à un score signé pour un thème.
export function orientationPole(
  categorie: string | null | undefined,
  score: number | null | undefined
): string | null {
  if (score == null) return null;
  const [g, d] = ORIENTATION_POLES[categorie ?? ""] ?? ORIENTATION_POLE_DEFAULT;
  if (score <= -0.12) return g;
  if (score >= 0.12) return d;
  return "Équilibré";
}

// Palette neutre : teal (pôle « gauche ») ↔ gris (équilibré) ↔ ambre (pôle « droite »).
export function orientationColor(score?: number | null): string {
  if (score == null) return "#94A3B8";
  if (score <= -0.12) return "#2A9D8F";
  if (score >= 0.12) return "#E0A13C";
  return "#94A3B8";
}

export function sortBadge(sort?: string | null): { label: string; cls: string } {
  const s = (sort ?? "").toLowerCase();
  if (s.includes("adopt")) return { label: "Adopté", cls: "badge-adopte" };
  if (s.includes("rejet")) return { label: "Rejeté", cls: "badge-rejete" };
  return { label: sort ?? "—", cls: "badge-neutre" };
}
