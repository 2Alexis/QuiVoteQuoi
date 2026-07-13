"use client";

import { useState } from "react";
import { DeputeCarte, type DeputeCardData } from "@/components/DeputeCarte";

// Liste des anciens députés au-delà de l'aperçu : rendue à l'ouverture seulement.
// Les cartes (photo + badge par député) ne sont donc PAS incluses dans le HTML
// initial de /deputes — ce qui allégeait la page de ~57 cartes rendues pour rien
// dans un <details> replié. Seules les données (légères) transitent en props.
export function AnciensReste({ deputes, leg }: { deputes: DeputeCardData[]; leg: string }) {
  const [open, setOpen] = useState(false);
  if (deputes.length === 0) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-center text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        {open ? "Réduire ▴" : `Voir les ${deputes.length} autres anciens députés ▾`}
      </button>
      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deputes.map((d) => (
            <DeputeCarte key={d.uid} d={d} leg={leg} ancien />
          ))}
        </div>
      )}
    </div>
  );
}
