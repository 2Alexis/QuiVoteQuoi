// Présidents de la Ve République — données factuelles curées.
// Indicateurs volontairement qualitatifs (faits marquants) pour éviter des chiffres
// économiques approximatifs. À enrichir avec des sources chiffrées si besoin.

export interface President {
  id: string;
  nom: string;
  parti: string;
  couleur: string;
  debut: string; // ISO
  fin: string | null; // null = en cours
  mandats: number;
  finMandat: string;
  faits: string[];
}

export const PRESIDENTS: President[] = [
  {
    id: "de-gaulle",
    nom: "Charles de Gaulle",
    parti: "UNR / UDR (gaulliste)",
    couleur: "#1B345E",
    debut: "1959-01-08",
    fin: "1969-04-28",
    mandats: 2,
    finMandat: "Démission après l'échec du référendum de 1969",
    faits: [
      "Fondateur de la Ve République (Constitution de 1958)",
      "Élection du président au suffrage universel (référendum de 1962)",
      "Fin de la guerre d'Algérie (accords d'Évian, 1962)",
      "Force de dissuasion nucléaire française",
      "Crise de Mai 68",
    ],
  },
  {
    id: "pompidou",
    nom: "Georges Pompidou",
    parti: "UDR (gaulliste)",
    couleur: "#24507F",
    debut: "1969-06-20",
    fin: "1974-04-02",
    mandats: 1,
    finMandat: "Décès en cours de mandat",
    faits: [
      "Modernisation industrielle et grands travaux",
      "Premier élargissement de la CEE (Royaume-Uni, 1973)",
      "Centre national d'art et de culture (futur Centre Pompidou)",
    ],
  },
  {
    id: "giscard",
    nom: "Valéry Giscard d'Estaing",
    parti: "Républicains indépendants (centre-droit)",
    couleur: "#4C7FBF",
    debut: "1974-05-27",
    fin: "1981-05-21",
    mandats: 1,
    finMandat: "Battu par F. Mitterrand en 1981",
    faits: [
      "Majorité à 18 ans",
      "Légalisation de l'IVG (loi Veil, 1975)",
      "Divorce par consentement mutuel",
      "Création du Conseil européen et du G7",
    ],
  },
  {
    id: "mitterrand",
    nom: "François Mitterrand",
    parti: "Parti socialiste",
    couleur: "#E5567A",
    debut: "1981-05-21",
    fin: "1995-05-17",
    mandats: 2,
    finMandat: "Ne se représente pas (fin du 2e mandat)",
    faits: [
      "Abolition de la peine de mort (1981)",
      "Nationalisations puis tournant de la rigueur (1983)",
      "Retraite à 60 ans, semaine de 39h, 5e semaine de congés",
      "Deux cohabitations (1986-88, 1993-95)",
      "Traité de Maastricht (1992)",
    ],
  },
  {
    id: "chirac",
    nom: "Jacques Chirac",
    parti: "RPR puis UMP (droite)",
    couleur: "#2563AC",
    debut: "1995-05-17",
    fin: "2007-05-16",
    mandats: 2,
    finMandat: "Ne se représente pas",
    faits: [
      "Fin du service militaire (professionnalisation de l'armée)",
      "Passage du septennat au quinquennat (référendum 2000)",
      "Refus de la guerre en Irak (2003)",
      "Reconnaissance de la responsabilité de l'État (Vél d'Hiv)",
      "Réélu en 2002 face à J.-M. Le Pen",
    ],
  },
  {
    id: "sarkozy",
    nom: "Nicolas Sarkozy",
    parti: "UMP (droite)",
    couleur: "#12509E",
    debut: "2007-05-16",
    fin: "2012-05-15",
    mandats: 1,
    finMandat: "Battu par F. Hollande en 2012",
    faits: [
      "Réforme des retraites (âge légal à 62 ans, 2010)",
      "Gestion de la crise financière de 2008",
      "Autonomie des universités (loi LRU)",
      "Retour de la France dans le commandement intégré de l'OTAN",
      "Intervention en Libye (2011)",
    ],
  },
  {
    id: "hollande",
    nom: "François Hollande",
    parti: "Parti socialiste",
    couleur: "#E5567A",
    debut: "2012-05-15",
    fin: "2017-05-14",
    mandats: 1,
    finMandat: "Ne se représente pas",
    faits: [
      "Mariage pour tous (2013)",
      "Attentats de 2015-2016 et état d'urgence",
      "Loi Travail (El Khomri)",
      "COP21 et Accord de Paris (2015)",
      "Crédit d'impôt compétitivité (CICE)",
    ],
  },
  {
    id: "macron",
    nom: "Emmanuel Macron",
    parti: "LREM / Renaissance (centre)",
    couleur: "#E7A100",
    debut: "2017-05-14",
    fin: null,
    mandats: 2,
    finMandat: "En cours (2e mandat depuis 2022)",
    faits: [
      "Réforme du Code du travail (ordonnances 2017)",
      "Suppression de l'ISF, crise des Gilets jaunes",
      "Gestion de la pandémie de Covid-19",
      "Réforme des retraites (49.3, âge à 64 ans, 2023)",
      "Dissolution de l'Assemblée (2024) et majorité relative",
    ],
  },
];

export function dureeAnnees(p: President, asOf?: number): number {
  // `asOf` : instant de référence (timestamp) fourni par le serveur pour les
  // mandats en cours, afin que serveur et client calculent la même valeur
  // (sinon `new Date()` diffère à l'hydratation → mismatch React).
  const fin = p.fin ? new Date(p.fin) : new Date(asOf ?? Date.now());
  const debut = new Date(p.debut);
  return Math.round(((fin.getTime() - debut.getTime()) / (365.25 * 864e5)) * 10) / 10;
}
