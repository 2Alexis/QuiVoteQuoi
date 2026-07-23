import Link from "next/link";
import { notFound } from "next/navigation";
import { scrutin, ventilationScrutin, votesNominatifsScrutin, debatScrutin } from "@/lib/db";
import { formatDate, sortBadge, POSITION_COLOR, scrutinUrlOfficiel } from "@/lib/ui";
import { GroupBadge, VoteBar, CategoriePill, OrientationPill, HemicycleVote } from "@/components/bits";
import { ScrutinCard } from "@/components/ScrutinCard";
import { ShareButtons } from "@/components/ShareButtons";
import { DebatsSummary } from "@/components/DebatsSummary";
import { parseScrutin } from "@/lib/parseScrutin";
import { getScrutinSummary } from "@/lib/scrutinSummary";
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
  const titre = `${label} — vote n°${sc.numero}`.slice(0, 110);
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
  const debats = debatScrutin(uid);
  const b = sortBadge(sc.sort_code);
  const summary = getScrutinSummary(sc);

  const byDep = new Map(nominatifs.map((n) => [n.acteur_uid, n]));
  void byDep;

  const renderGroupeRow = (g: (typeof vent)[number]) => {
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
            <span className="text-sm text-[var(--muted)] hidden sm:inline">{g.libelle}</span>
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
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/scrutins" className="text-sm text-[var(--muted)] link-accent">
          ← Scrutins
        </Link>
        <p className="mt-2 text-xs text-[var(--muted)]">
          {`${formatDate(sc.date)} · n°${sc.numero} · ${sc.type_vote}`}
        </p>
        <ScrutinCard titre={sc.titre} as="h1" size="lg" className="mt-2" />
        {sc.demandeur && (
          <p className="mt-1 text-sm text-[var(--muted)]">Demandé par {sc.demandeur}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
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

        {summary && (
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Description & Contexte du texte
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)] font-medium">
                <span className="rounded-md bg-[var(--background)] px-2 py-0.5 border border-[var(--border)]">
                  {summary.nature}
                </span>
                <span className="rounded-md bg-[var(--background)] px-2 py-0.5 border border-[var(--border)]">
                  {summary.etape}
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-[var(--foreground)] font-normal">
              {summary.description}
            </p>
          </div>
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
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ShareButtons title={`${sc.titre ?? "Scrutin"} — ${b.label}`} />
          <a
            href={`/scrutins/${uid}/partage`}
            download={`quivotequoi-scrutin-${sc.numero}.png`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            Visuel à partager
          </a>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Résultat du vote</h2>
          <p className="text-sm text-[var(--muted)]">
            Décompte des voix sur l&apos;ensemble des députés.
          </p>
        </div>
        <div className="card p-5">
          <VoteBar
            pour={sc.pour ?? 0}
            contre={sc.contre ?? 0}
            abstention={sc.abstentions ?? 0}
            nonvotant={sc.non_votants ?? 0}
          />
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Pour", sc.pour, POSITION_COLOR.pour],
              ["Contre", sc.contre, POSITION_COLOR.contre],
              ["Abstention", sc.abstentions, POSITION_COLOR.abstention],
              ["Non-votants", sc.non_votants, POSITION_COLOR.nonvotant],
            ].map(([l, v, c]) => (
              <div key={l as string} className="text-center">
                <div className="stat-num text-2xl font-bold" style={{ color: c as string }}>
                  {v ?? 0}
                </div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">{l as string}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Position des groupes</h2>
        <div className="card p-5">
          <HemicycleVote groupes={vent} />
        </div>
        <div className="card divide-y divide-[var(--border)]">
          {vent.slice(0, 3).map(renderGroupeRow)}
          {vent.length > 3 && (
            <details className="group">
              <summary className="cursor-pointer list-none p-4 text-center text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]">
                <span className="group-open:hidden">
                  Voir les {vent.length - 3} autres groupes ▾
                </span>
                <span className="hidden group-open:inline">Réduire ▴</span>
              </summary>
              <div className="divide-y divide-[var(--border)]">
                {vent.slice(3).map(renderGroupeRow)}
              </div>
            </details>
          )}
        </div>
      </section>

      <DebatsSummary initialSummary={debats} scrutinUid={uid} />

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
