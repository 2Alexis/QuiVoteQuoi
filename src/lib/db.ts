import Database from "better-sqlite3";
import path from "node:path";

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (!_db) {
    // Chemin de la base : surchargé par DATABASE_PATH en production (ex. disque
    // persistant), sinon le fichier généré dans data/ (reconstruit au déploiement).
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "hemicycle.db");
    _db = new Database(dbPath, {
      readonly: true,
      fileMustExist: true,
    });
    // Pas de `journal_mode = WAL` ici : c'est une écriture, impossible sur une
    // base en lecture seule (et inutile sans écriture concurrente).
  }
  return _db;
}

// Sous-requête « dernier vote par acteur » pour une législature. Version rapide
// (JOIN sur la table précalculée acteur_last_vote) si elle existe, sinon repli
// sur le scan des votes — évite toute casse tant que la base n'est pas régénérée.
// Les deux variantes exposent (uid, last_date) et prennent 1 paramètre : la lég.
const LAST_VOTE_FAST = "SELECT uid, last_date FROM acteur_last_vote WHERE legislature = ?";
const LAST_VOTE_SLOW =
  "SELECT v.acteur_uid uid, MAX(s.date) last_date FROM votes v JOIN scrutins s ON s.uid = v.scrutin_uid WHERE s.legislature = ? GROUP BY v.acteur_uid";
let _hasLastVoteTable: boolean | null = null;
function lastVoteSubquery(): string {
  if (_hasLastVoteTable === null) {
    _hasLastVoteTable =
      db()
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='acteur_last_vote'")
        .get() != null;
  }
  return _hasLastVoteTable ? LAST_VOTE_FAST : LAST_VOTE_SLOW;
}

export type Position = "pour" | "contre" | "abstention" | "nonvotant";

export const LEGISLATURE_LABEL: Record<string, string> = {
  "17": "17e législature (2024–)",
  "16": "16e législature (2022–2024)",
};

export function legislatures(): string[] {
  return (db().prepare("SELECT DISTINCT legislature l FROM mandats ORDER BY l DESC").all() as {
    l: string;
  }[]).map((r) => r.l);
}
export const DEFAULT_LEG = "17";

export interface Groupe {
  uid: string;
  libelle: string;
  abrege: string | null;
  date_debut: string | null;
  date_fin: string | null;
  n?: number;
}

export interface Depute {
  uid: string;
  civ: string | null;
  prenom: string | null;
  nom: string | null;
  profession: string | null;
  groupe_uid?: string | null;
  groupe_abrege?: string | null;
  groupe_libelle?: string | null;
  dept?: string | null;
  num_dept?: string | null;
  num_circo?: string | null;
}

export interface Scrutin {
  uid: string;
  numero: number;
  date: string;
  legislature: string;
  type_vote: string | null;
  sort_code: string | null;
  titre: string | null;
  objet: string | null;
  demandeur: string | null;
  nb_votants: number | null;
  exprimes: number | null;
  pour: number | null;
  contre: number | null;
  abstentions: number | null;
  non_votants: number | null;
  categorie: string | null;
  orientation: string | null;
  orientation_score: number | null;
  orientation_src: string | null;
}

// --- Condamnations judiciaires (source Wikidata/Wikipédia, cf. scripts/fetch-condamnations.mjs) ---
export interface Condamnation {
  infraction: string;
  date: string | null;
  wikidata_qid: string | null;
  wikipedia_url: string | null;
}

// Retourne les condamnations connues d'un député (peut être vide). Table
// optionnelle : absente si le script de récupération n'a pas été lancé.
export function condamnations(uid: string): Condamnation[] {
  const has = db()
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='condamnations'")
    .get();
  if (!has) return [];
  return db()
    .prepare(
      `SELECT infraction, date, wikidata_qid, wikipedia_url
       FROM condamnations WHERE uid = ?
       ORDER BY date DESC NULLS LAST, infraction`
    )
    .all(uid) as Condamnation[];
}

// Condamnations des membres d'un groupe (via les mandats liés à ce groupe).
export interface CondamneGroupe {
  uid: string;
  prenom: string | null;
  nom: string | null;
  infractions: Condamnation[];
}
export function condamnationsDuGroupe(groupeUid: string): CondamneGroupe[] {
  const has = db()
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='condamnations'")
    .get();
  if (!has) return [];
  const rows = db()
    .prepare(
      `SELECT d.uid, d.prenom, d.nom, c.infraction, c.date, c.wikidata_qid, c.wikipedia_url
       FROM condamnations c
       JOIN deputes d ON d.uid = c.uid
       JOIN mandats m ON m.uid = d.uid AND m.groupe_uid = ?
       ORDER BY d.nom, c.date DESC NULLS LAST`
    )
    .all(groupeUid) as (Condamnation & { uid: string; prenom: string | null; nom: string | null })[];
  const byDep = new Map<string, CondamneGroupe>();
  for (const r of rows) {
    let e = byDep.get(r.uid);
    if (!e) {
      e = { uid: r.uid, prenom: r.prenom, nom: r.nom, infractions: [] };
      byDep.set(r.uid, e);
    }
    e.infractions.push({
      infraction: r.infraction,
      date: r.date,
      wikidata_qid: r.wikidata_qid,
      wikipedia_url: r.wikipedia_url,
    });
  }
  return [...byDep.values()];
}

