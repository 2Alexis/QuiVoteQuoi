// Précalcul des métriques d'analyse -> tables *_stats dans data/hemicycle.db
// - scrutin_groupe   : ventilation + position majoritaire par (scrutin, groupe)
// - scrutin_presid   : position majoritaire du bloc présidentiel par scrutin
// - depute_stats     : participation, loyauté au groupe, alignement majorité présidentielle
// - groupe_stats     : cohésion + coordonnées 2D (MDS) par législature
// - groupe_agreement : taux d'accord des positions majoritaires entre groupes
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const DB_PATH = path.join(process.cwd(), "data", "hemicycle.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Bloc présidentiel (sigles de groupe) par législature
const BLOC_PRESID = {
  "17": ["EPR", "Dem", "HOR"],
  "16": ["RE", "Dem", "HOR"],
};

const MAJ_CASE = `CASE
  WHEN pour = 0 AND contre = 0 AND abstention = 0 THEN NULL
  WHEN pour >= contre AND pour >= abstention THEN 'pour'
  WHEN contre >= abstention THEN 'contre'
  ELSE 'abstention' END`;

console.log("→ scrutin_groupe");
db.exec(`
  DROP TABLE IF EXISTS scrutin_groupe;
  CREATE TABLE scrutin_groupe AS
  SELECT v.scrutin_uid, s.legislature, v.groupe_uid,
    SUM(v.position='pour') pour,
    SUM(v.position='contre') contre,
    SUM(v.position='abstention') abstention,
    SUM(v.position='nonvotant') nonvotant
  FROM votes v JOIN scrutins s ON s.uid = v.scrutin_uid
  GROUP BY v.scrutin_uid, v.groupe_uid;
  ALTER TABLE scrutin_groupe ADD COLUMN majorite TEXT;
  UPDATE scrutin_groupe SET majorite = ${MAJ_CASE};
  CREATE INDEX idx_sg ON scrutin_groupe(scrutin_uid, groupe_uid);
  CREATE INDEX idx_sg_leg ON scrutin_groupe(legislature, groupe_uid);
`);

// Date du dernier vote de chaque acteur par législature. Précalculée ici (une
// fois par build) pour éviter de rescanner les 1,8 M de votes à chaque affichage
// des pages composition / groupes / députés (JOIN direct au lieu d'un GROUP BY).
console.log("→ acteur_last_vote");
db.exec(`
  DROP TABLE IF EXISTS acteur_last_vote;
  CREATE TABLE acteur_last_vote AS
  SELECT v.acteur_uid AS uid, s.legislature AS legislature, MAX(s.date) AS last_date
  FROM votes v JOIN scrutins s ON s.uid = v.scrutin_uid
  GROUP BY v.acteur_uid, s.legislature;
  CREATE INDEX idx_alv ON acteur_last_vote(legislature, uid);
`);

console.log("→ scrutin_presid");
db.exec("DROP TABLE IF EXISTS scrutin_presid");
db.exec(`CREATE TABLE scrutin_presid (scrutin_uid TEXT PRIMARY KEY, legislature TEXT,
  pour INT, contre INT, abstention INT, majorite TEXT, clivant INT DEFAULT 0)`);
for (const [leg, sigles] of Object.entries(BLOC_PRESID)) {
  const placeholders = sigles.map(() => "?").join(",");
  db.prepare(
    `INSERT OR REPLACE INTO scrutin_presid (scrutin_uid, legislature, pour, contre, abstention)
     SELECT v.scrutin_uid, ?, SUM(v.position='pour'), SUM(v.position='contre'), SUM(v.position='abstention')
     FROM votes v JOIN scrutins s ON s.uid=v.scrutin_uid
     JOIN organes o ON o.uid=v.groupe_uid
     WHERE s.legislature=? AND o.abrege IN (${placeholders})
     GROUP BY v.scrutin_uid`
  ).run(leg, leg, ...sigles);
}
db.exec(`UPDATE scrutin_presid SET majorite = ${MAJ_CASE}`);

// Marque les scrutins « clivants » (contestés) : le camp minoritaire pèse au
// moins 10 % des voix pour/contre exprimées de toute l'assemblée. Écarte les
// votes quasi-unanimes / consensuels qui gonflent mécaniquement l'alignement,
// tout en gardant les votes où un seul gros groupe (ex. RN) s'oppose.
console.log("→ scrutin_presid.clivant");
db.exec(`
  DROP TABLE IF EXISTS _scrutin_tot;
  CREATE TABLE _scrutin_tot AS
    SELECT scrutin_uid, SUM(position='pour') tp, SUM(position='contre') tc
    FROM votes GROUP BY scrutin_uid;
  CREATE INDEX idx_stot ON _scrutin_tot(scrutin_uid);
  UPDATE scrutin_presid SET clivant = COALESCE((
    SELECT CASE WHEN (t.tp + t.tc) > 0
                 AND MIN(t.tp, t.tc) * 1.0 / (t.tp + t.tc) >= 0.10
                THEN 1 ELSE 0 END
    FROM _scrutin_tot t WHERE t.scrutin_uid = scrutin_presid.scrutin_uid
  ), 0);
  DROP TABLE _scrutin_tot;
`);

console.log("→ depute_stats");
db.exec(`
  DROP TABLE IF EXISTS depute_stats;
  CREATE TABLE depute_stats AS
  SELECT v.acteur_uid uid, s.legislature,
    COUNT(*) n_concerne,
    SUM(v.position IN ('pour','contre','abstention')) n_exprime,
    SUM(v.position IN ('pour','contre','abstention') AND sg.majorite IS NOT NULL) n_loyal_denom,
    SUM(v.position IN ('pour','contre','abstention') AND v.position = sg.majorite) n_loyal,
    SUM(v.position IN ('pour','contre','abstention') AND sp.majorite IS NOT NULL) n_align_denom,
    SUM(v.position IN ('pour','contre','abstention') AND v.position = sp.majorite) n_align,
    SUM(v.position IN ('pour','contre','abstention') AND sp.majorite IS NOT NULL AND sp.clivant=1) n_align_cliv_denom,
    SUM(v.position IN ('pour','contre','abstention') AND v.position = sp.majorite AND sp.clivant=1) n_align_cliv
  FROM votes v
  JOIN scrutins s ON s.uid = v.scrutin_uid
  LEFT JOIN scrutin_groupe sg ON sg.scrutin_uid = v.scrutin_uid AND sg.groupe_uid = v.groupe_uid
  LEFT JOIN scrutin_presid sp ON sp.scrutin_uid = v.scrutin_uid
  GROUP BY v.acteur_uid, s.legislature;
  CREATE INDEX idx_ds ON depute_stats(uid, legislature);
  CREATE INDEX idx_ds_leg ON depute_stats(legislature);
`);

// ---- Analyse par groupe : cohésion, accord entre groupes, MDS ----
console.log("→ groupe_stats + groupe_agreement");
db.exec(`
  DROP TABLE IF EXISTS groupe_stats;
  DROP TABLE IF EXISTS groupe_agreement;
  CREATE TABLE groupe_stats (groupe_uid TEXT, legislature TEXT, n_scrutins INT,
    cohesion REAL, x REAL, y REAL, PRIMARY KEY(groupe_uid, legislature));
  CREATE TABLE groupe_agreement (a TEXT, b TEXT, legislature TEXT, taux REAL, n INT,
    PRIMARY KEY(a, b, legislature));
`);
const insGS = db.prepare(
  `INSERT INTO groupe_stats (groupe_uid, legislature, n_scrutins, cohesion, x, y)
   VALUES (?,?,?,?,?,?)`
);
const insGA = db.prepare(
  `INSERT INTO groupe_agreement (a, b, legislature, taux, n) VALUES (?,?,?,?,?)`
);

for (const leg of Object.keys(BLOC_PRESID)) {
  // groupes "significatifs" = groupes parlementaires d'au moins 3 membres (même
  // seuil que l'affichage). Exclut les micro-organes fantômes qui, avec un seul
  // membre et un profil de vote atypique, déforment l'axe 2 du MDS.
  const groupes = db
    .prepare(
      `SELECT o.uid, o.abrege FROM organes o
       WHERE o.code_type='GP' AND o.uid IN (
         SELECT groupe_uid FROM mandats WHERE legislature=?
         GROUP BY groupe_uid HAVING COUNT(*) >= 3
       )`
    )
    .all(leg);
  const guids = groupes.map((g) => g.uid);

  // cohésion par groupe
  for (const g of groupes) {
    const rows = db
      .prepare(
        `SELECT pour, contre, abstention FROM scrutin_groupe
         WHERE legislature=? AND groupe_uid=? AND (pour+contre+abstention)>0`
      )
      .all(leg, g.uid);
    let sum = 0;
    for (const r of rows) {
      const exp = r.pour + r.contre + r.abstention;
      sum += Math.max(r.pour, r.contre, r.abstention) / exp;
    }
    const cohesion = rows.length ? sum / rows.length : 0;
    insGS.run(g.uid, leg, rows.length, cohesion, 0, 0);
  }

  // matrice d'accord : positions majoritaires par scrutin
  const majRows = db
    .prepare(
      `SELECT scrutin_uid, groupe_uid, majorite FROM scrutin_groupe
       WHERE legislature=? AND majorite IS NOT NULL`
    )
    .all(leg);
  const byScrutin = new Map();
  for (const r of majRows) {
    if (!guids.includes(r.groupe_uid)) continue;
    let m = byScrutin.get(r.scrutin_uid);
    if (!m) byScrutin.set(r.scrutin_uid, (m = new Map()));
    m.set(r.groupe_uid, r.majorite);
  }
  const n = guids.length;
  const agree = Array.from({ length: n }, () => new Array(n).fill(0));
  const common = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const m of byScrutin.values()) {
    for (let i = 0; i < n; i++) {
      const pi = m.get(guids[i]);
      if (pi === undefined) continue;
      for (let j = i; j < n; j++) {
        const pj = m.get(guids[j]);
        if (pj === undefined) continue;
        common[i][j]++;
        common[j][i]++;
        if (pi === pj) {
          agree[i][j]++;
          agree[j][i]++;
        }
      }
    }
  }
  const taux = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      taux[i][j] = common[i][j] ? agree[i][j] / common[i][j] : 0;
      if (i !== j && common[i][j] > 0) insGA.run(guids[i], guids[j], leg, taux[i][j], common[i][j]);
    }

  // MDS classique 2D à partir de la distance = 1 - taux d'accord
  const coords = mds2d(taux);

  // Ancrage des signes pour un rendu stable et étiquetable :
  //   axe X : négatif = gauche, positif = droite
  //   axe Y : positif = vote avec la majorité présidentielle, négatif = opposition
  // (les axes MDS sont sinon orientés arbitrairement d'un calcul à l'autre)
  const AB_LEFT = new Set(["LFI-NFP", "LFI", "GDR", "GDR-NUPES", "Écolo", "EcoS", "SOC"]);
  const AB_RIGHT = new Set(["RN", "LR", "DR", "UDR"]);
  const AB_PRESID = new Set(BLOC_PRESID[leg] ?? []);
  const meanDim = (dim, pred) => {
    let s = 0, k = 0;
    for (let i = 0; i < n; i++)
      if (pred(groupes[i].abrege)) {
        s += coords[i][dim];
        k++;
      }
    return k ? s / k : null;
  };
  const mL = meanDim(0, (ab) => AB_LEFT.has(ab));
  const mR = meanDim(0, (ab) => AB_RIGHT.has(ab));
  if (mL != null && mR != null && mL > mR) for (let i = 0; i < n; i++) coords[i][0] *= -1;
  const mP = meanDim(1, (ab) => AB_PRESID.has(ab));
  const mO = meanDim(1, (ab) => !AB_PRESID.has(ab));
  if (mP != null && mO != null && mP < mO) for (let i = 0; i < n; i++) coords[i][1] *= -1;

  for (let i = 0; i < n; i++) {
    db.prepare(`UPDATE groupe_stats SET x=?, y=? WHERE groupe_uid=? AND legislature=?`).run(
      coords[i][0],
      coords[i][1],
      guids[i],
      leg
    );
  }
  console.log(`   leg ${leg}: ${n} groupes, ${byScrutin.size} scrutins analysés`);
}

