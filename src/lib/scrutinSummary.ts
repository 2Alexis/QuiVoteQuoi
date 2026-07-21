import { parseScrutin } from "./parseScrutin";

export interface ScrutinSummary {
  /** Type de texte : Projet de loi (Gouvernement), Proposition de loi (Parlement)... */
  nature: string;
  /** Étape de la procédure : Première lecture, Commission mixte paritaire... */
  etape: string;
  /** Description synthétique claire et explicative des objectifs du texte */
  description: string;
  /** Thématique principale si disponible */
  categorie?: string | null;
}

// Dictionnaire de résumés informatifs clairs rédigés pour les lois majeures
const LAW_DESCRIPTIONS: Record<string, string> = {
  "offrir des réponses immédiates aux phénomènes troublant l'ordre public":
    "Ce texte vise à renforcer la réponse pénale face aux violences urbaines et délinquances du quotidien. Il prévoit des peines d'interdiction de paraître dans certains lieux, l'élargissement de la comparution immédiate et le renforcement des sanctions en cas de dégradation de biens publics.",

  "montagne vivante et souveraine":
    "Cette loi vise à soutenir l'économie, le pastoralisme et le logement dans les territoires de montagne en adaptant certaines normes d'aménagement et de protection environnementale.",

  "stratégie nationale de lutte contre les maladies cardio-neurovasculaires":
    "Ce texte établit un plan national de prévention, dépistage précoce et prise en charge des maladies cardiovasculaires et AVC, avec l'équipement renforcé des structures de soins territoriales.",

  "souveraineté alimentaire et agricole":
    "Cette loi d'orientation consacre l'agriculture au rang d'intérêt général majeur de la Nation. Elle facilite la transmission des exploitations agricoles et simplifie les normes administratives.",

  "programmation militaire":
    "Loi de programmation fixant la trajectoire budgétaire et les orientations stratégiques des forces armées françaises (équipements, modernisation des armées et dissuasion).",

  "juridictions criminelles":
    "Ce projet de loi réorganise le fonctionnement des cours criminelles départementales et renforce les moyens de la justice pour le traitement des affaires criminelles.",

  "légitime défense pour les forces de l'ordre":
    "Proposition de loi modifiant le cadre légal de l'usage des armes par les policiers et gendarmes en instituant une présomption de légitime défense lors de leurs interventions.",

  "aide à mourir":
    "Projet de loi définissant le cadre légal, les conditions médicales d'accès et les garde-fous pour l'aide active à mourir et le développement des soins palliatifs.",

  "droit de chaque enfant à être assisté d'un avocat":
    "Texte garantissant la présence obligatoire d'un avocat pour chaque mineur faisant l'objet d'une procédure d'assistance éducative ou de protection de l'enfance.",

  "industrie textile":
    "Loi visant à limiter l'impact environnemental de la fast-fashion en instaurant des pénalités financières basées sur le bilan écologique et l'interdiction de la publicité pour l'habillement éphémère.",

  "corse autonome":
    "Projet de loi constitutionnelle réformant le statut de la Corse pour reconnaître sa communauté historique, linguistique et culturelle et lui accorder une autonomie législative encadrée.",

  "hydroélectricité":
    "Loi simplifiant les procédures de concession et d'investissement pour moderniser le parc hydroélectrique français et soutenir la production d'énergie décarbonée.",

  "logement des travailleurs des services publics":
    "Texte facilitant l'attribution de logements sociaux ou conventionnés aux agents des services publics (soignants, enseignants, policiers) à proximité de leur lieu de travail.",

  "sécurité, la rétention administrative":
    "Loi prolongeant la durée maximale de rétention administrative pour les profils dangereux et renforçant les mesures de suivi administratif pour la prévention d'actes terroristes.",

  "bourses sur critères sociaux":
    "Proposition de loi revalorisant le montant des bourses étudiantes et simplifiant les critères d'attribution pour mieux lutter contre la précarité dans les universités.",

  "arcelormittal":
    "Proposition de loi prévoyant la nationalisation temporaire des sites industriels d'ArcelorMittal en France pour préserver les emplois et la souveraineté de la filière acier.",

  "retraités pauvres":
    "Texte instaurant une revalorisation exceptionnelle et un plancher minimum de pension pour les retraités disposant de revenus inférieurs au seuil de pauvreté.",

  "mal-être et le risque suicidaire dans le monde agricole":
    "Loi créant un dispositif de détection précoce, d'accompagnement financier et de soutien psychologique pour les agriculteurs en grande difficulté.",

  "retraites agricoles":
    "Texte revalorisant les petites pensions des anciens exploitants agricoles et de leurs conjoints collaborateurs en calculant les retraites sur les 25 meilleures années.",

  "vaisselle en plastique":
    "Loi interdisant définitivement les récipients et ustensiles en plastique dans les cantines scolaires et structures de la petite enfance.",

  "cadmium":
    "Proposition de loi fixant des seuils maximaux de concentration de cadmium dans les engrais et aliments pour prévenir les risques sanitaires.",

  "chlordécone":
    "Loi reconnaissant la responsabilité de l'État dans la pollution au chlordécone aux Antilles et organisant l'indemnisation complète des victimes et agriculteurs touchés.",

  "violences en milieu scolaire":
    "Texte renforçant le protocole de signalement, la prise en charge des victimes de harcèlement scolaire et prévoyant l'exclusion systématique des élèves harceleurs.",

  "crise du logement":
    "Loi visant à remettre sur le marché les logements vacants et meublés touristiques pour augmenter l'offre de logements locatifs permanents.",

  "code noir":
    "Proposition de loi symbolique portant abrogation formelle et mémorielle de l'édit de 1685 dit Code Noir régissant l'esclavage sous l'Ancien Régime.",

  "nouvelle-calédonie":
    "Projet de loi constitutionnelle modifiant le corps électoral pour les élections provinciales en Nouvelle-Calédonie.",

  "dérives sectaires":
    "Loi créant l'infraction de sujétion psychologique et durcissant les peines contre les gourous et mouvements sectaires ciblant les personnes vulnérables.",

  "simplification de la vie économique":
    "Projet de loi visant à alléger les démarches administratives des entreprises, réduire les délais de délivrance d'autorisations et simplifier les fiches de paie.",

  "propreté et sécurité dans les transports":
    "Loi renforçant les pouvoirs des agents de sécurité des transports publics (RATP, SNCF) pour lutter contre les incivilités et la fraude.",
};