// Agrégat des condamnations par groupe pour une législature (pour le comparateur).
export interface CondamGroupeAgg {
  uid: string;
  abrege: string | null;
  n_deputes: number; // députés du groupe ayant au moins une condamnation
  n_infractions: number; // total de condamnations recensées dans le groupe
}
export function condamnationsParGroupe(leg = DEFAULT_LEG): CondamGroupeAgg[] {
  const has = db()
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='condamnations'")
    .get();
  if (!has) return [];
  return db()
    .prepare(
      `SELECT m.groupe_uid uid, o.abrege,
              COUNT(DISTINCT c.uid) n_deputes, COUNT(*) n_infractions
       FROM condamnations c
       JOIN mandats m ON m.uid = c.uid AND m.legislature = ?
       JOIN organes o ON o.uid = m.groupe_uid
       WHERE o.code_type = 'GP'
       GROUP BY m.groupe_uid`
    )
    .all(leg) as CondamGroupeAgg[];
}

// Condamnations des députés d'une législature (pour construire une map uid → infractions).
export function condamnationsParLegislature(
  leg = DEFAULT_LEG
): (Condamnation & { uid: string })[] {
  const has = db()
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='condamnations'")
    .get();
  if (!has) return [];
  return db()
    .prepare(
      `SELECT DISTINCT c.uid, c.infraction, c.date, c.wikidata_qid, c.wikipedia_url
       FROM condamnations c
       JOIN mandats m ON m.uid = c.uid AND m.legislature = ?
       ORDER BY c.date DESC NULLS LAST`
    )
    .all(leg) as (Condamnation & { uid: string })[];
}

export function stats(leg = DEFAULT_LEG) {
  const d = db();
  const one = (sql: string, ...p: unknown[]) => (d.prepare(sql).get(...p) as { n: number }).n;
  return {
    deputes: one("SELECT COUNT(*) n FROM mandats WHERE legislature=?", leg),
    scrutins: one("SELECT COUNT(*) n FROM scrutins WHERE legislature=?", leg),
    votes: one(
      "SELECT COUNT(*) n FROM votes v JOIN scrutins s ON s.uid=v.scrutin_uid WHERE s.legislature=?",
      leg
    ),
    groupes: one(
      `SELECT COUNT(DISTINCT groupe_uid) n FROM mandats WHERE legislature=? AND groupe_uid IS NOT NULL`,
      leg
    ),
    lastDate: (
      d.prepare("SELECT MAX(date) n FROM scrutins WHERE legislature=?").get(leg) as { n: string }
    ).n,
  };
}

export function groupes(leg = DEFAULT_LEG): Groupe[] {
  return db()
    .prepare(
      `SELECT o.uid, o.libelle, o.abrege, o.date_debut, o.date_fin, COUNT(m.uid) n
       FROM organes o
       JOIN mandats m ON m.groupe_uid = o.uid AND m.legislature = ?
       WHERE o.code_type='GP'
       GROUP BY o.uid
       HAVING n > 0
       ORDER BY n DESC`
    )
    .all(leg) as Groupe[];
}

export function groupe(uid: string): Groupe | undefined {
  return db().prepare("SELECT * FROM organes WHERE uid=?").get(uid) as Groupe | undefined;
}

// Composition « instantanée » de l'Assemblée : un seul titulaire par
// circonscription (577), en gardant le plus récent (celui qui a voté en
// dernier). Reflète l'état actuel plutôt que le cumul des passages sur la
// législature (remplaçants inclus).
export function compositionActuelle(leg = DEFAULT_LEG): Groupe[] {
  return db()
    .prepare(
      `SELECT o.uid, o.abrege, o.libelle, o.date_debut, o.date_fin, COUNT(*) n
       FROM (
         SELECT m.groupe_uid,
           ROW_NUMBER() OVER (
             PARTITION BY m.dept, m.num_circo
             ORDER BY lv.last_date DESC NULLS LAST, m.uid
           ) rn
         FROM mandats m
         LEFT JOIN (
           ${lastVoteSubquery()}
         ) lv ON lv.uid = m.uid
         WHERE m.legislature = ?
       ) x
       JOIN organes o ON o.uid = x.groupe_uid
       WHERE x.rn = 1 AND o.code_type = 'GP'
       GROUP BY o.uid
       HAVING n > 0
       ORDER BY n DESC`
    )
    .all(leg, leg) as Groupe[];
}

