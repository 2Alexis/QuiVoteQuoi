import type { Metadata } from "next";

// URL publique du site, sans slash final. Surchargeable via NEXT_PUBLIC_SITE_URL
// (p. ex. un domaine personnalisé) ; repli sur l'hébergement Render actuel.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://quivotequoi.onrender.com"
).replace(/\/$/, "");

export const SITE_NAME = "QuiVoteQuoi";

// Fabrique des métadonnées cohérentes pour une page : titre (le gabarit du
// layout ajoute « · QuiVoteQuoi »), description, URL canonique + Open Graph /
// Twitter. Les champs communs (siteName, locale, card d'image…) proviennent du
// layout et sont fusionnés automatiquement par Next. Les chemins sont relatifs :
// Next les résout contre `metadataBase`.
export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
}): Metadata {
  const canonical = opts.path;
  const ogTitle = opts.ogTitle ?? `${opts.title} · ${SITE_NAME}`;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: ogTitle,
      description: opts.description,
    },
    twitter: {
      title: ogTitle,
      description: opts.description,
    },
  };
}
