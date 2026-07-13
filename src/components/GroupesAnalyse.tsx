import { MdsMap, CohesionInterne, TetesAffiche } from "@/components/GroupeViz";
import type { GroupePos, DeputeFig } from "@/components/GroupeViz";
import { ProfessionsGroupes } from "@/components/bits";
import type { ProfessionsTable } from "@/lib/db";

// Sections analytiques de /groupes (cartographie MDS, cohésion interne, têtes
// d'affiche, CSP). Regroupées ici pour être chargées en différé côté client via
// GroupesAnalyseLazy : la liste des groupes s'affiche tout de suite et ces
// visualisations plus lourdes à rendre arrivent juste après, ce qui réduit le
// temps de rendu serveur (TTFB) de la page. Ne reçoit que des données légères
// (les ~577 députés restent côté serveur, seules les figures retenues passent).
export function GroupesAnalyse({
  positions,
  figures,
  profs,
}: {
  positions: GroupePos[];
  figures: Record<string, DeputeFig[]>;
  profs: ProfessionsTable;
}) {
  return (
    <div className="space-y-6">
      {positions.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-1 text-lg font-semibold">Cartographie des groupes</h2>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Positionnement 2D (MDS) : deux groupes sont proches lorsqu&apos;ils votent de la même
            façon. La taille reflète le nombre de députés.
          </p>
          <MdsMap positions={positions} />
        </section>
      )}

      {positions.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-1 text-lg font-semibold">Cohésion interne</h2>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Part des députés du groupe suivant la position majoritaire, en moyenne sur tous les
            scrutins.
          </p>
          <CohesionInterne positions={positions} />
        </section>
      )}

      {positions.length > 0 && (
        <section className="card space-y-3 p-5">
          <div>
            <h2 className="text-lg font-semibold">Têtes d&apos;affiche</h2>
            <p className="text-xs text-[var(--muted)]">
              Quelques figures connues de chaque groupe (cliquez pour voir leur fiche et leurs
              statistiques de vote).
            </p>
          </div>
          <TetesAffiche positions={positions} figures={figures} />
        </section>
      )}

      {profs.categories.length > 0 && (
        <section className="card space-y-3 p-5">
          <div>
            <h2 className="text-lg font-semibold">Catégories socio-professionnelles</h2>
            <p className="text-sm text-[var(--muted)]">
              Part de chaque catégorie INSEE (dernier métier déclaré) au sein de chaque groupe.
            </p>
          </div>
          <ProfessionsGroupes table={profs} />
          <p className="text-xs text-[var(--muted)]">
            Source : catégorie socio-professionnelle INSEE (famille) des fiches d&apos;acteurs de
            l&apos;Assemblée nationale. Lecture en colonne : chaque pourcentage indique la part des
            députés du groupe relevant de la catégorie.
          </p>
        </section>
      )}
    </div>
  );
}
