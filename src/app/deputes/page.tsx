import Link from "next/link";
import {
  deputes,
  groupes,
  legislatures,
  siegesActuels,
  uidsTitulaires,
  DEFAULT_LEG,
} from "@/lib/db";
import { LegSwitcher } from "@/components/bits";
import { type DeptAgg } from "@/components/FranceMap";
import { FranceMapLazy } from "@/components/FranceMapLazy";
import { DeputeCarte } from "@/components/DeputeCarte";
import { AnciensReste } from "@/components/AnciensReste";
import { groupColor, groupOrder } from "@/lib/ui";
import departementsData from "@/data/departements.json";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Députés",
  description:
    "La liste des députés de l'Assemblée nationale : groupe politique, circonscription, participation et votes de chacun.",
  path: "/deputes",
});

const METRO_CODES = new Set(departementsData.departements.map((d) => d.code));

export default async function DeputesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    g?: string;
    leg?: string;
    dept?: string;
    per?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const search = sp.q?.trim() || undefined;
  const g = sp.g || undefined;
  const leg = sp.leg || DEFAULT_LEG;
  const dept = sp.dept || undefined;
  const list = deputes(search, g, leg, dept);
  const gs = groupes(leg);
  const legs = legislatures();

  // Sépare les mandats en cours (titulaire courant de chaque siège = 577) des
  // anciens députés (remplacés en cours de législature : ministres, démissions,
  // décès…). uidsTitulaires s'appuie sur les dates de mandat officielles.
  const titulaires = uidsTitulaires(leg);
  const actifs = list.filter((d) => titulaires.has(d.uid));
  const anciens = list.filter((d) => !titulaires.has(d.uid));
  const ANCIENS_APERCU = 12;
  const anciensApercu = anciens.slice(0, ANCIENS_APERCU);
  const anciensReste = anciens.slice(ANCIENS_APERCU);
  const isCurrent = leg === DEFAULT_LEG;

  // Pagination des mandats en cours : 30 par page par défaut, au choix 30/60/90.
  const PER_OPTIONS = [30, 60, 90];
  const perParsed = parseInt(sp.per ?? "", 10);
  const per = PER_OPTIONS.includes(perParsed) ? perParsed : 30;
  const totalPages = Math.max(1, Math.ceil(actifs.length / per));
  const page = Math.min(Math.max(1, parseInt(sp.page ?? "", 10) || 1), totalPages);
  const shown = actifs.slice((page - 1) * per, (page - 1) * per + per);
  const pageHref = (over: { per?: number; page?: number }) => {
    const u = new URLSearchParams();
    if (search) u.set("q", search);
    if (g) u.set("g", g);
    u.set("leg", leg);
    if (dept) u.set("dept", dept);
    const p = over.per ?? per;
    const pg = over.page ?? page;
    if (p !== 30) u.set("per", String(p));
    if (pg > 1) u.set("page", String(pg));
    return `/deputes?${u.toString()}`;
  };

  // Agrégats par département (siège = titulaire actuel), pour colorer la carte.
  const sieges = siegesActuels(leg);
  const acc: Record<string, { nom: string | null; n: number; byGroup: Record<string, number> }> = {};
  for (const s of sieges) {
    const code = s.num_dept ?? "?";
    const t = (acc[code] ??= { nom: s.dept, n: 0, byGroup: {} });
    t.n += 1;
    const key = s.abrege ?? "NI";
    t.byGroup[key] = (t.byGroup[key] ?? 0) + 1;
  }
  const aggregats: Record<string, DeptAgg> = {};
  const outreMer: { code: string; nom: string | null; n: number; abrege: string | null }[] = [];
  for (const [code, t] of Object.entries(acc)) {
    const dom = Object.entries(t.byGroup).sort((a, b) => b[1] - a[1])[0];
    const abrege = dom ? dom[0] : null;
    aggregats[code] = { n: t.n, abrege, libelle: t.nom };
    if (!METRO_CODES.has(code)) outreMer.push({ code, nom: t.nom, n: t.n, abrege });
  }
  outreMer.sort((a, b) => a.code.localeCompare(b.code));
  const selectedNom = dept ? acc[dept]?.nom ?? dept : undefined;

  // Légende : groupes majoritaires effectivement présents sur la carte.
  const libelleParAbrege = new Map(gs.map((x) => [x.abrege, x.libelle]));
  const legende = [
    ...new Set(
      Object.values(aggregats)
        .map((a) => a.abrege)
        .filter((x): x is string => !!x)
    ),
  ]
    .sort((a, b) => groupOrder(a) - groupOrder(b))
    .map((ab) => ({ abrege: ab, libelle: libelleParAbrege.get(ab) ?? ab }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Députés</h1>
          <p className="text-sm text-[var(--muted)]">
            {actifs.length} députés {isCurrent ? "en exercice" : "(titulaires du siège)"}
            {anciens.length > 0 && ` · ${anciens.length} anciens`}
          </p>
        </div>
        <LegSwitcher current={leg} base="/deputes" legislatures={legs} />
      </div>

      <form className="flex flex-wrap gap-2" action="/deputes">
        <input type="hidden" name="leg" value={leg} />
        {dept && <input type="hidden" name="dept" value={dept} />}
        <input
          name="q"
          defaultValue={search}
          placeholder="Rechercher un député…"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm outline-none focus:border-[var(--accent)] sm:min-w-56 sm:flex-1"
        />
        <select
          name="g"
          defaultValue={g ?? ""}
          className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm sm:w-auto"
        >
          <option value="">Tous les groupes</option>
          {gs.map((x) => (
            <option key={x.uid} value={x.uid}>
              {x.abrege} — {x.libelle}
            </option>
          ))}
        </select>
        <button className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white sm:w-auto">
          Filtrer
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((d) => (
          <DeputeCarte key={d.uid} d={d} leg={leg} />
        ))}
        {actifs.length === 0 && anciens.length === 0 && (
          <div className="col-span-full p-8 text-center text-sm text-[var(--muted)]">
            Aucun député trouvé.
          </div>
        )}
        {actifs.length === 0 && anciens.length > 0 && (
          <div className="col-span-full p-8 text-center text-sm text-[var(--muted)]">
            Aucun député en exercice pour ce filtre — voir les anciens députés ci-dessous.
          </div>
        )}
      </div>

      {actifs.length > 0 && (
        <div className="flex flex-col items-center gap-3 pt-1 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <span>Par page&nbsp;:</span>
            {PER_OPTIONS.map((n) => (
              <Link
                key={n}
                href={pageHref({ per: n, page: 1 })}
                aria-current={n === per ? "true" : undefined}
                className={`rounded-full border px-2.5 py-1 font-semibold transition-colors ${
                  n === per
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                {n}
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-3 text-sm">
              <Link
                href={pageHref({ page: page - 1 })}
                aria-disabled={page <= 1}
                className={`rounded-lg border border-[var(--border)] px-3 py-1.5 ${
                  page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-[var(--surface)]"
                }`}
              >
                ← Précédent
              </Link>
              <span className="whitespace-nowrap text-[var(--muted)]">
                Page {page} / {totalPages}
              </span>
              <Link
                href={pageHref({ page: page + 1 })}
                aria-disabled={page >= totalPages}
                className={`rounded-lg border border-[var(--border)] px-3 py-1.5 ${
                  page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-[var(--surface)]"
                }`}
              >
                Suivant →
              </Link>
            </div>
          )}
        </div>
      )}

      {anciens.length > 0 && (
        <section className="space-y-3 border-t border-[var(--border)] pt-6">
          <div>
            <h2 className="text-lg font-semibold">
              Anciens députés{isCurrent ? " de la législature" : ""}{" "}
              <span className="text-sm font-normal text-[var(--muted)]">({anciens.length})</span>
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Élus ayant quitté leur siège en cours de {leg}
              <sup>e</sup> législature (nomination au Gouvernement, démission, décès, décision du
              Conseil constitutionnel…). Ils ont été remplacés par leur suppléant ou à la suite
              d’une élection partielle, et n’entrent donc pas dans le décompte des 577 sièges.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {anciensApercu.map((d) => (
              <DeputeCarte key={d.uid} d={d} leg={leg} ancien />
            ))}
          </div>
          <AnciensReste deputes={anciensReste} leg={leg} />
        </section>
      )}

      <section className="card space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Explorez les députés par département</h2>
          {dept && (
            <Link href={`/deputes?leg=${leg}`} className="text-sm link-accent">
              ✕ {selectedNom} — voir tous
            </Link>
          )}
        </div>
        <div className="mx-auto max-w-xl">
          <FranceMapLazy
            width={departementsData.width}
            height={departementsData.height}
            aggregats={aggregats}
            leg={leg}
            selected={dept}
          />
        </div>
        <p className="text-center text-xs text-[var(--muted)]">
          Chaque département est coloré selon le groupe majoritaire de ses députés. Cliquez pour
          filtrer la liste.
        </p>
        {legende.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Groupe majoritaire par département
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-3">
              {legende.map((l) => (
                <div
                  key={l.abrege}
                  title={l.libelle}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: groupColor(l.abrege) }}
                  />
                  <span className="shrink-0 font-semibold">{l.abrege}</span>
                  <span className="truncate text-[var(--muted)]">{l.libelle}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {outreMer.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            <span className="self-center text-xs text-[var(--muted)]">Outre-mer &amp; autres :</span>
            {outreMer.map((o) => (
              <Link
                key={o.code}
                href={`/deputes?leg=${leg}&dept=${o.code}`}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  dept === o.code
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
                }`}
              >
                {o.nom} · {o.n}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
