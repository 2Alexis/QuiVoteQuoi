"use client";

import { useRouter } from "next/navigation";

// Filtre catégorie en menu déroulant natif, réservé au mobile (les puces
// colorées restent sur desktop). Un select est plus lisible qu'un nuage de
// puces qui se replient de façon irrégulière quand il y a une douzaine de
// catégories. La navigation réutilise les URLs déjà calculées côté serveur
// (elles préservent legislature, recherche et filtres lois/budget).
export function CategoryFilterSelect({
  current,
  options,
}: {
  current: string;
  options: { value: string; label: string; href: string }[];
}) {
  const router = useRouter();
  return (
    <div className="relative">
      <select
        aria-label="Filtrer par catégorie"
        value={current}
        onChange={(e) => {
          const opt = options.find((o) => o.value === e.target.value);
          if (opt) router.push(opt.href);
        }}
        className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 pr-10 text-sm font-medium outline-none focus:border-[var(--accent)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
        aria-hidden
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
