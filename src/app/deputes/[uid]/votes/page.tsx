import Link from "next/link";
import { notFound } from "next/navigation";
import { depute, votesDuDepute, votesDuDeputeCount, allCategories } from "@/lib/db";
import { formatDate, sortBadge, categorieColor } from "@/lib/ui";
import { GroupBadge, CategoriePill, PositionPill, OrientationPill } from "@/components/bits";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;
const POSITIONS = [
  ["", "Tous"],
  ["pour", "Pour"],
  ["contre", "Contre"],
  ["abstention", "Abstention"],
  ["nonvotant", "Non-votant"],
] as const;

export default async function DeputeVotes({
  params,
  searchParams,
}: {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ cat?: string; pos?: string; page?: string }>;
}) {
  const { uid } = await params;
  const { cat, pos, page: pageStr } = await searchParams;
  const d = depute(uid);
  if (!d) notFound();

  const categorie = cat || undefined;
  const position = pos || undefined;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const total = votesDuDeputeCount(uid, { categorie, position });
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const votes = votesDuDepute(uid, {
    categorie,
    position,
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
  });
  const cats = allCategories();

  const href = (o: { cat?: string | null; pos?: string | null; page?: number }) => {
    const u = new URLSearchParams();
    const c = o.cat === undefined ? categorie : o.cat || undefined;
    const p = o.pos === undefined ? position : o.pos || undefined;
    if (c) u.set("cat", c);
    if (p) u.set("pos", p);
    if (o.page && o.page > 1) u.set("page", String(o.page));
    const q = u.toString();
    return q ? `?${q}` : "?";
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/deputes/${uid}`} className="text-sm text-[var(--muted)] link-accent">
          ← {d.prenom} {d.nom}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold">
            Tous les votes · {d.prenom} {d.nom}
          </h1>
          <GroupBadge abrege={d.groupe_abrege} libelle={d.groupe_libelle} uid={d.groupe_uid} />
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {total.toLocaleString("fr-FR")} votes
          {categorie ? ` · ${categorie}` : ""}
          {position ? ` · ${position}` : ""}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={href({ cat: "", page: 1 })}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              !categorie
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
            }`}
          >
            Tous les thèmes
          </Link>
          {cats.map((c) => {
            const active = c === categorie;
            const cc = categorieColor(c);
            return (
              <Link
                key={c}
                href={href({ cat: c, page: 1 })}
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={
                  active
                    ? { background: cc, borderColor: cc, color: "white" }
                    : { borderColor: `${cc}66`, color: cc }
                }
              >
                {c}
              </Link>
            );
          })}
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-[var(--border)] text-xs">
          {POSITIONS.map(([v, label]) => {
            const active = (position ?? "") === v;
            return (
              <Link
                key={v}
                href={href({ pos: v, page: 1 })}
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
            {votes.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-[var(--muted)]">
                  Aucun vote pour ce filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Link
            href={href({ page: page - 1 })}
            aria-disabled={page <= 1}
            className={`rounded-lg border border-[var(--border)] px-3 py-1.5 ${
              page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-[var(--surface)]"
            }`}
          >
            ← Précédent
          </Link>
          <span className="text-[var(--muted)]">
            Page {page} / {pages}
          </span>
          <Link
            href={href({ page: page + 1 })}
            aria-disabled={page >= pages}
            className={`rounded-lg border border-[var(--border)] px-3 py-1.5 ${
              page >= pages ? "pointer-events-none opacity-40" : "hover:bg-[var(--surface)]"
            }`}
          >
            Suivant →
          </Link>
        </div>
      )}
    </div>
  );
}
