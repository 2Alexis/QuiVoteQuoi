"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PRESIDENTS, dureeAnnees, type President } from "@/data/presidents";
import { groupColor, groupOrder, ORIENTATION_POLES, deputePhotoUrl } from "@/lib/ui";
import { FIGURES_SET, normNom } from "@/lib/figures";
import { MetricRing } from "@/components/bits";
import { DeputePhoto } from "@/components/DeputePhoto";
import { GroupLogo } from "@/components/GroupLogo";

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
  n_concerne: number;
  n_loyal: number;
  n_loyal_denom: number;
  n_align: number;
  n_align_denom: number;
  n_align_cliv: number;
  n_align_cliv_denom: number;
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

// Couleurs d'identité pour comparer deux députés (un par « côté »). Volontairement
// neutres — ni rouge/bleu politique, ni « bien / mal » — et distinctes du teal/ambre
// des pôles d'orientation, pour rester lisibles quand les deux repères cohabitent.
const IDENT_A = "#7048E8"; // violet
const IDENT_B = "#F76707"; // orange

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
    <div className="space-y-4">
      {cats.map((cat) => {
        const r = byCat.get(cat);
        const dp = droitePart(r);
        const [pg, pd] = poles(cat);
        if (dp == null) {
          return (
            <div key={cat}>
              <div className="mb-1 text-xs font-medium">{cat}</div>
              <div className="h-1.5 w-full rounded-full" style={{ background: POLE_MID }} />
              <div className="mt-0.5 text-[10px] text-[var(--muted)]">Pas de vote marqué</div>
            </div>
          );
        }
        const { pole, share } = lean(dp, pg, pd);
        const partage = share < 0.6;
        const poleColor = partage ? "#8A96A3" : dp >= 0.5 ? POLE_D : POLE_G;
        return (
          <div key={cat}>
            <div className="mb-1 text-xs font-medium">{cat}</div>
            <div className="relative h-3.5">
              <div
                className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full"
                style={{ background: `linear-gradient(to right, ${POLE_G}, ${POLE_MID}, ${POLE_D})` }}
              />
              <Dot
                left={dp}
                color={poleColor}
                title={`${pct(share)} vers ${pole}`}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]">
              <span>← {pg}</span>
              <span>{pd} →</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              {partage ? (
                <>Partagé entre les deux pôles.</>
              ) : (
                <>
                  Penche vers <b style={{ color: poleColor }}>«&nbsp;{pole}&nbsp;»</b> ({pct(share)}).
                </>
              )}
            </p>
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

// Comparaison de deux entités (groupes ou députés) sur l'axe propre à chaque
// thème. Les couleurs et libellés sont explicites pour servir aux deux usages ;
// `sujet` n'ajuste que la formulation de l'intro.
function OrientationVs({
  rowsA,
  rowsB,
  labelA,
  labelB,
  colorA,
  colorB,
  sujet = "groupe",
}: {
  rowsA: OrientCatC[];
  rowsB: OrientCatC[];
  labelA: string;
  labelB: string;
  colorA: string;
  colorB: string;
  sujet?: string;
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
      <h3 className="mb-1 text-sm font-semibold">Orientation des votes par thème</h3>
      <p className="mb-5 text-xs text-[var(--muted)]">
        Sens des votes exprimés (<b>pour</b> et <b>contre</b>) de chaque {sujet} sur l&apos;axe du
        thème. Chaque {sujet} penche vers l&apos;un des deux pôles ; le pourcentage indique
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
                    color={colorA}
                    title={`${labelA} : ${pct(lean(da, pg, pd).share)} vers ${lean(da, pg, pd).pole}`}
                  />
                )}
                {dbv != null && (
                  <Dot
                    left={dbv}
                    color={colorB}
                    title={`${labelB} : ${pct(lean(dbv, pg, pd).share)} vers ${lean(dbv, pg, pd).pole}`}
                  />
                )}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]">
                <span>← {pg}</span>
                <span>{pd} →</span>
              </div>
              <div className="mt-2 flex flex-col gap-1 text-[11px] sm:flex-row sm:flex-wrap sm:gap-x-5">
                <LeanChip label={labelA} color={colorA} dp={da} poleG={pg} poleD={pd} />
                <LeanChip label={labelB} color={colorB} dp={dbv} poleG={pg} poleD={pd} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Boutons de téléchargement du visuel de partage (carrousel Instagram) d'une
// comparaison. Les thèmes sont répartis sur 2 images ; un bouton par image, pour
// que chaque téléchargement soit un clic distinct (sinon le navigateur demande
// d'« autoriser les téléchargements multiples »). La sélection courante est encodée
// dans l'URL de la route image ; on récupère chaque image en `fetch` (indicateur de
// chargement + anti-cache) puis on déclenche le téléchargement depuis le blob.
function PartageVisuel({ href }: { href: string }) {
  const [loadingPart, setLoadingPart] = useState<number | null>(null);
  const sep = href.includes("?") ? "&" : "?";

  const telecharger = async (part: number) => {
    if (loadingPart !== null) return;
    setLoadingPart(part);
    // Date.now() = anti-cache unique ; appelé dans un gestionnaire d'événement
    // (jamais au rendu), la règle de pureté est ici un faux positif.
    // eslint-disable-next-line react-hooks/purity
    const frais = `${href}${sep}part=${part}&cb=${Date.now()}`;
    try {
      const res = await fetch(frais);
      if (!res.ok) throw new Error("génération échouée");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quivotequoi-comparateur-${part}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Repli si le téléchargement direct échoue : ouvre l'image dans un onglet.
      window.open(frais, "_blank", "noopener,noreferrer");
    } finally {
      setLoadingPart(null);
    }
  };

  const bouton = (part: number) => {
    const loading = loadingPart === part;
    return (
      <button
        key={part}
        type="button"
        onClick={() => telecharger(part)}
        disabled={loadingPart !== null}
        aria-busy={loading}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 animate-spin" aria-hidden>
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
        )}
        {loading ? "Génération…" : `Image ${part}`}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
      <span className="text-xs text-[var(--muted)]">Partager (carrousel, 2 images) :</span>
      {bouton(1)}
      {bouton(2)}
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
  const [tab, setTab] = useState<Tab>("groupes");

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
            ["groupes", "Groupes"],
            ["deputes", "Députés"],
            ["presidents", "Présidents"],
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

// Seuil de fiabilité : en deçà de ce nombre de votes exprimés, les taux d'un
// député (loyauté, alignement, orientation) reposent sur trop peu d'observations
// pour être lus au sérieux — on le signale visiblement dans sa colonne.
const SEUIL_FAIBLE = 100;

// Figures connues présentes dans la liste, dédoublonnées et triées gauche→droite
// (ordre de l'hémicycle). Alimente le défaut et les préréglages du comparateur.
function figuresDe(deputes: DeputeCompareC[]): DeputeCompareC[] {
  const seen = new Set<string>();
  const out: DeputeCompareC[] = [];
  for (const d of deputes) {
    if (!d.abrege || seen.has(d.uid)) continue;
    if (!FIGURES_SET.has(normNom(`${d.prenom} ${d.nom}`))) continue;
    seen.add(d.uid);
    out.push(d);
  }
  return out.sort((a, b) => groupOrder(a.abrege) - groupOrder(b.abrege));
}

// Défaut « parlant » : la figure la plus à gauche face à la plus à droite, au
// lieu des deux premiers noms alphabétiques (première impression sans intérêt).
function defautParlant(deputes: DeputeCompareC[]): [string, string] {
  const figs = figuresDe(deputes);
  if (figs.length >= 2) return [figs[0].uid, figs[figs.length - 1].uid];
  return [deputes[0]?.uid ?? "", deputes[1]?.uid ?? ""];
}

// En deçà de ce nombre de scrutins en commun, le taux d'accord entre deux députés
// repose sur trop peu d'observations : on l'affiche grisé, assorti d'un avertissement.
const SEUIL_COMMUN = 50;

interface AccordData {
  commun: number;
  accord: number;
  taux: number | null;
}

// Carte « chiffre-choc » : le taux d'accord de vote entre les deux députés
// sélectionnés, avec le nombre de scrutins réellement communs et un garde-fou de
// significativité — le pourcentage est neutralisé (grisé) sous le seuil.
function FaceAFace({
  a,
  b,
  leg,
  data,
  loading,
}: {
  a: DeputeCompareC;
  b: DeputeCompareC;
  leg: string;
  data: AccordData | null;
  loading: boolean;
}) {
  const colorA = groupColor(a.abrege);
  const colorB = groupColor(b.abrege);
  const fiable = !!data && data.taux != null && data.commun >= SEUIL_COMMUN;
  return (
    <div className="card p-5 text-center">
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Accord de vote</div>
      {/* Photos des deux députés, face à face */}
      <div className="mt-3 flex items-start justify-center gap-4">
        <div className="flex w-28 flex-col items-center gap-1.5">
          <DeputePhoto src={deputePhotoUrl(a.uid, leg)} prenom={a.prenom} nom={a.nom} color={colorA} size={76} />
          <span className="text-sm font-semibold leading-tight" style={{ color: colorA }}>
            {a.prenom} {a.nom}
          </span>
        </div>
        <span className="mt-7 lowercase italic text-[var(--muted)]">vs</span>
        <div className="flex w-28 flex-col items-center gap-1.5">
          <DeputePhoto src={deputePhotoUrl(b.uid, leg)} prenom={b.prenom} nom={b.nom} color={colorB} size={76} />
          <span className="text-sm font-semibold leading-tight" style={{ color: colorB }}>
            {b.prenom} {b.nom}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="mt-3 text-sm text-[var(--muted)]">Calcul…</div>
      ) : !data || data.taux == null || data.commun === 0 ? (
        <div className="mt-3 text-sm text-[var(--muted)]">
          Aucun scrutin où les deux se sont exprimés sur cette législature.
        </div>
      ) : (
        <>
          <div
            className="stat-num mt-2 text-5xl font-bold"
            style={{ color: fiable ? undefined : "var(--muted)" }}
          >
            {pct(data.taux)}
          </div>
          <div className="mx-auto mb-1 mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full"
              style={{ width: `${data.taux * 100}%`, background: "var(--accent)" }}
            />
          </div>
          <div className="text-xs text-[var(--muted)]">
            sur <span className="stat-num font-semibold">{data.commun.toLocaleString("fr-FR")}</span>{" "}
            scrutins où les deux se sont exprimés
          </div>
          {!fiable && (
            <p
              className="mx-auto mt-2 max-w-sm text-[11px] font-medium leading-snug"
              style={{ color: "#9A6700" }}
            >
              Trop peu de votes en commun pour un score fiable — à interpréter avec prudence.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// Sélecteur d'un député : filtre par groupe, filtre par nom, puis choix dans la
// liste résultante (plafonnée pour rester fluide). Partagé par les colonnes
// desktop et la vue face à face mobile, seuls endroits où l'on change de député.
function DeputePicker({
  value,
  onChange,
  autre,
  deputes,
  groupesDispo,
}: {
  value: string;
  onChange: (v: string) => void;
  autre: string;
  deputes: DeputeCompareC[];
  groupesDispo: string[];
}) {
  const [q, setQ] = useState("");
  const [gf, setGf] = useState("");
  // La liste est plafonnée pour rester fluide, mais on garantit que le député
  // déjà sélectionné y figure : sinon le <select> contrôlé, ne trouvant pas sa
  // valeur, retomberait sur la première option et afficherait un autre nom.
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let base = deputes;
    if (gf) base = base.filter((d) => d.abrege === gf);
    if (s) base = base.filter((d) => `${d.prenom} ${d.nom}`.toLowerCase().includes(s));
    const capped = base.slice(0, 300);
    if (value && !capped.some((d) => d.uid === value)) {
      const sel = deputes.find((d) => d.uid === value);
      if (sel) return [sel, ...capped];
    }
    return capped;
  }, [q, gf, deputes, value]);
  return (
    <div className="space-y-2">
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
  const d = deputes.find((x) => x.uid === value);
  return (
    <div className="card overflow-hidden">
      <div className="h-1.5" style={{ background: groupColor(d?.abrege) }} />
      <div className="space-y-3 p-4">
        <DeputePicker
          value={value}
          onChange={onChange}
          autre={autre}
          deputes={deputes}
          groupesDispo={groupesDispo}
        />
        {d ? (
          <>
            <div>
              <Link href={`/deputes/${d.uid}`} className="text-base font-bold link-accent">
                {d.prenom} {d.nom}
              </Link>
              <div className="text-sm text-[var(--muted)]">{d.abrege ?? "Non inscrit"}</div>
            </div>
            {d.n_exprime < SEUIL_FAIBLE && (
              <p
                className="rounded-md px-2 py-1 text-[11px] font-medium leading-snug"
                style={{ color: "#9A6700", background: "#E7A1001f" }}
              >
                Échantillon faible : {d.n_exprime} votes exprimés — les taux ci-dessous sont peu
                fiables.
              </p>
            )}
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
              <MetricRing
                label="Participation"
                value={d.participation}
                hint={`${d.n_exprime} votes exprimés sur ${d.n_concerne} scrutins`}
              />
              <MetricRing
                label="Loyauté au groupe"
                value={d.loyaute}
                hint={`Suit la position majoritaire de son groupe (${d.n_loyal}/${d.n_loyal_denom})`}
              />
              <MetricRing
                label="Alignement présidentiel"
                value={d.align}
                hint={`Vote comme le bloc présidentiel (${d.n_align}/${d.n_align_denom})`}
              />
              <MetricRing
                label="Alignement (votes clivants)"
                value={d.alignClivant}
                hint={`Hors votes quasi-unanimes (${d.n_align_cliv}/${d.n_align_cliv_denom})`}
              />
            </div>
            <div className="border-t border-[var(--border)] pt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Orientation des votes par thème
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

// Vue « face à face » réservée au mobile : reprend le principe de la comparaison
// de groupes (barres qui s'opposent autour d'un axe + points de couleur sur l'axe
// d'orientation), une couleur d'identité par député. Sur petit écran, les colonnes
// détaillées sont masquées : cette carte porte donc aussi les sélecteurs (en haut,
// à portée) et les condamnations, pour ne rien perdre du contenu des colonnes.
function DeputeVs({
  a,
  b,
  setA,
  setB,
  deputes,
  groupesDispo,
  orientDeputes,
  condamDeputes,
}: {
  a: DeputeCompareC;
  b: DeputeCompareC;
  setA: (v: string) => void;
  setB: (v: string) => void;
  deputes: DeputeCompareC[];
  groupesDispo: string[];
  orientDeputes: Record<string, OrientCatC[]>;
  condamDeputes: Record<string, CondamInfo[]>;
}) {
  const nomA = `${a.prenom} ${a.nom}`;
  const nomB = `${b.prenom} ${b.nom}`;
  const cols: [DeputeCompareC, (v: string) => void, string, string][] = [
    [a, setA, b.uid, IDENT_A],
    [b, setB, a.uid, IDENT_B],
  ];
  return (
    <div className="card space-y-5 p-5">
      <div className="grid grid-cols-2 gap-3">
        {cols.map(([dep, set, autre, color]) => (
          <div key={dep.uid} className="space-y-2">
            <div className="flex items-start gap-1.5">
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: color }}
              />
              <div className="min-w-0">
                <Link
                  href={`/deputes/${dep.uid}`}
                  className="block truncate text-sm font-bold leading-tight link-accent"
                >
                  {dep.prenom} {dep.nom}
                </Link>
                <div className="truncate text-xs text-[var(--muted)]">
                  {dep.abrege ?? "Non inscrit"}
                </div>
              </div>
            </div>
            <DeputePicker
              value={dep.uid}
              onChange={set}
              autre={autre}
              deputes={deputes}
              groupesDispo={groupesDispo}
            />
            {dep.n_exprime < SEUIL_FAIBLE && (
              <p
                className="rounded-md px-2 py-1 text-[11px] font-medium leading-snug"
                style={{ color: "#9A6700", background: "#E7A1001f" }}
              >
                Échantillon faible : {dep.n_exprime} votes exprimés.
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <h2 className="mb-1 text-lg font-semibold">Face à face</h2>
        <p className="mb-4 text-xs text-[var(--muted)]">
          Les indicateurs de chaque député, dans sa couleur.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {cols.map(([dep, , , color]) => (
            <div key={dep.uid} className="space-y-2">
              <MetricRing
                label="Participation"
                value={dep.participation}
                hint={`${dep.n_exprime} votes exprimés sur ${dep.n_concerne} scrutins`}
                color={color}
              />
              <MetricRing
                label="Loyauté au groupe"
                value={dep.loyaute}
                hint={`Suit la position majoritaire de son groupe (${dep.n_loyal}/${dep.n_loyal_denom})`}
                color={color}
              />
              <MetricRing
                label="Alignement présidentiel"
                value={dep.align}
                hint={`Vote comme le bloc présidentiel (${dep.n_align}/${dep.n_align_denom})`}
                color={color}
              />
              <MetricRing
                label="Alignement (votes clivants)"
                value={dep.alignClivant}
                hint={`Hors votes quasi-unanimes (${dep.n_align_cliv}/${dep.n_align_cliv_denom})`}
                color={color}
              />
            </div>
          ))}
        </div>
        <OrientationVs
          rowsA={orientDeputes[a.uid] ?? []}
          rowsB={orientDeputes[b.uid] ?? []}
          labelA={nomA}
          labelB={nomB}
          colorA={IDENT_A}
          colorB={IDENT_B}
          sujet="député"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4">
        {cols.map(([dep, , , color]) => {
          const cs = condamDeputes[dep.uid] ?? [];
          return (
            <div key={dep.uid}>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                Condamnations
              </div>
              {cs.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">Aucune recensée.</p>
              ) : (
                <ul className="space-y-1">
                  {cs.map((c, i) => (
                    <li key={i} className="text-sm leading-snug">
                      <span className="capitalize">{c.infraction}</span>
                      {c.date && (
                        <span className="text-xs text-[var(--muted)]"> · {c.date.slice(0, 4)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Deputes({ legs, data }: { legs: string[]; data: Record<string, LegData> }) {
  const [leg, setLeg] = useState(legs[0]);
  const deputes = data[leg].deputes;
  const positions = data[leg].positions;
  const orientDeputes = data[leg].orientDeputes;
  const condamDeputes = data[leg].condamDeputes;
  const [a, setA] = useState(() => defautParlant(deputes)[0]);
  const [b, setB] = useState(() => defautParlant(deputes)[1]);
  // Résultat d'accord « estampillé » de la paire (a,b,leg) qui l'a produit. On en
  // dérive l'état de chargement (calcul en cours tant que l'estampille ne colle pas
  // à la sélection courante), ce qui évite tout setState synchrone dans l'effet —
  // donc pas de rendu en cascade.
  const [accordRes, setAccordRes] = useState<{
    a: string;
    b: string;
    leg: string;
    data: AccordData | null;
  } | null>(null);

  // Charge à la volée le taux d'accord de la paire courante (route lecture seule).
  // `annule` évite qu'une réponse tardive n'écrase une sélection plus récente.
  useEffect(() => {
    if (!a || !b || a === b) return;
    let annule = false;
    fetch(
      `/api/accord-deputes?leg=${encodeURIComponent(leg)}&a=${encodeURIComponent(
        a
      )}&b=${encodeURIComponent(b)}`
    )
      .then((r) => (r.ok ? (r.json() as Promise<AccordData>) : null))
      .then((data) => {
        if (!annule) setAccordRes({ a, b, leg, data });
      })
      .catch(() => {
        if (!annule) setAccordRes({ a, b, leg, data: null });
      });
    return () => {
      annule = true;
    };
  }, [a, b, leg]);

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

  // Préréglages « clic-et-compare » : chaque puce arme d'un coup les deux colonnes
  // sur un duel intéressant, pour guider vers des comparaisons pertinentes plutôt
  // que de laisser l'utilisateur face à deux noms pris au hasard de l'alphabet.
  const presets = useMemo(() => {
    const figs = figuresDe(deputes);
    const list: { id: string; label: string; pairs: [string, string][] }[] = [];

    // Gauche ⇄ droite : la figure la plus à gauche face à la plus à droite, puis
    // on resserre vers le centre (2e plus à gauche vs 2e plus à droite, etc.).
    const gd: [string, string][] = [];
    for (let i = 0; i < Math.floor(figs.length / 2); i++) {
      const L = figs[i];
      const R = figs[figs.length - 1 - i];
      if (L.uid !== R.uid && L.abrege !== R.abrege) gd.push([L.uid, R.uid]);
    }
    if (gd.length) list.push({ id: "gd", label: "Gauche ⇄ droite", pairs: gd.slice(0, 8) });

    // Une figure (ou, à défaut, le membre le plus actif) d'un groupe donné.
    const pick = (abrege: string): string | null => {
      const f = figs.find((d) => d.abrege === abrege);
      if (f) return f.uid;
      const membres = deputes
        .filter((d) => d.abrege === abrege)
        .sort((x, y) => y.n_exprime - x.n_exprime);
      return membres[0]?.uid ?? null;
    };
    // Deux poids lourds : un représentant par groupe (positionsGroupes() trie par
    // effectif décroissant), appariés en commençant par les groupes voisins en
    // taille — les plus gros d'abord — puis en élargissant l'écart.
    const reps = positions
      .map((g) => (g.abrege ? pick(g.abrege) : null))
      .filter((x): x is string => Boolean(x));
    const pl: [string, string][] = [];
    for (let gap = 1; gap < reps.length; gap++) {
      for (let i = 0; i + gap < reps.length; i++) {
        if (reps[i] !== reps[i + gap]) pl.push([reps[i], reps[i + gap]]);
      }
    }
    if (pl.length) list.push({ id: "pl", label: "Deux poids lourds", pairs: pl.slice(0, 12) });

    return list;
  }, [deputes, positions]);

  // Tirage aléatoire (dans un gestionnaire d'événement, donc sans risque
  // d'hydratation) : deux figures distinctes, pour la découverte.
  const surprise = () => {
    const figs = figuresDe(deputes);
    const pool = figs.length >= 2 ? figs : deputes;
    if (pool.length < 2) return;
    const i = Math.floor(Math.random() * pool.length);
    let j = Math.floor(Math.random() * pool.length);
    while (j === i) j = Math.floor(Math.random() * pool.length);
    setA(pool[i].uid);
    setB(pool[j].uid);
  };

  // Index courant de défilement de chaque préréglage : un clic arme la paire
  // courante puis avance d'un cran (en boucle), comme un « au hasard » guidé.
  const [presetIdx, setPresetIdx] = useState<Record<string, number>>({});
  const cyclePreset = (p: { id: string; pairs: [string, string][] }) => {
    const i = presetIdx[p.id] ?? 0;
    const pair = p.pairs[i % p.pairs.length];
    if (!pair) return;
    setA(pair[0]);
    setB(pair[1]);
    setPresetIdx((m) => ({ ...m, [p.id]: (i + 1) % p.pairs.length }));
  };
  const armedPreset = (p: { pairs: [string, string][] }) =>
    p.pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

  const onLeg = (l: string) => {
    setLeg(l);
    const [na, nb] = defautParlant(data[l].deputes);
    setA(na);
    setB(nb);
    setPresetIdx({});
  };

  const dA = deputes.find((x) => x.uid === a);
  const dB = deputes.find((x) => x.uid === b);
  const accordPret = accordRes?.a === a && accordRes?.b === b && accordRes?.leg === leg;
  const accordData = accordPret ? accordRes?.data ?? null : null;

  return (
    <div className="space-y-4">
      <LegTabs legs={legs} current={leg} onChange={onLeg} data={data} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[var(--muted)]">Comparaisons suggérées :</span>
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => cyclePreset(p)}
            aria-pressed={armedPreset(p)}
            title={p.pairs.length > 1 ? "Cliquez pour faire défiler d'autres duels" : undefined}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              armedPreset(p)
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
            }`}
          >
            {p.label}
            {p.pairs.length > 1 && <span className="ml-1 opacity-60">↻</span>}
          </button>
        ))}
        <button
          onClick={surprise}
          className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)]"
        >
          Au hasard
        </button>
      </div>

      {dA && dB && a !== b && (
        <FaceAFace a={dA} b={dB} leg={leg} data={accordData} loading={!accordPret} />
      )}

      {dA && dB && a !== b && (
        <div className="md:hidden">
          <DeputeVs
            a={dA}
            b={dB}
            setA={setA}
            setB={setB}
            deputes={deputes}
            groupesDispo={groupesDispo}
            orientDeputes={orientDeputes}
            condamDeputes={condamDeputes}
          />
        </div>
      )}

      <div className="hidden gap-4 md:grid md:grid-cols-2">
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
      {a && b && a !== b && (
        <PartageVisuel
          href={`/comparateur/partage/deputes?leg=${encodeURIComponent(leg)}&a=${encodeURIComponent(
            a,
          )}&b=${encodeURIComponent(b)}`}
        />
      )}
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
        leg={leg}
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
  leg,
  positions,
  accord,
  deputes,
  orientGroupes,
  condamGroupes,
}: {
  leg: string;
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
        {/* Logos des deux groupes, face à face */}
        <div className="mt-3 flex items-start justify-center gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <GroupLogo abrege={a} libelle={gA?.libelle} size={60} />
            <span className="text-sm font-semibold" style={{ color: colorA }}>{a}</span>
          </div>
          <span className="mt-6 lowercase italic text-[var(--muted)]">vs</span>
          <div className="flex flex-col items-center gap-1.5">
            <GroupLogo abrege={b} libelle={gB?.libelle} size={60} />
            <span className="text-sm font-semibold" style={{ color: colorB }}>{b}</span>
          </div>
        </div>
        <div className="stat-num mt-3 text-4xl font-bold">{taux == null ? "—" : pct(taux)}</div>
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

      <OrientationVs
        rowsA={orientGroupes[a] ?? []}
        rowsB={orientGroupes[b] ?? []}
        labelA={a}
        labelB={b}
        colorA={groupColor(a)}
        colorB={groupColor(b)}
        sujet="groupe"
      />
      {a && b && a !== b && (
        <div className="mt-6">
          <PartageVisuel
            href={`/comparateur/partage/groupes?leg=${encodeURIComponent(leg)}&a=${encodeURIComponent(
              a,
            )}&b=${encodeURIComponent(b)}`}
          />
        </div>
      )}
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
        <div className="hidden truncate text-xs text-[var(--muted)] sm:block" title={libelle ?? ""}>
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
