"use client";

import dynamic from "next/dynamic";
import type { DeptAgg } from "@/components/FranceMap";

// Chargement différé de la carte de France : le tracé des 96 départements (~150 Ko
// de géométrie SVG) sortait du HTML initial de /deputes et alourdissait chaque
// rendu serveur. Ici la carte est un chunk client chargé après l'hydratation, et
// le conteneur réserve déjà sa place (aspect-ratio) pour éviter tout décalage.
const FranceMap = dynamic(() => import("@/components/FranceMap").then((m) => m.FranceMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-[var(--surface)]" />,
});

export function FranceMapLazy({
  width,
  height,
  aggregats,
  leg,
  selected,
}: {
  width: number;
  height: number;
  aggregats: Record<string, DeptAgg>;
  leg: string;
  selected?: string;
}) {
  return (
    <div style={{ aspectRatio: `${width} / ${height}` }} className="w-full">
      <FranceMap aggregats={aggregats} leg={leg} selected={selected} />
    </div>
  );
}
