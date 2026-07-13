import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  async headers() {
    return [
      {
        // Logos des groupes (fichiers statiques public/groupes/*.png). Par défaut
        // Next sert le dossier public/ en `Cache-Control: max-age=0` : le
        // navigateur revalide chaque logo à chaque affichage et Cloudflare (devant
        // Render) ne les met pas en cache (cf-cache-status: DYNAMIC) → chaque logo
        // repart jusqu'au serveur d'origine, d'où la lenteur. On force un cache long
        // pour qu'ils soient servis depuis le cache navigateur + l'edge Cloudflare.
        // Restreint aux .png pour ne PAS toucher les pages /groupes/[uid].
        source: "/groupes/:file(.*\\.png)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
