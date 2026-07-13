"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDate, sortBadge, categorieColor } from "@/lib/ui";
import { VoteBar, LegSwitcher, CategoriePill, OrientationPill } from "@/components/bits";
import { ScrutinCard } from "@/components/ScrutinCard";
import type { Scrutin } from "@/lib/db";

interface Cat {
  categorie: string;
  n: number;
}
interface PageData {
  rows: Scrutin[];
  total: number;
  pages: number;
  page: number;
  // Décompte par catégorie du jeu filtré courant (renvoyé par /api/scrutins).
  cats?: Cat[];
}

// Rendu client de /scrutins. La page-coquille + la 1re page par défaut sont
// pré-rendues en statique (ISR) : l'arrivée sur /scrutins est instantanée, sans
// réveil à froid. La liste pouvant compter des milliers de lignes, on ne les
// embarque pas ; chaque filtre / changement de page interroge /api/scrutins (une
// page de 25). Rien n'est retiré, tout reste filtrable.
export function ScrutinsClient({
  legs,
  catsByLeg,
  initial,
}: {
  legs: string[];
  catsByLeg: Record<string, Cat[]>;
  initial: PageData;
}) {
  const [leg, setLeg] = useState(legs[0]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [cat, setCat] = useState("");
  const [loisOnly, setLoisOnly] = useState(true);
  const [includeBudget, setIncludeBudget] = useState(true);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageData>(initial);
  const [loading, setLoading] = useState(false);
  // Compteurs des chips : état par défaut au 1er rendu (statique), puis remplacés
  // par ceux du jeu filtré que renvoie /api/scrutins à chaque changement de filtre.
  const [cats, setCats] = useState<Cat[]>(catsByLeg[legs[0]] ?? []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // On saute le tout premier rendu : la page 1 par défaut est déjà pré-rendue.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const u = new URLSearchParams();
    u.set("leg", leg);
    if (debouncedQ) u.set("q", debouncedQ);
    if (cat) u.set("cat", cat);
    if (!loisOnly) u.set("loi", "0");
    if (loisOnly && !includeBudget) u.set("budget", "0");
    if (page > 1) u.set("page", String(page));
    fetch(`/api/scrutins?${u.toString()}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: PageData) => {
        setData(d);
        if (d.cats) setCats(d.cats);
        setLoading(false);
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setLoading(false);
      });
    return () => ctrl.abort();
  }, [leg, debouncedQ, cat, loisOnly, includeBudget, page]);

  const onLeg = (l: string) => {
    setLeg(l);
    setCat("");
    setPage(1);
    // Repli instantané sur les compteurs par défaut de la législature ; l'API
    // réajuste ensuite selon les filtres actifs.
    setCats(catsByLeg[l] ?? []);
  };
  const onCat = (c: string) => {
    setCat(c);
    setPage(1);
  };
  const toggleLois = () => {
    setLoisOnly((v) => !v);
    setPage(1);
  };
  const toggleBudget = () => {
    setIncludeBudget((v) => !v);
    setPage(1);
  };

  const { rows, total, pages } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Scrutins</h1>
          <p className="text-sm text-[var(--muted)]">
            {total.toLocaleString("fr-FR")} {loisOnly ? "lois (vote final)" : "scrutins publics"}
          </p>
        </div>
        {legs.length > 1 && <LegSwitcher current={leg} legislatures={legs} onSelect={onLeg} />}
      </div>

      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        placeholder="Rechercher un scrutin (loi, amendement, motion…)"
        className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm outline-none focus:border-[var(--accent)]"
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleLois}
            role="switch"
            aria-checked={loisOnly}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              loisOnly
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${loisOnly ? "bg-white" : "bg-[var(--muted)]"}`}
            />
            Lois uniquement
          </button>
          {loisOnly && (
            <button
              type="button"
              onClick={toggleBudget}
              role="switch"
              aria-checked={includeBudget}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                includeBudget
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  includeBudget ? "bg-white" : "bg-[var(--muted)]"
                }`}
              />
              Inclure le budget
            </button>
          )}
        </div>
        <p className="text-xs text-[var(--muted)]">
          {loisOnly
            ? "Ratifications comprises · le budget (PLF/PLFSS) peut être exclu."
            : "Vote final sur l'ensemble d'un texte — sans amendements, articles ni motions."}
        </p>
      </div>

      <div className="sm:hidden">
        <div className="relative">
          <select
            value={cat}
            onChange={(e) => onCat(e.target.value)}
            aria-label="Filtrer par catégorie"
            className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 pr-10 text-sm font-medium outline-none focus:border-[var(--accent)]"
          >
            <option value="">Toutes les catégories</option>
            {cats.map((c) => (
              <option key={c.categorie} value={c.categorie}>
                {c.categorie} · {c.n}
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
      </div>
      <div className="hidden flex-wrap gap-2 sm:flex">
        <button
          type="button"
          onClick={() => onCat("")}
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
            !cat
              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
              : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
          }`}
        >
          Toutes
        </button>
        {cats.map((c) => {
          const active = c.categorie === cat;
          const color = categorieColor(c.categorie);
          return (
            <button
              key={c.categorie}
              type="button"
              onClick={() => onCat(c.categorie)}
              className="whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium"
              style={
                active
                  ? { background: color, borderColor: color, color: "white" }
                  : { borderColor: `${color}66`, color }
              }
            >
              {c.categorie} · {c.n}
            </button>
          );
        })}
      </div>

      <div
        className={`card divide-y divide-[var(--border)] transition-opacity ${
          loading ? "opacity-50" : ""
        }`}
      >
        {rows.map((sc) => {
          const b = sortBadge(sc.sort_code);
          return (
            <Link
              key={sc.uid}
              href={`/scrutins/${sc.uid}`}
              className="block p-4 hover:bg-[var(--background)] transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--muted)]">
                  {formatDate(sc.date)} · n°{sc.numero} · {sc.type_vote}
                </span>
                <span className={`badge ${b.cls}`}>{b.label}</span>
              </div>
              <div className="mt-1 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <ScrutinCard titre={sc.titre} className="min-w-0 flex-1" />
                <div className="flex flex-wrap gap-1 sm:shrink-0 sm:justify-end">
                  <CategoriePill categorie={sc.categorie} />
                  <OrientationPill
                    categorie={sc.categorie}
                    orientation={sc.orientation}
                    score={sc.orientation_score}
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="max-w-xs flex-1">
                  <VoteBar pour={sc.pour ?? 0} contre={sc.contre ?? 0} abstention={sc.abstentions ?? 0} />
                </div>
                <span className="whitespace-nowrap text-xs text-[var(--muted)]">
                  {sc.pour} pour · {sc.contre} contre · {sc.abstentions} abst.
                </span>
              </div>
            </Link>
          );
        })}
        {rows.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--muted)]">Aucun scrutin trouvé.</div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={`rounded-lg border border-[var(--border)] px-3 py-1.5 ${
              page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-[var(--surface)]"
            }`}
          >
            ← Précédent
          </button>
          <span className="text-[var(--muted)]">
            Page {page} / {pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className={`rounded-lg border border-[var(--border)] px-3 py-1.5 ${
              page >= pages ? "pointer-events-none opacity-40" : "hover:bg-[var(--surface)]"
            }`}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
