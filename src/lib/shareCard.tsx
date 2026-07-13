import { parseScrutin } from "./parseScrutin";
import { sortBadge, categorieColor, formatDate, groupColor } from "./ui";

// Design partagé des visuels d'un scrutin, rendu via `next/og` (satori).
// Deux formats issus du même dessin : carré 1080×1080 (post Instagram,
// téléchargeable) et paysage 1200×630 (image OG des réseaux / aperçu de lien).
// Contrainte satori : couleurs en dur (pas de variables CSS), et tout <div>
// à plusieurs enfants doit porter `display: flex`.

export interface GroupVote {
  abrege: string | null;
  pour: number;
  contre: number;
  abstention: number;
  nonvotant: number;
}

export interface ShareCardInput {
  numero: number;
  date: string;
  titre: string | null;
  categorie: string | null;
  sortCode: string | null;
  pour: number;
  contre: number;
  abstention: number;
  nonvotant: number;
  groupes: GroupVote[];
}

export type ShareFormat = "square" | "landscape";

const C = {
  bg: "#ffffff",
  fg: "#161a20",
  muted: "#5b6572",
  accent: "#4f46e5",
  pour: "#2E9E5B",
  contre: "#C8102E",
  abstention: "#E7A100",
  nonvotant: "#94A3B8",
  barTrack: "#eef1f4",
  hair: "#e7ebf0",
};

const SIZES = {
  square: {
    w: 1080, h: 1080, pad: 64, brand: 38, meta: 27, kicker: 24, catDot: 15,
    title: 42, titleMax: 92, badge: 32, badgePad: "11px 26px",
    numLabel: 23, brandDot: 17, footer: 25,
    sectionTitle: 25, legendFont: 21, legendDot: 19,
    gLabel: 19, gCount: 20, gBarW: 50, gBarH: 340, maxGroups: 12,
  },
  landscape: {
    w: 1200, h: 630, pad: 44, brand: 30, meta: 23, kicker: 20, catDot: 13,
    title: 37, titleMax: 72, badge: 27, badgePad: "8px 20px",
    numLabel: 18, brandDot: 14, footer: 20,
    sectionTitle: 20, legendFont: 16, legendDot: 14,
    gLabel: 18, gCount: 16, gBarW: 74, gBarH: 98, maxGroups: 9,
  },
} as const;

