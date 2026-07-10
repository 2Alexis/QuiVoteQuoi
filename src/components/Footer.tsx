import Link from "next/link";

// Colonnes de liens du pied de page. Les liens internes utilisent <Link>,
// les liens externes un <a> classique (nouvel onglet + rel de sécurité).
const NAVIGATION = [
  { href: "/", label: "Accueil" },
  { href: "/scrutins", label: "Scrutins" },
  { href: "/deputes", label: "Députés" },
  { href: "/groupes", label: "Groupes" },
  { href: "/comparateur", label: "Comparateur" },
];

const INFORMATIONS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/conditions-utilisation", label: "Conditions d’utilisation" },
];

const RESSOURCES = [
  { href: "https://data.assemblee-nationale.fr/", label: "Open data de l’Assemblée" },
  {
    href: "https://www.etalab.gouv.fr/licence-ouverte-open-licence/",
    label: "Licence Ouverte Etalab",
  },
  { href: "https://github.com/2Alexis/QuiVoteQuoi", label: "Code source (GitHub)" },
];

function InternalLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {links.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className="text-[var(--muted)] transition-colors hover:text-[var(--accent)]">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ExternalLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {links.map((l) => (
        <li key={l.href}>
          <a
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
          >
            {l.label} <span aria-hidden>↗</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function Footer() {
  // Année du copyright. En rendu serveur (build pour les pages statiques,
  // requête pour les dynamiques) : pas de risque d'écart d'hydratation.
  // eslint-disable-next-line react-hooks/purity
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
                ✓
              </span>
              <span className="text-lg">
                Qui<span className="text-[var(--accent)]">Vote</span>Quoi
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Explorez et comparez les scrutins, les votes, les députés et les groupes de
              l’Assemblée nationale, à partir des données open data officielles.
            </p>
          </div>

          <nav aria-label="Navigation du site">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]">
              Navigation
            </h2>
            <InternalLinks links={NAVIGATION} />
          </nav>

          <nav aria-label="Informations légales">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]">
              Informations
            </h2>
            <InternalLinks links={INFORMATIONS} />
          </nav>

          <nav aria-label="Ressources externes">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]">
              Ressources
            </h2>
            <ExternalLinks links={RESSOURCES} />
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} QuiVoteQuoi · Projet indépendant, non affilié à l’Assemblée nationale.
          </p>
          <p>
            Données :{" "}
            <a
              href="https://data.assemblee-nationale.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--accent)]"
            >
              Assemblée nationale
            </a>{" "}
            — Licence Ouverte Etalab 2.0.
          </p>
        </div>
      </div>
    </footer>
  );
}
