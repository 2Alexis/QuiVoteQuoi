import { ImageResponse } from "next/og";
import {
  deputesPourComparaison,
  orientationDeputesParCategorie,
  legislatures,
  LEGISLATURE_LABEL,
} from "@/lib/db";
import { ORIENTATION_POLES } from "@/lib/ui";
import { compareCardElement, buildThemes } from "@/lib/compareCard";

// Visuel carré 1080×1080 (format post Instagram) du comparateur de deux députés,
// centré sur leurs orientations par thème mises face à face. Généré à la demande
// à partir de la sélection passée en query (?leg=&a=&b=, a/b = uid de député).
export const runtime = "nodejs";
export const revalidate = 3600;

// Couleurs d'identité du comparateur (un député par « côté »), volontairement
// neutres et distinctes du teal/ambre des pôles d'orientation.
const IDENT_A = "#7048E8"; // violet
const IDENT_B = "#F76707"; // orange

export async function GET(req: Request) {
  const url = new URL(req.url);
  const leg = url.searchParams.get("leg") ?? legislatures()[0];
  const aUid = url.searchParams.get("a") ?? "";
  const bUid = url.searchParams.get("b") ?? "";

  const deputes = deputesPourComparaison(leg);
  const dA = deputes.find((d) => d.uid === aUid);
  const dB = deputes.find((d) => d.uid === bUid);
  if (!dA || !dB) return new Response("Députés introuvables", { status: 404 });

  const orient = orientationDeputesParCategorie(leg);
  const themes = buildThemes(orient[aUid] ?? [], orient[bUid] ?? [], ORIENTATION_POLES);

  return new ImageResponse(
    compareCardElement({
      legLabel: LEGISLATURE_LABEL[leg] ?? `Législature ${leg}`,
      kind: "depute",
      a: { label: `${dA.prenom} ${dA.nom}`, sub: dA.abrege ?? "Non inscrit", color: IDENT_A },
      b: { label: `${dB.prenom} ${dB.nom}`, sub: dB.abrege ?? "Non inscrit", color: IDENT_B },
      themes,
    }),
    {
      width: 1080,
      height: 1080,
      headers: {
        "Content-Disposition": `inline; filename="quivotequoi-comparateur-deputes.png"`,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