export function getScrutinSummary(sc: {
  titre: string | null;
  objet?: string | null;
  categorie?: string | null;
}): ScrutinSummary {
  const p = parseScrutin(sc.titre);
  const raw = (sc.titre || "").toLowerCase();
  const loi = (p.loi || "").toLowerCase();

  // 1. Déterminer la nature du texte (Projet vs Proposition)
  let nature = "Texte législatif";
  if (p.meta.typeTexte) {
    if (p.meta.typeTexte.toLowerCase().includes("projet")) {
      nature = "Projet de loi (déposé par le Gouvernement)";
    } else if (p.meta.typeTexte.toLowerCase().includes("proposition")) {
      nature = "Proposition de loi (initiée par des députés)";
    } else {
      nature = p.meta.typeTexte;
    }
  }

  // 2. Étape de lecture
  const etape = p.meta.etapeLecture || "Examen en séance publique";

  // 3. Chercher dans notre dictionnaire de descriptions claires
  let description = "";
  for (const [key, desc] of Object.entries(LAW_DESCRIPTIONS)) {
    if (raw.includes(key) || loi.includes(key)) {
      description = desc;
      break;
    }
  }

  // 4. Générateur structuré si pas dans le dictionnaire
  if (!description) {
    if (p.type === "Vote final") {
      const nom = p.loi ? `« ${p.loi} »` : "ce texte";
      description = `Ce vote porte sur l'adoption globale du texte ${nom}. Il s'agit d'une initiative ${
        nature.includes("Gouvernement") ? "gouvernementale" : "parlementaire"
      } examinée en ${etape.toLowerCase()}${
        sc.categorie ? ` dans la thématique : ${sc.categorie}` : ""
      }.`;
    } else if (p.type === "Amendement") {
      const auteurStr = p.meta.auteur ? `déposé par ${p.meta.auteur}` : "";
      const loiStr = p.loi ? `dans le cadre du texte « ${p.loi} »` : "";
      description = `Ce vote concerne ${p.action || "un amendement"} ${auteurStr} ${loiStr}. Les amendements permettent de modifier, ajouter ou supprimer des articles d'un projet de loi pendant son examen.`;
    } else if (p.type === "Motion") {
      const auteurStr = p.meta.auteur ? `déposée par ${p.meta.auteur}` : "";
      const loiStr = p.loi ? `visant le texte « ${p.loi} »` : "";
      description = `Ce vote porte sur une ${p.action || "motion"} ${auteurStr} ${loiStr}. Une motion est une procédure permettant de rejeter d'emblée un texte ou d'engager la responsabilité politique.`;
    } else {
      description = `Ce scrutin concerne l'examen de ${p.action || "ce texte"} en ${etape.toLowerCase()}${
        sc.categorie ? ` (Thématique : ${sc.categorie})` : ""
      }.`;
    }
  }

  return {
    nature,
    etape,
    description,
    categorie: sc.categorie,
  };
}