function truncate(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

export function shareCardElement(input: ShareCardInput, format: ShareFormat) {
  const S = SIZES[format];
  const p = parseScrutin(input.titre);
  const bigTitle = truncate(
    p.loi ?? p.action ?? input.titre ?? `Scrutin n°${input.numero}`,
    S.titleMax,
  );
  const kicker = (p.loi ? [p.type, p.action].filter(Boolean).join(" · ") : p.type) || "Scrutin";
  const badge = sortBadge(input.sortCode);
  const isAdopte = badge.label === "Adopté";
  const isRejete = badge.label === "Rejeté";
  const badgeBg = isAdopte ? "#E4F5EA" : isRejete ? "#FDE7EA" : "#EEF1F4";
  const badgeFg = isAdopte ? "#1F7A44" : isRejete ? "#B00C26" : "#5B6572";
  const catColor = categorieColor(input.categorie);
  const nf = (n: number) => n.toLocaleString("fr-FR");

  // Ne garde que les groupes ayant réellement voté, du plus gros au plus petit.
  const groupes = [...input.groupes]
    .map((g) => ({ ...g, tot: g.pour + g.contre + g.abstention + g.nonvotant }))
    .filter((g) => g.tot > 0)
    .sort((a, b) => b.tot - a.tot)
    .slice(0, S.maxGroups);
  // Hauteur des colonnes proportionnelle à l'effectif : le plus gros groupe atteint
  // la hauteur max, les autres au prorata (avec un plancher pour rester visibles).
  const maxTot = Math.max(1, ...groupes.map((g) => g.tot));
  const barHeight = (tot: number) => Math.max(14, Math.round((tot / maxTot) * S.gBarH));

  const legendChip = (label: string, color: string) => (
    <div style={{ display: "flex", alignItems: "center", marginRight: 26 }}>
      <div style={{ width: S.legendDot, height: S.legendDot, borderRadius: 5, background: color, marginRight: 9 }} />
      <div style={{ fontSize: S.legendFont, color: C.muted }}>{label}</div>
    </div>
  );

  // Segment vertical d'une colonne empilée (part du vote dans la hauteur du groupe).
  const segV = (n: number, color: string, tot: number) =>
    n > 0 ? <div style={{ display: "flex", width: "100%", height: `${(n / tot) * 100}%`, background: color }} /> : null;

  // Une colonne par groupe : effectif au-dessus, barre empilée (pour en bas), abrégé
  // dessous. Hauteur proportionnelle à l'effectif du groupe (cf. barHeight).
  const groupColumn = (g: (typeof groupes)[number]) => (
    <div key={g.abrege ?? "NI"} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      <div style={{ display: "flex", fontSize: S.gCount, color: C.muted, marginBottom: 8 }}>{nf(g.tot)}</div>
      <div
        style={{
          display: "flex", flexDirection: "column-reverse", width: S.gBarW, height: barHeight(g.tot),
          borderRadius: 7, overflow: "hidden", background: C.barTrack,
        }}
      >
        {segV(g.pour, C.pour, g.tot)}
        {segV(g.contre, C.contre, g.tot)}
        {segV(g.abstention, C.abstention, g.tot)}
        {segV(g.nonvotant, C.nonvotant, g.tot)}
      </div>
      <div
        style={{
          display: "flex", marginTop: 12, fontSize: S.gLabel, fontWeight: 700,
          color: groupColor(g.abrege), maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap",
        }}
      >
        {g.abrege ?? "NI"}
      </div>
    </div>
  );

  return (
    <div style={{ width: S.w, height: S.h, display: "flex", flexDirection: "column", background: C.bg, color: C.fg }}>
      <div style={{ display: "flex", width: "100%", height: 12, background: C.accent }} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: S.pad }}>

        {/* En-tête */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: S.brandDot, height: S.brandDot, borderRadius: S.brandDot, background: C.accent, marginRight: 13 }} />
            <div style={{ fontSize: S.brand, fontWeight: 800, letterSpacing: "-0.01em" }}>QuiVoteQuoi</div>
          </div>
          <div style={{ display: "flex", fontSize: S.meta, color: C.muted }}>
            {`n°${input.numero} · ${formatDate(input.date)}`}
          </div>
        </div>

        {/* Intitulé + résultat */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: format === "square" ? 26 : 18 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <div style={{ width: S.catDot, height: S.catDot, borderRadius: S.catDot, background: catColor, marginRight: 11 }} />
            <div style={{ fontSize: S.kicker, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {kicker}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: S.title, fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em" }}>
            {bigTitle}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", background: badgeBg, color: badgeFg, fontSize: S.badge, fontWeight: 800, padding: S.badgePad, borderRadius: 999, marginRight: 22 }}>
              {badge.label}
            </div>
            <div style={{ display: "flex", fontSize: S.numLabel, color: C.muted }}>
              {`${nf(input.pour)} pour · ${nf(input.contre)} contre · ${nf(input.abstention)} abst.`}
            </div>
          </div>
        </div>

        {/* Bar plot : occupe le reste, aligné en haut */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "flex-start", marginTop: format === "square" ? 26 : 16 }}>
          {format === "square" && (
            <div style={{ display: "flex", fontSize: S.sectionTitle, fontWeight: 700, marginBottom: 12 }}>
              Comment chaque groupe a voté
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", marginBottom: format === "square" ? 30 : 16 }}>
            {legendChip("Pour", C.pour)}
            {legendChip("Contre", C.contre)}
            {legendChip("Abstention", C.abstention)}
            {legendChip("Non-votant", C.nonvotant)}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
            {groupes.map(groupColumn)}
          </div>
        </div>

        {/* Pied */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, borderTop: `1px solid ${C.hair}`, paddingTop: 14 }}>
          <div style={{ display: "flex", fontSize: S.footer, color: C.muted }}>quivotequoi.onrender.com</div>
          <div style={{ display: "flex", fontSize: S.footer, color: C.muted }}>Les votes de l’Assemblée nationale</div>
        </div>

      </div>
    </div>
  );
}
