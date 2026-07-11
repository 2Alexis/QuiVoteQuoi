import Link from "next/link";
import { deputes, groupes, legislatures, siegesActuels, uidsTitulaires, DEFAULT_LEG, type Depute } from "@/lib/db";
import { GroupBadge, LegSwitcher } from "@/components/bits";
import { FranceMap, type DeptAgg } from "@/components/FranceMap";
import { DeputePhoto } from "@/components/DeputePhoto";
import { deputePhotoUrl, groupColor, groupOrder } from "@/lib/ui";
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

// Étiquette courte pour le motif de fin de mandat d'un ancien député.
function causeCourte(cause: string | null | undefined): string | null {
  if (!cause) return null;
  const c = cause.toLowerCase();
  if (c.includes("gouvernement") && c.includes("nomination")) return "Entré·e au Gouvernement";
  if (c.includes("reprise")) return "Remplacé·e (retour d’un ministre)";
  if (c.includes("incompatibilit")) return "Incompatibilité (cumul)";
  if (c.includes("annulation")) return "Élection annulée";
  if (c.includes("conseil constitutionnel")) return "Décision du Conseil const.";
  if (c.includes("décès") || c.includes("deces")) return "Décès";
  if (c.includes("mission")) return "Mission temporaire";
  if (c.includes("démission") || c.includes("demission")) return "Démission";
  return cause;
}

// Carte d'un député, réutilisée pour les mandats en cours et les anciens députés.
function DeputeCarte({ d, leg, ancien }: { d: Depute; leg: string; ancien?: boolean }) {
  const cause = ancien ? causeCourte(d.cause_fin) : null;
  return (
    <Link
      href={`/deputes/${d.uid}`}
      className={`card flex flex-col items-center gap-2 p-4 text-center transition hover:scale-[1.02] hover:shadow-sm ${
        ancien ? "opacity-90" : ""
      }`}
      style={{ borderTop: `3px solid ${groupColor(d.groupe_abrege)}` }}
    >
      <DeputePhoto
        src={deputePhotoUrl(d.uid, leg)}
        prenom={d.prenom}
        nom={d.nom}
        color={groupColor(d.groupe_abrege)}
        size={88}
      />
      <div className="font-semibold leading-tight">
        {d.prenom} {d.nom}
      </div>
      <div className="text-xs text-[var(--muted)]">
        {d.dept ? `${d.dept} · circo. ${d.num_circo}` : "—"}
      </div>
      <GroupBadge abrege={d.groupe_abrege} libelle={d.groupe_libelle} />
      {cause && (
        <span className="mt-0.5 rounded-full bg-[var(--border)]/60 px-2 py-0.5 text-[11px] text-[var(--muted)]">
          {cause}
        </span>
      )}
    </Link>
  );
}

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
        <LegSwitcher current={leg} base="/deputes" legislatures={legislatures()} />
      </div>

      <form className="flex flex-wrap gap-2" action="/deputes">
        <input type="hidden" name="leg" value={leg} />
        {dept && <input type="hidden" name="dept" value={dept} />}
        <input
          name="q"
          defaultValue={search}
          placeholder="Rechercher un député…"
          className="min-w-56 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <select
          name="g"
          defaultValue={g ?? ""}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        >
          <option value="">Tous les groupes</option>
          {gs.map((x) => (
            <option key={x.uid} value={x.uid}>
              {x.abrege} — {x.libelle}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
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
          {anciensReste.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-center text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
                <span className="group-open:hidden">
                  Voir les {anciensReste.length} autres anciens députés ▾
                </span>
                <span className="hidden group-open:inline">Réduire ▴</span>
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {anciensReste.map((d) => (
                  <DeputeCarte key={d.uid} d={d} leg={leg} ancien />
                ))}
              </div>
            </details>
          )}
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
          <FranceMap aggregats={aggregats} leg={leg} selected={dept} />
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
            <div className="flex flex-wrap justify-center gap-1.5">
              {legende.map((l) => (
                <span
                  key={l.abrege}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: groupColor(l.abrege) }}
                  />
                  <span className="font-semibold">{l.abrege}</span>
                  <span className="text-[var(--muted)]">{l.libelle}</span>
                </span>
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
