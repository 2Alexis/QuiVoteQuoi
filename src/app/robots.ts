import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// robots.txt : on autorise l'indexation de tout le site et on pointe les
// crawlers vers le plan du site. Le SITE_URL sert d'hôte canonique.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
