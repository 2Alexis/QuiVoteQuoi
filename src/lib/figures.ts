// Figures connues de l'Assemblée, par groupe (abrégé). Sert à la fois aux
// « Têtes d'affiche » de la page Groupes et aux préréglages du Comparateur.
//
// Ces listes sont curatées à la main (notoriété médiatique) puis résolues contre
// les membres RÉELS de la législature choisie : un nom absent de la base pour la
// législature n'apparaît jamais. Le premier nom de chaque groupe est en général
// sa figure de proue (souvent le·la président·e de groupe).
export const TETES_AFFICHE: Record<string, string[]> = {
  RN: ["Marine Le Pen", "Sébastien Chenu", "Jean-Philippe Tanguy", "Laure Lavalette"],
  UDR: ["Éric Ciotti"],
  "LFI-NFP": ["Mathilde Panot", "Éric Coquerel", "Manuel Bompard", "Clémence Guetté"],
  SOC: ["Boris Vallaud", "Olivier Faure", "Jérôme Guedj"],
  EcoS: ["Cyrielle Chatelain", "Sandrine Rousseau"],
  GDR: ["André Chassaigne", "Stéphane Peu"],
  DR: ["Laurent Wauquiez", "Annie Genevard"],
  EPR: ["Gabriel Attal", "Sylvain Maillard", "Aurore Bergé"],
  Dem: ["Jean-Paul Mattei", "Erwan Balanant"],
  HOR: ["Laurent Marcangeli", "Naïma Moutchou"],
  LIOT: ["Charles de Courson", "Bertrand Pancher"],
};

// Normalisation d'un nom pour comparaison tolérante (sans accents ni casse ni
// ponctuation), afin de faire correspondre les libellés curatés aux fiches de la base.
export const normNom = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim();

// Ensemble des noms de figures (toutes appartenances confondues), normalisés :
// permet de tester en O(1) si un député donné est une figure connue.
export const FIGURES_SET: ReadonlySet<string> = new Set(
  Object.values(TETES_AFFICHE).flat().map(normNom)
);