// ---- Catégorisation thématique des scrutins (heuristique par mots-clés) ----
console.log("→ scrutins.categorie");
const CATS = [
  ["Santé", ["sante", "hopital", "hospital", "medic", "medecin", "soin", "soignant", "infirmier", "aide a mourir", "fin de vie", "soins palliatifs", "assurance maladie", "psychiatr", "vaccin", "epidemi", "pandemi", "addiction", "sanitaire", "cancer", "hopita", "tabac", "vapotage", "sage-femme", "infertilit", "fausse couche", "interruption spontanee de grossesse", "mortalite infantile", "orthophon", "cadmium"]],
  ["Social", ["securite sociale", "retraite", "handicap", "dependance", "autonomie", "solidarite", "pauvrete", "precarite", "allocation", "prestation", "ehpad", "aidant", "invalidite", "minima sociaux", "rsa", "revenu de solidarite", "bien vieillir", "grand age", "vieilli", "protection sociale", "aide sociale", "affaires sociales", "action sociale", "mediation sociale", "insertion", "sans-abri", "hebergement d urgence"]],
  ["Budget & fiscalité", ["loi de finances", "de finances pour", "budget", "fiscal", "impot", "taxe", "recettes", "douane", "dette", "credit d impot", "tva", "cotisation", "approbation des comptes", "loi de reglement", "resultats de la gestion", "programmation des finances", "depense publique", "de fin de gestion"]],
  ["Environnement & énergie", ["environnement", "climat", "ecolog", "energ", "nucleaire", "renouvelable", "industrie verte", "biodiversite", "pollution", "transition", "eau potable", "dechet", "artificialisation", "pesticide", "carbone", "emission", "eolien", "photovolta", "littoral", "forestier", "montagne", "perfluor", "pfas", "incendie", "electricite", "assainissement", "espaces naturels", "polyfluor", "fluoroalkyl", "vaisselle", "emballage", "frelon", "apicole", "retrait-gonflement"]],
  ["Économie & travail", ["economi", "industrie", "entreprise", "emploi", "travail", "chomage", "salaire", "pouvoir d achat", "commerce", "commercant", "consommat", "demarchage", "bancaire", "nationalisation", "banque", "artisan", "agricol", "agricult", "alimentaire", "peche", "tourisme", "simplification", "concurrence", "inflation", "innovation", "rural", "success", "fraude", "arnaque", "influenceur", "dumping", "commercial", "professionnalisation", "employabilite", "vignes non cultiv", "expertise comptable", "greve", "attractivite"]],
  ["Justice & sécurité", ["justice", "penal", "magistrat", "prison", "detenu", "delinquance", "police", "gendarmerie", "terroris", "attentat", "immigration", "asile", "etranger", "sejour", "frontiere", "retention", "narcotrafic", "recidive", "victime", "cybercriminal", "nationalite", "violence", "intrafamilial", "responsabilite civile", "privation de liberte", "surete", "securite civile", "pompier", "sapeurs", "juridiction", "criminel", "criminalit", "cour d assises", "assises", "parquet", "procedure penale", "garde a vue", "tribunal", "peine plancher", "procureur", "ordonnance de protection", "ministere de l interieur", "confisqu", "avoirs saisis", "expert judiciaire", "actions de groupe", "action de groupe", "nullites", "contentieux"]],
  ["International & défense", ["defense", "militaire", "armee", "guerre", "international", "traite", "union europeenne", "europeen", "otan", "diplomati", "souverainete", "ukraine", "gaza", "palestin", "cooperation", "nations unies", "ratification"]],
  ["Institutions & démocratie", ["constitution", "referendum", "electoral", "election", "eligibilite", "collectivite", "decentralisation", "motion de censure", "resolution", "congres", "organique", "deontologie", "assemblee nationale", "senat", "commune", "outre-mer", "nouvelle-caledonie", "mayotte", "elu local", "elus locaux", "des maires", "mairie", "secretaire de mairie", "conseil prive", "transparence", "vie publique", "affaires courantes", "accueils physiques", "polynesie", "operateurs de l etat", "aide publique au developpement"]],
  ["Éducation & culture", ["education", "ecole", "enseignement", "universite", "recherche", "culture", "sport", "jeunesse", "patrimoine", "audiovisuel", "numerique", "etudiant", "olympique", "scolaire", "restes humains", "collections publiques", "droits voisins", "agence de presse", "classes de decouverte"]],
  ["Société", ["egalite", "discrimination", "femmes", "laicite", "bioethique", "famille", "logement", "locatif", "loyer", "bail", "locataire", "urbanisme", "transport", "mobilite", "routier", "ferroviaire", "metropolitain", "animaux", "religion", "enfant", "mineur", "creche", "conjugal", "benevole", "associatif", "vie associative", "permis de conduire", "animal", "plui", "code noir", "homosexualite", "ascenseur", "ascenceur", "moniteurs de ski", "chien"]],
];
const normTxt = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’‘`´]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
function classify(t) {
  const s = normTxt(t);
  let best = "Autre";
  let bs = 0;
  for (const [name, kw] of CATS) {
    let sc = 0;
    for (const k of kw) if (s.includes(k)) sc++;
    if (sc > bs) {
      bs = sc;
      best = name;
    }
  }
  return best;
}
const cols = db.prepare("PRAGMA table_info(scrutins)").all().map((c) => c.name);
if (!cols.includes("categorie")) db.exec("ALTER TABLE scrutins ADD COLUMN categorie TEXT");
db.exec("CREATE INDEX IF NOT EXISTS idx_scrutins_cat ON scrutins(legislature, categorie)");
{
  const rows = db.prepare("SELECT uid, COALESCE(titre, objet, '') t FROM scrutins").all();
  const upd = db.prepare("UPDATE scrutins SET categorie=? WHERE uid=?");
  const tx = db.transaction(() => {
    for (const r of rows) upd.run(classify(r.t), r.uid);
  });
  tx();
  const dist = db
    .prepare("SELECT categorie, COUNT(*) n FROM scrutins GROUP BY categorie ORDER BY n DESC")
    .all();
  for (const d of dist) console.log(`   ${d.categorie}: ${d.n}`);
}

// ---- Orientation (axe gauche↔droite) par scrutin -------------------------------
// Méthode combinée : signal explicite du titre (mots-clés) sinon repli sur
// l'orientation déduite des votes (quels groupes ont porté le texte, projetés
// sur l'axe gauche-droite calculé par MDS). Score signé ∈ [-1,1] :
//   négatif = pôle "gauche" du thème, positif = pôle "droite" du thème.
console.log("→ scrutins.orientation");
const POLE_DEFAULT = ["Orientation de gauche", "Orientation de droite"];
const POLES = {
  "Santé": ["Accès aux soins élargi", "Restriction / économies"],
  "Social": ["Protection sociale renforcée", "Maîtrise des dépenses"],
  "Budget & fiscalité": ["Redistributif", "Allègements / capital"],
  "Économie & travail": ["Protège les salariés", "Favorable aux entreprises"],
  "Environnement & énergie": ["Écologie renforcée", "Assouplissement"],
  "Justice & sécurité": ["Libertés & droits", "Fermeté sécuritaire"],
  "Société": ["Progressiste", "Conservateur"],
  "International & défense": ["Diplomatie & multilatéral", "Défense & souveraineté"],
  "Institutions & démocratie": ["Contre-pouvoirs / décentralisation", "Exécutif / centralisation"],
  "Éducation & culture": ["Service public renforcé", "Autonomie / budget maîtrisé"],
};
const KW_LEFT = [
  "acces aux soins", "remboursement", "hausse du smic", "augmentation du smic",
  "pouvoir d achat", "taxe sur les", "taxer les", "contribution exceptionnelle",
  "impot sur la fortune", "justice fiscale", "service public", "protection sociale",
  "droits des", "egalite", "encadrement des loyers", "gel des loyers", "revalorisation",
  "minima sociaux", "hausse des salaires", "ouverture de droits", "gratuite",
  "logement social", "aide alimentaire", "acces a l", "lutte contre la pauvrete",
];
const KW_RIGHT = [
  "baisse des impots", "baisse d impot", "allegement", "exoneration", "deremboursement",
  "assouplissement", "flexibilite", "competitivite", "recul de l age", "report de l age",
  "durcissement", "fermete", "expulsion", "reconduite a la frontiere", "restriction",
  "reduction des depenses", "maitrise des depenses", "reforme des retraites",
  "allongement de la duree", "privatisation", "reduction d impot",
];
function orient(cat, titre, lean) {
  const s = normTxt(titre);
  let l = 0, r = 0;
  for (const k of KW_LEFT) if (s.includes(k)) l++;
  for (const k of KW_RIGHT) if (s.includes(k)) r++;
  let score, src;
  if (l !== r) {
    score = Math.max(-1, Math.min(1, (r - l) * 0.4));
    src = "titre";
  } else if (lean !== null) {
    score = Math.max(-1, Math.min(1, lean));
    src = "votes";
  } else {
    return [null, null, null];
  }
  const [L, R] = POLES[cat] || POLE_DEFAULT;
  const label = score <= -0.12 ? L : score >= 0.12 ? R : "Équilibré";
  return [Math.round(score * 1000) / 1000, label, src];
}

{
  const ocols = db.prepare("PRAGMA table_info(scrutins)").all().map((c) => c.name);
  if (!ocols.includes("orientation_score"))
    db.exec("ALTER TABLE scrutins ADD COLUMN orientation_score REAL");
  if (!ocols.includes("orientation")) db.exec("ALTER TABLE scrutins ADD COLUMN orientation TEXT");
  if (!ocols.includes("orientation_src"))
    db.exec("ALTER TABLE scrutins ADD COLUMN orientation_src TEXT");

  const LEFT_SET = new Set(["LFI-NFP", "LFI", "GDR", "GDR-NUPES", "Écolo", "EcoS", "SOC"]);
  const RIGHT_SET = new Set(["RN", "LR", "DR", "UDR"]);
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

  const legs = db.prepare("SELECT DISTINCT legislature FROM scrutins").all().map((r) => r.legislature);
  const updO = db.prepare(
    "UPDATE scrutins SET orientation_score=?, orientation=?, orientation_src=? WHERE uid=?"
  );
  let nTitre = 0, nVotes = 0, nNull = 0;

  for (const leg of legs) {
    // axe gauche-droite normalisé pour cette législature
    const gx = db
      .prepare(
        `SELECT gs.groupe_uid uid, o.abrege, gs.x FROM groupe_stats gs
         JOIN organes o ON o.uid = gs.groupe_uid WHERE gs.legislature = ?`
      )
      .all(leg);
    const sign =
      mean(gx.filter((g) => RIGHT_SET.has(g.abrege)).map((g) => g.x)) >=
      mean(gx.filter((g) => LEFT_SET.has(g.abrege)).map((g) => g.x))
        ? 1
        : -1;
    const maxabs = Math.max(...gx.map((g) => Math.abs(g.x)), 1e-9);
    const xnorm = new Map(gx.map((g) => [g.uid, (sign * g.x) / maxabs]));

    // lean par scrutin = moyenne des positions des groupes pondérée par leur soutien net
    const byS = new Map();
    if (xnorm.size) {
      const rows = db
        .prepare(
          `SELECT scrutin_uid, groupe_uid, pour, contre FROM scrutin_groupe WHERE legislature = ?`
        )
        .all(leg);
      for (const rw of rows) {
        const x = xnorm.get(rw.groupe_uid);
        if (x === undefined) continue;
        let e = byS.get(rw.scrutin_uid);
        if (!e) byS.set(rw.scrutin_uid, (e = { num: 0, den: 0 }));
        const net = rw.pour - rw.contre;
        e.num += x * net;
        e.den += Math.abs(net);
      }
    }
    const leanOf = (uid) => {
      const e = byS.get(uid);
      return e && e.den > 0 ? e.num / e.den : null;
    };

    const scr = db
      .prepare("SELECT uid, categorie, COALESCE(titre, objet, '') t FROM scrutins WHERE legislature = ?")
      .all(leg);
    const tx = db.transaction(() => {
      for (const s of scr) {
        const [score, label, src] = orient(s.categorie, s.t, leanOf(s.uid));
        updO.run(score, label, src, s.uid);
        if (src === "titre") nTitre++;
        else if (src === "votes") nVotes++;
        else nNull++;
      }
    });
    tx();
  }
  console.log(`   titre: ${nTitre} · votes: ${nVotes} · indéterminé: ${nNull}`);
}

// ---- Profil d'orientation par (entité, thème) --------------------------------
// Méthode « endossement » (complète) : on compte les votes POUR *et* CONTRE, car
// s'opposer à un texte révèle aussi une orientation.
//   pôle droite  = voter POUR un texte de droite  OU CONTRE un texte de gauche
//   pôle gauche  = voter POUR un texte de gauche   OU CONTRE un texte de droite
// (seuil |score| >= 0.12 ; les textes "Équilibré" et les abstentions sont ignorés)
console.log("→ groupe_orient + depute_orient");
const OR_DROITE = (posCol) =>
  `(${posCol}='pour' AND s.orientation_score>=0.12) OR (${posCol}='contre' AND s.orientation_score<=-0.12)`;
const OR_GAUCHE = (posCol) =>
  `(${posCol}='pour' AND s.orientation_score<=-0.12) OR (${posCol}='contre' AND s.orientation_score>=0.12)`;
db.exec(`
  DROP TABLE IF EXISTS groupe_orient;
  CREATE TABLE groupe_orient AS
  SELECT sg.groupe_uid uid, s.legislature, s.categorie,
    SUM(CASE WHEN ${OR_DROITE("sg.majorite")} THEN 1 ELSE 0 END) droite,
    SUM(CASE WHEN ${OR_GAUCHE("sg.majorite")} THEN 1 ELSE 0 END) gauche
  FROM scrutin_groupe sg JOIN scrutins s ON s.uid = sg.scrutin_uid
  WHERE s.categorie IS NOT NULL AND s.categorie != 'Autre' AND sg.majorite IN ('pour','contre')
    AND s.orientation_score IS NOT NULL
  GROUP BY sg.groupe_uid, s.legislature, s.categorie;
  DELETE FROM groupe_orient WHERE gauche + droite = 0;
  CREATE INDEX idx_go ON groupe_orient(uid, legislature);

  DROP TABLE IF EXISTS depute_orient;
  CREATE TABLE depute_orient AS
  SELECT v.acteur_uid uid, s.legislature, s.categorie,
    SUM(CASE WHEN ${OR_DROITE("v.position")} THEN 1 ELSE 0 END) droite,
    SUM(CASE WHEN ${OR_GAUCHE("v.position")} THEN 1 ELSE 0 END) gauche
  FROM votes v JOIN scrutins s ON s.uid = v.scrutin_uid
  WHERE s.categorie IS NOT NULL AND s.categorie != 'Autre' AND v.position IN ('pour','contre')
    AND s.orientation_score IS NOT NULL
  GROUP BY v.acteur_uid, s.legislature, s.categorie;
  DELETE FROM depute_orient WHERE gauche + droite = 0;
  CREATE INDEX idx_do ON depute_orient(uid, legislature);