export interface SiegeActuel {
  num_dept: string | null;
  dept: string | null;
  groupe_uid: string | null;
  abrege: string | null;
}

// Un siège = un titulaire par circonscription (le plus récent), avec son
// département et son groupe. Base des cartes/agrégats par département.
export function siegesActuels(leg = DEFAULT_LEG): SiegeActuel[] {
  return db()
    .prepare(
      `SELECT x.num_dept, x.dept, x.groupe_uid, o.abrege
       FROM (
         SELECT m.num_dept, m.dept, m.groupe_uid,
           ROW_NUMBER() OVER (
             PARTITION BY m.dept, m.num_circo
             ORDER BY lv.last_date DESC NULLS LAST, m.uid
           ) rn
         FROM mandats m
         LEFT JOIN (
           ${lastVoteSubquery()}
         ) lv ON lv.uid = m.uid
         WHERE m.legislature = ?
       ) x
       LEFT JOIN organes o ON o.uid = x.groupe_uid
       WHERE x.rn = 1`
    )
    .all(leg, leg) as SiegeActuel[];
}

// --- Catégories socio-professionnelles (INSEE, famSocPro) par groupe ---
export interface ProfCategorie {
  cat: string;
  total: number;
  parGroupe: Record<string, number>; // abrégé du groupe -> effectif
}
export interface ProfessionsTable {
  groupes: { abrege: string; libelle: string | null; n: number }[];
  categories: ProfCategorie[];
}

// Regroupe les variantes d'intitulés INSEE trouvées d'une législature à l'autre
// vers une étiquette canonique. Ordre d'affichage géré séparément.
function normCat(raw: string | null): string {
  const s = (raw ?? "").trim();
  if (!s) return "Sans profession déclarée";
  const low = s.toLowerCase();
  if (low.startsWith("agriculteur")) return "Agriculteurs exploitants";
  if (low.startsWith("artisan")) return "Artisans, commerçants et chefs d'entreprise";
  if (low.startsWith("cadre")) return "Cadres et professions intellectuelles supérieures";
  if (low.startsWith("profession")) return "Professions intermédiaires";
  if (low.startsWith("employ")) return "Employés";
  if (low.startsWith("ouvrier")) return "Ouvriers";
  if (low.startsWith("retrait")) return "Retraités";
  if (low.startsWith("autre") || low.startsWith("sans")) return "Sans profession déclarée";
  return s;
}

const CAT_ORDER = [
  "Agriculteurs exploitants",
  "Artisans, commerçants et chefs d'entreprise",
  "Cadres et professions intellectuelles supérieures",
  "Professions intermédiaires",
  "Employés",
  "Ouvriers",
  "Retraités",
  "Sans profession déclarée",
];

// Répartition des catégories socio-pro INSEE par groupe, sur la composition
// instantanée (un titulaire par circonscription). Une ligne par catégorie,
// une colonne par groupe.
export function professionsParGroupe(leg = DEFAULT_LEG): ProfessionsTable {
  const rows = db()
    .prepare(
      `SELECT o.uid, o.abrege, o.libelle, d.fam_socpro fam
       FROM (
         SELECT m.uid, m.groupe_uid,
           ROW_NUMBER() OVER (
             PARTITION BY m.dept, m.num_circo
             ORDER BY lv.last_date DESC NULLS LAST, m.uid
           ) rn
         FROM mandats m
         LEFT JOIN (
           ${lastVoteSubquery()}
         ) lv ON lv.uid = m.uid
         WHERE m.legislature = ?
       ) x
       JOIN organes o ON o.uid = x.groupe_uid
       JOIN deputes d ON d.uid = x.uid
       WHERE x.rn = 1 AND o.code_type = 'GP'`
    )
    .all(leg, leg) as { uid: string; abrege: string | null; libelle: string | null; fam: string | null }[];

  const groupTotals: Record<string, { abrege: string; libelle: string | null; n: number }> = {};
  const byCat: Record<string, ProfCategorie> = {};
  for (const r of rows) {
    const ab = r.abrege ?? "NI";
    (groupTotals[ab] ??= { abrege: ab, libelle: r.libelle, n: 0 }).n += 1;
    const cat = normCat(r.fam);
    const c = (byCat[cat] ??= { cat, total: 0, parGroupe: {} });
    c.total += 1;
    c.parGroupe[ab] = (c.parGroupe[ab] ?? 0) + 1;
  }

  const groupesList = Object.values(groupTotals).sort((a, b) => b.n - a.n);
  const categories = CAT_ORDER.filter((c) => byCat[c]).map((c) => byCat[c]);
  // Catégories imprévues (au cas où) ajoutées à la fin.
  for (const c of Object.values(byCat)) if (!CAT_ORDER.includes(c.cat)) categories.push(c);
  return { groupes: groupesList, categories };
}

