"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/actu", label: "Actu" },
  { href: "/scrutins", label: "Scrutins" },
  { href: "/deputes", label: "Députés" },
  { href: "/groupes", label: "Groupes" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const comparateurActif = isActive(pathname, "/comparateur");

  // Referme le menu à chaque navigation (ajustement pendant le rendu,
  // recommandé plutôt qu'un effet) et à la touche Échap.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Navigation complète — tablettes et ordinateurs (≥ md) */}
      <nav className="ml-auto hidden items-center gap-2 text-sm md:flex">
        {NAV.map((n) => {
          const actif = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className="nav-item"
              data-active={actif ? "true" : "false"}
              aria-current={actif ? "page" : undefined}
            >
              {n.label}
            </Link>
          );
        })}
        <span className="mx-2 h-5 w-px bg-[var(--border)]" aria-hidden />
        <Link
          href="/comparateur"
          className="nav-cta"
          data-active={comparateurActif ? "true" : "false"}
          aria-current={comparateurActif ? "page" : undefined}
        >
          <span aria-hidden>⇄</span>
          Comparateur
        </Link>
      </nav>

      {/* Bouton burger — petits écrans (< md) */}
      <button
        type="button"
        className="ml-auto inline-flex items-center justify-center rounded-lg border border-[var(--border)] p-2 text-[var(--foreground)] transition-colors hover:bg-[var(--background)] md:hidden"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        aria-controls="menu-mobile"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* Panneau déroulant mobile : occupe toute la largeur sous l'en-tête */}
      {open && (
        <>
          {/* Voile cliquable pour refermer en touchant à côté (sous l'en-tête z-20) */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default bg-transparent md:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            id="menu-mobile"
            className="absolute inset-x-0 top-full z-20 border-b border-[var(--border)] bg-[var(--surface)] shadow-md md:hidden"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
              {NAV.map((n) => {
                const actif = isActive(pathname, n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="nav-item"
                    data-active={actif ? "true" : "false"}
                    aria-current={actif ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {n.label}
                  </Link>
                );
              })}
              <Link
                href="/comparateur"
                className="nav-cta mt-1 justify-center"
                data-active={comparateurActif ? "true" : "false"}
                aria-current={comparateurActif ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <span aria-hidden>⇄</span>
                Comparateur
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
