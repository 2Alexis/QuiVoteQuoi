"use client";

import { useMemo, useState } from "react";
import { LegSwitcher } from "@/components/bits";
import { type DeptAgg } from "@/components/FranceMap";
import { FranceMapLazy } from "@/components/FranceMapLazy";
import { DeputeCarte, type DeputeCardData } from "@/components/DeputeCarte";
import { AnciensReste } from "@/components/AnciensReste";
import { groupColor } from "@/lib/ui";

export interface DeputeLite extends DeputeCardData {
  groupe_uid: string | null;
  num_dept: string | null;
  titulaire: boolean;
}

export interface DeputesLegData {
  deputies: DeputeLite[];
  groups: { uid: string; abrege: string | null; libelle: string | null }[];
  aggregats: Record<string, DeptAgg>;
  legende: { abrege: string; libelle: string }[];
  outreMer: { code: string; nom: string | null; n: number; abrege: string | null }[];
}

const PER_OPTIONS = [30, 60, 90];
const ANCIENS_APERCU = 12;

// Rendu client de /deputes. La page-coquille est statique (ISR) ; recherche,
// filtre par groupe / département, pagination et changement de législature se
// font ici, sur des données déjà chargées — instantané, sans aller-retour serveur,
// et sans réveil à froid après inactivité. Rien n'est retiré, tout est déplacé côté client.
export function DeputesClient({
  legs,
  data,
  mapWidth,
  mapHeight,
}: {
  legs: string[];
  data: Record<string, DeputesLegData>;
  mapWidth: number;
  mapHeight: number;
}) {
  const [leg, setLeg] = useState(legs[0]);
  const [q, setQ] = useState("");
  const [g, setG] = useState("");
  const [dept, setDept] = useState<string | undefined>(undefined);
  const [per, setPer] = useState(30);
  const [page, setPage] = useState(1);

  const d = data[leg] ?? data[legs[0]];
  const isCurrent = leg === legs[0];

  const { actifs, anciens } = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtered = d.deputies.filter((dep) => {
      if (g && dep.groupe_uid !== g) return false;
      if (dept && dep.num_dept !== dept) return false;
      if (s && !`${dep.prenom} ${dep.nom}`.toLowerCase().includes(s)) return false;
      return true;
    });
    return {
      actifs: filtered.filter((x) => x.titulaire),
      anciens: filtered.filter((x) => !x.titulaire),
    };
  }, [d, q, g, dept]);

  const totalPages = Math.max(1, Math.ceil(actifs.length / per));
  const curPage = Math.min(page, totalPages);
  const shown = actifs.slice((curPage - 1) * per, (curPage - 1) * per + per);
  const anciensApercu = anciens.slice(0, ANCIENS_APERCU);
  const anciensReste = anciens.slice(ANCIENS_APERCU);
  const selectedNom = dept ? d.aggregats[dept]?.libelle ?? dept : undefined;

  const onLeg = (l: string) => {
    setLeg(l);
    setQ("");
    setG("");
    setDept(undefined);
    setPage(1);
  };
  const toggleDept = (code: string) => {
    setDept((cur) => (cur === code ? undefined : code));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Députés</h1>
          <p className="text-sm text-[var(--muted)]">
            {actifs.length} députés {isCurrent ? "en exercice" : "(titulaires du siège)"}
            {anciens.length > 0 && ` · ${anciens.length} anciens`}
          </p>
        </div>
        {legs.length > 1 && <LegSwitcher current={leg} legislatures={legs} onSelect={onLeg} />}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Rechercher un député…"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm outline-none focus:border-[var(--accent)] sm:min-w-56 sm:flex-1"
        />
        <select
          value={g}
          onChange={(e) => {
            setG(e.target.value);
            setPage(1);
          }}
          className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm sm:w-auto"
        >
          <option value="">Tous les groupes</option>
          {d.groups.map((x) => (
            <option key={x.uid} value={x.uid}>
              {x.abrege} — {x.libelle}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((dep) => (
          <DeputeCarte key={dep.uid} d={dep} leg={leg} />
        ))}
        {actifs.length === 0 && anciens.length === 0 && (
          <div className="col-span-full p-8 text-center text-sm text-[var(--muted)]">
            Aucun député trouvé.
          </div>
        )}
        {actifs.length === 0 && anciens.length > 0 && (
          <div className="col-span-full p-8 text-center text-sm text-[var(--muted)]">
            Aucun député en exercice pour ce filtre — voir les anciens députés ci-dessous.
          </div>
        )}
      </div>

      {actifs.length > 0 && (
        <div className="flex flex-col items-center gap-3 pt-1 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <span>Par page&nbsp;:</span>
            {PER_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setPer(n);
                  setPage(1);
                }}
                aria-current={n === per ? "true" : undefined}
                className={`rounded-full border px-2.5 py-1 font-semibold transition-colors ${
                  n === per
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={curPage <= 1}
                className={`rounded-lg border border-[var(--border)] px-3 py-1.5 ${
                  curPage <= 1 ? "pointer-events-none opacity-40" : "hover:bg-[var(--surface)]"
                }`}
              >
                ← Précédent
              </button>
              <span className="whitespace-nowrap text-[var(--muted)]">
                Page {curPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={curPage >= totalPages}
                className={`rounded-lg border border-[var(--border)] px-3 py-1.5 ${
                  curPage >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-[var(--surface)]"
                }`}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>
      )}

      {anciens.length > 0 && (
        <section className="space-y-3 border-t border-[var(--border)] pt-6">
          <div>
            <h2 className="text-lg font-semibold">
              Anciens députés{isCurrent ? " de la législature" : ""}{" "}
              <span className="text-sm font-normal text-[var(--muted)]">({anciens.length})</span>
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Élus ayant quitté leur siège en cours de {leg}
              <sup>e</sup> législature (nomination au Gouvernement, démission, décès, décision du
              Conseil constitutionnel…). Ils ont été remplacés par leur suppléant ou à la suite
              d’une élection partielle, et n’entrent donc pas dans le décompte des 577 sièges.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {anciensApercu.map((dep) => (
              <DeputeCarte key={dep.uid} d={dep} leg={leg} ancien />
            ))}
          </div>
          <AnciensReste deputes={anciensReste} leg={leg} />
        </section>
      )}

      <section className="card space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Explorez les députés par département</h2>
          {dept && (
            <button
              type="button"
              onClick={() => {
                setDept(undefined);
                setPage(1);
              }}
              className="text-sm link-accent"
            >
              ✕ {selectedNom} — voir tous
            </button>
          )}
        </div>
        <div className="mx-auto max-w-xl">
          <FranceMapLazy
            width={mapWidth}
            height={mapHeight}
            aggregats={d.aggregats}
            leg={leg}
            selected={dept}
            onSelect={toggleDept}
          />
        </div>
        <p className="text-center text-xs text-[var(--muted)]">
          Chaque département est coloré selon le groupe majoritaire de ses députés. Cliquez pour
          filtrer la liste.
        </p>
        {d.legende.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Groupe majoritaire par département
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-3">
              {d.legende.map((l) => (
                <div key={l.abrege} title={l.libelle} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: groupColor(l.abrege) }}
                  />
                  <span className="shrink-0 font-semibold">{l.abrege}</span>
                  <span className="truncate text-[var(--muted)]">{l.libelle}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {d.outreMer.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            <span className="self-center text-xs text-[var(--muted)]">Outre-mer &amp; autres :</span>
            {d.outreMer.map((o) => (
              <button
                key={o.code}
                type="button"
                onClick={() => toggleDept(o.code)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  dept === o.code
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
                }`}
              >
                {o.nom} · {o.n}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