export function legislatureDuGroupe(uid: string): string {
  const r = db()
    .prepare("SELECT legislature l FROM mandats WHERE groupe_uid=? LIMIT 1")
    .get(uid) as { l: string } | undefined;
  return r?.l ?? DEFAULT_LEG;
}

export function deputesDuGroupe(uid: string): Depute[] {
  return db()
    .prepare(
      `SELECT d.*, m.dept, m.num_dept, m.num_circo
       FROM mandats m JOIN deputes d ON d.uid = m.uid
       WHERE m.groupe_uid = ?
       ORDER BY d.nom COLLATE NOCASE, d.prenom COLLATE NOCASE`
    )
    .all(uid) as Depute[];
}

type ScrutinsGroupeOpts = {
  position?: string;
  categorie?: string;
  limit?: number;
  offset?: number;
};

function scrutinsGroupeWhere(groupeUid: string, opts: ScrutinsGroupeOpts) {
  const params: unknown[] = [groupeUid];
  let where = "WHERE sg.groupe_uid = ? AND (sg.pour + sg.contre + sg.abstention) > 0";
  if (opts.position) {
    where += " AND sg.majorite = ?";
    params.push(opts.position);
  }
  if (opts.categorie && hasCategorie()) {
    where += " AND s.categorie = ?";
    params.push(opts.categorie);
  }
  return { where, params };
}

export function scrutinsDuGroupeCount(groupeUid: string, opts: ScrutinsGroupeOpts = {}): number {
  const { where, params } = scrutinsGroupeWhere(groupeUid, opts);
  return (
    db()
      .prepare(
        `SELECT COUNT(*) n FROM scrutin_groupe sg JOIN scrutins s ON s.uid = sg.scrutin_uid ${where}`
      )
      .get(...params) as { n: number }
  ).n;
}

