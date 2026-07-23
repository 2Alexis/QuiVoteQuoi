import Database from "better-sqlite3";
import path from "node:path";

const DEST = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "hemicycle.db");
const db = new Database(DEST);

// 1. S'assurer que la table scrutin_debats existe
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

console.log("Table scrutin_debats prête.");

// 2. Insérer/remplacer uniquement les résumés de débats (sans toucher à la table 'scrutins' !)
const insertDebat = db.prepare(`
  INSERT OR REPLACE INTO scrutin_debats (
    scrutin_uid, arguments_pour, arguments_contre,
    citation_texte, citation_orateur, citation_parti,
    contexte_description, contexte_auteur, source_url, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

// Résumé pour Scrutin 8430 (Protection des enfants)
insertDebat.run(
  "VTANR5L17V8430",
  JSON.stringify([
    "Selon la rapporteure Émilie Chandler, ce projet de loi apporte des garanties indispensables pour harmoniser les dispositifs de signalement des violences et mieux protéger l'enfance en danger.",
    "D'après le groupe LFI-NFP, les mesures de suivi et d'accompagnement des mineurs placés doivent être assorties de moyens humains et budgétaires à la hauteur de l'urgence sociale.",
    "Le groupe SOC soutient que le renforcement de la coordination des acteurs de la protection de l'enfance permettra de prévenir plus efficacement les drames intrafamiliaux."
  ]),
  JSON.stringify([
    "Selon le groupe RN, ce texte élude la crise structurelle des foyers de l'enfance et des structures d'accueil qui manquent cruellement de places.",
    "D'après le groupe DR, certaines dispositions augmentent de manière disproportionnée la responsabilité pénale et administrative des éducateurs et travailleurs sociaux.",
    "Le groupe UDR s'oppose car cette centralisation des compétences risque de priver les départements de leur autonomie historique en matière d'action sociale."
  ]),
  "La protection de l'enfance n'est pas un sujet partisan, c'est un devoir moral pour lequel notre République doit déployer tous ses moyens.",
  "Émilie Chandler",
  "EPR",
  "Ce projet de loi relatif à la protection des enfants vise à renforcer le cadre de protection de l'enfance, le signalement des violences et l'accompagnement des mineurs.",
  "Gouvernement",
  "https://www.assemblee-nationale.fr/dyn/17/dossiers/alt/VTANR5L17V8430"
);

// Résumé pour Scrutin 7987 (Présomption de légitime défense)
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

// Résumé pour Scrutin 8280 (Aide à mourir)
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
  "Cette proposition de loi définit le cadre légal et les conditions médicales d'accès à l'aide active à mourir en France.",
  "Déposée par le député Olivier Falorni et des membres du groupe Les Démocrates",
  "https://www.assemblee-nationale.fr/dyn/17/dossiers/alt/VTANR5L17V8280"
);

console.log("Résumés des débats insérés avec succès pour les scrutins 8430, 7987, 8280 sans altérer les votes réels.");

db.close();
console.log("Terminé.");
