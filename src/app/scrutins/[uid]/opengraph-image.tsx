import { ImageResponse } from "next/og";
import { scrutin, ventilationScrutin } from "@/lib/db";
import { shareCardElement } from "@/lib/shareCard";

// Image d'aperçu (Open Graph / Twitter) générée pour chaque scrutin : Next
// l'expose automatiquement en <meta og:image> sur /scrutins/[uid]. Lecture
// SQLite → runtime Node ; mis en cache et revalidé comme la page.
export const runtime = "nodejs";
export const revalidate = 3600;

export const alt = "Résultat du vote à l'Assemblée nationale — QuiVoteQuoi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const sc = scrutin(uid);

  if (!sc) {
    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            color: "#4f46e5",
            fontSize: 64,
            fontWeight: 800,
            fontFamily: "sans-serif",
          }}
        >
          QuiVoteQuoi
        </div>
      ),
      size,
    );
  }

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
        groupes: ventilationScrutin(uid),
      },
      "landscape",
    ),
    size,
  );
}