`);

db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
console.log("✓ Stats calculées");
db.close();

// ---- MDS classique (2 dimensions) via double-centrage + power iteration ----
function mds2d(sim) {
  const n = sim.length;
  if (n === 0) return [];
  // distance = 1 - similarité ; D2 = distance^2
  const D2 = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (1 - sim[i][j]) ** 2)
  );
  // double centrage : B = -1/2 J D2 J
  const rowMean = D2.map((r) => r.reduce((a, b) => a + b, 0) / n);
  const grand = rowMean.reduce((a, b) => a + b, 0) / n;
  const B = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => -0.5 * (D2[i][j] - rowMean[i] - rowMean[j] + grand))
  );
  const [v1, l1] = topEigen(B);
  deflate(B, v1, l1);
  const [v2, l2] = topEigen(B);
  const s1 = Math.sqrt(Math.max(l1, 0));
  const s2 = Math.sqrt(Math.max(l2, 0));
  return v1.map((_, i) => [v1[i] * s1, v2[i] * s2]);
}

function topEigen(M) {
  const n = M.length;
  let v = new Array(n).fill(0).map(() => Math.random());
  let lambda = 0;
  for (let iter = 0; iter < 200; iter++) {
    const w = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) w[i] += M[i][j] * v[j];
    const norm = Math.sqrt(w.reduce((a, b) => a + b * b, 0)) || 1;
    for (let i = 0; i < n; i++) w[i] /= norm;
    lambda = norm;
    v = w;
  }
  // signe de lambda
  const Mv = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Mv[i] += M[i][j] * v[j];
  const dot = Mv.reduce((a, b, i) => a + b * v[i], 0);
  return [v, dot];
}

function deflate(M, v, l) {
  const n = M.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) M[i][j] -= l * v[i] * v[j];
}