export function scrutinsDuGroupe(groupeUid: string, opts: ScrutinsGroupeOpts = {}) {
  const { where, params } = scrutinsGroupeWhere(groupeUid, opts);
  params.push(opts.limit ?? 100, opts.offset ?? 0);
  return db()
    .prepare(
      `SELECT s.uid, s.numero, s.date, s.titre, s.sort_code, s.legislature, s.categorie,
              ${hasOrientation() ? "s.orientation, s.orientation_score," : "NULL orientation, NULL orientation_score,"}
              sg.pour, sg.contre, sg.abstention, sg.nonvotant, sg.majorite
       FROM scrutin_groupe sg JOIN scrutins s ON s.uid = sg.scrutin_uid
       ${where}
       ORDER BY s.date DESC, s.numero DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params) as {
    uid: string;
    numero: number;
    date: string;
    titre: string | null;
    sort_code: string | null;
    legislature: string;
    categorie: string | null;
    orientation: string | null;
    orientation_score: number | null;
    pour: number;
    contre: number;
    abstention: number;
    nonvotant: number;
    majorite: Position;
  }[];
}

export function deputes(
  search?: string,
  groupeUid?: string,
  leg = DEFAULT_LEG,
  numDept?: string
): Depute[] {
  const clauses = ["m.legislature = ?"];
  const params: unknown[] = [leg];
  if (search) {
    clauses.push("(d.nom LIKE ? OR d.prenom LIKE ? OR (d.prenom || ' ' || d.nom) LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (groupeUid) {
    clauses.push("m.groupe_uid = ?");
    params.push(groupeUid);
  }
  if (numDept) {
    clauses.push("m.num_dept = ?");
    params.push(numDept);
  }
  return db()
    .prepare(
      `SELECT d.uid, d.civ, d.prenom, d.nom, d.profession,
              m.groupe_uid, m.dept, m.num_dept, m.num_circo,
              o.abrege groupe_abrege, o.libelle groupe_libelle
       FROM mandats m
       JOIN deputes d ON d.uid = m.uid
       LEFT JOIN organes o ON o.uid = m.groupe_uid
       WHERE ${clauses.join(" AND ")}
       ORDER BY d.nom COLLATE NOCASE, d.prenom COLLATE NOCASE`
    )
    .all(...params) as Depute[];
}

export function depute(uid: string): (Depute & { mandats: MandatInfo[] }) | undefined {
  const d = db().prepare("SELECT * FROM deputes WHERE uid=?").get(uid) as Depute | undefined;
  if (!d) return undefined;
  const mandats = db()
    .prepare(
      `SELECT m.legislature, m.groupe_uid, m.dept, m.num_dept, m.num_circo,
              o.abrege groupe_abrege, o.libelle groupe_libelle
       FROM mandats m LEFT JOIN organes o ON o.uid = m.groupe_uid
       WHERE m.uid = ? ORDER BY m.legislature DESC`
    )
    .all(uid) as MandatInfo[];
  const cur = mandats[0];
  return {
    ...d,
    mandats,
    groupe_uid: cur?.groupe_uid,
    groupe_abrege: cur?.groupe_abrege,
    groupe_libelle: cur?.groupe_libelle,
    dept: cur?.dept,
    num_dept: cur?.num_dept,
    num_circo: cur?.num_circo,
  };
}

export interface MandatInfo {
  legislature: string;
  groupe_uid: string | null;
  groupe_abrege: string | null;
  groupe_libelle: string | null;
  dept: string | null;
  num_dept: string | null;
  num_circo: string | null;
}

export interface DeputeStat {
  legislature: string;
  n_concerne: number;
  n_exprime: number;
  n_loyal: number;
  n_loyal_denom: number;
  n_align: number;
  n_align_denom: number;
  n_align_cliv: number;
  n_align_cliv_denom: number;
  participation: number;
  loyaute: number;
  align: number;
  alignClivant: number;
}

function withRatios(
  r: Omit<DeputeStat, "participation" | "loyaute" | "align" | "alignClivant">
): DeputeStat {
  return {
    ...r,
    participation: r.n_concerne ? r.n_exprime / r.n_concerne : 0,
    loyaute: r.n_loyal_denom ? r.n_loyal / r.n_loyal_denom : 0,
    align: r.n_align_denom ? r.n_align / r.n_align_denom : 0,
    alignClivant: r.n_align_cliv_denom ? r.n_align_cliv / r.n_align_cliv_denom : 0,
  };
}

export function statsDepute(uid: string): DeputeStat[] {
  const rows = db()
    .prepare(
      `SELECT legislature, n_concerne, n_exprime, n_loyal, n_loyal_denom, n_align, n_align_denom,
              n_align_cliv, n_align_cliv_denom
       FROM depute_stats WHERE uid=? ORDER BY legislature DESC`
    )
    .all(uid) as Omit<DeputeStat, "participation" | "loyaute" | "align" | "alignClivant">[];
  return rows.map(withRatios);
}

export interface CategorieVotes {
  categorie: string;
  pour: number;
  contre: number;
  abstention: number;
  nonvotant: number;
  total: number;
  // Endorsement (méthode A) : nombre de votes qui « valident » le pôle gauche/droite
  // du thème. Voter POUR un texte de droite OU CONTRE un texte de gauche = 1 point droite
  // (et inversement). N'annule pas le signal comme le ferait une moyenne des scores.
  orient_gauche: number;
  orient_droite: number;
}

// Comptages d'endorsement gauche/droite à partir d'une colonne de position.
const ORIENT_ENDORSE = (posCol: string) =>
  `SUM(CASE WHEN ${posCol}='pour' AND s.orientation_score<=-0.12 THEN 1
            WHEN ${posCol}='contre' AND s.orientation_score>=0.12 THEN 1 ELSE 0 END) orient_gauche,
   SUM(CASE WHEN ${posCol}='pour' AND s.orientation_score>=0.12 THEN 1
            WHEN ${posCol}='contre' AND s.orientation_score<=-0.12 THEN 1 ELSE 0 END) orient_droite`;

export function votesGroupeParCategorie(groupeUid: string): CategorieVotes[] {
  if (!hasCategorie()) return [];
  return db()
    .prepare(
      `SELECT s.categorie categorie,
        SUM(sg.pour) pour, SUM(sg.contre) contre,
        SUM(sg.abstention) abstention, SUM(sg.nonvotant) nonvotant,
        SUM(sg.pour + sg.contre + sg.abstention) total,
        ${hasOrientation() ? ORIENT_ENDORSE("sg.majorite") : "0 orient_gauche, 0 orient_droite"}
       FROM scrutin_groupe sg JOIN scrutins s ON s.uid = sg.scrutin_uid
       WHERE sg.groupe_uid = ? AND s.categorie IS NOT NULL
       GROUP BY s.categorie
       HAVING total > 0
       ORDER BY total DESC`
    )
    .all(groupeUid) as CategorieVotes[];
}

export function votesDeputeParCategorie(uid: string): (CategorieVotes & { legislature: string })[] {
  if (!hasCategorie()) return [];
  return db()
    .prepare(
      `SELECT s.legislature legislature, s.categorie categorie,
        SUM(v.position='pour') pour, SUM(v.position='contre') contre,
        SUM(v.position='abstention') abstention, SUM(v.position='nonvotant') nonvotant,
        SUM(v.position IN ('pour','contre','abstention')) total,
        ${hasOrientation() ? ORIENT_ENDORSE("v.position") : "0 orient_gauche, 0 orient_droite"}
       FROM votes v JOIN scrutins s ON s.uid = v.scrutin_uid
       WHERE v.acteur_uid = ? AND s.categorie IS NOT NULL
       GROUP BY s.legislature, s.categorie
       HAVING total > 0
       ORDER BY s.legislature DESC, total DESC`
    )
    .all(uid) as (CategorieVotes & { legislature: string })[];
}

type VotesDeputeOpts = {
  categorie?: string;
  position?: string;
  legislature?: string;
  limit?: number;
  offset?: number;
};

function votesDeputeWhere(uid: string, opts: VotesDeputeOpts) {
  const params: unknown[] = [uid];
  let where = "WHERE v.acteur_uid = ?";
  if (opts.position) {
    where += " AND v.position = ?";
    params.push(opts.position);
  }
  if (opts.categorie && hasCategorie()) {
    where += " AND s.categorie = ?";
    params.push(opts.categorie);
  }
  if (opts.legislature) {
    where += " AND s.legislature = ?";
    params.push(opts.legislature);
  }
  return { where, params };
}

export function votesDuDeputeCount(uid: string, opts: VotesDeputeOpts = {}): number {
  const { where, params } = votesDeputeWhere(uid, opts);
  return (
    db()
      .prepare(`SELECT COUNT(*) n FROM votes v JOIN scrutins s ON s.uid = v.scrutin_uid ${where}`)
      .get(...params) as { n: number }
  ).n;
}

export function votesDuDepute(uid: string, opts: VotesDeputeOpts | number = {}) {
  const o: VotesDeputeOpts = typeof opts === "number" ? { limit: opts } : opts;
  const { where, params } = votesDeputeWhere(uid, o);
  params.push(o.limit ?? 60, o.offset ?? 0);
  return db()
    .prepare(
      `SELECT s.uid, s.numero, s.date, s.titre, s.sort_code, s.legislature, s.categorie,
              ${hasOrientation() ? "s.orientation, s.orientation_score," : "NULL orientation, NULL orientation_score,"}
              v.position
       FROM votes v JOIN scrutins s ON s.uid = v.scrutin_uid
       ${where}
       ORDER BY s.date DESC, s.numero DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params) as (Pick<
    Scrutin,
    | "uid"
    | "numero"
    | "date"
    | "titre"
    | "sort_code"
    | "legislature"
    | "categorie"
    | "orientation"
    | "orientation_score"
  > & { position: Position })[];
}

