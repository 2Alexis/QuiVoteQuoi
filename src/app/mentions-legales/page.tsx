import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales — QuiVoteQuoi",
  description:
    "Mentions légales du site QuiVoteQuoi : éditeur, hébergeur, sources des données et propriété intellectuelle.",
};

export default function MentionsLegalesPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Mentions légales</h1>
        <p className="text-sm text-[var(--muted)]">Dernière mise à jour : juillet 2026</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Éditeur du site</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Le site <strong>QuiVoteQuoi</strong> est édité à titre personnel et non commercial par
          Alexis Clerc. Contact :{" "}
          <a href="mailto:alexisclerc22@gmail.com" className="text-[var(--accent)] hover:underline">
            alexisclerc22@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Directeur de la publication</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Alexis Clerc, en sa qualité d’éditeur du site.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Hébergement</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Le site est hébergé par <strong>Render Services, Inc.</strong>, San Francisco,
          Californie (États-Unis) —{" "}
          <a
            href="https://render.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            render.com
          </a>
          . Le code source et le fichier de données sont hébergés sur GitHub, Inc. —{" "}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            github.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Sources des données</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Les données relatives aux scrutins, aux votes, aux députés et aux groupes proviennent de
          l’open data officiel de l’Assemblée nationale (
          <a
            href="https://data.assemblee-nationale.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            data.assemblee-nationale.fr
          </a>
          ), diffusé sous{" "}
          <a
            href="https://www.etalab.gouv.fr/licence-ouverte-open-licence/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            Licence Ouverte / Etalab 2.0
          </a>
          . Les informations relatives à d’éventuelles condamnations sont issues de Wikipédia et
          Wikidata (licences CC BY-SA / CC0). QuiVoteQuoi est un projet indépendant, sans aucune
          affiliation ni validation par l’Assemblée nationale.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Propriété intellectuelle</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Le code source du site est publié sous licence libre (voir le dépôt GitHub). La
          présentation, les visualisations et les textes rédigés pour le site restent la propriété
          de leur auteur. Les données publiques sous-jacentes demeurent régies par leurs licences
          respectives mentionnées ci-dessus.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Pour toute question, signalement d’erreur ou demande concernant vos données, écrivez à{" "}
          <a href="mailto:alexisclerc22@gmail.com" className="text-[var(--accent)] hover:underline">
            alexisclerc22@gmail.com
          </a>
          .
        </p>
      </section>

      <p className="pt-4 text-sm">
        <Link href="/conditions-utilisation" className="text-[var(--accent)] hover:underline">
          Consulter les conditions d’utilisation →
        </Link>
      </p>
    </article>
  );
}
