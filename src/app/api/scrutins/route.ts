import { scrutins } from "@/lib/db";

// Pagination / filtrage des scrutins pour la page /scrutins (rendue en statique).
// La liste peut atteindre des milliers de lignes : on ne les embarque donc pas
// côté client (contrairement à /deputes), on interroge cette route au fil des
// filtres. Elle réutilise exactement la même fonction scrutins() que le serveur
// (aucune duplication de logique), et ne renvoie qu'une page (25 lignes).
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const { rows, total, pages, page } = scrutins({
    search: u.get("q")?.trim() || undefined,
    page: parseInt(u.get("page") ?? "1", 10) || 1,
    perPage: 25,
    leg: u.get("leg") || undefined,
    categorie: u.get("cat") || undefined,
    loisOnly: u.get("loi") !== "0",
    includeBudget: u.get("budget") !== "0",
  });
  return Response.json({ rows, total, pages, page });
}