let _hasCat: boolean | null = null;
export function hasCategorie(): boolean {
  if (_hasCat === null) {
    _hasCat = (db().prepare("PRAGMA table_info(scrutins)").all() as { name: string }[]).some(
      (c) => c.name === "categorie"
    );
  }
  return _hasCat;
}

let _hasOri: boolean | null = null;
export function hasOrientation(): boolean {
  if (_hasOri === null) {
    _hasOri = (db().prepare("PRAGMA table_info(scrutins)").all() as { name: string }[]).some(
      (c) => c.name === "orientation_score"
    );
  }
  return _hasOri;
}

export function categoriesScrutins(leg = DEFAULT_LEG): { categorie: string; n: number }[] {
  if (!hasCategorie()) return [];
  return db()
    .prepare(
      `SELECT categorie, COUNT(*) n FROM scrutins
       WHERE legislature = ? AND categorie IS NOT NULL
       GROUP BY categorie ORDER BY n DESC`
    )
    .all(leg) as { categorie: string; n: number }[];
}

export function allCategories(): string[] {
  if (!hasCategorie()) return [];
  return (
    db()
      .prepare(
        `SELECT categorie FROM scrutins WHERE categorie IS NOT NULL
         GROUP BY categorie ORDER BY COUNT(*) DESC`
      )
      .all() as { categorie: string }[]
  ).map((r) => r.categorie);
}

