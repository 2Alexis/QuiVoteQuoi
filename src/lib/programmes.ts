// Programmes / positions des partis pour la présidentielle 2027, rattachés au
// groupe parlementaire correspondant (par abrégé). CONTENU ÉDITORIAL CURATÉ À LA
// MAIN — il n'existe PAS dans l'open data de l'Assemblée.
//
// AVERTISSEMENT (dernière vérification : juillet 2026). L'élection a lieu en
// avril 2027 : à ce stade, la plupart des programmes détaillés ne sont pas encore
// publiés. Les éléments ci-dessous reflètent des candidatures déclarées et des
// prises de position publiques, sourcées et susceptibles d'évoluer. Chaque point
// porte un lien vers sa source ; l'affichage rappelle leur caractère provisoire.
//
// Un groupe parlementaire n'est pas exactement un parti : on ne renseigne que les
// groupes dont un parti porte une candidature ou une ligne présidentielle claire
// (les groupes « attrape-tout » comme LIOT sont donc volontairement absents).
//
// À RE-SOURCER AVANT PUBLICATION : quelques points de DR, EPR et HOR s'appuient
// sur des agrégateurs (elyseescope.com, candidatspresidentielles2027.fr,
// election-presidentielle-francaise-2027.fr). À confirmer sur des sources
// primaires (LCP, franceinfo, Le Monde…) lors de la relecture.

export interface ProgrammePoint {
  /** Grand thème : Économie, Immigration, Écologie, Institutions… */
  theme: string;
  /** Mesure ou position, formulée de façon factuelle et neutre. */
  texte: string;
  /** URL de la source qui étaye ce point précis. */
  source: string;
}

export interface ProgrammeParti {
  /** Nom du parti (ou de la coalition) derrière le groupe. */
  parti: string;
  /** Candidat·e déclaré·e ou pressenti·e pour 2027. */
  candidat: string;
  /** Statut : « Candidature déclarée », « Désigné(e) par le parti », « Primaire en cours »… */
  statut: string;
  /** Positionnement en une phrase. */
  resume?: string;
  /** Mesures / positions clés, chacune sourcée. */
  points: ProgrammePoint[];
  /** Lien vers le programme ou le site officiel, si publié. */
  sourceProgramme?: string;
  /** Nuance éventuelle (coalition, désignation à venir…). */
  note?: string;
  /** Mois de dernière vérification (AAAA-MM). */
  maj: string;
}

const MAJ = "2026-07";

