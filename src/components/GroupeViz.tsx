import Link from "next/link";
import { groupColor } from "@/lib/ui";
import { TETES_AFFICHE, normNom } from "@/lib/figures";

// Visualisations de groupes réutilisables (cartographie MDS, cohésion interne,
// têtes d'affiche). Composants serveur : rendu pur, sans interactivité.

export interface GroupePos {
  uid: string;
  abrege: string | null;
  libelle: string | null;
  n: number;
  cohesion: number;
  x: number;
  y: number;
}
export interface DeputeFig {
  uid: string;
  nom: string;
  prenom: string;
  abrege: string | null;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function MdsMap({ positions }: { positions: GroupePos[] }) {
  const W = 480;
  const H = 280;
  const pad = 36;
  if (positions.length === 0) return <p className="text-sm text-[var(--muted)]">Aucune donnée.</p>;
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const sx = (x: number) => pad + ((x - minX) / (maxX - minX || 1)) * (W - 2 * pad);
  // y positif = vote avec la majorité → doit s'afficher EN HAUT (donc on inverse)
  const sy = (y: number) => pad + ((maxY - y) / (maxY - minY || 1)) * (H - 2 * pad);
  const maxN = Math.max(...positions.map((p) => p.n));
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
      <div className="min-w-0 lg:w-[640px] lg:shrink-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
        <defs>
          <marker id="mds-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--muted)" />
          </marker>
        </defs>
        {/* axe horizontal : gauche ↔ droite */}
        <line x1={pad - 6} y1={H / 2} x2={W - pad + 6} y2={H / 2} stroke="var(--muted)" strokeWidth={1} markerStart="url(#mds-arrow)" markerEnd="url(#mds-arrow)" />
        {/* axe vertical : majorité (haut) ↔ opposition (bas) */}
        <line x1={W / 2} y1={pad - 6} x2={W / 2} y2={H - pad + 6} stroke="var(--muted)" strokeWidth={1} markerStart="url(#mds-arrow)" markerEnd="url(#mds-arrow)" />
        <text x={pad - 4} y={H / 2 - 6} textAnchor="start" className="fill-[var(--muted)] text-[10px] font-semibold">← Gauche</text>
        <text x={W - pad + 4} y={H / 2 - 6} textAnchor="end" className="fill-[var(--muted)] text-[10px] font-semibold">Droite →</text>
        <text x={W / 2 + 6} y={pad + 4} textAnchor="start" className="fill-[var(--muted)] text-[10px] font-semibold">Vote avec la majorité</text>
        <text x={W / 2 + 6} y={H - pad - 2} textAnchor="start" className="fill-[var(--muted)] text-[10px] font-semibold">Vote dans l&apos;opposition</text>
        {positions.map((g) => {
          const r = 8 + (g.n / maxN) * 20;
          return (
            <g key={g.uid}>
              <circle
                cx={sx(g.x)}
                cy={sy(g.y)}
                r={r}
                fill={groupColor(g.abrege)}
                fillOpacity={0.75}
                stroke="white"
                strokeWidth={1.5}
              />
              <text
                x={sx(g.x)}
                y={sy(g.y) - r - 3}
                textAnchor="middle"
                className="fill-[var(--foreground)] text-[10px] font-semibold"
              >
                {g.abrege}
              </text>
            </g>
          );
        })}
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Légende
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-1">
          {positions.map((g) => (
            <div
              key={g.uid}
              className="flex min-w-0 items-center gap-2 text-xs"
              title={g.libelle ?? undefined}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: groupColor(g.abrege) }}
              />
              <span className="font-semibold">{g.abrege}</span>
              <span className="hidden min-w-0 flex-1 truncate text-[var(--muted)] lg:block">
                {g.libelle}
              </span>
              <span className="ml-auto shrink-0 stat-num text-[var(--muted)]">{g.n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CohesionInterne({ positions }: { positions: GroupePos[] }) {
  if (positions.length === 0)
    return <p className="text-sm text-[var(--muted)]">Aucune donnée.</p>;
  const sorted = [...positions].sort((x, y) => y.cohesion - x.cohesion);
  const top = sorted[0];
  const low = sorted[sorted.length - 1];
  return (
    <div className="space-y-3">
      <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {sorted.map((g) => (
          <div key={g.uid} className="flex items-center gap-3">
            <span
              className="w-14 shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-bold text-white"
              style={{ background: groupColor(g.abrege) }}
            >
              {g.abrege}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded bg-[var(--border)]">
              <div
                className="h-full rounded"
                style={{
                  width: `${Math.round(g.cohesion * 100)}%`,
                  background: groupColor(g.abrege),
                }}
              />
            </div>
            <span className="stat-num w-10 text-right text-xs font-semibold">
              {pct(g.cohesion)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Groupe le plus discipliné : <b className="text-[var(--foreground)]">{top.abrege}</b> (
        {pct(top.cohesion)} de votes alignés sur sa position majoritaire). Le plus dispersé :{" "}
        <b className="text-[var(--foreground)]">{low.abrege}</b> ({pct(low.cohesion)}).
      </p>
    </div>
  );
}

// Sélection des têtes d'affiche par groupe (liste fixe TETES_AFFICHE, appariée
// aux députés par nom normalisé). Calculée côté serveur pour ne PAS transmettre
// les ~577 députés au client : seules les quelques figures retenues transitent.
export function selectFigures(
  positions: GroupePos[],
  deputes: DeputeFig[]
): Record<string, DeputeFig[]> {
  const idx = new Map<string, DeputeFig>();
  for (const d of deputes) idx.set(normNom(`${d.prenom} ${d.nom}`), d);
  const figuresParGroupe: Record<string, DeputeFig[]> = {};
  for (const g of positions) {
    const noms = TETES_AFFICHE[g.abrege ?? ""] ?? [];
    const found = noms
      .map((n) => idx.get(normNom(n)))
      .filter((x): x is DeputeFig => Boolean(x) && x!.abrege === g.abrege);
    if (found.length) figuresParGroupe[g.uid] = found;
  }
  return figuresParGroupe;
}

export function TetesAffiche({
  positions,
  figures,
}: {
  positions: GroupePos[];
  figures: Record<string, DeputeFig[]>;
}) {
  const groupesAvecFigures = positions.filter((g) => figures[g.uid]?.length);
  if (groupesAvecFigures.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {groupesAvecFigures.map((g) => (
        <div key={g.uid} className="rounded-lg border border-[var(--border)] p-3">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold text-white"
              style={{ background: groupColor(g.abrege) }}
            >
              {g.abrege}
            </span>
            <span className="min-w-0 truncate text-sm text-[var(--muted)]">{g.libelle}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {figures[g.uid].map((d) => (
              <Link
                key={d.uid}
                href={`/deputes/${d.uid}`}
                className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-medium hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {d.prenom} {d.nom}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
