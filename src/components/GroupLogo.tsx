import logos from "@/data/group-logos.json";
import { groupColor } from "@/lib/ui";

const MANIFEST = logos as Record<string, string>;

export function hasGroupLogo(abrege?: string | null): boolean {
  return !!(abrege && MANIFEST[abrege]);
}

// Logo officiel du parti dans une pastille blanche ; repli sur une pastille
// colorée avec l'abrégé quand aucun logo n'est disponible (LIOT, NI…).
export function GroupLogo({
  abrege,
  libelle,
  size = 48,
  radius = "0.75rem",
}: {
  abrege?: string | null;
  libelle?: string | null;
  size?: number;
  radius?: string;
}) {
  const src = abrege ? MANIFEST[abrege] : undefined;
  if (!src) {
    return (
      <span
        className="flex shrink-0 items-center justify-center font-bold text-white"
        style={{ width: size, height: size, borderRadius: radius, background: groupColor(abrege), fontSize: size * 0.3 }}
      >
        {abrege ?? "—"}
      </span>
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden bg-white p-1.5"
      style={{ width: size, height: size, borderRadius: radius, boxShadow: "0 0 0 1px var(--border)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={libelle ? `Logo ${libelle}` : `Logo ${abrege}`}
        loading="lazy"
        className="h-full w-full object-contain"
      />
    </span>
  );
}
