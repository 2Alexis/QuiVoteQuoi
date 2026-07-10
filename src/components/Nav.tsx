"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Accueil" },
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
  const comparateurActif = isActive(pathname, "/comparateur");

  return (
    <nav className="flex items-center gap-2 text-sm">
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
  );
}
