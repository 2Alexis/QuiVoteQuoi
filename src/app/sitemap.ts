import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { sitemapDeputes, sitemapScrutins, sitemapGroupes } from "@/lib/db";

// Plan du site pour les moteurs de recherche : il liste toutes les URL
// indexables (pages fixes + fiches député / scrutin / groupe). Régénéré au
// build (déploiement nocturne) puis revalidé en arrière-plan toutes les heures,
// comme les fiches, plutôt qu'à chaque requête du crawler.
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const statiques: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/scrutins`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/deputes`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/groupes`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/comparateur`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  const scrutins: MetadataRoute.Sitemap = sitemapScrutins().map((s) => ({
    url: `${SITE_URL}/scrutins/${s.uid}`,
    lastModified: s.date ? new Date(s.date) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const deputes: MetadataRoute.Sitemap = sitemapDeputes().map((d) => ({
    url: `${SITE_URL}/deputes/${d.uid}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const groupes: MetadataRoute.Sitemap = sitemapGroupes().map((g) => ({
    url: `${SITE_URL}/groupes/${g.uid}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...statiques, ...scrutins, ...deputes, ...groupes];
}
