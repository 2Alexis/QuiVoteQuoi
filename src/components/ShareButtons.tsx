"use client";

import { useEffect, useState } from "react";

// Boutons de partage réutilisables (fiches scrutin / député / comparateur).
// Le partage natif (feuille système : Instagram, WhatsApp, Messages…) n'apparaît
// qu'après montage pour éviter tout décalage d'hydratation ; X et « copier le
// lien » restent toujours disponibles, y compris sur desktop.
export function ShareButtons({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const currentUrl = () => window.location.href;

  const nativeShare = async () => {
    try {
      await navigator.share({ title, url: currentUrl() });
    } catch {
      /* partage annulé par l'utilisateur */
    }
  };

  const shareOnX = () => {
    const u = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      title,
    )}&url=${encodeURIComponent(currentUrl())}`;
    window.open(u, "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  const btn =
    "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-medium text-[var(--muted)]">Partager :</span>
      {canShare && (
        <button type="button" onClick={nativeShare} className={btn} aria-label="Partager">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
          </svg>
          Partager
        </button>
      )}
      <button type="button" onClick={shareOnX} className={btn} aria-label="Partager sur X">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        X
      </button>
      <button type="button" onClick={copyLink} className={btn} aria-label="Copier le lien">
        {copied ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Lien copié
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Copier le lien
          </>
        )}
      </button>
    </div>
  );
}
