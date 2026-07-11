import { accordDeputes, legislatures } from "@/lib/db";

// Taux d'accord entre deux députés, calculé à la volée (lecture seule). Permet de
// garder la page Comparateur en génération statique tout en rendant dynamique la
// seule donnée qui dépend de la paire sélectionnée.
export const dynamic = "force-dynamic";

const UID_RE = /^PA\d+$/;

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const a = searchParams.get("a") ?? "";
  const b = searchParams.get("b") ?? "";
  const leg = searchParams.get("leg") ?? "";
  if (!UID_RE.test(a) || !UID_RE.test(b) || a === b) {
    return Response.json({ error: "paramètres invalides" }, { status: 400 });
  }
  if (!legislatures().includes(leg)) {
    return Response.json({ error: "législature inconnue" }, { status: 400 });
  }
  return Response.json(accordDeputes(a, b, leg));
}
