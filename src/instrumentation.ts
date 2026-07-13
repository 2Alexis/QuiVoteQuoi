// Maintien « au chaud » de /deputes et /groupes.
//
// Sur l'offre Render gratuite (512 Mo de RAM), même quand l'instance ne s'endort
// pas, l'OS récupère la mémoire des routes dynamiques inactives : les pages de la
// base SQLite (221 Mo) et le chemin de rendu SSR de ces routes sortent du cache.
// Le premier accès après une période calme est alors lent (« latence après le
// repas »), alors que la page d'accueil — statique, pré-générée — n'est jamais
// concernée. Le ping keep-alive existant vise /health (volontairement léger, sans
// base) : il empêche la veille mais ne réchauffe pas ces deux pages.
//
// On les sollicite donc nous-mêmes, périodiquement, depuis le serveur : cela
// garde leur working set (pages SQLite + code SSR compilé) résident, donc le clic
// de l'utilisateur reste rapide même après une longue inactivité.
export async function register() {
  // Uniquement dans le vrai runtime Node en production (ni edge, ni build, ni dev).
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;

  const base = `http://127.0.0.1:${process.env.PORT || "3000"}`;
  const warm = () =>
    Promise.all(
      ["/deputes", "/groupes"].map((path) =>
        fetch(`${base}${path}`, { headers: { "x-prewarm": "1" } })
          .then((r) => r.status)
          .catch(() => "err")
      )
    );

  // Premier passage une fois le serveur en écoute, puis toutes les 4 min — sous le
  // délai au bout duquel le cache se refroidit sur une instance sous pression mémoire.
  console.log("[prewarm] actif — /deputes + /groupes toutes les 4 min");
  setTimeout(() => warm().then((r) => console.log("[prewarm] premier passage:", r)), 10_000);
  setInterval(warm, 4 * 60 * 1000);
}
