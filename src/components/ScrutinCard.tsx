import type { ElementType } from "react";
import { parseScrutin, type ScrutinType } from "@/lib/parseScrutin";

// Couleur de repère par type de scrutin (même langage visuel que les pills du
// projet : teinte pleine sur fond translucide `${couleur}1a`).
const TYPE_COLOR: Record<ScrutinType, string> = {
  Amendement: "#2563AC",
  Article: "#64748B",
  "Vote final": "#2E9E5B",
  Motion: "#C8102E",
  Autre: "#8A96A3",
};

// Carte de scrutin : remplace le pavé de titre brut par une hiérarchie lisible
// — un badge pour le type, l'intitulé de la loi en grand, et la nature du texte
// / détails techniques (action, auteur, n° d'amendement) en secondaire italique.
export function ScrutinCard({
  titre,
  as: Heading = "h3" as ElementType,
  size = "sm",
  className = "",
}: {
  titre: string | null | undefined;
  /** Élément de titre pour l'intitulé de loi (h1 sur la fiche, h3 en liste). */
  as?: ElementType;
  size?: "sm" | "lg";
  className?: string;
}) {
  const p = parseScrutin(titre);
  const color = TYPE_COLOR[p.type];

  // Intitulé principal : la loi si elle est identifiée, sinon l'action (cas des
  // motions de censure, sans texte associé), sinon le titre brut en dernier recours.
  const principal = p.loi ?? p.action ?? titre ?? "Scrutin";

  // Ligne de détails sous le titre. Quand l'intitulé principal est déjà le nom de la loi,
  // on affiche la nature du texte (ex. "Projet de loi") au lieu de répéter inutilement le titre.
  const details = (
    p.loi
      ? [
          p.action === "Vote sur l'ensemble du texte"
            ? (p.meta.typeTexte ?? "Vote sur l'ensemble du texte")
            : p.action,
          p.meta.auteur,
          p.meta.numeroAmendement ? `amendement n° ${p.meta.numeroAmendement}` : null,
        ]
      : [
          p.action ?? p.meta.typeTexte,
          p.meta.auteur,
          p.meta.cosignataires ? `${p.meta.cosignataires} cosignataires` : null,
        ]
  )
    .filter(Boolean)
    .join(" · ");

  const titleCls = size === "lg" ? "text-2xl font-bold leading-snug" : "font-semibold leading-snug";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ color, background: `${color}1a` }}
        >
          {p.type}
        </span>
        {p.meta.etapeLecture ? (
          <span className="text-xs text-[var(--muted)]">{p.meta.etapeLecture}</span>
        ) : null}
        {p.meta.examenPrioritaire ? (
          <span className="text-xs italic text-[var(--muted)]">examen prioritaire</span>
        ) : null}
      </div>

      <Heading className={`mt-1 ${titleCls}`}>{principal}</Heading>

      {details ? (
        <p className="mt-0.5 text-sm italic text-[var(--muted)] truncate" title={details}>
          {details}
        </p>
      ) : null}
    </div>
  );
}
