import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/site";
import {
  depute,
  statsDepute,
  votesDuDepute,
  votesDuDeputeCount,
  votesDeputeParCategorie,
  condamnations,
} from "@/lib/db";
import { LEGISLATURE_LABEL, DEFAULT_LEG } from "@/lib/db";
import { formatDate, sortBadge, groupColor, deputePhotoUrl } from "@/lib/ui";
import {
  GroupBadge,
  PositionPill,
  CategorieVotesList,
  CategoriePill,
  OrientationPill,
  Condamnations,
  MetricRing,
} from "@/components/bits";
import { ScrutinCard } from "@/components/ScrutinCard";
import { DeputePhoto } from "@/components/DeputePhoto";

// Fiche d'un député : le rendu ne dépend que de l'uid (aucun searchParams) et les
// données ne bougent qu'au rythme des ingestions (quotidiennes). On met donc la
// page en cache (ISR) et on la revalide en arrière-plan toutes les heures, plutôt
// que de refaire le rendu React + les lectures SQLite à chaque visite.
export const revalidate = 3600;

// On ne prégénère aucune page au build (éviter un build long et une lecture
// SQLite de tous les uid) : en renvoyant une liste vide, Next active le cache
// incrémental (ISR) « à la demande » — la fiche est rendue à la 1re visite puis
// servie depuis le cache, revalidée en arrière-plan selon `revalidate`.
export function generateStaticParams(): { uid: string }[] {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uid: string }>;
}): Promise<Metadata> {
  const { uid } = await params;
  const d = depute(uid);
  if (!d) return { title: "Député introuvable", robots: { index: false } };
  const nom = `${d.prenom ?? ""} ${d.nom ?? ""}`.trim();
  const fonction = d.civ === "Mme" ? "Députée" : "Député";
  const grp = d.groupe_abrege ? ` (${d.groupe_abrege})` : "";
  const desc = `${fonction}${
    d.groupe_libelle ? ` du groupe ${d.groupe_libelle}` : " à l'Assemblée nationale"
  }. Votes, participation, loyauté, orientation et comparaisons de ${nom}.`;
  return pageMeta({ title: `${nom}${grp}`, description: desc, path: `/deputes/${uid}` });
}

export default async function DeputeDetail({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const d = depute(uid);
  if (!d) notFound();
  const leg = d.mandats[0]?.legislature ?? DEFAULT_LEG;
  const stats = statsDepute(uid);
  const VOTES_APERCU = 20;
  const votes = votesDuDepute(uid, VOTES_APERCU);
  const votesTotal = votesDuDeputeCount(uid);
  const parCategorie = votesDeputeParCategorie(uid);
  const condamne = condamnations(uid);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/deputes" className="text-sm text-[var(--muted)] link-accent">
          ← Députés
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
          <DeputePhoto
            src={deputePhotoUrl(uid, leg)}
            prenom={d.prenom}
            nom={d.nom}
            color={groupColor(d.groupe_abrege)}
            size={96}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">
                {d.civ} {d.prenom} {d.nom}
              </h1>
              <GroupBadge
                abrege={d.groupe_abrege}
                libelle={d.groupe_libelle}
                uid={d.groupe_uid}
                size="md"
              />
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {d.dept
                ? `${d.dept} · ${d.num_circo}e circonscription`
                : "Circonscription non renseignée"}
              {d.profession ? ` · ${d.profession}` : ""}
            </p>
          </div>
        </div>
      </div>

      <Condamnations items={condamne} />

      {stats.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Aucune statistique de vote disponible.</p>
      ) : (
        stats.map((s) => (
          <section key={s.legislature} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {LEGISLATURE_LABEL[s.legislature] ?? `Législature ${s.legislature}`}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <MetricRing
                label="Participation"
                value={s.participation}
                hint={`${s.n_exprime} votes exprimés sur ${s.n_concerne} scrutins`}
              />
              <MetricRing
                label="Loyauté au groupe"
                value={s.loyaute}
                hint={`Suit la position majoritaire de son groupe (${s.n_loyal}/${s.n_loyal_denom})`}
              />
              <MetricRing
                label="Alignement présidentiel"
                value={s.align}
                hint={`Vote comme le bloc présidentiel (${s.n_align}/${s.n_align_denom})`}
              />
              <MetricRing
                label="Alignement (votes clivants)"
                value={s.alignClivant}
                hint={`Hors votes quasi-unanimes (${s.n_align_cliv}/${s.n_align_cliv_denom})`}
              />
            </div>
            {(() => {
              const cats = parCategorie.filter((c) => c.legislature === s.legislature);
              if (cats.length === 0) return null;
              return (
                <div className="card p-5">
                  <div className="mb-3 text-sm font-semibold">Votes par thème</div>
                  <CategorieVotesList rows={cats} />
                </div>
              );
            })()}
          </section>
        ))
      )}

      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold">Votes récents</h2>
          <Link href={`/deputes/${uid}/votes`} className="text-sm link-accent">
            Voir tous les votes (par thème) →
          </Link>
        </div>
        <div className="card overflow-hidden">
          <div className="divide-y divide-[var(--border)]">
            {votes.map((v) => {
              const b = sortBadge(v.sort_code);
              return (
                <Link
                  key={v.uid}
                  href={`/scrutins/${v.uid}`}
                  className="block p-4 transition-colors hover:bg-[var(--background)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-[var(--muted)]">{formatDate(v.date)}</span>
                    <span className={`badge ${b.cls}`}>{b.label}</span>
                  </div>
                  <div className="mt-1 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <ScrutinCard titre={v.titre} className="min-w-0 flex-1" />
                    <div className="flex flex-wrap gap-1 sm:shrink-0 sm:justify-end">
                      <CategoriePill categorie={v.categorie} />
                      <OrientationPill
                        categorie={v.categorie}
                        orientation={v.orientation}
                        score={v.orientation_score}
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
                    <span>Son vote :</span>
                    <PositionPill position={v.position} />
                  </div>
                </Link>
              );
            })}
          </div>
          {votesTotal > votes.length && (
            <div className="border-t border-[var(--border)] p-3 text-center text-xs text-[var(--muted)]">
              Aperçu des {votes.length} plus récents ·{" "}
              <Link href={`/deputes/${uid}/votes`} className="link-accent font-medium">
                voir les {votesTotal.toLocaleString("fr-FR")} votes →
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