// Clé = abrégé du groupe (cf. src/lib/figures.ts et src/data/group-logos.json).
export const PROGRAMMES: Record<string, ProgrammeParti> = {
  RN: {
    parti: "Rassemblement National",
    candidat: "Marine Le Pen",
    statut: "Candidature déclarée",
    resume:
      "Droite nationale : priorité nationale, réduction de l'immigration et pouvoir d'achat ; « ticket » annoncé avec Jordan Bardella comme Premier ministre.",
    points: [
      {
        theme: "Immigration",
        texte:
          "Inscrire la « priorité nationale » dans la Constitution pour l'accès aux aides sociales, au logement et à l'emploi ; suppression de l'aide médicale d'État.",
        source: "https://election-presidentielle-francaise-2027.fr/marine-le-pen/",
      },
      {
        theme: "Fiscalité",
        texte:
          "Baisse de la TVA de 20 % à 5,5 % sur les carburants, l'électricité, le gaz et le fioul domestique.",
        source:
          "https://www.institutmontaigne.org/expressions/les-quatre-points-retenir-du-programme-de-marine-le-pen",
      },
      {
        theme: "Social",
        texte:
          "Refus de tout recul de l'âge de départ à la retraite et réindexation des pensions sur l'inflation.",
        source:
          "https://www.institutmontaigne.org/expressions/les-quatre-points-retenir-du-programme-de-marine-le-pen",
      },
    ],
    note: "Programme 2027 non encore publié : positions issues du socle 2022 réactualisé et de déclarations récentes.",
    maj: MAJ,
  },

  UDR: {
    parti: "Union des droites pour la République",
    candidat: "Pas de candidat propre",
    statut: "Soutient le Rassemblement National",
    resume:
      "Formation de droite née d'une scission avec Les Républicains, en alliance électorale avec le Rassemblement National.",
    points: [
      {
        theme: "Institutions",
        texte:
          "Ligne d'« union des droites » : alliance avec le RN plutôt qu'une candidature autonome pour 2027.",
        source:
          "https://www.publicsenat.fr/actualites/politique/alliance-ciotti-bardella-que-sait-on-des-candidats-investis-pour-les-legislatives",
      },
    ],
    note: "Le parti d'Éric Ciotti ne présente pas de candidat propre à mi-2026 ; aucune ligne présidentielle autonome publiée.",
    maj: MAJ,
  },

  "LFI-NFP": {
    parti: "La France insoumise",
    candidat: "Jean-Luc Mélenchon",
    statut: "Candidature déclarée",
    resume:
      "Gauche de rupture : planification écologique, hausse des salaires et VIᵉ République ; quatrième candidature consécutive.",
    points: [
      {
        theme: "Social",
        texte: "Abrogation de la réforme des retraites et retour de l'âge légal à 60 ans (40 annuités).",
        source: "https://melenchon2027.fr/programme2025/livre/chapitre8/s8/",
      },
      {
        theme: "Économie",
        texte: "SMIC porté à 1 600 € nets.",
        source: "https://melenchon2027.fr/programme2025/livre/",
      },
      {
        theme: "Institutions",
        texte: "Convocation d'une Assemblée constituante pour instaurer une VIᵉ République.",
        source: "https://melenchon2027.fr/programme2025/livre/",
      },
      {
        theme: "Écologie",
        texte: "Planification écologique (programme « L'Avenir en commun », 4ᵉ édition).",
        source: "https://melenchon2027.fr/construction-programme/",
      },
    ],
    sourceProgramme: "https://melenchon2027.fr/programme2025/livre/",
    note: "Programme « L'Avenir en commun » actualisé et publié ; refuse toute primaire à gauche.",
    maj: MAJ,
  },

  SOC: {
    parti: "Parti socialiste",
    candidat: "À désigner (primaire)",
    statut: "Primaire fermée (octobre 2026)",
    resume:
      "Parti social-démocrate ; le candidat sera désigné par une primaire fermée du « pôle socialiste ».",
    points: [
      {
        theme: "Désignation",
        texte:
          "Le 9 juillet 2026, les militants ont choisi une primaire « fermée » (55,5 %) réservée aux adhérents, prévue en octobre 2026.",
        source:
          "https://lcp.fr/actualites/presidentielle-le-ps-se-prononce-pour-une-primaire-fermee-un-desaveu-pour-olivier-faure",
      },
      {
        theme: "Prétendants",
        texte:
          "Noms cités pour la primaire : Olivier Faure, Boris Vallaud, Raphaël Glucksmann, Bernard Cazeneuve.",
        source:
          "https://lcp.fr/actualites/presidentielle-2027-la-liste-des-candidats-deja-en-lice-et-des-pretendants-436373",
      },
    ],
    note: "Ni candidat ni programme arrêtés à mi-2026 : la désignation intervient à l'automne 2026.",
    maj: MAJ,
  },

  EcoS: {
    parti: "Les Écologistes",
    candidat: "Marine Tondelier",
    statut: "Désignée par le parti",
    resume: "Écologie politique et justice sociale ; planification de la transition.",
    points: [
      {
        theme: "Institutions",
        texte: "Désignée candidate le 8 décembre 2025 avec 86 % des voix par Les Écologistes.",
        source: "https://fr.wikipedia.org/wiki/%C3%89lection_pr%C3%A9sidentielle_fran%C3%A7aise_de_2027",
      },
      {
        theme: "Écologie",
        texte:
          "Plan de transition avec objectifs contraignants de baisse des émissions, rénovation thermique et développement des renouvelables.",
        source: "https://en.wikipedia.org/wiki/Marine_Tondelier",
      },
    ],
    note: "Programme présidentiel détaillé en construction ; stratégie vis-à-vis d'une primaire de gauche non tranchée.",
    maj: MAJ,
  },

  GDR: {
    parti: "Parti communiste français",
    candidat: "Fabien Roussel (pressenti)",
    statut: "Soumis au vote des militants (septembre 2026)",
    resume:
      "Groupe réunissant le Parti communiste et des élus ultramarins ; le PCF vise une candidature issue de ses rangs.",
    points: [
      {
        theme: "Institutions",
        texte:
          "Fabien Roussel réélu secrétaire national du PCF le 5 juillet 2026 (70,1 %) ; vote des militants sur la candidature le 6 septembre.",
        source:
          "https://www.franceinfo.fr/politique/fabien-roussel/reelu-a-la-tete-du-pcf-fabien-roussel-fait-un-pas-de-plus-vers-sa-candidature-a-la-presidentielle_8094911.html",
      },
      {
        theme: "Stratégie",
        texte: "Le PCF a acté le principe d'une candidature autonome pour 2027, malgré les réserves de LFI.",
        source:
          "https://www.franceinfo.fr/politique/fabien-roussel/reelu-a-la-tete-du-pcf-fabien-roussel-fait-un-pas-de-plus-vers-sa-candidature-a-la-presidentielle_8094911.html",
      },
    ],
    note: "Candidature non encore formellement validée ; les élus ultramarins du groupe ne se rattachent pas à une candidature unique.",
    maj: MAJ,
  },

  DR: {
    parti: "Les Républicains",
    candidat: "Bruno Retailleau",
    statut: "Désigné par le parti (avril 2026)",
    resume:
      "Droite d'ordre : fermeté migratoire, sécurité et réduction des dépenses publiques.",
    points: [
      {
        theme: "Immigration",
        texte:
          "Suppression du droit du sol et conditionnement des prestations sociales à cinq ans de présence et de travail.",
        source:
          "https://www.planet.fr/politique-presidentielle-2027-bruno-retailleau-durcit-sa-ligne-et-prone-la-fin-du-droit-du-sol.2997878.29334.html",
      },
      {
        theme: "Sécurité",
        texte:
          "Création de places de prison, hausse des effectifs de police et de gendarmerie, extension de la vidéosurveillance.",
        source: "https://www.elyseescope.com/questions/programme-retailleau-lr-2027-securite-immigration",
      },
    ],
    note: "Programme de campagne non encore publié : positions issues de déclarations 2026.",
    maj: MAJ,
  },

  EPR: {
    parti: "Renaissance",
    candidat: "Gabriel Attal",
    statut: "Candidature déclarée (mai 2026)",
    resume: "Camp central macroniste ; Attal se pose en candidat d'une recomposition après le macronisme.",
    points: [
      {
        theme: "Institutions",
        texte:
          "Introduction de la proportionnelle aux législatives, recours accru aux référendums et réduction du nombre de parlementaires.",
        source:
          "https://www.publicsenat.fr/actualites/politique/candidature-de-gabriel-attal-pour-2027-on-sy-prepare-il-sy-prepare-depuis-des-annees-explique-franck-riester",
      },
      {
        theme: "Social",
        texte:
          "Réforme systémique des retraites vers un système universel (« un euro cotisé ouvre les mêmes droits »).",
        source: "https://www.candidatspresidentielles2027.fr/candidats/gabriel-attal",
      },
    ],
    note: "Investiture Renaissance non encore acquise (concurrents pressentis) ; programme non publié.",
    maj: MAJ,
  },

  Dem: {
    parti: "Les Démocrates (MoDem)",
    candidat: "Pas de candidat propre",
    statut: "Ne présente pas de candidat",
    resume: "Parti centriste ; son président François Bayrou a renoncé à se présenter en 2027.",
    points: [
      {
        theme: "Institutions",
        texte: "François Bayrou a déclaré ne pas être candidat à la présidentielle 2027.",
        source:
          "https://www.franceinfo.fr/elections/presidentielle/l-ancien-premier-ministre-francois-bayrou-n-est-pas-candidat-a-l-election-presidentielle-de-2027_8054486.html",
      },
    ],
    note: "Aucun candidat MoDem désigné à mi-2026 ; positionnement de soutien au camp central non arrêté.",
    maj: MAJ,
  },

  HOR: {
    parti: "Horizons",
    candidat: "Édouard Philippe",
    statut: "Candidature déclarée",
    resume: "Centre-droit libéral : ordre, réduction de la dette et réformes institutionnelles.",
    points: [
      {
        theme: "Social",
        texte:
          "Ajout d'une part de capitalisation au système de retraite par répartition ; incitations à travailler plus longtemps.",
        source: "https://www.elyseescope.com/candidat/edouard-philippe/retraites",
      },
      {
        theme: "Économie",
        texte:
          "Objectif de déficit public sous 3 % du PIB d'ici 2030 et « règle d'or » budgétaire dans la Constitution.",
        source: "https://www.elyseescope.com/questions/programme-economique-edouard-philippe-2027",
      },
      {
        theme: "Institutions",
        texte: "Dissolution de l'Assemblée à son élection et recours à des référendums.",
        source: "https://www.elyseescope.com/candidat/edouard-philippe/programme-presidentiel-et-methode",
      },
    ],
    note: "Orientations connues via déclarations ; programme costé non encore publié. Points à re-sourcer (agrégateur).",
    maj: MAJ,
  },
};

// Renvoie le programme rattaché à un groupe (par abrégé), s'il en existe un.
export function programmeParti(abrege?: string | null): ProgrammeParti | undefined {
  if (!abrege) return undefined;
  return PROGRAMMES[abrege];
}
