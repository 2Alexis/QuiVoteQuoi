import Link from "next/link";

// Marque du site : un fronton classique (temple / Assemblée) dessiné en SVG
// monochrome (`currentColor`) — net à toute taille, réutilisé pour le logo
// (en-tête + pied de page), le favicon (src/app/icon.svg) et l'image de partage.
export function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" className={className} aria-hidden focusable="false">
      {/* Le dessin s'étend de y=6 (sommet du fronton) à y=62.5 (base), soit un
          centre à 34.25 au lieu de 32 : on le remonte de 2.25 pour le centrer
          verticalement dans le carré (sinon le bâtiment "tombe" vers le bas). */}
      <g transform="translate(0 -2.25)">
        {/* Fronton (triangle évidé) */}
        <path fillRule="evenodd" d="M32 6 58 25 6 25Z M32 13.5 49 23.5 15 23.5Z" />
        {/* Architrave */}
        <rect x="9" y="27" width="46" height="6" rx="1" />
        {/* Colonnes */}
        <rect x="12.5" y="33" width="4" height="19" />
        <rect x="19.5" y="33" width="4" height="19" />
        <rect x="26.5" y="33" width="4" height="19" />
        <rect x="33.5" y="33" width="4" height="19" />
        <rect x="40.5" y="33" width="4" height="19" />
        <rect x="47.5" y="33" width="4" height="19" />
        {/* Base + degré */}
        <rect x="7" y="52" width="50" height="5.5" rx="1" />
        <rect x="5" y="59.5" width="54" height="3" rx="1.5" />
      </g>
    </svg>
  );
}

// Logo complet (tuile indigo + bâtiment blanc + mot-symbole), partagé entre
// l'en-tête et le pied de page pour rester cohérent.
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`.trim()}
      aria-label="QuiVoteQuoi — accueil"
    >
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-white"
      >
        <BuildingIcon className="h-[18px] w-[18px]" />
      </span>
      <span className="text-lg">
        Qui<span className="text-[var(--accent)]">Vote</span>Quoi
      </span>
    </Link>
  );
}
