import { ImageResponse } from "next/og";
import {
  positionsGroupes,
  orientationGroupesParCategorie,
  legislatures,
  LEGISLATURE_LABEL,
} from "@/lib/db";
import { ORIENTATION_POLES, groupColor } from "@/lib/ui";
import { compareCardElement, buildThemes } from "@/lib/compareCard";

// Visuel carré 1080×1080 (format post Instagram) du comparateur de deux groupes,
// centré sur leurs orientations par thème mises face à face. Généré à la demande
// à partir de la sélection passée en query (?leg=&a=&b=, a/b = abrégé de groupe).
export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const leg = url.searchParams.get("leg") ?? legislatures()[0];
  const aAbrege = url.searchParams.get("a") ?? "";
  const bAbrege = url.searchParams.get("b") ?? "";

  const positions = positionsGroupes(leg);
  const gA = positions.find((g) => g.abrege === aAbrege);
  const gB = positions.find((g) => g.abrege === bAbrege);
  if (!gA || !gB) return new Response("Groupes introuvables", { status: 404 });

  const orient = orientationGroupesParCategorie(leg);
  const themes = buildThemes(orient[aAbrege] ?? [], orient[bAbrege] ?? [], ORIENTATION_POLES);

  return new ImageResponse(
    compareCardElement({
      legLabel: LEGISLATURE_LABEL[leg] ?? `Législature ${leg}`,
      kind: "groupe",
      a: { label: aAbrege, sub: gA.libelle, color: groupColor(aAbrege) },
      b: { label: bAbrege, sub: gB.libelle, color: groupColor(bAbrege) },
      themes,
    }),
    {
      width: 1080,
      height: 1080,
      headers: {
        "Content-Disposition": `inline; filename="quivotequoi-comparateur-groupes.png"`,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
