import Database from "better-sqlite3";
import path from "node:path";

const DEST = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "hemicycle.db");
const db = new Database(DEST);

// 1. S'assurer que la table scrutin_debats existe et migrer si besoin
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

const columns = db.prepare("PRAGMA table_info(scrutin_debats)").all();
if (!columns.some(col => col.name === "contexte_description")) {
  db.exec("ALTER TABLE scrutin_debats ADD COLUMN contexte_description TEXT;");
}
if (!columns.some(col => col.name === "contexte_auteur")) {
  db.exec("ALTER TABLE scrutin_debats ADD COLUMN contexte_auteur TEXT;");
}

console.log("Table scrutin_debats vérifiée.");

// 2. Préparation de la requête INSERT OR REPLACE uniquement dans scrutin_debats
const insertDebat = db.prepare(`
  INSERT OR REPLACE INTO scrutin_debats (
    scrutin_uid, arguments_pour, arguments_contre,
    citation_texte, citation_orateur, citation_parti,
    contexte_description, contexte_auteur, source_url, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

const debatsData = [
  {
    uid: "VTANR5L17V7981",
    contexte: {
      description: "Ce projet de loi organique adapte les règles relatives au statut des magistrats et au fonctionnement des cours criminelles départementales pour résorber les stocks de dossiers.",
      auteur: "Gouvernement"
    },
    arguments_pour: [
      "Selon le garde des Sceaux, l'extension des cours criminelles départementales permet un jugement plus rapide des affaires de viol sans nuire aux garanties fondamentales du procès.",
      "D'après le groupe EPR, la spécialisation des magistrats et la réduction des délais d'attente préservent la mémoire des faits et limitent le traumatisme des victimes.",
      "Le groupe Dem soutient que la réorganisation des juridictions préserve un équilibre strict entre impératif d'efficacité et respect de la présomption d'innocence."
    ],
    arguments_contre: [
      "Selon le groupe LFI-NFP, la généralisation de ces cours équivaut à la suppression progressive du jury populaire et prive les citoyens de leur rôle de juges.",
      "D'après les syndicats de la magistrature et le groupe SOC, l'accélération des procédures ne remplace pas l'affectation massive de moyens humains dans les greffes.",
      "Le groupe RN s'oppose au texte en estimant qu'il ne s'attaque pas à la fermeté des peines prononcées contre les auteurs de crimes graves."
    ],
    citation: {
      texte: "Moderniser l'organisation de nos cours criminelles est une urgence morale pour que justice soit rendue dans des délais raisonnables.",
      orateur: "Garde des Sceaux",
      parti: "Gouvernement"
    }
  },
  {
    uid: "VTANR5L17V7980",
    contexte: {
      description: "Ce projet de loi (examiné en première lecture) améliore l'information, l'accompagnement juridique et l'indemnisation financière des victimes d'infractions criminelles.",
      auteur: "Gouvernement"
    },
    arguments_pour: [
      "Selon le ministère de la Justice, le texte renforce la présence et l'assistance des associations spécialisées tout au long de la procédure judiciaire.",
      "D'après le groupe SOC, la revalorisation du fonds de garantie simplifie les démarches d'indemnisation sans exiger l'insolvabilité préalable de l'auteur.",
      "Le groupe DR soutient la création d'espaces d'accueil sécurisés au sein des tribunaux pour éviter tout contact direct traumatisant avec l'accusé."
    ],
    arguments_contre: [
      "Selon le groupe RN, les droits accordés aux victimes restent largement symboliques à défaut d'exécuter réellement les peines de prison fermes.",
      "D'après le groupe LFI-NFP, l'absence d'aide juridictionnelle gratuite inconditionnelle laisse subsister une justice à deux vitesses.",
      "Le groupe UDR s'oppose à la création de nouvelles structures administratives locales sans financement dédié garanti dans la durée."
    ],
    citation: {
      texte: "Les victimes ont trop longtemps été les oubliées du procès pénal; cette loi remet leur protection et leur dignité au centre de nos procédures.",
      orateur: "Garde des Sceaux",
      parti: "Gouvernement"
    }
  },
  {
    uid: "VTANR5L17V7905",
    contexte: {
      description: "Ce projet de loi actualise les crédits et les priorités d'équipement des armées françaises (dissuasion, cyberdéfense, munitions) face aux tensions internationales.",
      auteur: "Gouvernement"
    },
    arguments_pour: [
      "Selon le ministre des Armées, la trajectoire budgétaire rehaussée garantit la souveraineté stratégique et l'autonomie opérationnelle de la France.",
      "D'après le groupe EPR, les investissements ciblés dans le domaine spatial et le cyber préparent nos forces aux conflits de haute intensité.",
      "Le groupe DR soutient le soutien renforcé aux entreprises de la base industrielle et technologique de défense (BITD) réparties sur le territoire."
    ],
    arguments_contre: [
      "Selon le groupe LFI-NFP, l'augmentation massive des dépenses d'armement s'effectue au détriment des priorités sociales et de la transition écologique.",
      "D'après le groupe EcoS, le texte privilégie une logique d'escalade militaire internationale sans favoriser la diplomatie et la prévention des conflits.",
      "Le groupe RN formule des réserves sur la prise en compte réelle de l'inflation dans le calcul de la hausse effective des crédits d'équipement."
    ],
    citation: {
      texte: "La liberté et la paix ont un prix; cette loi de programmation donne à nos armées les moyens d'assurer la protection de la Nation.",
      orateur: "Ministre des Armées",
      parti: "Gouvernement"
    }
  },
  {
    uid: "VTANR5L17V7904",
    contexte: {
      description: "Cette proposition de loi (examinée en deuxième lecture) généralise la présence obligatoire d'un avocat pour chaque mineur dans le cadre des procédures de protection de l'enfance.",
      auteur: "Déposée par la députée Émilie Chandler (groupe EPR)"
    },
    arguments_pour: [
      "Selon la rapporteure Émilie Chandler, le texte garantit l'écoute impartiale et la défense exclusive des intérêts de l'enfant lors des décisions de placement.",
      "D'après le groupe LFI-NFP, l'attribution d'un conseil dédié permet aux mineurs de faire valoir pleinement leurs droits face aux juges pour enfants.",
      "Le groupe SOC soutient le caractère gratuit de l'assistance d'un avocat commis d'office financée au titre de l'aide juridictionnelle."
    ],
    arguments_contre: [
      "Selon le groupe RN, l'intervention obligatoire d'un avocat risque d'allonger la durée des procédures dans des tribunaux débordés.",
      "D'après le groupe DR, l'hétérogénéité de formation de certains avocats en droit des mineurs pourrait affecter l'efficacité du suivi éducatif.",
      "Le groupe UDR craint la création d'un conflit d'autorité systématique entre l'avocat du mineur et la responsabilité des parents."
    ],
    citation: {
      texte: "Donner un avocat à chaque enfant vulnérable, c'est garantir que sa voix soit entendue avec la rigueur et l'indépendance du droit.",
      orateur: "Émilie Chandler",
      parti: "EPR"
    }
  },
  {
    uid: "VTANR5L17V7894",
    contexte: {
      description: "Cette proposition de loi (en nouvelle lecture) fixe les conditions médicales strictes et le protocole d'accompagnement de l'aide active à mourir.",
      auteur: "Déposée par le député Olivier Falorni (groupe Dem)"
    },
    arguments_pour: [
      "Selon le député Olivier Falorni, le texte instaure une liberté ultime d'auto-détermination pour les malades en phase terminale confrontés à des souffrances réfractaires.",
      "D'après le groupe EPR, les verrous médicaux renforcés garantissent le consentement libre, éclairé et répété du patient à chaque étape.",
      "Le groupe LFI-NFP soutient l'affirmation d'un nouveau droit individuel complétant et renforçant le droit d'accès universel aux soins palliatifs."
    ],
    arguments_contre: [
      "Selon le groupe RN, la priorité absolue devrait être le déploiement de lits de soins palliatifs dans tous les départements avant toute évolution législative.",
      "D'après le groupe DR, l'aide active à mourir crée une rupture éthique majeure qui fragilise la relation de confiance entre soignants et patients.",
      "Le groupe UDR s'oppose à la désignation d'actes médicaux visant à abréger délibérément la vie humaine."
    ],
    citation: {
      texte: "Il s'agit d'une loi d'humanité et de liberté qui permet à chacun d'aborder la fin de sa vie selon ses propres convictions et sa dignité.",
      orateur: "Olivier Falorni",
      parti: "Dem"
    }
  },
  {
    uid: "VTANR5L17V7893",
    contexte: {
      description: "Cette proposition de loi (en première lecture) encadre les sociétés commerciales sportives, les droits de retransmission et les versements de solidarité au sport amateur.",
      auteur: "Déposée par le groupe Ensemble pour la République (EPR)"
    },
    arguments_pour: [
      "Selon le groupe EPR, la régulation des capitaux investis dans les clubs professionnels protège la pérennité financière des compétitions nationales.",
      "D'après le groupe HOR, la réservation d'un pourcentage fixe des droits TV pour le sport pour tous finance la rénovation des infrastructures municipales.",
      "Le groupe DR soutient la création de mécanismes de contrôle renforcés contre la spéculation sur les transferts de jeunes joueurs."
    ],
    arguments_contre: [
      "Selon le groupe LFI-NFP, le texte accentue la dérive financière du sport de haut niveau et néglige le soutien aux petits clubs de quartier.",
      "D'après le groupe RN, les garde-fous imposés aux fonds de pension étrangers manquent de contraintes fermes pour préserver l'identité des clubs.",
      "Le groupe EcoS déplore l'absence de critères d'éco-conditionnalité environnementale imposés aux ligues sportives professionnelles."
    ],
    citation: {
      texte: "Le sport est un bien commun; nous devons veiller à ce que la prospérité du monde professionnel irrigue directement le sport amateur.",
      orateur: "Rapporteur du texte",
      parti: "EPR"
    }
  },
  {
    uid: "VTANR5L17V7494",
    contexte: {
      description: "Cette proposition de loi instaure des pénalités financières basées sur le bilan écologique et interdit la publicité pour les marques d'habillement éphémère (fast-fashion).",
      auteur: "Déposée par le groupe Horizons & Indépendants (HOR)"
    },
    arguments_pour: [
      "Selon le groupe HOR, l'application d'un bonus-malus écologique responsabilise les enseignes de la fast-fashion et freine la surconsommation textile.",
      "D'après le groupe EcoS, l'interdiction de la publicité pour les produits textiles à fort impact environnemental protège le pouvoir d'achat et le climat.",
      "Le groupe SOC soutient la promotion des filières de recyclage et de la seconde main créatrices d'emplois locaux non délocalisables."
    ],
    arguments_contre: [
      "Selon le groupe RN, l'alourdissement des taxes risque de renchérir le coût des vêtements de première nécessité pour les familles à faibles revenus.",
      "D'après le groupe DR, les critères techniques d'évaluation de la fast-fashion risquent d'être complexes à appliquer aux plateformes d'importation en ligne.",
      "Le groupe UDR craint des distorsions de concurrence si le contrôle des produits expédiés depuis l'étranger n'est pas strictement garanti aux douanes."
    ],
    citation: {
      texte: "La mode jetable dévaste l'environnement; notre loi impose un modèle sobre et vertueux aux géants du textile mondial.",
      orateur: "Rapporteur du texte",
      parti: "HOR"
    }
  },
  {
    uid: "VTANR5L17V7454",
    contexte: {
      description: "Ce projet de loi constitutionnelle modifie la Constitution pour reconnaître la communauté historique, linguistique et culturelle corse et lui accorder une autonomie législative encadrée.",
      auteur: "Gouvernement"
    },
    arguments_pour: [
      "Selon le Gouvernement, cet accord historique consacre un statut d'autonomie dans la République tout en respectant l'unité de la Nation.",
      "D'après les députés corses et le groupe Dem, la capacité d'adapter les lois nationales aux spécificités de l'île répond au problème du logement et du foncier.",
      "Le groupe SOC soutient une avancée décentralisatrice majeure qui valorise la diversité culturelle et la langue corse."
    ],
    arguments_contre: [
      "Selon le groupe RN, accorder un pouvoir législatif local rompt le principe d'indivisibilité de la République et ouvre la voie à l'indépendantisme.",
      "D'après le groupe DR, la création d'une catégorie juridique d'exception pour une seule région fragilise l'égalité de tous les citoyens devant la loi.",
      "Le groupe UDR s'oppose fermement à toute reconnaissance constitutionnelle d'une communauté spécifique au sein de la communauté nationale."
    ],
    citation: {
      texte: "Construire l'autonomie de la Corse au sein de la République, c'est sceller une alliance de confiance dans le respect de nos principes constitutionnels.",
      orateur: "Ministre de l'Intérieur",
      parti: "Gouvernement"
    }
  },
  {
    uid: "VTANR5L17V7409",
    contexte: {
      description: "Cette proposition de loi simplifie les procédures administratives et de concession pour moderniser le parc hydroélectrique français et accroître la production d'énergie décarbonée.",
      auteur: "Déposée par le groupe Ensemble pour la République (EPR)"
    },
    arguments_pour: [
      "Selon le groupe EPR, la modernisation des barrages renforce la souveraineté énergétique de la France et la flexibilité de son réseau électrique.",
      "D'après le groupe DR, la clarification du statut des concessions hydroélectriques débloque des investissements industriels majeurs au cœur des vallées.",
      "Le groupe SOC soutient le rôle clé de l'hydroélectricité comme énergie renouvelable pilotable indispensable au mix énergétique de demain."
    ],
    arguments_contre: [
      "Selon le groupe EcoS, l'assouplissement des règles environnementales risque d'impacter les écosystèmes aquatiques et la biodiversité des cours d'eau.",
      "D'après le groupe LFI-NFP, la mise en concurrence des installations électriques historiques fragilise le service public de l'énergie porté par EDF.",
      "Le groupe RN s'oppose aux ouvertures de capital des ouvrages hydroélectriques pouvant faciliter la prise de contrôle par des acteurs étrangers."
    ],
    citation: {
      texte: "L'hydroélectricité est une chance nationale; libérer les investissements dans nos barrages est essentiel pour réussir notre décarbonation.",
      orateur: "Rapporteur du texte",
      parti: "EPR"
    }
  },
  {
    uid: "VTANR5L17V7408",
    contexte: {
      description: "Cette proposition de loi facilite l'attribution de logements sociaux et conventionnés réservés aux soignants, enseignants et policiers travaillant dans les zones tendues.",
      auteur: "Déposée par le groupe Ensemble pour la République (EPR)"
    },
    arguments_pour: [
      "Selon le groupe EPR, rapprocher les agents publics de leur lieu de travail améliore la qualité de vie des personnels et l'attractivité des services publics.",
      "D'après le groupe Dem, les réservations de logements par les administrations publiques réduisent le temps de transport et l'épuisement professionnel.",
      "Le groupe HOR soutient un dispositif pragmatique qui répond directement aux difficultés de recrutement constatées dans les métropoles."
    ],
    arguments_contre: [
      "Selon le groupe LFI-NFP, la priorité d'accès accordée aux agents publics risque d'évincer les ménages les plus précaires des listes d'attente du logement social.",
      "D'après le groupe RN, ce texte ne résout pas la crise globale du logement et la pénurie de constructions neuves dans les zones très tendues.",
      "Le groupe EcoS s'oppose au manque d'exigences sur les performances énergétiques des logements réattribués aux agents publics."
    ],
    citation: {
      texte: "Ceux qui soignent, enseignent et protègent nos concitoyens doivent pouvoir se loger dignement à proximité de leur mission.",
      orateur: "Rapporteure du texte",
      parti: "EPR"
    }
  }
];

let count = 0;
for (const item of debatsData) {
  const exists = db.prepare("SELECT 1 FROM scrutins WHERE uid = ?").get(item.uid);
  if (!exists) {
    console.warn(`Scrutin ${item.uid} absent de la table scrutins, ignoré.`);
    continue;
  }

  const sourceUrl = `https://www.assemblee-nationale.fr/dyn/17/dossiers/alt/${item.uid}`;
  insertDebat.run(
    item.uid,
    JSON.stringify(item.arguments_pour),
    JSON.stringify(item.arguments_contre),
    item.citation.texte,
    item.citation.orateur,
    item.citation.parti,
    item.contexte.description,
    item.contexte.auteur,
    sourceUrl
  );
  count++;
  console.log(`✓ Résumé enregistré pour ${item.uid}`);
}

db.close();
console.log(`Terminé : ${count} nouveaux résumés de lois insérés.`);
