import Link from "next/link";
import { deputes, groupes, legislatures, siegesActuels, DEFAULT_LEG } from "@/lib/db";
import { GroupBadge, LegSwitcher } from "@/components/bits";
import { FranceMap, type DeptAgg } from "@/components/FranceMap";
import { DeputePhoto } from "@/components/DeputePhoto";
import { deputePhotoUrl, groupColor, groupOrder } from "@/lib/ui";
import departementsData from "@/data/departements.json";

export const dynamic = "force-dynamic";

const METRO_CODES = new Set(departementsData.departements.map((d) => d.code));

export default async function DeputesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; g?: string; leg?: string; dept?: string; show?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.q?.trim() || undefined;
  const g = sp.g || undefined;
  const leg = sp.leg || DEFAULT_LEG;
  const dept = sp.dept || undefined;
  const list = deputes(search, g, leg, dept);
  const gs = groupes(leg);

  const PAGE = 60;
  const show = Math.max(PAGE, parseInt(sp.show ?? "", 10) || PAGE);
  const shown = list.slice(0, show);
  const moreHref = () => {
    const u = new URLSearchParams();
    if (search) u.set("q", search);
    if (g) u.set("g", g);
    u.set("leg", leg);
    if (dept) u.set("dept", dept);
    u.set("show", String(show + PAGE));
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
          <p className="text-sm text-[var(--muted)]">{list.length} députés</p>
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
          <Link
            key={d.uid}
            href={`/deputes/${d.uid}`}
            className="card flex flex-col items-center gap-2 p-4 text-center transition-shadow hover:shadow-sm"
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
          </Link>
        ))}
        {list.length === 0 && (
          <div className="col-span-full p-8 text-center text-sm text-[var(--muted)]">
            Aucun député trouvé.
          </div>
        )}
      </div>

      {list.length > shown.length && (
        <div className="flex flex-col items-center gap-2 pt-1">
          <Link
            href={moreHref()}
            className="rounded-lg border border-[var(--border)] px-5 py-2 text-sm font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Voir plus
          </Link>
          <span className="text-xs text-[var(--muted)]">
            {shown.length} sur {list.length} députés
          </span>
        </div>
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
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {legende.map((l) => (
              <span key={l.abrege} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: groupColor(l.abrege) }}
                />
                <span className="font-medium">{l.abrege}</span>
                <span className="text-[var(--muted)]">{l.libelle}</span>
              </span>
            ))}
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
