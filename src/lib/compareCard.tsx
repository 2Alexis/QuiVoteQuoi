// Visuel de partage du comparateur (carré 1080×1080, post Instagram), rendu via
// `next/og` (satori). Met deux entités (deux députés ou deux groupes) face à face
// sur leurs orientations par thème : un axe dégradé par thème (pôle « gauche » ↔
// pôle « droite ») portant deux points, un par entité, avec le % de penchant sous
// chaque point, dans la couleur de l'entité. L'identité (couleur → entité) est
// donnée une seule fois en haut, avec le « vs ».
// Contrainte satori : couleurs en dur (pas de variables CSS), et tout <div> à
// plusieurs enfants doit porter `display: flex`.

export interface CompareTheme {
  categorie: string;
  poleG: string;
  poleD: string;
  // Part du pôle « droite » (0 = tout à gauche, 1 = tout à droite) ; null = pas de vote marqué.
  a: number | null;
  b: number | null;
}

export interface CompareCardInput {
  legLabel: string;
  kind: "depute" | "groupe";
  a: { label: string; sub: string | null; color: string };
  b: { label: string; sub: string | null; color: string };
  themes: CompareTheme[];
}

const C = {
  bg: "#ffffff",
  fg: "#161a20",
  muted: "#5b6572",
  faint: "#8a96a3",
  accent: "#4f46e5",
  poleG: "#2A9D8F",
  poleMid: "#E8ECF1",
  poleD: "#E0A13C",
  hair: "#e7ebf0",
};

const AXIS_GRADIENT = `linear-gradient(to right, ${C.poleG}, ${C.poleMid}, ${C.poleD})`;
const MAX_THEMES = 7;

