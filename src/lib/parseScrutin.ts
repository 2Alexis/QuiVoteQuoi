// Analyse des intitulés de scrutins de l'Assemblée nationale.
//
// Les titres bruts de l'open data suivent une grammaire régulière mais verbeuse,
// p. ex. : « l'amendement n° 183 de Mme K/Bidi et les amendements identiques
// suivants de suppression de l'article 11 du projet de loi visant à offrir des
// réponses immédiates aux phénomènes troublant l'ordre public (première lecture). »
//
// `parseScrutin` décompose ce pavé en champs typés que l'UI hiérarchise
// (badge de type, intitulé de loi en grand, action technique en secondaire).
//
// Portage fidèle de `scripts/parse_scrutin.py` (mêmes règles, mêmes sorties),
// validé sur les 12 094 scrutins des 16e et 17e législatures.

export type ScrutinType = "Amendement" | "Article" | "Vote final" | "Motion" | "Autre";

export interface ScrutinMeta {
  auteur: string | null;
  numeroAmendement: number | null;
  etapeLecture: string | null;
  typeTexte: string | null;
  sousAmendement: boolean;
  amendementCible: number | null;
  identiques: boolean;
  examenPrioritaire: boolean;
  articleConstitution: string | null;
  cosignataires: number | null;
}

export interface ParsedScrutin {
  type: ScrutinType;
  loi: string | null; // intitulé nettoyé, ou null (motion de censure, procédure…)
  action: string | null; // « Suppression de l'article 11 », « Article 10 »…
  meta: ScrutinMeta;
}

/**
 * Nettoie le titre brut ou l'objet d'un scrutin pour en faire une description textuelle complète et lisible.
 * Exemple: "l'ensemble du projet de loi..." -> "Projet de loi..."
 */
