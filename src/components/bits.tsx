import Link from "next/link";
import {
  groupColor,
  groupOrder,
  POSITION_COLOR,
  categorieColor,
  orientationColor,
  orientationPole,
  ORIENTATION_POLES,
} from "@/lib/ui";

const ORIENTATION_DEFAULT: [string, string] = ["Gauche", "Droite"];

export function OrientationPill({
  categorie,
  orientation,
  score,
}: {
  categorie?: string | null;
  orientation?: string | null;
  score?: number | null;
}) {
  const label = orientation ?? orientationPole(categorie, score);
  if (!label) return null;
  const c = orientationColor(score);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: c, background: `${c}1a` }}
      title={`Orientation ${score != null ? `(${score > 0 ? "+" : ""}${score})` : ""}`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {label}
    </span>
  );
}

const POLE_GAUCHE_COLOR = "#2A9D8F";
const POLE_DROITE_COLOR = "#E0A13C";

// Orientation d'un thème par endorsement : part des votes qui valident le pôle
// « droite » vs le pôle « gauche » du thème. Ne s'annule pas comme une moyenne.
function OrientationLean({
  categorie,
  gaucheN,
  droiteN,
}: {
  categorie: string;
  gaucheN: number;
  droiteN: number;
}) {
  const [gauche, droite] = ORIENTATION_POLES[categorie] ?? ORIENTATION_DEFAULT;
  const tot = gaucheN + droiteN;
  const dp = tot ? droiteN / tot : 0.5; // part « droite »
  const leansDroite = dp > 0.5;
  const share = leansDroite ? dp : 1 - dp;
  const partage = tot === 0 || share < 0.6; // ni l'un ni l'autre ne domine
  const pole = leansDroite ? droite : gauche;
  const poleColor = partage ? "#8A96A3" : leansDroite ? POLE_DROITE_COLOR : POLE_GAUCHE_COLOR;
  // Position du curseur sur l'axe gauche↔droite, bornée pour rester visible.
  const pos = Math.max(0.05, Math.min(0.95, dp));
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        Orientation
      </div>
      {tot === 0 ? (
        <p className="text-xs leading-snug text-[var(--muted)]">
          Aucun texte clairement marqué à gauche ou à droite sur ce thème.
        </p>
      ) : (
        <>
          <div
            className="relative h-2.5 w-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${POLE_GAUCHE_COLOR} 0%, #E8EBEF 50%, ${POLE_DROITE_COLOR} 100%)`,
            }}
            role="img"
            aria-label={`Orientation : ${Math.round((1 - dp) * 100)} % « ${gauche} », ${Math.round(
              dp * 100
            )} % « ${droite} »`}
          >
            <span
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${pos * 100}%`, background: poleColor }}
            />
          </div>
          <div className="mt-1.5 flex justify-between gap-3 text-[11px] leading-tight text-[var(--muted)]">
            <span className="max-w-[46%]">{gauche}</span>
            <span className="max-w-[46%] text-right">{droite}</span>
          </div>
          <p className="mt-1.5 text-xs leading-snug text-[var(--muted)]">
            {partage ? (
              <>Partagé entre «&nbsp;{gauche}&nbsp;» et «&nbsp;{droite}&nbsp;».</>
            ) : (
              <>
                Penche vers <b style={{ color: poleColor }}>«&nbsp;{pole}&nbsp;»</b> (
                {Math.round(share * 100)}%).
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}

export function CategoriePill({ categorie }: { categorie?: string | null }) {
  if (!categorie) return null;
  const c = categorieColor(categorie);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: c, background: `${c}1a` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {categorie}
    </span>
  );
}

export function GroupBadge({
  abrege,
  libelle,
  uid,
  size = "sm",
}: {
  abrege?: string | null;
  libelle?: string | null;
  uid?: string | null;
  size?: "sm" | "md";
}) {
  const color = groupColor(abrege);
  const inner = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold text-white ${
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
      style={{ background: color }}
      title={libelle ?? undefined}
    >
      {abrege ?? "?"}
    </span>
  );
  if (uid) return <Link href={`/groupes/${uid}`}>{inner}</Link>;
  return inner;
}

export function VoteBar({
  pour,
  contre,
  abstention,
  nonvotant = 0,
}: {
  pour: number;
  contre: number;
  abstention: number;
  nonvotant?: number;
}) {
  const total = pour + contre + abstention + nonvotant || 1;
  const seg = (n: number, c: string) =>
    n > 0 ? <span style={{ width: `${(n / total) * 100}%`, background: c }} /> : null;
  return (
    <div
      className="votebar"
      role="img"
      aria-label={`Résultat du vote : ${pour} pour, ${contre} contre, ${abstention} abstention${
        nonvotant > 0 ? `, ${nonvotant} non-votant` : ""
      }`}
      title={`Pour ${pour} · Contre ${contre} · Abstention ${abstention}`}
    >
      {seg(pour, POSITION_COLOR.pour)}
      {seg(contre, POSITION_COLOR.contre)}
      {seg(abstention, POSITION_COLOR.abstention)}
      {seg(nonvotant, POSITION_COLOR.nonvotant)}
    </div>
  );
}

// Jauge circulaire d'un indicateur en pourcentage (participation, cohésion,
// alignement…) : plus lisible et accrocheuse qu'une simple barre, partagée entre
// les fiches député et groupe. Quatre cartes tiennent en 2×2 sans « trou ».
export function MetricRing({
  label,
  value,
  hint,
  color = "var(--accent)",
}: {
  label: string;
  value: number;
  hint: string;
  color?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  const R = 26;
  const C = 2 * Math.PI * R;
  const off = C * (1 - v);
  return (
    <div className="card flex flex-col items-center gap-2 p-3 text-center sm:flex-row sm:items-center sm:gap-4 sm:p-4 sm:text-left">
      <div className="relative h-14 w-14 shrink-0 sm:h-16 sm:w-16">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
          <circle cx="32" cy="32" r={R} fill="none" stroke="var(--border)" strokeWidth="7" />
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={off}
          />
        </svg>
        <span className="stat-num absolute inset-0 flex items-center justify-center text-sm font-bold">
          {Math.round(v * 100)}%
        </span>
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold leading-tight sm:text-sm">{label}</div>
        <div className="mt-1 hidden text-[11px] leading-snug text-[var(--muted)] sm:block">{hint}</div>
      </div>
    </div>
  );
}

// Sélecteur de législature. Deux modes : navigation par lien (`base` → ?leg=…)
// pour les pages serveur, ou rappel `onSelect` pour un basculement client instantané
// (pages statiques dont les données des deux législatures sont déjà chargées).
export function LegSwitcher({
  current,
  base,
  legislatures,
  onSelect,
}: {
  current: string;
  base?: string;
  legislatures: string[];
  onSelect?: (leg: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        Législature
      </span>
      <div className="inline-flex overflow-hidden rounded-lg border border-[var(--border)] text-sm">
        {legislatures.map((l) => {
          const active = l === current;
          const cls = `px-3 py-1.5 font-medium ${
            active
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
          }`;
          return onSelect ? (
            <button key={l} type="button" onClick={() => onSelect(l)} className={cls}>
              {l}
              <sup>e</sup>
            </button>
          ) : (
            <Link key={l} href={`${base ?? ""}?leg=${l}`} className={cls}>
              {l}
              <sup>e</sup>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function CategorieVotesList({
  rows,
}: {
  rows: {
    categorie: string;
    pour: number;
    contre: number;
    abstention: number;
    nonvotant: number;
    total: number;
    orient_gauche?: number;
    orient_droite?: number;
  }[];
}) {
  if (!rows.length)
    return <p className="text-sm text-[var(--muted)]">Aucune donnée par catégorie.</p>;
  return (
    <div className="space-y-3">
      <dl className="space-y-1 text-xs leading-relaxed text-[var(--muted)]">
        <div>
          <dt className="inline font-semibold text-[var(--foreground)]">Approbation :</dt>{" "}
          <dd className="inline">part des votes pour / contre / abstention, tous textes confondus.</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-[var(--foreground)]">Orientation :</dt>{" "}
          <dd className="inline">
            tendance gauche-droite, sur les seuls textes marqués à gauche ou à droite.
          </dd>
        </div>
      </dl>
      <div className="divide-y divide-[var(--border)]">
        {rows.map((r) => {
          const exp = r.pour + r.contre + r.abstention || 1;
          const pourPct = Math.round((r.pour / exp) * 100);
          const contrePct = Math.round((r.contre / exp) * 100);
          const abstPct = Math.max(0, 100 - pourPct - contrePct);
          const tendance =
            r.pour > r.contre ? "Plutôt pour" : r.contre > r.pour ? "Plutôt contre" : "Partagé";
          const tendanceColor =
            r.pour > r.contre
              ? POSITION_COLOR.pour
              : r.contre > r.pour
                ? POSITION_COLOR.contre
                : "#8A96A3";
          return (
            <div key={r.categorie} className="py-4 first:pt-0 last:pb-0">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: categorieColor(r.categorie) }}
                />
                <span className="text-sm font-semibold">{r.categorie}</span>
              </div>
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Approbation
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ color: tendanceColor, background: `${tendanceColor}1a` }}
                    >
                      {tendance}
                    </span>
                  </div>
                  <VoteBar pour={r.pour} contre={r.contre} abstention={r.abstention} />
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: POSITION_COLOR.pour }}
                      />
                      {pourPct}% pour
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: POSITION_COLOR.contre }}
                      />
                      {contrePct}% contre
                    </span>
                    {abstPct > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: POSITION_COLOR.abstention }}
                        />
                        {abstPct}% abst.
                      </span>
                    )}
                  </div>
                </div>
                <OrientationLean
                  categorie={r.categorie}
                  gaucheN={r.orient_gauche ?? 0}
                  droiteN={r.orient_droite ?? 0}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// « Avec qui vote ce groupe » : classement des taux de co-vote avec les autres
// groupes. Sémantique accord/désaccord (vert = votent ensemble, rouge = s'opposent),
// sans rapport avec l'axe gauche/droite.
const COVOTE_HIGH = "#2A9D8F";
const COVOTE_MID = "#9AA5B1";
const COVOTE_LOW = "#C25E5E";
const covoteColor = (t: number) => (t >= 0.6 ? COVOTE_HIGH : t >= 0.45 ? COVOTE_MID : COVOTE_LOW);

export function GroupeAccords({
  abrege,
  accords,
}: {
  abrege?: string | null;
  accords: {
    uid: string;
    abrege: string | null;
    libelle: string | null;
    taux: number;
    n: number;
  }[];
}) {
  if (!accords.length)
    return <p className="text-sm text-[var(--muted)]">Pas de données de co-vote pour ce groupe.</p>;
  const me = abrege ?? "Ce groupe";
  const top = accords[0];
  const bottom = accords[accords.length - 1];
  const allies = accords.filter((a) => a.taux >= 0.6);
  const pct = (t: number) => `${Math.round(t * 100)}%`;
  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Part des scrutins où <b className="text-[var(--foreground)]">{me}</b>{" "}a adopté la même
        position majoritaire que chaque autre groupe. Taux élevé = les deux blocs votent ensemble ;
        taux faible = ils s&apos;opposent.
      </p>
      <div className="space-y-2">
        {accords.map((a) => {
          const c = covoteColor(a.taux);
          return (
            <div key={a.uid} className="flex items-center gap-3">
              <div className="w-16 shrink-0">
                <GroupBadge abrege={a.abrege} libelle={a.libelle} uid={a.uid} />
              </div>
              <div className="h-2 flex-1 overflow-hidden rounded bg-[var(--border)]">
                <div
                  className="h-full rounded"
                  style={{ width: `${Math.round(a.taux * 100)}%`, background: c }}
                />
              </div>
              <span
                className="w-10 shrink-0 text-right text-xs font-semibold"
                style={{ color: c }}
                title={`${a.n.toLocaleString("fr-FR")} scrutins communs`}
              >
                {pct(a.taux)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        {me} vote le plus souvent comme <b className="text-[var(--foreground)]">{top.abrege}</b> (
        {pct(top.taux)}){allies.length > 1 && (
          <>
            {" "}
            et forme un bloc avec{" "}
            <b className="text-[var(--foreground)]">
              {allies
                .slice(0, 4)
                .map((a) => a.abrege)
                .join(", ")}
            </b>{" "}
            (≥ 60&nbsp;% de votes communs)
          </>
        )}
        . À l&apos;inverse, il ne rejoint <b className="text-[var(--foreground)]">{bottom.abrege}</b>{" "}
        que {pct(bottom.taux)} du temps.
      </p>
    </div>
  );
}

export function PositionPill({ position }: { position: keyof typeof POSITION_COLOR }) {
  const labels = { pour: "Pour", contre: "Contre", abstention: "Abstention", nonvotant: "Non-votant" };
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold"
      style={{ color: POSITION_COLOR[position] }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: POSITION_COLOR[position] }} />
      {labels[position]}
    </span>
  );
}

// Hémicycle en demi-anneau : chaque groupe occupe un secteur proportionnel à son
// nombre de sièges, classé de la gauche (à gauche) à la droite (à droite).
export function Hemicycle({
  groupes,
}: {
  groupes: { uid: string; abrege: string | null; libelle: string | null; n?: number | null }[];
}) {
  const data = [...groupes]
    .map((g) => ({ ...g, n: g.n ?? 0 }))
    .filter((g) => g.n > 0)
    .sort((a, b) => groupOrder(a.abrege) - groupOrder(b.abrege));
  const total = data.reduce((s, g) => s + g.n, 0);
  if (total === 0) return null;

  const W = 440;
  const cx = W / 2;
  const cy = 210;
  const outerR = 200;
  const innerR = 108;
  const labelR = (outerR + innerR) / 2;
  const H = cy + 26;

  const pol = (r: number, a: number): [number, number] => [
    cx + r * Math.cos(a),
    cy - r * Math.sin(a),
  ];

  // On balaie de π (gauche) vers 0 (droite). Angles cumulés calculés sans mutation.
  const wedges = data.map((g, i) => {
    const seatsBefore = data.slice(0, i).reduce((s, x) => s + x.n, 0);
    const span = (g.n / total) * Math.PI;
    const t1 = Math.PI - (seatsBefore / total) * Math.PI;
    const t2 = t1 - span;
    const tm = (t1 + t2) / 2;
    const [ox1, oy1] = pol(outerR, t1);
    const [ox2, oy2] = pol(outerR, t2);
    const [ix2, iy2] = pol(innerR, t2);
    const [ix1, iy1] = pol(innerR, t1);
    const d = `M ${ox1.toFixed(2)} ${oy1.toFixed(2)} A ${outerR} ${outerR} 0 0 1 ${ox2.toFixed(2)} ${oy2.toFixed(2)} L ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${innerR} ${innerR} 0 0 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`;
    const [lx, ly] = pol(labelR, tm);
    return { g, d, lx, ly, big: span > 0.12 };
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full max-w-lg"
      role="img"
      aria-label={`Composition de l'Assemblée : ${total} sièges`}
    >
      {wedges.map(({ g, d, lx, ly, big }) => {
        const color = groupColor(g.abrege);
        return (
          <Link key={g.uid} href={`/groupes/${g.uid}`}>
            <path d={d} fill={color} stroke="var(--surface)" strokeWidth={1.5}>
              <title>{`${g.libelle} · ${g.n} sièges`}</title>
            </path>
            {big && (
              <text
                x={lx.toFixed(2)}
                y={ly.toFixed(2)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={700}
                fill="white"
              >
                {g.n}
              </text>
            )}
          </Link>
        );
      })}
      <text
        x={cx}
        y={cy - 30}
        textAnchor="middle"
        fontSize={30}
        fontWeight={800}
        fill="var(--foreground)"
      >
        {total}
      </text>
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={14} fill="var(--muted)">
        députés
      </text>
    </svg>
  );
}

