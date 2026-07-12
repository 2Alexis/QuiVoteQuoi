import { parseScrutin } from "./parseScrutin";
import { sortBadge, categorieColor, formatDate } from "./ui";

// Design partagé des visuels d'un scrutin, rendu via `next/og` (satori).
// Deux formats issus du même dessin : carré 1080×1080 (post Instagram,
// téléchargeable) et paysage 1200×630 (image OG des réseaux / aperçu de lien).
// Contrainte satori : couleurs en dur (pas de variables CSS), et tout <div>
// à plusieurs enfants doit porter `display: flex`.

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
};

const SIZES = {
  square: {
    w: 1080, h: 1080, pad: 76, brand: 42, meta: 30, kicker: 28, catDot: 18,
    title: 62, titleMax: 135, badge: 42, badgePad: "18px 36px",
    num: 74, numLabel: 26, bar: 26, footer: 28, brandDot: 20,
  },
  landscape: {
    w: 1200, h: 630, pad: 58, brand: 34, meta: 26, kicker: 24, catDot: 15,
    title: 48, titleMax: 92, badge: 34, badgePad: "12px 28px",
    num: 54, numLabel: 22, bar: 20, footer: 23, brandDot: 16,
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

  const total = input.pour + input.contre + input.abstention + input.nonvotant || 1;
  const seg = (n: number, color: string) =>
    n > 0 ? <div style={{ width: `${(n / total) * 100}%`, background: color }} /> : null;

  const nf = (n: number) => n.toLocaleString("fr-FR");
  const numberBlock = (value: number, label: string, color: string) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: S.num, fontWeight: 800, color, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {nf(value)}
      </div>
      <div style={{ fontSize: S.numLabel, color: C.muted, marginTop: 8 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ width: S.w, height: S.h, display: "flex", flexDirection: "column", background: C.bg, color: C.fg }}>
      <div style={{ display: "flex", width: "100%", height: 12, background: C.accent }} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: S.pad, justifyContent: "space-between" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: S.brandDot, height: S.brandDot, borderRadius: S.brandDot, background: C.accent, marginRight: 14 }} />
            <div style={{ fontSize: S.brand, fontWeight: 800, letterSpacing: "-0.01em" }}>QuiVoteQuoi</div>
          </div>
          <div style={{ fontSize: S.meta, color: C.muted }}>
            {`n°${input.numero} · ${formatDate(input.date)}`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingTop: S.pad * 0.35, paddingBottom: S.pad * 0.35 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
            <div style={{ width: S.catDot, height: S.catDot, borderRadius: S.catDot, background: catColor, marginRight: 12 }} />
            <div style={{ fontSize: S.kicker, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {kicker}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: S.title, fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em" }}>
            {bigTitle}
          </div>
          <div style={{ display: "flex", marginTop: 32 }}>
            <div style={{ display: "flex", alignItems: "center", background: badgeBg, color: badgeFg, fontSize: S.badge, fontWeight: 800, padding: S.badgePad, borderRadius: 999 }}>
              {badge.label}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            {numberBlock(input.pour, "Pour", C.pour)}
            {numberBlock(input.contre, "Contre", C.contre)}
            {numberBlock(input.abstention, "Abstention", C.abstention)}
            {numberBlock(input.nonvotant, "Non-votants", C.nonvotant)}
          </div>
          <div style={{ display: "flex", width: "100%", height: S.bar, borderRadius: 999, overflow: "hidden", background: C.barTrack }}>
            {seg(input.pour, C.pour)}
            {seg(input.contre, C.contre)}
            {seg(input.abstention, C.abstention)}
            {seg(input.nonvotant, C.nonvotant)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26 }}>
            <div style={{ display: "flex", fontSize: S.footer, color: C.muted }}>quivotequoi.onrender.com</div>
            <div style={{ display: "flex", fontSize: S.footer, color: C.muted }}>Les votes de l’Assemblée nationale</div>
          </div>
        </div>

      </div>
    </div>
  );
}
