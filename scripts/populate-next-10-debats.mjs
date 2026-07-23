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
    uid: "VTANR5L17V8434",
    contexte: {
      description: "Cette proposition de loi vise à optimiser la gestion, la cession et la rénovation énergétique du parc immobilier appartenant à l'État pour réduire les dépenses d'entretien.",
      auteur: "Déposée par le groupe Ensemble pour la République (EPR)"
    },
    arguments_pour: [
      "Selon le groupe EPR, la modernisation de la gestion foncière permettra de libérer des actifs inutilisés et de générer des recettes pour désendetter l'État.",
      "D'après la commission des finances, la rationalisation des surfaces occupées par les ministères réduit l'empreinte carbone et les coûts de fonctionnement.",
      "Le groupe Dem soutient que la vente prioritaire aux collectivités territoriales facilitera la création de logements sociaux et d'équipements publics."
    ],
    arguments_contre: [
      "Selon le groupe LFI-NFP, ce texte s'apparente à une braderie du patrimoine public au profit de promoteurs privés sans garantie d'utilité sociale.",
      "D'après le groupe RN, la cession précipitée de bâtiments historiques prive la Nation de son patrimoine culturel sans régler le problème de la dette.",
      "Le groupe EcoS s'oppose car l'évaluation environnementale des cessions immobilières prévues par la loi reste trop parcellaire."
    ],
    citation: {
      texte: "L'État ne doit pas rester un propriétaire dormant; chaque mètre carré public doit servir l'intérêt général et l'efficience budgétaire.",
      orateur: "Rapporteur du texte",
      parti: "EPR"
    }
  },
  {
    uid: "VTANR5L17V8433",
    contexte: {
      description: "Ce projet de loi renforce les sanctions pénales contre la délinquance du quotidien et crée des procédures de comparution accélérée pour les actes de vandalisme urbain.",
      auteur: "Gouvernement"
    },
    arguments_pour: [
      "Selon le ministre de l'Intérieur, ces mesures apportent une réponse pénale rapide et dissuasive face aux incivilités et dégradations qui pourrissent la vie des quartiers.",
      "D'après le groupe RN, l'alourdissement des peines planchers et l'interdiction de paraître répondent à l'exaspération légitime des citoyens.",
      "Le groupe UDR soutient que le texte redonne des outils opérationnels immédiatement mobilisables par les forces de l'ordre et les magistrats."
    ],
    arguments_contre: [
      "Selon le groupe LFI-NFP, cette loi d'affichage sécuritaire engorge inutilement les tribunaux sans s'attaquer aux causes profondes de la délinquance.",
      "D'après le groupe SOC, l'automatisation des peines restreint le pouvoir d'appréciation individualisé des juges garanti par la Constitution.",
      "Le groupe EcoS s'oppose car le recours accru à la détention provisoire risque d'aggraver la surpopulation carcérale déjà critique."
    ],
    citation: {
      texte: "La tranquillité publique n'est pas une option; la République doit faire respecter la loi sur chaque mètre carré de son territoire.",
      orateur: "Ministre de l'Intérieur",
      parti: "Gouvernement"
    }
  },
  {
    uid: "VTANR5L17V8431",
    contexte: {
      description: "Cette proposition de loi instaure une vérification stricte de l'âge à l'inscription et encadre l'utilisation des algorithmes de recommandation ciblant les mineurs.",
      auteur: "Déposée par le groupe Ensemble pour la République (EPR)"
    },
    arguments_pour: [
      "Selon le groupe EPR, ce texte protège les enfants contre le cyberharcèlement, l'exposition à la pornographie et l'addiction aux écrans.",
      "D'après le groupe SOC, la responsabilisation légale des plateformes numériques est un préalable indispensable pour garantir la santé mentale des adolescents.",
      "Le groupe Dem soutient que la majorité numérique fixée à 15 ans redonne aux parents un levier de contrôle éducatif efficace."
    ],
    arguments_contre: [
      "Selon le groupe RN, le dispositif technique d'attestation d'âge risque de collecter massivement des données personnelles au mépris de la vie privée.",
      "D'après le groupe LFI-NFP, les sanctions financières prévues à l'encontre des géants du Web demeurent trop faibles pour être réellement dissuasives.",
      "Le groupe DR s'oppose à la rigidité des contrôles qui pourraient inciter les jeunes à contourner les règles via des réseaux non sécurisés."
    ],
    citation: {
      texte: "Nos enfants ne sont pas des marchandises algorithmiques; l'espace numérique doit obéir aux mêmes règles de protection que le monde réel.",
      orateur: "Rapporteure du texte",
      parti: "EPR"
    }
  },
  {
    uid: "VTANR5L17V8427",
    contexte: {
      description: "Ce projet de loi consacre l'agriculture au rang d'intérêt général majeur et simplifie les procédures administratives et environnementales pour l'exploitation rurale.",
      auteur: "Gouvernement"
    },
    arguments_pour: [
      "Selon le ministre de l'Agriculture, la consécration de la souveraineté alimentaire sécurise les agriculteurs face aux recours contentieux abusifs.",
      "D'après le groupe DR, l'allègement des normes et la facilitation des retenues d'eau sont indispensables pour préserver la compétitivité de la ferme France.",
      "Le groupe RN soutient que la priorité donnée à la production nationale protège le monde agricole contre la concurrence loyale et déloyale."
    ],
    arguments_contre: [
      "Selon le groupe EcoS, le texte détricote les normes de protection de la biodiversité et de la qualité de l'eau sous prétexte de simplification.",
      "D'après le groupe LFI-NFP, la loi favorise l'agrobusiness agro-industriel au détriment de la transition vers l'agriculture biologique et paysanne.",
      "Le groupe SOC s'oppose au manque d'accompagnement financier spécifique pour aider les jeunes agriculteurs à faire face au changement climatique."
    ],
    citation: {
      texte: "Nourrir la Nation est une mission de souveraineté stratégique; nous devons redonner de la liberté et de la dignité à nos agriculteurs.",
      orateur: "Ministre de l'Agriculture",
      parti: "Gouvernement"
    }
  },
  {
    uid: "VTANR5L17V8421",
    contexte: {
      description: "Cette proposition de loi adapte le droit de l'urbanisme et le soutien au pastoralisme pour favoriser l'économie, le logement permanent et les services en montagne.",
      auteur: "Déposée par le groupe Droite Républicaine (DR)"
    },
    arguments_pour: [
      "Selon le groupe DR, l'assouplissement de la loi Montagne permet de construire des logements réservés aux résidents permanents et aux saisonniers.",
      "D'après le groupe EPR, le renforcement du cadre juridique du pastoralisme protège les troupeaux contre les grands prédateurs.",
      "Le groupe LIOT soutient que la différenciation territoriale garantit le maintien des écoles et de l'offre de soins dans les vallées isolées."
    ],
    arguments_contre: [
      "Selon le groupe EcoS, le texte encourage le bétonnage des zones naturelles d'altitude sous couvert d'aménagement touristique.",
      "D'après le groupe LFI-NFP, les dérogations environnementales prévues risquent d'accélérer la dégradation des écosystèmes montagnards fragiles.",
      "Le groupe SOC émet des réserves sur la répartition des compensations financières entre les grandes stations et les petites communes de montagne."
    ],
    citation: {
      texte: "La montagne ne doit pas devenir un musée ou une réserve; elle doit rester un territoire vivant où les familles peuvent se loger et travailler.",
      orateur: "Rapporteur du texte",
      parti: "DR"
    }
  },
  {
    uid: "VTANR5L17V8419",
    contexte: {
      description: "Cette proposition de loi fixe une stratégie nationale de prévention, de dépistage précoce et d'équipement médical des territoires pour lutter contre les AVC et arrêts cardiaques.",
      auteur: "Déposée par le groupe Horizons & Indépendants (HOR)"
    },
    arguments_pour: [
      "Selon le groupe HOR, la création d'un plan national de santé permet d'équiper les zones rurales en défibrillateurs et de former massivement la population aux gestes qui sauvent.",
      "D'après le groupe SOC, le développement des unités neuro-vasculaires mobiles réduit l'inégalité d'accès aux soins d'urgence sur le territoire.",
      "Le groupe Dem soutient que la généralisation du dépistage de l'hypertension et du cholestérol préviendra des milliers d'accidents vasculaires évitables."
    ],
    arguments_contre: [
      "Selon le groupe RN, la proposition de loi reste incantatoire si elle ne s'accompagne pas d'un plan d'urgence contre les déserts médicaux et pour l'hôpital public.",
      "D'après le groupe LFI-NFP, le texte ne prévoit pas les créations de postes de soignants et de cardiologues nécessaires pour mettre en œuvre cette stratégie.",
      "Le groupe UDR s'oppose aux lourdeurs administratives liées à la gouvernance de la nouvelle instance nationale créée par le texte."
    ],
    citation: {
      texte: "Chaque minute compte face à un AVC; cette loi fait de la rapidité d'intervention et de la prévention une priorité sanitaire nationale.",
      orateur: "Rapporteur du texte",
      parti: "HOR"
    }
  },
  {
    uid: "VTANR5L17V8418",
    contexte: {
      description: "Cette proposition de loi réforme la régulation financière des clubs sportifs professionnels, le cadre des droits audiovisuel et le soutien au sport amateur.",
      auteur: "Déposée par le groupe Ensemble pour la République (EPR)"
    },
    arguments_pour: [
      "Selon le groupe EPR, le texte renforce la transparence des fonds d'investissement et protège la pérennité financière des ligues et des clubs.",
      "D'après le groupe HOR, le mécanisme de solidarité garantit un fléchage obligatoire d'une part des recettes audiovisuelles vers le développement des clubs amateurs.",
      "Le groupe DR soutient que la modernisation du cadre des sociétés sportives renforce l'attractivité et la compétitivité du sport français à l'international."
    ],
    arguments_contre: [
      "Selon le groupe LFI-NFP, la loi accentue la marchandisation du sport au détriment des supporters et des valeurs de l'esprit olympique.",
      "D'après le groupe RN, les contreparties imposées aux investisseurs étrangers manquent de fermeté pour éviter la spéculation sur les clubs historiques.",
      "Le groupe EcoS s'oppose au manque d'engagements environnementaux et d'éco-responsabilité exigés pour l'organisation des grands événements sportifs."
    ],
    citation: {
      texte: "Le sport professionnel doit allier excellence économique et solidarité envers la base amatrice qui forme nos futurs champions.",
      orateur: "Rapporteur du texte",
      parti: "EPR"
    }
  },
  {
    uid: "VTANR5L17V8279",
    contexte: {
      description: "Ce projet de loi (examiné en première lecture) instaure des sanctions pénales renforcées pour le refus d'obtempérer et les violences commises en bande organisée.",
      auteur: "Gouvernement"
    },
    arguments_pour: [
      "Selon le Gouvernement, la fermeté pénale est l'unique rempart contre la banalisation des agressions visant les forces de l'ordre et les élus.",
      "D'après le groupe RN, la généralisation des peines planchers garantit une sanction systématique et prompte pour les délinquants récidivistes.",
      "Le groupe UDR soutient que les nouvelles procédures de rétention administrative et de saisie des véhicules simplifient le travail d'enquête."
    ],
    arguments_contre: [
      "Selon le groupe LFI-NFP, cette législation sécuritaire restreint les libertés publiques sans apporter de réponse éducative ou de prévention.",
      "D'après le groupe SOC, l'automatisation des sanctions est contraire aux principes d'individualisation des peines et surcharge les prisons.",
      "Le groupe EcoS s'oppose aux dispositions élargissant les techniques de surveillance numérique lors des manifestations."
    ],
    citation: {
      texte: "Face à la délinquance qui défie l'autorité de l'État, la réponse de la République doit être immédiate, claire et intransigeante.",
      orateur: "Député orateur",
      parti: "Gouvernement"
    }
  },
  {
    uid: "VTANR5L17V8043",
    contexte: {
      description: "Ce projet de loi organique adapte le fonctionnement et la composition des cours criminelles départementales pour réduire le délai de jugement des crimes.",
      auteur: "Gouvernement"
    },
    arguments_pour: [
      "Selon le garde des Sceaux, l'accélération du traitement des affaires criminelles évite la détresse des victimes confrontées à des années d'attente.",
      "D'après le groupe EPR, l'évaluation des cours criminelles démontre une efficacité renforcée et une spécialisation accrue des magistrats.",
      "Le groupe Dem soutient que la professionnalisation des débats permet de juger les crimes graves dans le strict respect des droits de la défense."
    ],
    arguments_contre: [
      "Selon le groupe LFI-NFP, l'éviction progressive du jury populaire au profit de juges professionnels affaiblit la démocratie judiciaire et le jugement par les pairs.",
      "D'après l'ordre des avocats et le groupe SOC, la généralisation de ces cours sans jury populaire risque de déhumaniser la justice criminelle.",
      "Le groupe RN s'oppose car les moyens matériels et humains alloués aux secrétariats des tribunaux restent insuffisants pour absorber le flux des dossiers."
    ],
    citation: {
      texte: "Une justice trop lente n'est plus tout à fait la justice; moderniser nos cours criminelles est un devoir envers les victimes.",
      orateur: "Garde des Sceaux",
      parti: "Gouvernement"
    }
  },
  {
    uid: "VTANR5L17V8042",
    contexte: {
      description: "Ce projet de loi renforce l'accompagnement juridique et psychologique des victimes de crimes et améliore leur indemnisation lors des procédures judiciaires.",
      auteur: "Gouvernement"
    },
    arguments_pour: [
      "Selon le ministre de la Justice, placer les victimes au cœur du procès pénal garantit leur prise en charge globale dès le dépôt de plainte.",
      "D'après le groupe SOC, la création d'un fonds de garantie revalorisé assure l'indemnisation rapide des préjudices corporels subis.",
      "Le groupe DR soutient que la présence obligatoire d'un espace d'accueil dédié dans chaque tribunal préserve la dignité des victimes."
    ],
    arguments_contre: [
      "Selon le groupe RN, les mesures d'accompagnement manquent de moyens financiers pérennes et reposent trop sur le tissu associatif débordé.",
      "D'après le groupe LFI-NFP, le texte n'accorde pas d'aide juridictionnelle automatique sans condition de ressources pour toutes les victimes de crimes graves.",
      "Le groupe UDR s'oppose car la réduction des délais d'instruction ne doit pas se faire au détriment de l'analyse approfondie des faits."
    ],
    citation: {
      texte: "Les victimes ne doivent plus jamais se sentir seules ou oubliées par la justice de notre pays.",
      orateur: "Garde des Sceaux",
      parti: "Gouvernement"
    }
  }
];

let count = 0;
for (const item of debatsData) {
  // Vérification que le scrutin existe bien dans la table 'scrutins'
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