// Hémicycle d'un scrutin coupé en deux : à gauche les votes « contre », à droite
// les votes « pour ». Chaque demi-hémicycle est rempli des groupes (couleur du
// groupe), en proportion de leurs voix de ce côté. Abstentions / non-votants
// résumés en légende sous le graphique.
export function HemicycleVote({
  groupes,
}: {
  groupes: {
    groupe_uid: string;
    abrege: string | null;
    libelle: string | null;
    pour: number;
    contre: number;
    abstention: number;
    nonvotant: number;
  }[];
}) {
  const totalPour = groupes.reduce((s, g) => s + g.pour, 0);
  const totalContre = groupes.reduce((s, g) => s + g.contre, 0);
  const totalAbst = groupes.reduce((s, g) => s + g.abstention, 0);
  const totalNv = groupes.reduce((s, g) => s + g.nonvotant, 0);

  const W = 440;
  const cx = W / 2;
  const cy = 210;
  const outerR = 200;
  const innerR = 108;
  const labelR = (outerR + innerR) / 2;
  const H = cy + 46;

  const pol = (r: number, a: number): [number, number] => [
    cx + r * Math.cos(a),
    cy - r * Math.sin(a),
  ];

  // Construit les secteurs d'un demi-hémicycle. `a0`/`a1` : angles de début/fin
  // (on balaie de a0 décroissant vers a1). `pick` : voix du groupe de ce côté.
  const buildSide = (
    a0: number,
    a1: number,
    pick: (g: (typeof groupes)[number]) => number
  ) => {
    const data = groupes
      .map((g) => ({ g, n: pick(g) }))
      .filter((d) => d.n > 0)
      .sort((x, y) => groupOrder(x.g.abrege) - groupOrder(y.g.abrege));
    const tot = data.reduce((s, d) => s + d.n, 0);
    if (tot === 0) return [];
    const swept = a0 - a1;
    return data.map((d, i) => {
      const before = data.slice(0, i).reduce((s, x) => s + x.n, 0);
      const span = (d.n / tot) * swept;
      const t1 = a0 - (before / tot) * swept;
      const t2 = t1 - span;
      const tm = (t1 + t2) / 2;
      const [ox1, oy1] = pol(outerR, t1);
      const [ox2, oy2] = pol(outerR, t2);
      const [ix2, iy2] = pol(innerR, t2);
      const [ix1, iy1] = pol(innerR, t1);
      const path = `M ${ox1.toFixed(2)} ${oy1.toFixed(2)} A ${outerR} ${outerR} 0 0 1 ${ox2.toFixed(2)} ${oy2.toFixed(2)} L ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${innerR} ${innerR} 0 0 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`;
      const [lx, ly] = pol(labelR, tm);
      return { d, path, lx, ly, big: span > 0.14 };
    });
  };

  // Gauche (π → π/2) : contre. Droite (π/2 → 0) : pour.
  const contre = buildSide(Math.PI, Math.PI / 2, (g) => g.contre);
  const pour = buildSide(Math.PI / 2, 0, (g) => g.pour);

  const renderSide = (
    side: ReturnType<typeof buildSide>,
    verb: string
  ) =>
    side.map(({ d, path, lx, ly, big }) => {
      const color = groupColor(d.g.abrege);
      return (
        <Link key={`${verb}-${d.g.groupe_uid}`} href={`/groupes/${d.g.groupe_uid}`}>
          <path d={path} fill={color} stroke="var(--surface)" strokeWidth={1.5}>
            <title>{`${d.g.libelle ?? d.g.abrege} · ${d.n} ${verb}`}</title>
          </path>
          {big && (
            <text
              x={lx.toFixed(2)}
              y={ly.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={13}
              fontWeight={700}
              fill="white"
            >
              {d.n}
            </text>
          )}
        </Link>
      );
    });

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto block h-auto w-full max-w-lg"
        role="img"
        aria-label={`Résultat du scrutin : ${totalContre} contre, ${totalPour} pour`}
      >
        {renderSide(contre, "contre")}
        {renderSide(pour, "pour")}

        {/* Trait de séparation vertical au centre. */}
        <line
          x1={cx}
          y1={cy - outerR - 4}
          x2={cx}
          y2={cy - innerR + 4}
          stroke="var(--border)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />

        {/* Totaux et libellés, dans le creux de l'anneau. */}
        <text
          x={cx - 58}
          y={cy - 20}
          textAnchor="middle"
          fontSize={30}
          fontWeight={800}
          fill={POSITION_COLOR.contre}
        >
          {totalContre}
        </text>
        <text x={cx - 58} y={cy + 2} textAnchor="middle" fontSize={13} fill="var(--muted)">
          Contre
        </text>
        <text
          x={cx + 58}
          y={cy - 20}
          textAnchor="middle"
          fontSize={30}
          fontWeight={800}
          fill={POSITION_COLOR.pour}
        >
          {totalPour}
        </text>
        <text x={cx + 58} y={cy + 2} textAnchor="middle" fontSize={13} fill="var(--muted)">
          Pour
        </text>
      </svg>

      {(totalAbst > 0 || totalNv > 0) && (
        <div className="mt-2 flex justify-center gap-4 text-xs text-[var(--muted)]">
          {totalAbst > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: POSITION_COLOR.abstention }}
              />
              {totalAbst} abstention{totalAbst > 1 ? "s" : ""}
            </span>
          )}
          {totalNv > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: POSITION_COLOR.nonvotant }}
              />
              {totalNv} non-votant{totalNv > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Condamnations judiciaires connues d'un député (source Wikidata/Wikipédia).
// Présentation factuelle, avec lien source par ligne et rappel de la
// présomption d'innocence (certaines décisions peuvent être frappées d'appel).
export function Condamnations({
  items,
}: {
  items: {
    infraction: string;
    date: string | null;
    wikidata_qid: string | null;
    wikipedia_url: string | null;
  }[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Condamnations judiciaires</h2>
      <div className="card overflow-hidden rounded-xl border border-[#C25E5E]/40">
        <ul className="divide-y divide-[var(--border)]">
          {items.map((c, i) => {
            const src = c.wikipedia_url || (c.wikidata_qid && `https://www.wikidata.org/wiki/${c.wikidata_qid}`);
            return (
              <li key={i} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <span className="font-medium capitalize">{c.infraction}</span>
                  {c.date && (
                    <span className="ml-2 text-xs text-[var(--muted)]">
                      {c.date.slice(0, 4)}
                    </span>
                  )}
                </div>
                {src && (
                  <a
                    href={src}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="shrink-0 text-xs link-accent"
                  >
                    source ↗
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Données issues de Wikidata / Wikipédia (propriété « condamné pour »), même socle que
        casier-politique.fr. Les intitulés d&apos;infraction reprennent ceux de la source et
        peuvent recouvrir des décisions de première instance ou frappées d&apos;appel. La
        présomption d&apos;innocence s&apos;applique tant qu&apos;une condamnation n&apos;est pas
        définitive. Vérifiez chaque cas via le lien source.
      </p>
    </section>
  );
}

// Résumé des condamnations d'un groupe : compteurs + bouton « détail » (dépliant)
// listant les députés concernés et leurs infractions (avec liens sources).
export function CondamnationsGroupe({
  membres,
}: {
  membres: {
    uid: string;
    prenom: string | null;
    nom: string | null;
    infractions: {
      infraction: string;
      date: string | null;
      wikidata_qid: string | null;
      wikipedia_url: string | null;
    }[];
  }[];
}) {
  if (membres.length === 0) return null;
  const nInfractions = membres.reduce((s, m) => s + m.infractions.length, 0);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Condamnations judiciaires</h2>
      <div className="card rounded-xl border border-[#C25E5E]/40 p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <div className="text-2xl font-bold">{membres.length}</div>
            <div className="text-xs text-[var(--muted)]">
              député{membres.length > 1 ? "s" : ""} concerné{membres.length > 1 ? "s" : ""}
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold">{nInfractions}</div>
            <div className="text-xs text-[var(--muted)]">
              condamnation{nInfractions > 1 ? "s" : ""} recensée{nInfractions > 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <details className="group mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:border-[var(--accent)] hover:text-[var(--accent)]">
            <span className="group-open:hidden">Détail ▾</span>
            <span className="hidden group-open:inline">Réduire ▴</span>
          </summary>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {membres.map((m) => (
              <li key={m.uid} className="py-2.5">
                <Link href={`/deputes/${m.uid}`} className="font-medium link-accent">
                  {m.prenom} {m.nom}
                </Link>
                <ul className="mt-1 space-y-0.5">
                  {m.infractions.map((c, i) => {
                    const src =
                      c.wikipedia_url ||
                      (c.wikidata_qid && `https://www.wikidata.org/wiki/${c.wikidata_qid}`);
                    return (
                      <li key={i} className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <span className="capitalize">{c.infraction}</span>
                        {c.date && <span className="text-xs">· {c.date.slice(0, 4)}</span>}
                        {src && (
                          <a
                            href={src}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-xs link-accent"
                          >
                            source ↗
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Source : Wikidata / Wikipédia. Décisions possiblement de première instance ou en appel ;
            la présomption d&apos;innocence s&apos;applique. Vérifiez via les liens.
          </p>
        </details>
      </div>
    </section>
  );
}

// Tableau catégories socio-professionnelles (INSEE) × groupes.
// Chaque cellule = part de la catégorie au sein du groupe (colonne).
export function ProfessionsGroupes({
  table,
}: {
  table: {
    groupes: { abrege: string; libelle: string | null; n: number }[];
    categories: { cat: string; total: number; parGroupe: Record<string, number> }[];
  };
}) {
  const { groupes: gs, categories } = table;
  const totalDeputes = gs.reduce((s, g) => s + g.n, 0);
  const shade = (p: number) => {
    // Fond bleu d'intensité proportionnelle à la part (0 → transparent, 1 → vif).
    const a = Math.min(0.85, p * 1.6);
    return p > 0 ? `rgba(37,99,172,${a.toFixed(3)})` : undefined;
  };
  const pct = (n: number, d: number) => (d > 0 ? (100 * n) / d : 0);

  return (
    <>
      {/* Ordinateur / tablette : matrice complète catégories × groupes. */}
      <div className="-mx-1 hidden overflow-x-auto pb-1 sm:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--surface)] p-2 text-left font-semibold">
                Catégorie
              </th>
              {gs.map((g) => (
                <th key={g.abrege} className="p-1.5 text-center align-bottom">
                  <span
                    className="mx-auto flex h-7 w-11 items-center justify-center rounded-md text-[11px] font-bold text-white"
                    style={{ background: groupColor(g.abrege) }}
                    title={g.libelle ?? g.abrege}
                  >
                    {g.abrege}
                  </span>
                  <div className="mt-1 text-[10px] font-normal text-[var(--muted)]">{g.n}</div>
                </th>
              ))}
              <th className="p-1.5 text-center align-bottom text-[var(--muted)]">
                Ens.
                <div className="mt-1 text-[10px] font-normal">{totalDeputes}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.cat} className="border-t border-[var(--border)]">
                <td className="sticky left-0 z-10 bg-[var(--surface)] p-2 pr-3 font-medium">
                  {c.cat}
                </td>
                {gs.map((g) => {
                  const n = c.parGroupe[g.abrege] ?? 0;
                  const p = pct(n, g.n);
                  return (
                    <td
                      key={g.abrege}
                      className="p-1.5 text-center tabular-nums"
                      style={{ background: shade(p / 100), color: p > 33 ? "white" : undefined }}
                      title={`${n} député${n > 1 ? "s" : ""} sur ${g.n}`}
                    >
                      {p > 0 ? `${Math.round(p)}%` : "·"}
                    </td>
                  );
                })}
                <td className="p-1.5 text-center tabular-nums font-medium text-[var(--muted)]">
                  {Math.round(pct(c.total, totalDeputes))}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Téléphone : une carte dépliable par groupe (pas de défilement latéral). */}
      <div className="space-y-2 sm:hidden">
        {gs.map((g) => {
          const rows = categories
            .map((c) => ({ cat: c.cat, n: c.parGroupe[g.abrege] ?? 0, p: pct(c.parGroupe[g.abrege] ?? 0, g.n) }))
            .filter((r) => r.n > 0)
            .sort((a, b) => b.p - a.p);
          const color = groupColor(g.abrege);
          return (
            <details key={g.abrege} className="group card overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center gap-2 p-3">
                <span
                  className="flex h-6 min-w-[2.75rem] items-center justify-center rounded-md px-1.5 text-[11px] font-bold text-white"
                  style={{ background: color }}
                >
                  {g.abrege}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{g.libelle ?? g.abrege}</span>
                <span className="shrink-0 text-xs text-[var(--muted)]">{g.n} dép.</span>
                <span className="shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" aria-hidden>
                  ▾
                </span>
              </summary>
              <div className="space-y-2 border-t border-[var(--border)] p-3">
                {rows.map((r) => (
                  <div key={r.cat} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate" title={r.cat}>
                        {r.cat}
                      </span>
                      <span className="shrink-0 tabular-nums text-[var(--muted)]">
                        {Math.round(r.p)}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                      <div className="h-full rounded-full" style={{ width: `${r.p}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