export function cleanDescription(titre: string | null | undefined): string | null {
  if (!titre) return null;
  let s = titre.trim().replace(/\s+/g, " ");
  s = s.replace(/^l['’]ensemble\s+(?:du|de\s+la|des)\s+/i, "");
  s = s.replace(/^(?:l['’]|le\s+|la\s+|les\s+)/i, "");
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Apostrophes droite ' et typographique ' traitées indifféremment.
const AP = "['’]";

// Types de texte, du plus spécifique au plus générique (l'alternance regex
// étant gourmande, « projet de loi organique » doit précéder « projet de loi »).
const BASE_TYPES: [string, string][] = [
  ["projet de loi constitutionnelle", "Projet de loi constitutionnelle"],
  ["projet de loi organique", "Projet de loi organique"],
  ["proposition de loi organique", "Proposition de loi organique"],
  ["proposition de résolution européenne", "Proposition de résolution européenne"],
  ["proposition de résolution", "Proposition de résolution"],
  ["proposition européenne", "Proposition européenne"],
  ["projet de loi", "Projet de loi"],
  ["proposition de loi", "Proposition de loi"],
];
const BASE_MAP = new Map(BASE_TYPES);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ALT = BASE_TYPES.map(([k]) => escapeRe(k)).join("|");

// « du projet de loi … » / « de la proposition de loi … ».
const LAW_RE = new RegExp(`(?:du|de la|des)\\s+(${ALT})[\\s,]+([\\s\\S]*)$`, "i");
// Texte sujet grammatical : « le projet de loi … », « la première partie du … ».
const LAW_LEAD_RE = new RegExp(
  `^\\s*(?:le|la|l${AP})\\s+(?:(?:première|seconde|nouvelle)\\s+partie\\s+(?:du|de la)\\s+)?(${ALT})[\\s,]+([\\s\\S]*)$`,
  "i"
);

// Participe introductif = jargon retiré du nom de la loi.
const PARTICIPLE_RE = new RegExp(
  "^(?:" +
    "visant\\s+à\\s+|tendant\\s+à\\s+|" +
    `relati(?:f|ve|fs|ves)\\s+(?:à\\s+l${AP}|à\\s+la\\s+|à\\s+|au\\s+|aux\\s+)|` +
    "portant\\s+(?:sur\\s+)?|pour\\s+|afin\\s+de\\s+|" +
    "instituant\\s+|créant\\s+|autorisant\\s+|ratifiant\\s+|modifiant\\s+|" +
    "complétant\\s+|renforçant\\s+|améliorant\\s+|garantissant\\s+|" +
    `permettant\\s+(?:de\\s+|d${AP})?|assurant\\s+|favorisant\\s+|encadrant\\s+|` +
    "invitant\\s+|demandant\\s+|reconnaissant\\s+|condamnant\\s+|soutenant\\s+|" +
    "appelant\\s+(?:à\\s+)?" +
    ")",
  "i"
);

// Référence d'article : « premier », « unique », « liminaire », « 2 », « 1er bis ».
const ART_INNER =
  "(premier|unique|liminaire|\\d+(?:er|ère|ème|e)?(?:\\s+(?:bis|ter|quater|quinquies|sexies))?)";
const ART_RE = new RegExp(`l${AP}article\\s+${ART_INNER}`, "i");
const READING_RE =
  /(première lecture|deuxième lecture|troisième lecture|nouvelle lecture|lecture définitive|commission mixte paritaire)/i;

function cap(s: string): string {
  s = s.trim();
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch.toLowerCase() !== ch.toUpperCase()) return s.slice(0, i) + ch.toUpperCase() + s.slice(i + 1);
  }
  return s;
}

const normArt = (ref: string) => ref.replace(/\s+/g, " ").trim().toLowerCase();

function firstArticle(text: string): string | null {
  const m = text.match(ART_RE);
  return m ? normArt(m[1]) : null;
}

// Dernière parenthèse correspondant à une étape de lecture (ignore
// « (examen prioritaire) » qui qualifie l'article, pas la lecture).
function etapeLecture(title: string): string | null {
  let etape: string | null = null;
  for (const m of title.matchAll(/\(([^)]*)\)/g)) {
    const rm = m[1].match(READING_RE);
    if (rm) {
      const found = rm[1].toLowerCase();
      etape = found.includes("commission") ? "Commission mixte paritaire" : cap(found);
    }
  }
  return etape;
}

// Auteur introduit par `keyword` (« de » pour un amendement, « par » pour une
// motion) : civilité + nom jusqu'au prochain séparateur.
function auteur(title: string, keyword: string): string | null {
  const re = new RegExp(
    `\\b${keyword}\\s+(M\\.|MM\\.|Mmes?|Mme)\\s+([\\s\\S]+?)` +
      `(?=\\s+et\\s+(?:les\\s+amendements|l${AP}amendement|\\d+|plusieurs)|` +
      `\\s+à\\s+l${AP}|\\s+après\\s+l${AP}|\\s+de\\s+suppression|` +
      `\\s+du\\s+projet|\\s+de\\s+la\\s+proposition|` +
      `,\\s+de\\b|,\\s+du\\b|,\\s+M(?:me|M)?\\.|,|\\.\\s*$|$)`,
    "i"
  );
  const m = title.match(re);
  return m ? `${m[1]} ${m[2].trim()}` : null;
}

function cleanLoi(intitule: string): string | null {
  let s = intitule.trim().replace(/[.\s]+$/, "");
  s = s.replace(/\s*\([^)]*\)\s*$/, ""); // parenthèse d'étape de lecture
  s = s.replace(
    new RegExp(`^,?\\s*adoptée?\\s+par\\s+(?:le\\s+Sénat|l${AP}Assemblée nationale)\\s*,?\\s*`, "i"),
    ""
  ); // incise « , adoptée par le Sénat, »
  s = s.replace(/[.\s]+$/, "").trim();
  if (!s) return null;
  const low = s.toLowerCase();
  if (low.startsWith("de ") || low.startsWith("d'") || low.startsWith("d’") || low.startsWith("des ")) {
    return "Loi " + s; // nom fixe : loi de finances / d'urgence / d'orientation…
  }
  return cap(s.replace(PARTICIPLE_RE, ""));
}

function extractLoi(title: string): { typeTexte: string | null; loi: string | null; start: number } {
  let m = title.match(LAW_RE);
  if (!m) m = title.match(LAW_LEAD_RE);
  if (!m || m.index == null) return { typeTexte: null, loi: null, start: -1 };
  const typeTexte = BASE_MAP.get(m[1].toLowerCase()) ?? cap(m[1]);
  return { typeTexte, loi: cleanLoi(m[2]), start: m.index };
}

export function parseScrutin(titre: string | null | undefined): ParsedScrutin {
  const t = (titre ?? "").replace(/\s+/g, " ").trim();
  const low = t.toLowerCase();
  const { typeTexte, loi, start } = extractLoi(t);
  const head = start >= 0 ? t.slice(0, start) : t; // partie « action »

  const meta: ScrutinMeta = {
    auteur: null,
    numeroAmendement: null,
    etapeLecture: etapeLecture(t),
    typeTexte,
    sousAmendement: false,
    amendementCible: null,
    identiques: false,
    examenPrioritaire: low.includes("(examen prioritaire)"),
    articleConstitution: null,
    cosignataires: null,
  };

  // --- MOTION ---
  if (/^\s*la\s+motion\b/i.test(low)) {
    let nature = "Motion";
    if (low.includes("motion de censure")) nature = "Motion de censure";
    else if (low.includes("rejet préalable")) nature = "Motion de rejet préalable";
    else if (low.includes("motion de rejet")) nature = "Motion de rejet";
    else if (low.includes("référendaire")) nature = "Motion référendaire";
    else if (low.includes("ajournement")) nature = "Motion d'ajournement";
    const m49 = low.match(/article\s+49,?\s+alinéa\s+(\d)/);
    const cos = low.match(/et\s+(\d+)\s+(?:députés|membres)/);
    meta.auteur = auteur(t, "par");
    meta.articleConstitution = m49 ? `49.${m49[1]}` : null;
    meta.cosignataires = cos ? parseInt(cos[1], 10) : null;
    return {
      type: "Motion",
      loi, // loi visée (rejet préalable) ou null (censure)
      action: m49 ? `${nature} (49.${m49[1]})` : nature,
      meta,
    };
  }

  // --- AMENDEMENT / SOUS-AMENDEMENT ---
  if (new RegExp(`^\\s*(?:l${AP}|le\\s+|les\\s+)(?:sous-)?amendements?\\b`, "i").test(low)) {
    const nums = [...t.matchAll(/n\s*°\s*(\d+)/g)].map((m) => parseInt(m[1], 10));
    const sous = /^\s*le\s+sous-amendement/i.test(low);
    meta.auteur = auteur(t, "de");
    meta.numeroAmendement = nums.length ? nums[0] : null;
    meta.sousAmendement = sous;
    meta.amendementCible = sous && nums.length > 1 ? nums[1] : null;
    meta.identiques = /amendements?\s+identiques?\s+suivants?/i.test(low);

    let action: string;
    if (low.includes("de suppression")) {
      const m = t.match(new RegExp(`de\\s+suppression\\s+de\\s+l${AP}article\\s+${ART_INNER}`, "i"));
      const ref = m ? normArt(m[1]) : firstArticle(head);
      action = ref ? `Suppression de l'article ${ref}` : "Suppression d'article";
    } else if (new RegExp(`après\\s+l${AP}article`, "i").test(low)) {
      const m = t.match(new RegExp(`après\\s+l${AP}article\\s+${ART_INNER}`, "i"));
      action = m ? `Après l'article ${normArt(m[1])}` : "Article additionnel";
    } else {
      const ref = firstArticle(head);
      action = ref ? `Article ${ref}` : "Amendement";
    }
    return { type: "Amendement", loi, action, meta };
  }

  // --- VOTE FINAL (« l'ensemble … ») ---
  if (new RegExp(`^\\s*l${AP}ensemble\\b`, "i").test(low)) {
    return { type: "Vote final", loi, action: "Vote sur l'ensemble du texte", meta };
  }

  // --- ARTICLE ---
  if (new RegExp(`^\\s*l${AP}article\\b`, "i").test(low)) {
    const ref = firstArticle(head);
    return { type: "Article", loi, action: ref ? `Article ${ref}` : "Article", meta };
  }

  // --- VOTE FINAL, texte sujet (« le projet de loi … », « la première partie
  //     du projet de loi de finances … », « la proposition de résolution … »). ---
  const lead = low.match(
    /^\s*(?:le\s+projet de loi|la\s+proposition de loi|la\s+proposition de résolution|la\s+(première|seconde|nouvelle)\s+partie\s+(?:du|de la))/
  );
  if (lead) {
    return {
      type: "Vote final",
      loi,
      action: lead[1] ? `Vote sur la ${lead[1]} partie` : "Vote sur l'ensemble du texte",
      meta,
    };
  }

  // --- AUTRE ---
  return { type: "Autre", loi, action: null, meta };
}
