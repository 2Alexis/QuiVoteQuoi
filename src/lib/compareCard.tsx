// Visuel de partage du comparateur (carré 1080×1080, post Instagram), rendu via
// `next/og` (satori). Met deux entités (deux députés ou deux groupes) face à face
// sur leurs orientations par thème : un axe dégradé par thème (pôle « gauche » ↔
// pôle « droite ») portant deux points, un par entité.
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
// Les abréges de groupes tiennent à deux sur une ligne : puces en ligne, 6 thèmes.
// Les noms de députés sont longs : puces empilées (une par ligne, hauteur stable)
// et un thème de moins, pour un rendu qui ne déborde jamais.
const MAX_THEMES = { groupe: 6, depute: 5 } as const;

function truncate(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

// Intensité du penchant (0.5 = pile au centre) et pôle dominant.
function lean(dp: number, poleG: string, poleD: string): { pole: string; share: number } {
  const droite = dp >= 0.5;
  return { pole: droite ? poleD : poleG, share: droite ? dp : 1 - dp };
}

// Construit la liste de thèmes face à face à partir des profils bruts des deux
// entités : part du pôle « droite » de chacune, thèmes triés par volume de votes
// cumulé (les plus votés d'abord), pôles résolus via la table passée en argument.
type OrientRow = { categorie: string; gauche: number; droite: number };
export function buildThemes(
  rowsA: OrientRow[],
  rowsB: OrientRow[],
  poles: Record<string, [string, string]>,
): CompareTheme[] {
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
  const stack = input.kind === "depute";
  const themes = input.themes.slice(0, MAX_THEMES[input.kind]);
  const sujetSing = input.kind === "depute" ? "député" : "groupe";

  // Point d'une entité posé sur l'axe : cercle bordé de blanc, positionné en % de
  // la largeur (marginLeft négatif = recentrage sur sa position exacte).
  const dot = (v: number | null, color: string) =>
    v == null ? null : (
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 3,
          left: `${v * 100}%`,
          marginLeft: -10,
          width: 20,
          height: 20,
          borderRadius: 20,
          background: color,
          border: "3px solid #ffffff",
        }}
      />
    );

  // Puce « ● Nom — 72% vers Pôle » sous l'axe, une par entité.
  const leanChip = (v: number | null, color: string, label: string, poleG: string, poleD: string) => {
    if (v == null) {
      return (
        <div style={{ display: "flex", alignItems: "center", marginRight: stack ? 0 : 34, marginBottom: stack ? 3 : 0 }}>
          <div style={{ width: 15, height: 15, borderRadius: 15, background: color, marginRight: 8 }} />
          <div style={{ display: "flex", fontSize: 18, color: C.faint }}>{`${label} · pas de données`}</div>
        </div>
      );
    }
    const { pole, share } = lean(v, poleG, poleD);
    return (
      <div style={{ display: "flex", alignItems: "center", marginRight: stack ? 0 : 34, marginBottom: stack ? 3 : 0 }}>
        <div style={{ width: 15, height: 15, borderRadius: 15, background: color, marginRight: 8 }} />
        <div style={{ display: "flex", fontSize: 18, color: C.fg }}>
          <span style={{ fontWeight: 700, color }}>{label}</span>
          <span style={{ marginLeft: 7, color: C.muted }}>{`${pct(share)} vers ${truncate(pole, 26)}`}</span>
        </div>
      </div>
    );
  };

  const themeRow = (t: CompareTheme) => (
    <div key={t.categorie} style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 7 }}>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 700 }}>{t.categorie}</div>
        <div style={{ display: "flex", fontSize: 15, color: C.faint }}>{`${truncate(t.poleG, 22)}  ↔  ${truncate(t.poleD, 22)}`}</div>
      </div>
      <div style={{ display: "flex", position: "relative", width: "100%", height: 26 }}>
        <div
          style={{
            position: "absolute", top: 9, left: 0, width: "100%", height: 8,
            borderRadius: 999, background: AXIS_GRADIENT,
          }}
        />
        {dot(t.a, input.a.color)}
        {dot(t.b, input.b.color)}
      </div>
      <div style={{ display: "flex", flexDirection: stack ? "column" : "row", flexWrap: stack ? "nowrap" : "wrap", marginTop: 7 }}>
        {leanChip(t.a, input.a.color, input.a.label, t.poleG, t.poleD)}
        {leanChip(t.b, input.b.color, input.b.label, t.poleG, t.poleD)}
      </div>
    </div>
  );

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
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 50 }}>

        {/* En-tête */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 17, height: 17, borderRadius: 17, background: C.accent, marginRight: 13 }} />
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: "-0.01em" }}>QuiVoteQuoi</div>
          </div>
          <div style={{ display: "flex", fontSize: 23, color: C.muted }}>{input.legLabel}</div>
        </div>

        {/* Face à face des deux entités */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
          {entity(input.a, "flex-start")}
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: C.faint, marginLeft: 18, marginRight: 18 }}>vs</div>
          {entity(input.b, "flex-end")}
        </div>

        {/* Intitulé de section */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>Orientation par thème</div>
          <div style={{ display: "flex", fontSize: 18, color: C.muted, marginTop: 5 }}>
            {`Le sens des votes de chaque ${sujetSing}, thème par thème, sur l’axe propre au thème.`}
          </div>
        </div>

        {/* Axes par thème */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "flex-start", marginTop: 18, gap: 14 }}>
          {themes.map(themeRow)}
        </div>

        {/* Pied */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, borderTop: `1px solid ${C.hair}`, paddingTop: 16 }}>
          <div style={{ display: "flex", fontSize: 23, color: C.muted }}>quivotequoi.onrender.com</div>
          <div style={{ display: "flex", fontSize: 23, color: C.muted }}>Les votes de l’Assemblée nationale</div>
        </div>

      </div>
    </div>
  );
}
