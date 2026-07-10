import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions d’utilisation — QuiVoteQuoi",
  description:
    "Conditions d’utilisation du site QuiVoteQuoi : objet, nature des données, absence de garantie, données personnelles et responsabilité.",
};

export default function ConditionsUtilisationPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Conditions d’utilisation</h1>
        <p className="text-sm text-[var(--muted)]">Dernière mise à jour : juillet 2026</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">1. Objet</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          QuiVoteQuoi est un service d’information gratuit qui met en forme et permet de comparer
          des données publiques relatives à l’activité de l’Assemblée nationale française (scrutins,
          votes, députés, groupes). L’utilisation du site implique l’acceptation pleine et entière
          des présentes conditions.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">2. Nature et source des données</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Les données proviennent de l’open data officiel de l’Assemblée nationale, diffusé sous
          Licence Ouverte / Etalab 2.0, ainsi que, pour certaines informations, de Wikipédia et
          Wikidata. Elles sont mises à jour automatiquement et périodiquement. QuiVoteQuoi se limite
          à les agréger, les recalculer et les présenter ; le site ne produit aucune donnée
          officielle et ne se substitue pas aux publications de l’Assemblée nationale.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3. Absence de garantie</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Les informations sont fournies « en l’état », à titre indicatif. Malgré le soin apporté au
          traitement, des erreurs, omissions, retards de mise à jour ou approximations de calcul
          peuvent subsister. Les statistiques dérivées (participation, loyauté, alignement,
          orientation, cohésion, etc.) sont des indicateurs calculés par le site et ne constituent
          pas des données officielles. En cas de doute, seules les sources officielles font foi.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">4. Indépendance</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          QuiVoteQuoi est un projet indépendant, à but non lucratif, sans affiliation, partenariat
          ni approbation de l’Assemblée nationale ou d’une quelconque formation politique. Les choix
          de couleurs associés aux groupes ne servent qu’à représenter des données et ne traduisent
          aucune prise de position.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">5. Données personnelles</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Le site affiche des informations relatives à des personnes exerçant un mandat électif
          public (députés), déjà rendues publiques dans le cadre de l’open data de l’Assemblée
          nationale. Le site ne crée pas de compte utilisateur et ne collecte pas de données
          personnelles de ses visiteurs à des fins commerciales. Conformément au RGPD, toute
          personne concernée peut exercer ses droits d’accès, de rectification ou d’opposition en
          écrivant à l’adresse de contact indiquée dans les{" "}
          <Link href="/mentions-legales" className="text-[var(--accent)] hover:underline">
            mentions légales
          </Link>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">6. Propriété intellectuelle</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Les données publiques réutilisées restent soumises à leurs licences respectives (Licence
          Ouverte Etalab, CC BY-SA, CC0). La mise en forme, les visualisations et les textes
          rédigés pour le site sont protégés ; leur réutilisation est autorisée dans le respect des
          licences applicables et à condition de mentionner la source.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">7. Responsabilité</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          L’éditeur ne saurait être tenu responsable de tout dommage direct ou indirect résultant de
          l’accès au site, de son utilisation ou de l’interprétation des informations qui y sont
          présentées. L’utilisateur est seul responsable de l’usage qu’il fait des données.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">8. Liens externes</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Le site peut renvoyer vers des sites tiers (Assemblée nationale, Etalab, Wikipédia,
          GitHub…). L’éditeur n’exerce aucun contrôle sur ces ressources et décline toute
          responsabilité quant à leur contenu.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">9. Évolution des conditions</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Les présentes conditions peuvent être modifiées à tout moment afin de refléter les
          évolutions du site ou de la réglementation. La version applicable est celle publiée sur
          cette page.
        </p>
      </section>

      <p className="pt-4 text-sm">
        <Link href="/mentions-legales" className="text-[var(--accent)] hover:underline">
          ← Consulter les mentions légales
        </Link>
      </p>
    </article>
  );
}
