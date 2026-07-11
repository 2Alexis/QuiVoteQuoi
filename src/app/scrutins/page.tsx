import Link from "next/link";
import { scrutins, legislatures, categoriesScrutins, DEFAULT_LEG } from "@/lib/db";
import { formatDate, sortBadge, categorieColor } from "@/lib/ui";
import { VoteBar, LegSwitcher, CategoriePill, OrientationPill } from "@/components/bits";
import { ScrutinCard } from "@/components/ScrutinCard";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Scrutins",
  description:
    "Tous les scrutins publics de l'Assemblée nationale : résultat, votes par groupe et orientation gauche-droite.",
  path: "/scrutins",
});

export default async function ScrutinsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    leg?: string;
    cat?: string;
    loi?: string;
    budget?: string;
  }>;
}) {
  const sp = await searchParams;
  const search = sp.q?.trim() || undefined;
  const page = parseInt(sp.page ?? "1", 10) || 1;
  const leg = sp.leg || DEFAULT_LEG;
  const categorie = sp.cat || undefined;
  const loisOnly = sp.loi !== "0";
  const includeBudget = sp.budget !== "0";
  const { rows, total, pages } = scrutins({
    search,
    page,
    perPage: 25,
    leg,
    categorie,
    loisOnly,
    includeBudget,
  });
  const cats = categoriesScrutins(leg);

  const qp = (p: number) => {
    const u = new URLSearchParams();
    u.set("leg", leg);
    if (search) u.set("q", search);
    if (categorie) u.set("cat", categorie);
    if (!loisOnly) u.set("loi", "0");
    if (loisOnly && !includeBudget) u.set("budget", "0");
    if (p > 1) u.set("page", String(p));
    return `?${u.toString()}`;
  };

  const catHref = (c?: string) => {
    const u = new URLSearchParams();
    u.set("leg", leg);
    if (search) u.set("q", search);
    if (c) u.set("cat", c);
    if (!loisOnly) u.set("loi", "0");
    if (loisOnly && !includeBudget) u.set("budget", "0");
    return `?${u.toString()}`;
  };

  const loiHref = (on: boolean) => {
    const u = new URLSearchParams();
    u.set("leg", leg);
    if (search) u.set("q", search);
    if (categorie) u.set("cat", categorie);
    if (on) {
      if (!includeBudget) u.set("budget", "0");
    } else {
      u.set("loi", "0");
    }
    return `?${u.toString()}`;
  };

  const budgetHref = (on: boolean) => {
    const u = new URLSearchParams();
    u.set("leg", leg);
    if (search) u.set("q", search);
    if (categorie) u.set("cat", categorie);
    if (!on) u.set("budget", "0");
    return `?${u.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Scrutins</h1>
          <p className="text-sm text-[var(--muted)]">
            {total.toLocaleString("fr-FR")} {loisOnly ? "lois (vote final)" : "scrutins publics"}
          </p>
        </div>
        <LegSwitcher current={leg} base="/scrutins" legislatures={legislatures()} />
      </div>

      <form className="flex gap-2" action="/scrutins">
        <input type="hidden" name="leg" value={leg} />
        {categorie && <input type="hidden" name="cat" value={categorie} />}
        {!loisOnly && <input type="hidden" name="loi" value="0" />}
        {loisOnly && !includeBudget && <input type="hidden" name="budget" value="0" />}
        <input
          name="q"
          defaultValue={search}
          placeholder="Rechercher un scrutin (loi, amendement, motion…)"
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
          Rechercher
        </button>
      </form>

      <div className="flex items-center gap-3">
        <Link
          href={loiHref(!loisOnly)}
          role="switch"
          aria-checked={loisOnly}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            loisOnly
              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
              : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
          }`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              loisOnly ? "bg-white" : "bg-[var(--muted)]"
            }`}
          />
          Lois uniquement
        </Link>
        {loisOnly ? (
          <>
            <Link
              href={budgetHref(!includeBudget)}
              role="switch"
              aria-checked={includeBudget}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                includeBudget
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  includeBudget ? "bg-white" : "bg-[var(--muted)]"
                }`}
              />
              Inclure le budget
            </Link>
            <span className="text-xs text-[var(--muted)]">
              Ratifications comprises · le budget (PLF/PLFSS) peut être exclu.
            </span>
          </>
        ) : (
          <span className="text-xs text-[var(--muted)]">
            Vote final sur l&apos;ensemble d&apos;un texte — sans amendements, articles ni motions.
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={catHref()}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !categorie
              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
              : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
          }`}
        >
          Toutes
        </Link>
        {cats.map((c) => {
          const active = c.categorie === categorie;
          const color = categorieColor(c.categorie);
          return (
            <Link
              key={c.categorie}
              href={catHref(c.categorie)}
              className="rounded-full border px-3 py-1 text-xs font-medium"
              style={
                active
                  ? { background: color, borderColor: color, color: "white" }
                  : { borderColor: `${color}66`, color }
              }
            >
              {c.categorie} · {c.n}
            </Link>
          );
        })}
      </div>

      <div className="card divide-y divide-[var(--border)]">
        {rows.map((sc) => {
          const b = sortBadge(sc.sort_code);
          return (
            <Link
              key={sc.uid}
              href={`/scrutins/${sc.uid}`}
              className="block p-4 hover:bg-[var(--background)] transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--muted)]">
                  {formatDate(sc.date)} · n°{sc.numero} · {sc.type_vote}
                </span>
                <span className={`badge ${b.cls}`}>{b.label}</span>
              </div>
              <div className="mt-1 flex items-start justify-between gap-3">
                <ScrutinCard titre={sc.titre} className="min-w-0 flex-1" />
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  <CategoriePill categorie={sc.categorie} />
                  <OrientationPill
                    categorie={sc.categorie}
                    orientation={sc.orientation}
                    score={sc.orientation_score}
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="max-w-xs flex-1">
                  <VoteBar
                    pour={sc.pour ?? 0}
                    contre={sc.contre ?? 0}
                    abstention={sc.abstentions ?? 0}
                  />
                </div>
                <span className="whitespace-nowrap text-xs text-[var(--muted)]">
                  {sc.pour} pour · {sc.contre} contre · {sc.abstentions} abst.
                </span>
              </div>
            </Link>
          );
        })}
        {rows.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--muted)]">Aucun scrutin trouvé.</div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Link
            href={qp(page - 1)}
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
            href={qp(page + 1)}
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
