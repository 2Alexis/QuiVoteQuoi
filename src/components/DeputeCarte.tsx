import Link from "next/link";
import { GroupBadge } from "@/components/bits";
import { DeputePhoto } from "@/components/DeputePhoto";
import { deputePhotoUrl, groupColor } from "@/lib/ui";

// Champs strictement nécessaires à la carte : permet de n'embarquer côté client
// que ces données légères (pas la profession, la civilité… de ~1300 députés).
export interface DeputeCardData {
  uid: string;
  prenom: string;
  nom: string;
  groupe_abrege: string | null;
  groupe_libelle: string | null;
  dept: string | null;
  num_circo: string | null;
  cause_fin?: string | null;
}

// Étiquette courte pour le motif de fin de mandat d'un ancien député.
export function causeCourte(cause: string | null | undefined): string | null {
  if (!cause) return null;
  const c = cause.toLowerCase();
  if (c.includes("gouvernement") && c.includes("nomination")) return "Entré·e au Gouvernement";
  if (c.includes("reprise")) return "Remplacé·e (retour d’un ministre)";
  if (c.includes("incompatibilit")) return "Incompatibilité (cumul)";
  if (c.includes("annulation")) return "Élection annulée";
  if (c.includes("conseil constitutionnel")) return "Décision du Conseil const.";
  if (c.includes("décès") || c.includes("deces")) return "Décès";
  if (c.includes("mission")) return "Mission temporaire";
  if (c.includes("démission") || c.includes("demission")) return "Démission";
  return cause;
}

// Carte d'un député, réutilisée pour les mandats en cours et les anciens députés.
// Module « partagé » (sans "use client") : rendu côté serveur dans la liste
// principale, et côté client dans AnciensReste (chargement à l'ouverture).
export function DeputeCarte({ d, leg, ancien }: { d: DeputeCardData; leg: string; ancien?: boolean }) {
  const cause = ancien ? causeCourte(d.cause_fin) : null;
  return (
    <Link
      href={`/deputes/${d.uid}`}
      className={`card flex flex-col items-center gap-2 p-4 text-center transition hover:scale-[1.02] hover:shadow-sm ${
        ancien ? "opacity-90" : ""
      }`}
      style={{ borderTop: `3px solid ${groupColor(d.groupe_abrege)}` }}
    >
      <DeputePhoto
        src={deputePhotoUrl(d.uid, leg)}
        prenom={d.prenom}
        nom={d.nom}
        color={groupColor(d.groupe_abrege)}
        size={88}
      />
      <div className="font-semibold leading-tight">
        {d.prenom} {d.nom}
      </div>
      <div className="text-xs text-[var(--muted)]">
        {d.dept ? `${d.dept} · circo. ${d.num_circo}` : "—"}
      </div>
      <GroupBadge abrege={d.groupe_abrege} libelle={d.groupe_libelle} />
      {cause && (
        <span className="mt-0.5 rounded-full bg-[var(--border)]/60 px-2 py-0.5 text-[11px] text-[var(--muted)]">
          {cause}
        </span>
      )}
    </Link>
  );
}
