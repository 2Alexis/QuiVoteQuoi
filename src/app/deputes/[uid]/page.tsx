import Link from "next/link";
import { notFound } from "next/navigation";
import {
  depute,
  statsDepute,
  votesDuDepute,
  votesDuDeputeCount,
  votesDeputeParCategorie,
  condamnations,
} from "@/lib/db";
import { LEGISLATURE_LABEL } from "@/lib/db";
import { formatDate, sortBadge } from "@/lib/ui";
import {
  GroupBadge,
  PositionPill,
  CategorieVotesList,
  CategoriePill,
  OrientationPill,
  Condamnations,
} from "@/components/bits";

export const dynamic = "force-dynamic";

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;

function MetricBar({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="card p-4">
      <div className="stat-num text-2xl font-bold">{pctFmt(value)}</div>
      <div className="text-xs font-medium">{label}</div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-[var(--border)]">
        <div
          className="h-full rounded bg-[var(--accent)]"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <div className="mt-1 text-[11px] text-[var(--muted)]">{hint}</div>
    </div>
  );
}

export default async function DeputeDetail({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const d = depute(uid);
  if (!d) notFound();
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
        <div className="mt-3 flex flex-wrap items-center gap-3">
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
          {d.dept ? `${d.dept} · ${d.num_circo}e circonscription` : "Circonscription non renseignée"}
          {d.profession ? ` · ${d.profession}` : ""}
        </p>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MetricBar
                label="Participation"
                value={s.participation}
                hint={`${s.n_exprime} votes exprimés sur ${s.n_concerne} scrutins`}
              />
              <MetricBar
                label="Loyauté au groupe"
                value={s.loyaute}
                hint={`Suit la position majoritaire de son groupe (${s.n_loyal}/${s.n_loyal_denom})`}
              />
              <MetricBar
                label="Alignement présidentiel"
                value={s.align}
                hint={`Vote comme le bloc présidentiel (${s.n_align}/${s.n_align_denom})`}
              />
              <MetricBar
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
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Scrutin</th>
                <th>Thème</th>
                <th>Orientation</th>
                <th>Résultat</th>
                <th>Vote</th>
              </tr>
            </thead>
            <tbody>
              {votes.map((v) => {
                const b = sortBadge(v.sort_code);
                return (
                  <tr key={v.uid}>
                    <td className="whitespace-nowrap text-[var(--muted)]">{formatDate(v.date)}</td>
                    <td>
                      <Link href={`/scrutins/${v.uid}`} className="link-accent">
                        {v.titre}
                      </Link>
                    </td>
                    <td>
                      <CategoriePill categorie={v.categorie} />
                    </td>
                    <td>
                      <OrientationPill
                        categorie={v.categorie}
                        orientation={v.orientation}
                        score={v.orientation_score}
                      />
                    </td>
                    <td>
                      <span className={`badge ${b.cls}`}>{b.label}</span>
                    </td>
                    <td>
                      <PositionPill position={v.position} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
