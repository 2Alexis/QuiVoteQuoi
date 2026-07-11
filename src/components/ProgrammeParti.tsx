import type { ProgrammeParti } from "@/lib/programmes";

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

// « 2026-07 » → « juillet 2026 ».
function formatMaj(maj: string): string {
  const [y, m] = maj.split("-").map(Number);
  const nom = MOIS[(m ?? 1) - 1] ?? "";
  return `${nom} ${y}`.trim();
}

// Encart « Programme — présidentielle 2027 » sur la fiche d'un groupe.
// Contenu éditorial curaté et PROVISOIRE (cf. src/lib/programmes.ts) : chaque
// point est sourcé, et un avertissement rappelle qu'à ce stade (mi-2026) les
// programmes ne sont pas définitifs.
export function ProgrammePartiSection({ p }: { p: ProgrammeParti }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Programme · présidentielle 2027</h2>
        <p className="text-sm text-[var(--muted)]">
          Positions portées par {p.parti} pour l&apos;élection présidentielle de 2027.
        </p>
      </div>

      <div className="card space-y-4 p-5">
        {/* Candidat·e + statut */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-base font-semibold">{p.candidat}</div>
            {p.resume && <p className="mt-0.5 text-sm text-[var(--muted)]">{p.resume}</p>}
          </div>
          <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent-strong)]">
            {p.statut}
          </span>
        </div>

        {/* Points clés, chacun sourcé */}
        {p.points.length > 0 ? (
          <ul className="space-y-3 border-t border-[var(--border)] pt-4">
            {p.points.map((pt, i) => (
              <li key={i} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                <span className="inline-flex h-fit shrink-0 items-center rounded-md bg-[var(--background)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] sm:w-32">
                  {pt.theme}
                </span>
                <span className="flex-1 text-sm">
                  {pt.texte}{" "}
                  <a
                    href={pt.source}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="whitespace-nowrap text-xs link-accent"
                  >
                    source ↗
                  </a>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
            Programme détaillé à venir : à ce stade, les mesures ne sont pas encore publiées.
          </p>
        )}

        {p.sourceProgramme && (
          <a
            href={p.sourceProgramme}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex text-sm font-medium link-accent"
          >
            Programme officiel ↗
          </a>
        )}
      </div>

      {p.note && <p className="text-xs text-[var(--muted)]">{p.note}</p>}

      {/* Avertissement : contenu provisoire */}
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Élection à venir (avril 2027). À ce stade, les programmes ne sont pas définitifs : ces
        éléments proviennent de candidatures et de prises de position publiques (mise à jour&nbsp;:{" "}
        {formatMaj(p.maj)}) et peuvent évoluer. Contenu indicatif, à vérifier via les liens sources.
      </p>
    </section>
  );
}
