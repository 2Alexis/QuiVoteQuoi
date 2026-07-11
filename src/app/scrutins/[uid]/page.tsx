import Link from "next/link";
import { notFound } from "next/navigation";
import { scrutin, ventilationScrutin, votesNominatifsScrutin } from "@/lib/db";
import { formatDate, sortBadge, POSITION_COLOR, scrutinUrlOfficiel } from "@/lib/ui";
import { GroupBadge, VoteBar, CategoriePill, OrientationPill, HemicycleVote } from "@/components/bits";
import { ScrutinCard } from "@/components/ScrutinCard";
import { parseScrutin } from "@/lib/parseScrutin";
import { pageMeta } from "@/lib/site";
import type { Metadata } from "next";

// Détail d'un scrutin : le rendu ne dépend que de l'uid (aucun searchParams) et
// les données ne bougent qu'au rythme des ingestions (quotidiennes). On met donc
// la page en cache (ISR) et on la revalide en arrière-plan toutes les heures,
// plutôt que de refaire le rendu React + les lectures SQLite à chaque visite.
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
  const sc = scrutin(uid);
  if (!sc) return { title: "Scrutin introuvable", robots: { index: false } };
  const p = parseScrutin(sc.titre);
  const label = p.loi ? `${p.type} · ${p.loi}` : p.action ?? sc.titre ?? `Scrutin n°${sc.numero}`;
  const titre = `Scrutin n°${sc.numero} — ${label}`.slice(0, 110);
  const desc = `${formatDate(sc.date)} · ${sortBadge(sc.sort_code).label}. ${sc.pour ?? 0} pour, ${
    sc.contre ?? 0
  } contre, ${sc.abstentions ?? 0} abstention. ${sc.titre ?? ""}`
    .trim()
    .slice(0, 300);
  return pageMeta({ title: titre, description: desc, path: `/scrutins/${uid}` });
}

export default async function ScrutinDetail({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const sc = scrutin(uid);
  if (!sc) notFound();
  const vent = ventilationScrutin(uid);
  const nominatifs = votesNominatifsScrutin(uid);
  const b = sortBadge(sc.sort_code);

  const byDep = new Map(nominatifs.map((n) => [n.acteur_uid, n]));
  void byDep;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/scrutins" className="text-sm text-[var(--muted)] link-accent">
          ← Scrutins
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <span>{formatDate(sc.date)}</span>
          <span>·</span>
          <span>n°{sc.numero}</span>
          <span>·</span>
          <span>{sc.type_vote}</span>
          <span className={`badge ${b.cls}`}>{b.label}</span>
          {sc.categorie && (
            <Link href={`/scrutins?leg=${sc.legislature}&cat=${encodeURIComponent(sc.categorie)}`}>
              <CategoriePill categorie={sc.categorie} />
            </Link>
          )}
          <OrientationPill
            categorie={sc.categorie}
            orientation={sc.orientation}
            score={sc.orientation_score}
          />
        </div>
        <ScrutinCard titre={sc.titre} as="h1" size="lg" className="mt-2" />
        {sc.demandeur && (
          <p className="mt-1 text-sm text-[var(--muted)]">Demandé par {sc.demandeur}</p>
        )}
        <a
          href={scrutinUrlOfficiel(sc.legislature, sc.numero)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium link-accent"
        >
          Voir le détail officiel du scrutin et le texte de loi
          <span aria-hidden>↗</span>
        </a>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center gap-4">
          <VoteBar
            pour={sc.pour ?? 0}
            contre={sc.contre ?? 0}
            abstention={sc.abstentions ?? 0}
            nonvotant={sc.non_votants ?? 0}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Pour", sc.pour, POSITION_COLOR.pour],
            ["Contre", sc.contre, POSITION_COLOR.contre],
            ["Abstention", sc.abstentions, POSITION_COLOR.abstention],
            ["Non-votants", sc.non_votants, POSITION_COLOR.nonvotant],
          ].map(([l, v, c]) => (
            <div key={l as string}>
              <div className="stat-num text-2xl font-bold" style={{ color: c as string }}>
                {v ?? 0}
              </div>
              <div className="text-xs text-[var(--muted)]">{l as string}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Position des groupes</h2>
        <div className="card p-5">
          <HemicycleVote groupes={vent} />
        </div>
        <div className="card divide-y divide-[var(--border)]">
          {vent.map((g) => {
            const tot = g.pour + g.contre + g.abstention;
            const maj =
              g.pour >= g.contre && g.pour >= g.abstention
                ? "pour"
                : g.contre >= g.abstention
                ? "contre"
                : "abstention";
            return (
              <div key={g.groupe_uid} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <GroupBadge abrege={g.abrege} libelle={g.libelle} uid={g.groupe_uid} />
                    <span className="text-sm text-[var(--muted)] hidden sm:inline">
                      {g.libelle}
                    </span>
                  </div>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: POSITION_COLOR[maj as keyof typeof POSITION_COLOR] }}
                  >
                    majorité {maj}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="max-w-md flex-1">
                    <VoteBar pour={g.pour} contre={g.contre} abstention={g.abstention} />
                  </div>
                  <span className="whitespace-nowrap text-xs text-[var(--muted)]">
                    {g.pour} / {g.contre} / {g.abstention} · {tot} votants
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Votes nominatifs</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {(["pour", "contre", "abstention", "nonvotant"] as const).map((pos) => {
            const list = nominatifs.filter((n) => n.position === pos);
            const labels = {
              pour: "Pour",
              contre: "Contre",
              abstention: "Abstention",
              nonvotant: "Non-votants",
            };
            return (
              <div key={pos} className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: POSITION_COLOR[pos] }}
                    />
                    {labels[pos]}
                  </span>
                  <span className="stat-num text-sm text-[var(--muted)]">{list.length}</span>
                </div>
                <ul className="max-h-72 space-y-0.5 overflow-auto text-sm">
                  {list.map((n) => (
                    <li key={n.acteur_uid}>
                      <Link
                        href={`/deputes/${n.acteur_uid}`}
                        className="flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-[var(--background)]"
                      >
                        <span className="truncate">
                          {n.prenom} {n.nom}
                        </span>
                        <span className="text-xs text-[var(--muted)]">{n.groupe_abrege}</span>
                      </Link>
                    </li>
                  ))}
                  {list.length === 0 && <li className="text-xs text-[var(--muted)]">—</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
