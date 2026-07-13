import { ImageResponse } from "next/og";
import { scrutin, ventilationScrutin, effectifsGroupesADate } from "@/lib/db";
import { shareCardElement } from "@/lib/shareCard";

// Visuel carré 1080×1080 téléchargeable (format post Instagram), généré à la
// demande à partir des données du scrutin. Même dessin que l'aperçu OG.
export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const sc = scrutin(uid);
  if (!sc) return new Response("Scrutin introuvable", { status: 404 });

  const eff = effectifsGroupesADate(sc.legislature, sc.date);
  const groupes = ventilationScrutin(uid).map((v) => ({ ...v, membres: eff[v.groupe_uid ?? ""] }));

  return new ImageResponse(
    shareCardElement(
      {
        numero: sc.numero,
        date: sc.date,
        titre: sc.titre,
        categorie: sc.categorie,
        sortCode: sc.sort_code,
        pour: sc.pour ?? 0,
        contre: sc.contre ?? 0,
        abstention: sc.abstentions ?? 0,
        nonvotant: sc.non_votants ?? 0,
        groupes,
      },
      "square",
    ),
    {
      width: 1080,
      height: 1080,
      headers: {
        "Content-Disposition": `inline; filename="quivotequoi-scrutin-${sc.numero}.png"`,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
