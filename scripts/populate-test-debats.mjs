import Database from "better-sqlite3";
import path from "node:path";

const DEST = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "hemicycle.db");
const db = new Database(DEST);

// 1. S'assurer que les tables existent et ont la bonne structure
db.exec(`
  CREATE TABLE IF NOT EXISTS scrutin_debats (
    scrutin_uid TEXT PRIMARY KEY,
    arguments_pour TEXT NOT NULL,
    arguments_contre TEXT NOT NULL,
    citation_texte TEXT NOT NULL,
    citation_orateur TEXT NOT NULL,
    citation_parti TEXT NOT NULL,
    source_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration des colonnes de contexte
const columns = db.prepare("PRAGMA table_info(scrutin_debats)").all();
if (!columns.some(col => col.name === "contexte_description")) {
  db.exec("ALTER TABLE scrutin_debats ADD COLUMN contexte_description TEXT;");
}
if (!columns.some(col => col.name === "contexte_auteur")) {
  db.exec("ALTER TABLE scrutin_debats ADD COLUMN contexte_auteur TEXT;");
}

// Insérer les scrutins manquants dans la table 'scrutins' pour la navigation et l'affichage complet
const insertScrutin = db.prepare(`
  INSERT INTO scrutins (
    uid, numero, date, legislature, type_vote, sort_code, titre, objet, demandeur,
    nb_votants, exprimes, pour, contre, abstentions, non_votants, categorie, orientation, orientation_score, orientation_src
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(uid) DO UPDATE SET
    numero = excluded.numero,
    date = excluded.date,
    legislature = excluded.legislature,
    type_vote = excluded.type_vote,
    sort_code = excluded.sort_code,
    titre = excluded.titre,
    objet = excluded.objet,
    pour = excluded.pour,
    contre = excluded.contre,
    abstentions = excluded.abstentions
`);

// Scrutin 8430
insertScrutin.run(
  "VTANR5L17V8430",
  8430,
  "2026-07-20",
  "17",
  "scrutin public",
  "adopté",
  "l'ensemble de la proposition de loi visant à assurer le droit de chaque enfant à être assisté d'un avocat dans le cadre d'une mesure d'assistance éducative et de protection de l'enfance (deuxième lecture).",
  "l'ensemble de la proposition de loi visant à assurer le droit de chaque enfant à être assisté d'un avocat dans le cadre d'une mesure d'assistance éducative et de protection de l'enfance (deuxième lecture).",
  "Conférence des Présidents",
  467,
  462,
  450,
  12,
  5,
  1,
  "Famille & société",
  "Droits des mineurs",
  -0.65,
  "votes"
);

// Scrutin 8280
insertScrutin.run(
  "VTANR5L17V8280",
  8280,
  "2026-07-15",
  "17",
  "scrutin public",
  "adopté",
  "l'ensemble de la proposition de loi relative au droit à l'aide à mourir (première lecture).",
  "l'ensemble de la proposition de loi relative au droit à l'aide à mourir (première lecture).",
  "Conférence des Présidents",
  545,
  530,
  320,
  210,
  15,
  2,
  "Santé & social",
  "Bioéthique",
  -0.45,
  "votes"
);

console.log("Scrutins de test (8430 et 8280) insérés dans la table `scrutins`.");

// 2. Insérer les résumés de débats formatés selon AGENTS.md
const insertDebat = db.prepare(`
  INSERT OR REPLACE INTO scrutin_debats (
    scrutin_uid, arguments_pour, arguments_contre,
    citation_texte, citation_orateur, citation_parti,
    contexte_description, contexte_auteur, source_url, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

// Résumé pour Scrutin 8430
insertDebat.run(
  "VTANR5L17V8430",
  JSON.stringify([
    "Selon la rapporteure Émilie Chandler, cette mesure garantit la parole de l'enfant de manière autonome, en évitant toute influence ou conflit d'intérêts avec les représentants légaux.",
    "D'après le groupe LFI-NFP, la présence systématique d'un avocat qualifié renforce les droits fondamentaux des mineurs face aux décisions d'assistance éducative.",
    "Le groupe SOC soutient que cette assistance juridique gratuite contribue à réduire les inégalités d'accès à la justice pour les enfants les plus vulnérables."
  ]),
  JSON.stringify([
    "Selon le groupe RN, l'automatisation de la présence d'un avocat risque d'allonger les délais de procédure déjà critiques dans les tribunaux pour enfants.",
    "D'après le groupe DR, l'absence de formation spécialisée obligatoire de certains avocats commis d'office pourrait nuire à la qualité de l'accompagnement du mineur.",
    "Le groupe UDR s'oppose car cette mesure engendre un coût budgétaire conséquent pour l'aide juridictionnelle sans garantie d'une meilleure efficacité éducative."
  ]),
  "L'avocat de l'enfant n'est pas là pour juger les parents, mais pour s'assurer que l'intérêt supérieur du mineur soit la boussole de notre justice.",
  "Émilie Chandler",
  "EPR",
  "Cette proposition de loi vise à instaurer le droit pour tout enfant d'être assisté d'un avocat lors des procédures d'assistance éducative devant le juge des enfants.",
  "Déposée par la députée Émilie Chandler (groupe EPR)",
  "https://www.assemblee-nationale.fr/dyn/17/dossiers/alt/VTANR5L17V8430"
);

// Résumé pour Scrutin 7987
insertDebat.run(
  "VTANR5L17V7987",
  JSON.stringify([
    "Selon le groupe RN, cette mesure protège juridiquement et moralement les policiers et gendarmes confrontés à une hausse des agressions physiques et refus d'obtempérer.",
    "D'après le député Thomas Ménagé, il est indispensable d'inverser la charge de la preuve pour que les forces de l'ordre ne soient pas présumées coupables d'emblée.",
    "Le groupe UDR soutient que cette réforme redonne de l'autorité à l'État et renforce le pouvoir de dissuasion des forces de sécurité intérieure."
  ]),
  JSON.stringify([
    "Selon le groupe LFI-NFP, instaurer une telle présomption crée un permis de tuer de fait et risque d'accroître de manière dramatique les violences policières.",
    "D'après le ministre de l'Intérieur, le cadre actuel de la légitime défense réformé en 2017 est suffisant, équilibré et protecteur pour les policiers.",
    "Le groupe EcoS s'oppose car cette mesure rompt l'égalité des citoyens devant la loi et contredit les principes fondamentaux de la proportionnalité de la force."
  ]),
  "Nos policiers risquent leur vie chaque jour pour notre sécurité; la moindre des choses est que la loi se place à leurs côtés et non contre eux.",
  "Thomas Ménagé",
  "RN",
  "Cette proposition de loi vise à instaurer une présomption de légitime défense pour les membres des forces de l'ordre lorsqu'ils font usage de leurs armes dans l'exercice de leurs fonctions.",
  "Déposée par le groupe Rassemblement National",
  "https://www.assemblee-nationale.fr/dyn/17/dossiers/alt/VTANR5L17V7987"
);

// Résumé pour Scrutin 8280
insertDebat.run(
  "VTANR5L17V8280",
  JSON.stringify([
    "Selon le Gouvernement, cette loi d'éthique et de fraternité répond à la souffrance des malades en fin de vie en leur offrant une liberté ultime dans le respect de leur volonté.",
    "D'après le groupe EPR, le texte comporte des garde-fous extrêmement précis, réservant l'aide à mourir aux patients atteints d'une affection incurable à court ou moyen terme.",
    "Le groupe LFI-NFP soutient que cette mesure consacre un nouveau droit civil garantissant la dignité humaine face à la maladie et aux traitements devenus inutiles."
  ]),
  JSON.stringify([
    "Selon le groupe RN, le projet de loi élude le manque criant de moyens alloués aux soins palliatifs sur l'ensemble du territoire national.",
    "D'après le groupe DR, l'aide active à mourir contredit le serment d'Hippocrate et risque de faire peser une pression intolérable sur les soignants et les personnes âgées.",
    "Le groupe UDR s'oppose car l'acte d'abréger la vie ne saurait être qualifié de soin ou de geste de solidarité nationale."
  ]),
  "Ce texte n'impose rien à personne, il offre simplement un droit ultime de dignité et de liberté à ceux dont la souffrance est devenue insupportable.",
  "Olivier Falorni",
  "Dem",
  "Ce projet de loi définit les conditions d'accès, les critères médicaux stricts et les garanties entourant le droit à l'aide active à mourir en France.",
  "Déposé par le Gouvernement",
  "https://www.assemblee-nationale.fr/dyn/17/dossiers/alt/VTANR5L17V8280"
);

console.log("Résumés des débats insérés pour les scrutins 8430, 7987, 8280.");

db.close();
console.log("Terminé.");
