"use client";

import { useState } from "react";

export function DeputePhoto({
  src,
  prenom,
  nom,
  color,
  size = 96,
}: {
  src: string;
  prenom?: string | null;
  nom?: string | null;
  color: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials = `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase();

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: "0 0 0 3px var(--surface), 0 0 0 4px var(--border)",
      }}
    >
      {failed ? (
        <span
          className="font-bold text-white"
          style={{ fontSize: size * 0.36 }}
        >
          {initials}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${prenom ?? ""} ${nom ?? ""}`.trim()}
          loading="lazy"
          width={size}
          height={size}
          className="h-full w-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
