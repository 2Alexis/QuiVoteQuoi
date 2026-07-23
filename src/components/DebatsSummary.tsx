"use client";

import React, { useState, useEffect } from "react";
import type { DebatSummary } from "@/lib/db";

interface DebatsSummaryProps {
  initialSummary?: DebatSummary | null;
  scrutinUid?: string;
  className?: string;
}

export function DebatsSummary({ initialSummary, scrutinUid, className = "" }: DebatsSummaryProps) {
  const [summary, setSummary] = useState<DebatSummary | null>(initialSummary ?? null);
  const [loading, setLoading] = useState<boolean>(!initialSummary && !!scrutinUid);
  const [activeTab, setActiveTab] = useState<"pour" | "contre">("pour");

  useEffect(() => {
    if (!initialSummary && scrutinUid) {
      setLoading(true);
      fetch(`/api/scrutins/${scrutinUid}/debats`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && !data.error) setSummary(data);
          else setSummary(null);
        })
        .catch(() => setSummary(null))
        .finally(() => setLoading(false));
    }
  }, [initialSummary, scrutinUid]);

  if (loading) {
    return <DebatsSummarySkeleton className={className} />;
  }

  if (!summary) {
    return (
      <div className={`card p-5 border-dashed text-center text-sm text-[var(--muted)] space-y-1 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-base font-semibold text-[var(--foreground)]">
          <span>💬</span> Résumé des Débats de l'Assemblée
        </div>
        <p>Les débats parlementaires pour ce scrutin n&apos;ont pas encore été synthétisés.</p>
      </div>
    );
  }

  const { arguments_pour, arguments_contre, citation, contexte, source_url } = summary;

  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>💬</span> Résumé des Débats de l&apos;Assemblée
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Synthèse automatique des comptes-rendus officiels de séance publique.
          </p>
        </div>
        {source_url && (
          <a
            href={source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium link-accent flex items-center gap-1"
          >
            Compte-rendu officiel ↗
          </a>
        )}
      </div>

      {contexte && (contexte.description || contexte.auteur) && (
        <div className="card p-4 bg-[var(--background)] border border-[var(--border)] text-sm space-y-1.5">
          {contexte.description && (
            <p className="text-[var(--foreground)] font-medium leading-relaxed">
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--muted)] block mb-0.5">Contexte des débats</span>
              {contexte.description}
            </p>
          )}
          {contexte.auteur && (
            <p className="text-xs text-[var(--muted)] font-semibold">
              Origine du texte : <span className="text-[var(--foreground)]">{contexte.auteur}</span>
            </p>
          )}
        </div>
      )}

      {/* Onglets mobile / Vue 2 colonnes desktop */}
      <div className="block sm:hidden flex rounded-lg bg-[var(--background)] p-1 border border-[var(--border)]">
        <button
          onClick={() => setActiveTab("pour")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === "pour"
              ? "bg-[var(--surface)] text-emerald-600 shadow-xs"
              : "text-[var(--muted)]"
          }`}
        >
          🟢 Favorable ({arguments_pour.length})
        </button>
        <button
          onClick={() => setActiveTab("contre")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === "contre"
              ? "bg-[var(--surface)] text-rose-600 shadow-xs"
              : "text-[var(--muted)]"
          }`}
        >
          🔴 Opposé ({arguments_contre.length})
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Colonne Verte - Pour */}
        <div
          className={`card p-5 border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/50 space-y-3 ${
            activeTab === "pour" ? "block" : "hidden sm:block"
          }`}
        >
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm border-b border-emerald-200/60 dark:border-emerald-900/60 pb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-xs">
              🟢
            </span>
            <span>Arguments pour ({arguments_pour.length})</span>
          </div>
          <ul className="space-y-2.5 text-sm text-[var(--foreground)]">
            {arguments_pour.map((arg, i) => (
              <li key={i} className="flex items-start gap-2.5 leading-snug">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{arg}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Colonne Rouge - Contre */}
        <div
          className={`card p-5 border-rose-200/80 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-900/50 space-y-3 ${
            activeTab === "contre" ? "block" : "hidden sm:block"
          }`}
        >
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm border-b border-rose-200/60 dark:border-rose-900/60 pb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/60 text-xs">
              🔴
            </span>
            <span>Arguments contre ({arguments_contre.length})</span>
          </div>
          <ul className="space-y-2.5 text-sm text-[var(--foreground)]">
            {arguments_contre.map((arg, i) => (
              <li key={i} className="flex items-start gap-2.5 leading-snug">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{arg}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bloc de Citation Marquante */}
      {citation && citation.texte && (
        <div className="card relative overflow-hidden p-5 bg-gradient-to-r from-[var(--surface)] to-[var(--background)] border border-[var(--border)]">
          <div className="absolute top-2 right-4 text-5xl font-serif text-[var(--muted)] opacity-15 select-none" aria-hidden="true">
            “
          </div>
          <div className="relative z-10 space-y-2">
            <p className="italic text-sm sm:text-base text-[var(--foreground)] leading-relaxed font-medium">
              « {citation.texte} »
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-[var(--foreground)]">
                — {citation.orateur}
              </span>
              {citation.parti && (
                <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[0.7rem] font-bold text-[var(--accent-strong)]">
                  {citation.parti}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Skeleton de chargement
export function DebatsSummarySkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-4 animate-pulse ${className}`}>
      <div className="h-6 w-48 bg-[var(--border)] rounded-md" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5 space-y-3">
          <div className="h-4 w-32 bg-[var(--border)] rounded" />
          <div className="space-y-2 pt-2">
            <div className="h-3.5 w-full bg-[var(--border)] rounded" />
            <div className="h-3.5 w-4/5 bg-[var(--border)] rounded" />
            <div className="h-3.5 w-3/4 bg-[var(--border)] rounded" />
          </div>
        </div>
        <div className="card p-5 space-y-3">
          <div className="h-4 w-32 bg-[var(--border)] rounded" />
          <div className="space-y-2 pt-2">
            <div className="h-3.5 w-full bg-[var(--border)] rounded" />
            <div className="h-3.5 w-4/5 bg-[var(--border)] rounded" />
            <div className="h-3.5 w-3/4 bg-[var(--border)] rounded" />
          </div>
        </div>
      </div>
      <div className="card p-5 h-24 bg-[var(--border)]/40 rounded-xl" />
    </div>
  );
}
