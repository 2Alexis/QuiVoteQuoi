import Link from "next/link";
import { notFound } from "next/navigation";
import {
  groupe,
  deputesDuGroupe,
  votesGroupeParCategorie,
  scrutinsDuGroupe,
  scrutinsDuGroupeCount,
  accordsDuGroupe,
  legislatureDuGroupe,
  condamnationsDuGroupe,
} from "@/lib/db";
import { formatDate } from "@/lib/ui";
import {
  CategorieVotesList,
  CategoriePill,
  PositionPill,
  OrientationPill,
  GroupeAccords,
  CondamnationsGroupe,
} from "@/components/bits";
import { GroupLogo } from "@/components/GroupLogo";

export const dynamic = "force-dynamic";

const POSITIONS = [
  ["", "Tous"],
  ["pour", "Pour"],
  ["contre", "Contre"],
  ["abstention", "Abstention"],
] as const;

export default async function GroupeDetail({
  params,
  searchParams,
}: {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ pos?: string }>;
}) {
  const { uid } = await params;
  const { pos } = await searchParams;
  const g = groupe(uid);
  if (!g) notFound();
  const leg = legislatureDuGroupe(uid);
  const membres = deputesDuGroupe(uid);
  const parCategorie = votesGroupeParCategorie(uid);
  const SCRUTINS_APERCU = 20;
  const scrutinsList = scrutinsDuGroupe(uid, { position: pos || undefined, limit: SCRUTINS_APERCU });
  const scrutinsTotal = scrutinsDuGroupeCount(uid, { position: pos || undefined });
  const accords = accordsDuGroupe(uid, leg);
  const condamnes = condamnationsDuGroupe(uid);

  const MEMBRES_APERCU = 12;
  const membresApercu = membres.slice(0, MEMBRES_APERCU);
  const membresReste = membres.slice(MEMBRES_APERCU);
  const MemberCard = (d: (typeof membres)[number]) => (
    <Link
      key={d.uid}
      href={`/deputes/${d.uid}`}
      className="card flex items-center justify-between gap-2 p-3 hover:shadow-sm"
    >
      <span className="truncate text-sm font-medium">
        {d.prenom} {d.nom}
      </span>
      <span className="whitespace-nowrap text-xs text-[var(--muted)]">{d.num_dept ?? "—"}</span>
    </Link>
  );

  return (
    <div className="space-y-8">
      <div>
        <Link href="/groupes" className="text-sm text-[var(--muted)] link-accent">
          ← Groupes
        </Link>
        <div className="mt-3 flex items-center gap-4">
          <GroupLogo abrege={g.abrege} libelle={g.libelle} size={64} radius="1rem" />
          <div>
            <h1 className="text-2xl font-bold">{g.libelle}</h1>
            <p className="text-sm text-[var(--muted)]">
              {membres.length} députés · depuis le {formatDate(g.date_debut)}
            </p>
          </div>
        </div>
      </div>

      {parCategorie.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Profil de vote par thème</h2>
            <p className="text-sm text-[var(--muted)]">
              Position majoritaire du groupe selon le type de texte.
            </p>
          </div>
          <div className="card p-5">
            <CategorieVotesList rows={parCategorie} />
          </div>
        </section>
      )}

      {accords.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Avec qui vote ce groupe ?</h2>
            <p className="text-sm text-[var(--muted)]">
              Blocs et alliances : qui vote dans le même sens, qui s&apos;oppose.
            </p>
          </div>
          <div className="card p-5">
            <GroupeAccords abrege={g.abrege} accords={accords} />
          </div>
        </section>
      )}

      <CondamnationsGroupe membres={condamnes} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold">Scrutins &amp; position du groupe</h2>
            <Link href={`/groupes/${uid}/votes`} className="text-sm link-accent">
              Voir tous les votes (par thème) →
            </Link>
          </div>
          <div className="inline-flex overflow-hidden rounded-lg border border-[var(--border)] text-xs">
            {POSITIONS.map(([v, label]) => {
              const active = (pos ?? "") === v;
              return (
                <Link
                  key={v}
                  href={v ? `?pos=${v}` : "?"}
                  className={`px-3 py-1.5 font-medium ${
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="card overflow-hidden">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Scrutin</th>
                <th>Thème</th>
                <th>Orientation</th>
                <th>Position</th>
                <th className="text-right">P / C / A</th>
              </tr>
            </thead>
            <tbody>
              {scrutinsList.map((s) => (
                <tr key={s.uid}>
                  <td className="whitespace-nowrap text-[var(--muted)]">{formatDate(s.date)}</td>
                  <td>
                    <Link href={`/scrutins/${s.uid}`} className="link-accent">
                      {s.titre}
                    </Link>
                  </td>
                  <td>
                    <CategoriePill categorie={s.categorie} />
                  </td>
                  <td>
                    <OrientationPill
                      categorie={s.categorie}
                      orientation={s.orientation}
                      score={s.orientation_score}
                    />
                  </td>
                  <td>
                    <PositionPill position={s.majorite} />
                  </td>
                  <td className="whitespace-nowrap text-right text-xs text-[var(--muted)]">
                    {s.pour} / {s.contre} / {s.abstention}
                  </td>
                </tr>
              ))}
              {scrutinsList.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-[var(--muted)]">
                    Aucun scrutin pour ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {scrutinsTotal > scrutinsList.length && (
            <div className="border-t border-[var(--border)] p-3 text-center text-xs text-[var(--muted)]">
              Aperçu des {scrutinsList.length} plus récents ·{" "}
              <Link href={`/groupes/${uid}/votes`} className="link-accent font-medium">
                voir les {scrutinsTotal.toLocaleString("fr-FR")} scrutins →
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Membres · {membres.length}</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {membresApercu.map((d) => MemberCard(d))}
        </div>
        {membresReste.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer list-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-center text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
              <span className="group-open:hidden">
                Voir les {membresReste.length} autres membres ▾
              </span>
              <span className="hidden group-open:inline">Réduire ▴</span>
            </summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {membresReste.map((d) => MemberCard(d))}
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
