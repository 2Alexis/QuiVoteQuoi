"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PRESIDENTS, dureeAnnees, type President } from "@/data/presidents";
import { groupColor, ORIENTATION_POLES } from "@/lib/ui";

export interface DeputeCompareC {
  uid: string;
  nom: string;
  prenom: string;
  abrege: string | null;
  groupe_uid: string | null;
  participation: number;
  loyaute: number;
  align: number;
  alignClivant: number;
  n_exprime: number;
}
export interface GroupePositionC {
  uid: string;
  abrege: string | null;
  libelle: string | null;
  n: number;
  cohesion: number;
  x: number;
  y: number;
}
export interface OrientCatC {
  categorie: string;
  gauche: number;
  droite: number;
}
export interface CondamInfo {
  infraction: string;
  date: string | null;
  wikipedia_url: string | null;
  wikidata_qid: string | null;
}
export interface CondamGroupeC {
  uid: string;
  abrege: string | null;
  n_deputes: number;
  n_infractions: number;
}
export interface LegData {
  label: string;
  deputes: DeputeCompareC[];
  positions: GroupePositionC[];
  accord: { a: string; b: string; taux: number }[];
  orientGroupes: Record<string, OrientCatC[]>;
  orientDeputes: Record<string, OrientCatC[]>;
  condamGroupes: CondamGroupeC[];
  condamDeputes: Record<string, CondamInfo[]>;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
type Tab = "presidents" | "deputes" | "groupes";

// Palette neutre (teal ↔ ambre) : deux pôles d'un même axe, sans connotation
// « bien / mal ». Volontairement à l'écart du rouge/bleu politique.
const POLE_G = "#2A9D8F"; // teal (pôle « gauche » du thème)
const POLE_D = "#E0A13C"; // ambre (pôle « droite » du thème)
const POLE_MID = "#E8ECF1"; // gris clair neutre au centre de l'axe

function poles(cat: string): [string, string] {
  return ORIENTATION_POLES[cat] ?? ["Orientation de gauche", "Orientation de droite"];
}

// Part du pôle « droite » (0 = tout à gauche, 1 = tout à droite) ; null si aucune donnée.
function droitePart(r?: OrientCatC): number | null {
  if (!r) return null;
  const t = r.gauche + r.droite;
  return t ? r.droite / t : null;
}

// Profil d'orientation d'une seule entité (un député) : une barre gauche/droite par thème.
// `order` impose la même liste de thèmes, dans le même ordre, sur les deux colonnes,
// pour que les catégories se fassent face. Les thèmes sans données restent affichés (vides).
function OrientationBars({ rows, order }: { rows: OrientCatC[]; order?: string[] }) {
  const byCat = new Map(rows.map((r) => [r.categorie, r]));
  const cats =
    order ?? [...rows].sort((a, b) => b.gauche + b.droite - (a.gauche + a.droite)).map((r) => r.categorie);
  if (cats.length === 0)
    return <p className="text-xs text-[var(--muted)]">Pas assez de votes thématiques marqués.</p>;
  return (
    <div className="space-y-3">
      {cats.map((cat) => {
        const r = byCat.get(cat);
        const dp = droitePart(r);
        const [pg, pd] = poles(cat);
        return (
          <div key={cat}>
            <div className="mb-0.5 text-xs font-medium">{cat}</div>
            {dp == null ? (
              <>
                <div className="h-2 w-full rounded" style={{ background: POLE_MID }} />
                <div className="mt-0.5 text-[10px] text-[var(--muted)]">Pas de vote marqué</div>
              </>
            ) : (
              <>
                <div className="flex h-2 w-full overflow-hidden rounded">
                  <div style={{ width: `${(1 - dp) * 100}%`, background: POLE_G }} />
                  <div style={{ width: `${dp * 100}%`, background: POLE_D }} />
                </div>
                <div className="mt-0.5 flex justify-between text-[10px] text-[var(--muted)]">
                  <span>
                    {pg} · {Math.round((1 - dp) * 100)}%
                  </span>
                  <span>
                    {Math.round(dp * 100)}% · {pd}
                  </span>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Dot({ left, color, title }: { left: number; color: string; title: string }) {
  return (
    <span
      className="absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
      style={{ left: `${left * 100}%`, background: color }}
      title={title}
    />
  );
}

// Pôle dominant d'un score et intensité du penchant (0.5 = pile au centre).
function lean(dp: number, poleG: string, poleD: string): { pole: string; share: number } {
  const droite = dp >= 0.5;
  return { pole: droite ? poleD : poleG, share: droite ? dp : 1 - dp };
}

// Ligne « ● GROUPE — 96 % vers Accès élargi » sous l'axe, sans ambiguïté.
function LeanChip({
  label,
  color,
  dp,
  poleG,
  poleD,
}: {
  label: string;
  color: string;
  dp: number | null;
  poleG: string;
  poleD: string;
}) {
  if (dp == null)
    return (
      <span className="flex items-center gap-1.5 text-[var(--muted)]">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <b style={{ color }}>{label}</b> · pas de données
      </span>
    );
  const { pole, share } = lean(dp, poleG, poleD);
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <span>
        <b style={{ color }}>{label}</b>{" "}
        <span className="stat-num font-semibold">{pct(share)}</span>{" "}
        <span className="text-[var(--muted)]">vers « {pole} »</span>
      </span>
    </span>
  );
}

// Comparaison de deux entités (groupes) sur l'axe propre à chaque thème.
function OrientationVs({
  rowsA,
  rowsB,
  a,
  b,
}: {
  rowsA: OrientCatC[];
  rowsB: OrientCatC[];
  a: string;
  b: string;
}) {
  const mapA = new Map(rowsA.map((r) => [r.categorie, r]));
  const mapB = new Map(rowsB.map((r) => [r.categorie, r]));
  const cats = Array.from(
    new Set([...rowsA.map((r) => r.categorie), ...rowsB.map((r) => r.categorie)])
  );
  const total = (c: string) =>
    (mapA.get(c)?.gauche ?? 0) +
    (mapA.get(c)?.droite ?? 0) +
    (mapB.get(c)?.gauche ?? 0) +
    (mapB.get(c)?.droite ?? 0);
  cats.sort((x, y) => total(y) - total(x));
  if (cats.length === 0) return null;
  return (
    <div className="mt-6 border-t border-[var(--border)] pt-4">
      <h3 className="mb-1 text-sm font-semibold">Orientation par thème</h3>
      <p className="mb-5 text-xs text-[var(--muted)]">
        Sens des votes exprimés (<b>pour</b> et <b>contre</b>) de chaque groupe sur l&apos;axe du
        thème. Chaque groupe penche vers l&apos;un des deux pôles ; le pourcentage indique
        l&apos;intensité de ce penchant.
      </p>
      <div className="space-y-6">
        {cats.map((c) => {
          const da = droitePart(mapA.get(c));
          const dbv = droitePart(mapB.get(c));
          const [pg, pd] = poles(c);
          return (
            <div key={c}>
              <div className="mb-2 text-xs font-semibold">{c}</div>
              <div className="relative h-3.5">
                <div
                  className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${POLE_G}, ${POLE_MID}, ${POLE_D})`,
                  }}
                />
                {da != null && (
                  <Dot
                    left={da}
                    color={groupColor(a)}
                    title={`${a} : ${pct(lean(da, pg, pd).share)} vers ${lean(da, pg, pd).pole}`}
                  />
                )}
                {dbv != null && (
                  <Dot
                    left={dbv}
                    color={groupColor(b)}
                    title={`${b} : ${pct(lean(dbv, pg, pd).share)} vers ${lean(dbv, pg, pd).pole}`}
                  />
                )}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]">
                <span>← {pg}</span>
                <span>{pd} →</span>
              </div>
              <div className="mt-2 flex flex-col gap-1 text-[11px] sm:flex-row sm:flex-wrap sm:gap-x-5">
                <LeanChip label={a} color={groupColor(a)} dp={da} poleG={pg} poleD={pd} />
                <LeanChip label={b} color={groupColor(b)} dp={dbv} poleG={pg} poleD={pd} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ComparateurClient({
  legs,
  data,
  now,
}: {
  legs: string[];
  data: Record<string, LegData>;
  now: number;
}) {
  const [tab, setTab] = useState<Tab>("presidents");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comparateur</h1>
        <p className="max-w-2xl text-sm text-[var(--muted)]">
          Comparez les présidents de la Ve République, deux députés selon leur comportement de vote,
          ou deux groupes politiques selon leur cohésion et leur accord mutuel.
        </p>
      </div>

      <div className="inline-flex overflow-hidden rounded-lg border border-[var(--border)] text-sm">
        {(
          [
            ["presidents", "Présidents"],
            ["deputes", "Députés"],
            ["groupes", "Groupes"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-medium ${
              tab === t
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "presidents" && <Presidents now={now} />}
      {tab === "deputes" && <Deputes legs={legs} data={data} />}
      {tab === "groupes" && <Groupes legs={legs} data={data} />}
    </div>
  );
}

// ---- Onglet Présidents ----

function ColonnePresident({
  value,
  onChange,
  autre,
  now,
}: {
  value: string;
  onChange: (v: string) => void;
  autre: string;
  now: number;
}) {
  const p = PRESIDENTS.find((x) => x.id === value) as President;
  return (
    <div className="card overflow-hidden">
      <div className="h-2" style={{ background: p.couleur }} />
      <div className="p-5 space-y-4">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold"
        >
          {PRESIDENTS.map((x) => (
            <option key={x.id} value={x.id} disabled={x.id === autre}>
              {x.nom}
            </option>
          ))}
        </select>
        <div>
          <div className="text-xl font-bold">{p.nom}</div>
          <div className="text-sm text-[var(--muted)]">{p.parti}</div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-[var(--muted)]">Entrée en fonction</dt>
            <dd className="font-semibold">{new Date(p.debut).getFullYear()}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Fin</dt>
            <dd className="font-semibold">{p.fin ? new Date(p.fin).getFullYear() : "en cours"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Durée</dt>
            <dd className="font-semibold">{dureeAnnees(p, now)} ans</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Mandats</dt>
            <dd className="font-semibold">{p.mandats}</dd>
          </div>
        </dl>
        <div>
          <div className="mb-1 text-xs text-[var(--muted)]">Fin de mandat</div>
          <div className="text-sm">{p.finMandat}</div>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Faits marquants
          </div>
          <ul className="space-y-1.5 text-sm">
            {p.faits.map((f) => (
              <li key={f} className="flex gap-2">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: p.couleur }}
                />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Presidents({ now }: { now: number }) {
  const [a, setA] = useState("macron");
  const [b, setB] = useState("hollande");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ColonnePresident value={a} onChange={setA} autre={b} now={now} />
      <ColonnePresident value={b} onChange={setB} autre={a} now={now} />
    </div>
  );
}

// ---- Onglet Députés ----

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="stat-num text-sm font-bold">{pct(value)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-[var(--border)]">
        <div
          className="h-full rounded bg-[var(--accent)]"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</div>
    </div>
  );
}

function ColonneDepute({
  value,
  onChange,
  autre,
  deputes,
  groupesDispo,
  orientDeputes,
  condamDeputes,
  orientOrder,
}: {
  value: string;
  onChange: (v: string) => void;
  autre: string;
  deputes: DeputeCompareC[];
  groupesDispo: string[];
  orientDeputes: Record<string, OrientCatC[]>;
  condamDeputes: Record<string, CondamInfo[]>;
  orientOrder: string[];
}) {
  const [q, setQ] = useState("");
  const [gf, setGf] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let base = deputes;
    if (gf) base = base.filter((d) => d.abrege === gf);
    if (s) base = base.filter((d) => `${d.prenom} ${d.nom}`.toLowerCase().includes(s));
    return base.slice(0, 300);
  }, [q, gf, deputes]);
  const d = deputes.find((x) => x.uid === value);
  return (
    <div className="card overflow-hidden">
      <div className="h-1.5" style={{ background: groupColor(d?.abrege) }} />
      <div className="space-y-3 p-4">
        <select
          value={gf}
          onChange={(e) => setGf(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm"
        >
          <option value="">Tous les groupes</option>
          {groupesDispo.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrer par nom…"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm"
        />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold"
        >
          {filtered.map((x) => (
            <option key={x.uid} value={x.uid} disabled={x.uid === autre}>
              {x.prenom} {x.nom} {x.abrege ? `(${x.abrege})` : ""}
            </option>
          ))}
        </select>
        {d ? (
          <>
            <div>
              <Link href={`/deputes/${d.uid}`} className="text-base font-bold link-accent">
                {d.prenom} {d.nom}
              </Link>
              <div className="text-sm text-[var(--muted)]">{d.abrege ?? "Non inscrit"}</div>
            </div>
            <div className="space-y-2.5">
              <Metric
                label="Participation"
                value={d.participation}
                hint={`${d.n_exprime} votes exprimés`}
              />
              <Metric
                label="Loyauté au groupe"
                value={d.loyaute}
                hint="Vote comme la majorité de son groupe"
              />
              <Metric
                label="Alignement présidentiel"
                value={d.align}
                hint="Vote comme le bloc présidentiel"
              />
              <Metric
                label="… sur les votes clivants"
                value={d.alignClivant}
                hint="Alignement hors votes quasi-unanimes"
              />
            </div>
            <div className="border-t border-[var(--border)] pt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Orientation par thème
              </div>
              <OrientationBars rows={orientDeputes[d.uid] ?? []} order={orientOrder} />
            </div>
            {(() => {
              const cs = condamDeputes[d.uid] ?? [];
              return (
                <div className="border-t border-[var(--border)] pt-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Condamnations judiciaires
                  </div>
                  {cs.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">Aucune condamnation recensée.</p>
                  ) : (
                    <ul className="space-y-1">
                      {cs.map((c, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-sm">
                          <span className="capitalize">{c.infraction}</span>
                          {c.date && (
                            <span className="text-xs text-[var(--muted)]">· {c.date.slice(0, 4)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
          </>
        ) : (
          <p className="text-sm text-[var(--muted)]">Sélectionnez un député.</p>
        )}
      </div>
    </div>
  );
}

function Deputes({ legs, data }: { legs: string[]; data: Record<string, LegData> }) {
  const [leg, setLeg] = useState(legs[0]);
  const deputes = data[leg].deputes;
  const orientDeputes = data[leg].orientDeputes;
  const condamDeputes = data[leg].condamDeputes;
  const [a, setA] = useState(deputes[0]?.uid ?? "");
  const [b, setB] = useState(deputes[1]?.uid ?? "");

  const groupesDispo = useMemo(
    () =>
      Array.from(
        new Set(deputes.map((d) => d.abrege).filter((x): x is string => Boolean(x)))
      ).sort(),
    [deputes]
  );

  // Ordre de thèmes partagé par les deux colonnes : union des catégories des deux
  // députés sélectionnés, triée par volume de votes cumulé, pour qu'elles se fassent face.
  const orientOrder = useMemo(() => {
    const total = new Map<string, number>();
    for (const uid of [a, b]) {
      for (const r of orientDeputes[uid] ?? []) {
        total.set(r.categorie, (total.get(r.categorie) ?? 0) + r.gauche + r.droite);
      }
    }
    return Array.from(total.entries())
      .sort((x, y) => y[1] - x[1])
      .map(([cat]) => cat);
  }, [a, b, orientDeputes]);

  const onLeg = (l: string) => {
    setLeg(l);
    const ds = data[l].deputes;
    setA(ds[0]?.uid ?? "");
    setB(ds[1]?.uid ?? "");
  };

  return (
    <div className="space-y-4">
      <LegTabs legs={legs} current={leg} onChange={onLeg} data={data} />
      <div className="grid gap-4 md:grid-cols-2">
        <ColonneDepute
          value={a}
          onChange={setA}
          autre={b}
          deputes={deputes}
          groupesDispo={groupesDispo}
          orientDeputes={orientDeputes}
          condamDeputes={condamDeputes}
          orientOrder={orientOrder}
        />
        <ColonneDepute
          value={b}
          onChange={setB}
          autre={a}
          deputes={deputes}
          groupesDispo={groupesDispo}
          orientDeputes={orientDeputes}
          condamDeputes={condamDeputes}
          orientOrder={orientOrder}
        />
      </div>
      <p className="text-xs text-[var(--muted)]">
        Participation = votes exprimés / scrutins concernés. Loyauté = accord avec la position
        majoritaire de son groupe. Alignement présidentiel = accord avec la position majoritaire du
        bloc présidentiel.
      </p>
    </div>
  );
}

// ---- Onglet Groupes (comparaison groupe contre groupe) ----

function Groupes({ legs, data }: { legs: string[]; data: Record<string, LegData> }) {
  const [leg, setLeg] = useState(legs[0]);
  const { positions, accord, deputes, orientGroupes, condamGroupes } = data[leg];

  return (
    <div className="space-y-6">
      <LegTabs legs={legs} current={leg} onChange={setLeg} data={data} />
      <GroupeVsGroupe
        positions={positions}
        accord={accord}
        deputes={deputes}
        orientGroupes={orientGroupes}
        condamGroupes={condamGroupes}
      />
    </div>
  );
}

interface AggGroupe {
  participation: number;
  loyaute: number;
  align: number;
  alignClivant: number;
}

function moyennesGroupe(deputes: DeputeCompareC[]): Map<string, AggGroupe> {
  const acc = new Map<string, { p: number; l: number; a: number; ac: number; n: number }>();
  for (const d of deputes) {
    if (!d.abrege || d.n_exprime === 0) continue;
    const cur = acc.get(d.abrege) ?? { p: 0, l: 0, a: 0, ac: 0, n: 0 };
    cur.p += d.participation;
    cur.l += d.loyaute;
    cur.a += d.align;
    cur.ac += d.alignClivant;
    cur.n += 1;
    acc.set(d.abrege, cur);
  }
  const out = new Map<string, AggGroupe>();
  for (const [k, v] of acc)
    out.set(k, {
      participation: v.p / v.n,
      loyaute: v.l / v.n,
      align: v.a / v.n,
      alignClivant: v.ac / v.n,
    });
  return out;
}

function GroupeVsGroupe({
  positions,
  accord,
  deputes,
  orientGroupes,
  condamGroupes,
}: {
  positions: GroupePositionC[];
  accord: { a: string; b: string; taux: number }[];
  deputes: DeputeCompareC[];
  orientGroupes: Record<string, OrientCatC[]>;
  condamGroupes: CondamGroupeC[];
}) {
  const [a, setA] = useState(positions[0]?.abrege ?? "");
  const [b, setB] = useState(positions[1]?.abrege ?? positions[0]?.abrege ?? "");
  const agg = useMemo(() => moyennesGroupe(deputes), [deputes]);
  const accordMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of accord) {
      m.set(`${r.a}|${r.b}`, r.taux);
      m.set(`${r.b}|${r.a}`, r.taux);
    }
    return m;
  }, [accord]);

  const gA = positions.find((p) => p.abrege === a);
  const gB = positions.find((p) => p.abrege === b);
  const taux = a === b ? 1 : accordMap.get(`${a}|${b}`) ?? null;

  const condamMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of condamGroupes) if (c.abrege) m.set(c.abrege, c.n_deputes);
    return m;
  }, [condamGroupes]);

  const options = positions.map((p) => p.abrege).filter((x): x is string => Boolean(x));

  const colorA = groupColor(a);
  const colorB = groupColor(b);

  return (
    <div className="card p-5">
      <h2 className="mb-1 text-lg font-semibold">Groupe contre groupe</h2>
      <p className="mb-4 text-xs text-[var(--muted)]">
        Comparez deux groupes sur leur cohésion, leurs moyennes de comportement et leur taux
        d&apos;accord mutuel.
      </p>

      <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <GroupPicker value={a} onChange={setA} options={options} color={colorA} libelle={gA?.libelle} effectif={gA?.n} />
        <span className="text-sm font-semibold text-[var(--muted)]">vs</span>
        <GroupPicker value={b} onChange={setB} options={options} color={colorB} libelle={gB?.libelle} effectif={gB?.n} />
      </div>

      <div className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-center">
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Accord mutuel</div>
        <div className="stat-num text-4xl font-bold">{taux == null ? "—" : pct(taux)}</div>
        <div className="mx-auto mb-1 mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full"
            style={{ width: `${(taux ?? 0) * 100}%`, background: "var(--accent)" }}
          />
        </div>
        <div className="text-xs text-[var(--muted)]">
          des scrutins où les deux groupes votent dans le même sens
        </div>
      </div>

      <div className="mx-auto max-w-xl divide-y divide-[var(--border)]">
        <CompareBar label="Effectif" a={gA?.n} b={gB?.n} colorA={colorA} colorB={colorB} kind="count" />
        <CompareBar label="Cohésion interne" a={gA?.cohesion} b={gB?.cohesion} colorA={colorA} colorB={colorB} kind="pct" />
        <CompareBar label="Participation moyenne" a={agg.get(a)?.participation} b={agg.get(b)?.participation} colorA={colorA} colorB={colorB} kind="pct" />
        <CompareBar label="Loyauté moyenne au groupe" a={agg.get(a)?.loyaute} b={agg.get(b)?.loyaute} colorA={colorA} colorB={colorB} kind="pct" />
        <CompareBar label="Alignement présidentiel moyen" a={agg.get(a)?.align} b={agg.get(b)?.align} colorA={colorA} colorB={colorB} kind="pct" />
        <CompareBar label="… sur les seuls votes clivants" a={agg.get(a)?.alignClivant} b={agg.get(b)?.alignClivant} colorA={colorA} colorB={colorB} kind="pct" />
        <CompareBar label="Députés condamnés" a={condamMap.get(a) ?? 0} b={condamMap.get(b) ?? 0} colorA={colorA} colorB={colorB} kind="count" />
      </div>
      <p className="mx-auto mt-3 max-w-xl text-center text-[11px] leading-relaxed text-[var(--muted)]">
        « Votes clivants » = scrutins réellement contestés (le camp minoritaire pèse ≥ 10 % des voix).
        On écarte les votes quasi-unanimes, qui gonflent l&apos;alignement de tous les groupes.
      </p>

      <OrientationVs rowsA={orientGroupes[a] ?? []} rowsB={orientGroupes[b] ?? []} a={a} b={b} />
    </div>
  );
}

// Sélecteur de groupe : carte à liseré coloré + libellé + effectif.
function GroupPicker({
  value,
  onChange,
  options,
  color,
  libelle,
  effectif,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  color: string;
  libelle?: string | null;
  effectif?: number;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="h-1.5" style={{ background: color }} />
      <div className="space-y-1.5 p-3 text-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <div className="truncate text-xs text-[var(--muted)]" title={libelle ?? ""}>
          {libelle ?? "—"}
        </div>
        {effectif != null && (
          <div className="stat-num text-xs font-semibold" style={{ color }}>
            {effectif} députés
          </div>
        )}
      </div>
    </div>
  );
}

// Barre d'opposition « tir à la corde » : deux valeurs se font face autour d'un
// axe central, chaque barre grandissant vers l'extérieur proportionnellement.
function CompareBar({
  label,
  a,
  b,
  colorA,
  colorB,
  kind,
}: {
  label: string;
  a: number | null | undefined;
  b: number | null | undefined;
  colorA: string;
  colorB: string;
  kind: "pct" | "count";
}) {
  const max = kind === "pct" ? 1 : Math.max(a ?? 0, b ?? 0, 1);
  const fa = a == null ? 0 : Math.max(0, Math.min(1, a / max));
  const fb = b == null ? 0 : Math.max(0, Math.min(1, b / max));
  const fmt = (v: number | null | undefined) =>
    v == null ? "—" : kind === "pct" ? pct(v) : String(v);
  return (
    <div className="py-2.5">
      <div className="mb-1 text-center text-[11px] font-medium text-[var(--muted)]">{label}</div>
      <div className="flex items-center gap-2.5">
        <span
          className="stat-num w-12 shrink-0 text-right text-sm font-bold"
          style={{ color: colorA }}
        >
          {fmt(a)}
        </span>
        <div className="flex flex-1 items-center gap-0.5">
          <div className="flex h-2.5 flex-1 justify-end overflow-hidden rounded-full bg-[var(--background)]">
            <div className="h-full rounded-full" style={{ width: `${fa * 100}%`, background: colorA }} />
          </div>
          <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--background)]">
            <div className="h-full rounded-full" style={{ width: `${fb * 100}%`, background: colorB }} />
          </div>
        </div>
        <span
          className="stat-num w-12 shrink-0 text-left text-sm font-bold"
          style={{ color: colorB }}
        >
          {fmt(b)}
        </span>
      </div>
    </div>
  );
}

function LegTabs({
  legs,
  current,
  onChange,
  data,
}: {
  legs: string[];
  current: string;
  onChange: (l: string) => void;
  data: Record<string, LegData>;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-[var(--border)] text-sm">
      {legs.map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`px-3 py-1.5 font-medium ${
            l === current
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {data[l].label}
        </button>
      ))}
    </div>
  );
}