function truncate(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

// Intensité du penchant (0.5 = pile au centre → 100 % = tout à un pôle).
function leanShare(dp: number): number {
  return dp >= 0.5 ? dp : 1 - dp;
}

// Positions horizontales des étiquettes de % : les points restent à leur vraie
// place, mais si les deux sont très proches on écarte les étiquettes autour de leur
// milieu pour qu'elles ne se chevauchent pas ; bornées pour ne pas sortir du cadre.
function labelPositions(a: number | null, b: number | null): [number | null, number | null] {
  const clamp = (x: number) => Math.max(0.055, Math.min(0.945, x));
  if (a == null || b == null) return [a == null ? null : clamp(a), b == null ? null : clamp(b)];
  let xa = a;
  let xb = b;
  const MIN = 0.13;
  if (Math.abs(xa - xb) < MIN) {
    const mid = (xa + xb) / 2;
    const lo = mid - MIN / 2;
    const hi = mid + MIN / 2;
    if (xa <= xb) {
      xa = lo;
      xb = hi;
    } else {
      xa = hi;
      xb = lo;
    }
  }
  return [clamp(xa), clamp(xb)];
}

export function buildThemes(
  rowsA: { categorie: string; gauche: number; droite: number }[],
  rowsB: { categorie: string; gauche: number; droite: number }[],
  poles: Record<string, [string, string]>,
): CompareTheme[] {
  type OrientRow = { categorie: string; gauche: number; droite: number };
  const mapA = new Map(rowsA.map((r) => [r.categorie, r]));
  const mapB = new Map(rowsB.map((r) => [r.categorie, r]));
  const cats = Array.from(new Set([...rowsA.map((r) => r.categorie), ...rowsB.map((r) => r.categorie)]));
  const dp = (r?: OrientRow): number | null => {
    if (!r) return null;
    const t = r.gauche + r.droite;
    return t ? r.droite / t : null;
  };
  const weight = (c: string) =>
    (mapA.get(c)?.gauche ?? 0) + (mapA.get(c)?.droite ?? 0) +
    (mapB.get(c)?.gauche ?? 0) + (mapB.get(c)?.droite ?? 0);
  return cats
    .sort((x, y) => weight(y) - weight(x))
    .map((c) => {
      const [poleG, poleD] = poles[c] ?? ["Orientation de gauche", "Orientation de droite"];
      return { categorie: c, poleG, poleD, a: dp(mapA.get(c)), b: dp(mapB.get(c)) };
    });
}

export function compareCardElement(input: CompareCardInput) {
  const themes = input.themes.slice(0, MAX_THEMES);

  // Point d'une entité posé sur l'axe, à sa vraie position, bordé de blanc.
  const dot = (v: number | null, color: string) =>
    v == null ? null : (
      <div
        style={{
          display: "flex", position: "absolute", top: 3, left: `${v * 100}%`, marginLeft: -10,
          width: 20, height: 20, borderRadius: 20, background: color, border: "3px solid #ffffff",
        }}
      />
    );

  // Étiquette de % sous un point, centrée sur sa position (nudgée), dans la couleur de l'entité.
  const pctLabel = (v: number | null, color: string, x: number | null) =>
    v == null || x == null ? null : (
      <div
        style={{
          position: "absolute", top: 21, left: `${x * 100}%`, marginLeft: -32, width: 64,
          display: "flex", justifyContent: "center", fontSize: 18, fontWeight: 800, color,
        }}
      >
        {pct(leanShare(v))}
      </div>
    );

  const themeRow = (t: CompareTheme) => {
    const [xa, xb] = labelPositions(t.a, t.b);
    return (
      <div key={t.categorie} style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 21, fontWeight: 700, marginBottom: 4 }}>{t.categorie}</div>
        <div style={{ display: "flex", position: "relative", width: "100%", height: 42 }}>
          <div
            style={{
              position: "absolute", top: 9, left: 0, width: "100%", height: 8,
              borderRadius: 999, background: AXIS_GRADIENT,
            }}
          />
          {dot(t.a, input.a.color)}
          {dot(t.b, input.b.color)}
          {pctLabel(t.a, input.a.color, xa)}
          {pctLabel(t.b, input.b.color, xb)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
          <div style={{ display: "flex", fontSize: 15, color: C.faint }}>{truncate(t.poleG, 32)}</div>
          <div style={{ display: "flex", fontSize: 15, color: C.faint }}>{truncate(t.poleD, 32)}</div>
        </div>
      </div>
    );
  };

  const entity = (e: CompareCardInput["a"], align: "flex-start" | "flex-end") => (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: align }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ width: 20, height: 20, borderRadius: 20, background: e.color, marginRight: 12 }} />
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: e.color, letterSpacing: "-0.01em" }}>
          {truncate(e.label, 22)}
        </div>
      </div>
      {e.sub ? (
        <div style={{ display: "flex", fontSize: 20, color: C.muted, marginTop: 4 }}>{truncate(e.sub, 30)}</div>
      ) : null}
    </div>
  );

  return (
    <div style={{ width: 1080, height: 1080, display: "flex", flexDirection: "column", background: C.bg, color: C.fg }}>
      <div style={{ display: "flex", width: "100%", height: 12, background: C.accent }} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 46 }}>

        {/* En-tête */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 17, height: 17, borderRadius: 17, background: C.accent, marginRight: 13 }} />
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: "-0.01em" }}>QuiVoteQuoi</div>
          </div>
          <div style={{ display: "flex", fontSize: 23, color: C.muted }}>{input.legLabel}</div>
        </div>

        {/* Face à face des deux entités : la seule fois où l'on nomme A et B (couleur = identité). */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
          {entity(input.a, "flex-start")}
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: C.faint, marginLeft: 18, marginRight: 18 }}>vs</div>
          {entity(input.b, "flex-end")}
        </div>

        {/* Intitulé de section */}
        <div style={{ display: "flex", fontSize: 29, fontWeight: 800, marginTop: 16 }}>Orientation par thème</div>

        {/* Axes par thème : point de chaque entité + son % de penchant, pôles aux extrémités. */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "flex-start", marginTop: 14, gap: 10 }}>
          {themes.map(themeRow)}
        </div>

        {/* Pied */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, borderTop: `1px solid ${C.hair}`, paddingTop: 14 }}>
          <div style={{ display: "flex", fontSize: 23, color: C.muted }}>quivotequoi.onrender.com</div>
          <div style={{ display: "flex", fontSize: 23, color: C.muted }}>Les votes de l’Assemblée nationale</div>
        </div>

      </div>
    </div>
  );
}
