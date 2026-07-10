import Link from "next/link";
import departementsData from "@/data/departements.json";
import { groupColor } from "@/lib/ui";

export interface DeptAgg {
  n: number;
  abrege: string | null;
  libelle: string | null;
}

// Carte des départements métropolitains, colorée par le groupe majoritaire.
// Chaque département renvoie vers la liste des députés filtrée.
export function FranceMap({
  aggregats,
  leg,
  selected,
}: {
  aggregats: Record<string, DeptAgg>;
  leg: string;
  selected?: string;
}) {
  const { width, height, departements } = departementsData;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Carte des départements de France métropolitaine"
    >
      {departements.map((d) => {
        const agg = aggregats[d.code];
        const isSel = selected === d.code;
        const fill = agg ? groupColor(agg.abrege) : "#c7d0d9";
        const title = agg
          ? `${d.nom} (${d.code}) · ${agg.n} siège${agg.n > 1 ? "s" : ""}${
              agg.abrege ? ` · maj. ${agg.abrege}` : ""
            }`
          : `${d.nom} (${d.code})`;
        return (
          <Link key={d.code} href={`/deputes?leg=${leg}&dept=${d.code}`}>
            <path
              d={d.d}
              fill={fill}
              stroke={isSel ? "var(--foreground)" : "var(--surface)"}
              strokeWidth={isSel ? 2.5 : 0.6}
              className="cursor-pointer opacity-90 transition-opacity hover:opacity-100"
              style={isSel ? { opacity: 1 } : undefined}
            >
              <title>{title}</title>
            </path>
          </Link>
        );
      })}
    </svg>
  );
}
