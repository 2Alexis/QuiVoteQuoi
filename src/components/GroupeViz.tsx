import Link from "next/link";
import { groupColor } from "@/lib/ui";

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

// Figures connues par groupe (abrégé). Résolues contre les membres réels de la
// législature : un nom absent de la base pour la législature choisie n'apparaît pas.
const TETES_AFFICHE: Record<string, string[]> = {
  RN: ["Marine Le Pen", "Sébastien Chenu", "Jean-Philippe Tanguy", "Laure Lavalette"],
  UDR: ["Éric Ciotti"],
  "LFI-NFP": ["Mathilde Panot", "Éric Coquerel", "Manuel Bompard", "Clémence Guetté"],
  SOC: ["Boris Vallaud", "Olivier Faure", "Jérôme Guedj"],
  EcoS: ["Cyrielle Chatelain", "Sandrine Rousseau"],
  GDR: ["André Chassaigne", "Stéphane Peu"],
  DR: ["Laurent Wauquiez", "Annie Genevard"],
  EPR: ["Gabriel Attal", "Sylvain Maillard", "Aurore Bergé"],
  Dem: ["Jean-Paul Mattei", "Erwan Balanant"],
  HOR: ["Laurent Marcangeli", "Naïma Moutchou"],
  LIOT: ["Charles de Courson", "Bertrand Pancher"],
};

const normNom = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim();

export function MdsMap({ positions }: { positions: GroupePos[] }) {
  const W = 480;
  const H = 360;
  const pad = 40;
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
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
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
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        <strong className="text-[var(--foreground)]">Axe horizontal :</strong> gauche ↔ droite, selon la
        proximité des votes. <strong className="text-[var(--foreground)]">Axe vertical :</strong> les groupes
        du haut votent le plus souvent <em>avec la majorité présidentielle</em>, ceux du bas s&apos;y opposent
        le plus. Deux groupes proches sur la carte votent de façon semblable&nbsp;; la taille du cercle reflète
        le nombre de députés.
      </p>
      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Légende
        </div>
        <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {positions.map((g) => (
            <div key={g.uid} className="flex items-center gap-2 text-xs">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: groupColor(g.abrege) }}
              />
              <span className="font-semibold">{g.abrege}</span>
              <span className="truncate text-[var(--muted)]">{g.libelle}</span>
              <span className="ml-auto shrink-0 stat-num text-[var(--muted)]">{g.n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CohesionInterne({ positions }: { positions: GroupePos[] }) {
  return (
    <div className="space-y-2">
      {[...positions]
        .sort((x, y) => y.cohesion - x.cohesion)
        .map((g) => (
          <div key={g.uid} className="flex items-center gap-3">
            <span
              className="w-14 shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-bold text-white"
              style={{ background: groupColor(g.abrege) }}
            >
              {g.abrege}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-[var(--border)]">
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
  );
}

export function TetesAffiche({
  positions,
  deputes,
}: {
  positions: GroupePos[];
  deputes: DeputeFig[];
}) {
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
  const groupesAvecFigures = positions.filter((g) => figuresParGroupe[g.uid]?.length);
  if (groupesAvecFigures.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groupesAvecFigures.map((g) => (
        <div key={g.uid} className="rounded-lg border border-[var(--border)] p-3">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 text-xs font-bold text-white"
              style={{ background: groupColor(g.abrege) }}
            >
              {g.abrege}
            </span>
            <span className="truncate text-sm text-[var(--muted)]">{g.libelle}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {figuresParGroupe[g.uid].map((d) => (
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