export function scrutins(opts: {
  search?: string;
  page?: number;
  perPage?: number;
  leg?: string;
  categorie?: string;
  loisOnly?: boolean;
  includeBudget?: boolean;
}) {
  const perPage = opts.perPage ?? 30;
  const page = Math.max(1, opts.page ?? 1);
  const leg = opts.leg ?? DEFAULT_LEG;
  const params: unknown[] = [leg];
  let where = "WHERE legislature = ?";
  if (opts.search) {
    where += " AND titre LIKE ?";
    params.push(`%${opts.search}%`);
  }
  if (opts.categorie && hasCategorie()) {
    where += " AND categorie = ?";
    params.push(opts.categorie);
  }
  // « Lois uniquement » : votes sur l'ensemble d'un texte de loi (exclut
  // amendements, articles, motions de censure/rejet, résolutions…).
  if (opts.loisOnly) {
    const parts = [
      // Vote final sur l'ensemble d'un projet/proposition de loi.
      "(titre LIKE '%ensemble%' AND titre LIKE '%loi%')",
      // Ratifications / approbations d'accords (des lois à part entière),
      // en excluant les motions (« la motion… »).
      "((titre LIKE '%autorisant%ratification%' OR titre LIKE '%autorisant%approbation%') AND titre NOT LIKE 'la motion%')",
    ];
    if (opts.includeBudget) {
      // Lois de finances / de financement (PLF, PLFSS) : votes sur une « partie ».
      parts.push("(titre LIKE '%partie du projet de loi de finance%')");
    }
    where += ` AND (${parts.join(" OR ")})`;
  }
  const total = (
    db().prepare(`SELECT COUNT(*) n FROM scrutins ${where}`).get(...params) as { n: number }
  ).n;
  const rows = db()
    .prepare(`SELECT * FROM scrutins ${where} ORDER BY date DESC, numero DESC LIMIT ? OFFSET ?`)
    .all(...params, perPage, (page - 1) * perPage) as Scrutin[];
  return { rows, total, page, perPage, pages: Math.ceil(total / perPage) };
}

export function scrutin(uid: string): Scrutin | undefined {
  return db().prepare("SELECT * FROM scrutins WHERE uid=?").get(uid) as Scrutin | undefined;
}

export interface VentilationGroupe {
  groupe_uid: string;
  abrege: string | null;
  libelle: string | null;
  pour: number;
  contre: number;
  abstention: number;
  nonvotant: number;
}

export function ventilationScrutin(uid: string): VentilationGroupe[] {
  const rows = db()
    .prepare(
      `SELECT sg.groupe_uid, o.abrege, o.libelle, sg.pour, sg.contre, sg.abstention, sg.nonvotant
       FROM scrutin_groupe sg LEFT JOIN organes o ON o.uid = sg.groupe_uid
       WHERE sg.scrutin_uid=?
       ORDER BY (sg.pour+sg.contre+sg.abstention) DESC`
    )
    .all(uid) as VentilationGroupe[];
  return rows;
}

export function votesNominatifsScrutin(uid: string) {
  return db()
    .prepare(
      `SELECT v.acteur_uid, v.position, d.prenom, d.nom, o.abrege groupe_abrege
       FROM votes v
       LEFT JOIN deputes d ON d.uid = v.acteur_uid
       LEFT JOIN organes o ON o.uid = v.groupe_uid
       WHERE v.scrutin_uid=?
       ORDER BY d.nom COLLATE NOCASE`
    )
    .all(uid) as {
    acteur_uid: string;
    position: Position;
    prenom: string | null;
    nom: string | null;
    groupe_abrege: string | null;
  }[];
}

// ---- Données pour le comparateur ----

export interface DeputeCompare {
  uid: string;
  nom: string;
  prenom: string;
  abrege: string | null;
  groupe_uid: string | null;
  participation: number;
  loyaute: number;
  align: number;
  alignClivant: number;
  n_exprime: number;
}

export function deputesPourComparaison(leg = DEFAULT_LEG): DeputeCompare[] {
  return db()
    .prepare(
      `SELECT d.uid, d.nom, d.prenom, o.abrege, m.groupe_uid,
              ds.n_concerne, ds.n_exprime, ds.n_loyal, ds.n_loyal_denom, ds.n_align, ds.n_align_denom,
              ds.n_align_cliv, ds.n_align_cliv_denom
       FROM mandats m
       JOIN deputes d ON d.uid = m.uid
       LEFT JOIN organes o ON o.uid = m.groupe_uid
       LEFT JOIN depute_stats ds ON ds.uid = m.uid AND ds.legislature = m.legislature
       WHERE m.legislature = ?
       ORDER BY d.nom COLLATE NOCASE, d.prenom COLLATE NOCASE`
    )
    .all(leg)
    .map((r) => {
      const x = r as Record<string, number> & Record<string, string | null>;
      return {
        uid: x.uid as string,
        nom: x.nom as string,
        prenom: x.prenom as string,
        abrege: x.abrege as string | null,
        groupe_uid: x.groupe_uid as string | null,
        n_exprime: (x.n_exprime as number) ?? 0,
        participation: x.n_concerne ? (x.n_exprime as number) / (x.n_concerne as number) : 0,
        loyaute: x.n_loyal_denom ? (x.n_loyal as number) / (x.n_loyal_denom as number) : 0,
        align: x.n_align_denom ? (x.n_align as number) / (x.n_align_denom as number) : 0,
        alignClivant: x.n_align_cliv_denom
          ? (x.n_align_cliv as number) / (x.n_align_cliv_denom as number)
          : 0,
      };
    }) as DeputeCompare[];
}

export interface GroupePosition {
  uid: string;
  abrege: string | null;
  libelle: string | null;
  n: number;
  cohesion: number;
  x: number;
  y: number;
}

export function positionsGroupes(leg = DEFAULT_LEG): GroupePosition[] {
  const rows = db()
    .prepare(
      `SELECT o.uid, o.abrege, o.libelle, gs.cohesion, gs.x, gs.y, COUNT(m.uid) n
       FROM groupe_stats gs
       JOIN organes o ON o.uid = gs.groupe_uid
       JOIN mandats m ON m.groupe_uid = o.uid AND m.legislature = gs.legislature
       WHERE gs.legislature = ? AND o.code_type='GP'
       GROUP BY o.uid
       HAVING n >= 3
       ORDER BY n DESC`
    )
    .all(leg) as GroupePosition[];
  return rows;
}

export interface OrientCat {
  categorie: string;
  gauche: number;
  droite: number;
}

let _hasOrientTables: boolean | null = null;
function hasOrientTables(): boolean {
  if (_hasOrientTables === null) {
    _hasOrientTables =
      (
        db()
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('groupe_orient','depute_orient')"
          )
          .all() as { name: string }[]
      ).length === 2;
  }
  return _hasOrientTables;
}

// Profil d'orientation par thème pour chaque groupe (clé = abrégé), pour une
// législature. gauche/droite = nombre d'« endossements » du pôle correspondant.
export function orientationGroupesParCategorie(leg = DEFAULT_LEG): Record<string, OrientCat[]> {
  if (!hasOrientTables()) return {};
  const rows = db()
    .prepare(
      `SELECT o.abrege abrege, go.categorie, go.gauche, go.droite
       FROM groupe_orient go JOIN organes o ON o.uid = go.uid
       WHERE go.legislature = ? AND o.abrege IS NOT NULL
       ORDER BY (go.gauche + go.droite) DESC`
    )
    .all(leg) as { abrege: string; categorie: string; gauche: number; droite: number }[];
  const out: Record<string, OrientCat[]> = {};
  for (const r of rows) {
    (out[r.abrege] ??= []).push({ categorie: r.categorie, gauche: r.gauche, droite: r.droite });
  }
  return out;
}

// Idem par député (clé = uid).
export function orientationDeputesParCategorie(leg = DEFAULT_LEG): Record<string, OrientCat[]> {
  if (!hasOrientTables()) return {};
  const rows = db()
    .prepare(
      `SELECT uid, categorie, gauche, droite
       FROM depute_orient
       WHERE legislature = ?
       ORDER BY (gauche + droite) DESC`
    )
    .all(leg) as { uid: string; categorie: string; gauche: number; droite: number }[];
  const out: Record<string, OrientCat[]> = {};
  for (const r of rows) {
    (out[r.uid] ??= []).push({ categorie: r.categorie, gauche: r.gauche, droite: r.droite });
  }
  return out;
}

export function matriceAccord(leg = DEFAULT_LEG) {
  return db()
    .prepare(
      `SELECT oa.abrege a, ob.abrege b, ga.taux
       FROM groupe_agreement ga
       JOIN organes oa ON oa.uid = ga.a
       JOIN organes ob ON ob.uid = ga.b
       WHERE ga.legislature = ?
         AND ga.a IN (SELECT groupe_uid FROM mandats WHERE legislature=? GROUP BY groupe_uid HAVING COUNT(*)>=3)
         AND ga.b IN (SELECT groupe_uid FROM mandats WHERE legislature=? GROUP BY groupe_uid HAVING COUNT(*)>=3)`
    )
    .all(leg, leg, leg) as { a: string; b: string; taux: number }[];
}

export interface AccordGroupe {
  uid: string;
  abrege: string | null;
  libelle: string | null;
  taux: number;
  n: number;
}

// « Avec qui vote ce groupe » : taux de co-vote (accord des positions
// majoritaires) entre ce groupe et chacun des autres groupes de la même
// législature, classé du plus proche au plus éloigné.
export function accordsDuGroupe(uid: string, leg = DEFAULT_LEG): AccordGroupe[] {
  return db()
    .prepare(
      `SELECT ob.uid uid, ob.abrege abrege, ob.libelle libelle, ga.taux taux, ga.n n
       FROM groupe_agreement ga
       JOIN organes ob ON ob.uid = ga.b
       WHERE ga.legislature = ? AND ga.a = ?
         AND ga.b IN (SELECT groupe_uid FROM mandats WHERE legislature=? GROUP BY groupe_uid HAVING COUNT(*)>=3)
       ORDER BY ga.taux DESC`
    )
    .all(leg, uid, leg) as AccordGroupe[];
}
