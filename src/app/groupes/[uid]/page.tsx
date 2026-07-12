import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMeta, SITE_URL } from "@/lib/site";
import {
  groupe,
  deputesDuGroupe,
  votesGroupeParCategorie,
  scrutinsDuGroupe,
  scrutinsDuGroupeCount,
  accordsDuGroupe,
  legislatureDuGroupe,
  condamnationsDuGroupe,
  statsGroupe,
} from "@/lib/db";
import { formatDate } from "@/lib/ui";
import {
  CategorieVotesList,
  CategoriePill,
  PositionPill,
  OrientationPill,
  GroupeAccords,
  CondamnationsGroupe,
  MetricRing,
} from "@/components/bits";
import { GroupLogo } from "@/components/GroupLogo";
import { ScrutinCard } from "@/components/ScrutinCard";
import { ShareButtons } from "@/components/ShareButtons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uid: string }>;
}): Promise<Metadata> {
  const { uid } = await params;
  const g = groupe(uid);
  if (!g) return { title: "Groupe introuvable", robots: { index: false } };
  const titre = g.abrege ? `${g.libelle} (${g.abrege})` : g.libelle;
  const desc = `${g.libelle} à l'Assemblée nationale : cohésion des votes, orientation gauche-droite, députés membres et positions par thème.`;
  return pageMeta({ title: titre, description: desc, path: `/groupes/${uid}` });
}

const POSITIONS = [
  ["", "Tous"],
  ["pour", "Pour"],
  ["contre", "Contre"],
  ["abstention", "Abstention"],
] as const;

export default async function GroupeDetail({
  params,
  searchParams,
}: {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ pos?: string }>;
}) {
  const { uid } = await params;
  const { pos } = await searchParams;
  const g = groupe(uid);
  if (!g) notFound();
  const leg = legislatureDuGroupe(uid);
  const gstats = statsGroupe(uid, leg);
  const membres = deputesDuGroupe(uid);
  const parCategorie = votesGroupeParCategorie(uid);
  const SCRUTINS_APERCU = 20;
  const scrutinsList = scrutinsDuGroupe(uid, { position: pos || undefined, limit: SCRUTINS_APERCU });
  const scrutinsTotal = scrutinsDuGroupeCount(uid, { position: pos || undefined });
  const accords = accordsDuGroupe(uid, leg);
  const condamnes = condamnationsDuGroupe(uid);

  const MEMBRES_APERCU = 12;
  const membresApercu = membres.slice(0, MEMBRES_APERCU);
  const membresReste = membres.slice(MEMBRES_APERCU);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: g.libelle,
    ...(g.abrege ? { alternateName: g.abrege } : {}),
    url: `${SITE_URL}/groupes/${uid}`,
    parentOrganization: { "@type": "Organization", name: "Assemblée nationale" },
    ...(membres.length ? { numberOfEmployees: membres.length } : {}),
  };
  const MemberCard = (d: (typeof membres)[number]) => (
    <Link
      key={d.uid}
      href={`/deputes/${d.uid}`}
      className="card flex items-center justify-between gap-2 p-3 hover:shadow-sm"
    >
      <span className="truncate text-sm font-medium">
        {d.prenom} {d.nom}
      </span>
      <span className="whitespace-nowrap text-xs text-[var(--muted)]">{d.num_dept ?? "—"}</span>
    </Link>
  );

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div>
        <Link href="/groupes" className="text-sm text-[var(--muted)] link-accent">
          ← Groupes
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
          <GroupLogo abrege={g.abrege} libelle={g.libelle} size={64} radius="1rem" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{g.libelle}</h1>
            <p className="text-sm text-[var(--muted)]">
              {membres.length} députés · depuis le {formatDate(g.date_debut)}
            </p>
            <ShareButtons
              title={`${g.libelle}${g.abrege ? ` (${g.abrege})` : ""} — ses votes à l'Assemblée nationale`}
              className="mt-3"
            />
          </div>
        </div>
      </div>

      {(gstats.cohesion > 0 || gstats.participation > 0) && (
        <section className="grid grid-cols-2 gap-3">
          <MetricRing
            label="Cohésion interne"
            value={gstats.cohesion}
            hint="Part des membres suivant la position majoritaire du groupe, en moyenne"
          />
          <MetricRing
            label="Participation moyenne"
            value={gstats.participation}
            hint="Part des scrutins où les membres ont voté, en moyenne"
          />
          <MetricRing
            label="Alignement présidentiel"
            value={gstats.align}
            hint="Vote comme le bloc présidentiel"
          />
          <MetricRing
            label="Alignement (votes clivants)"
            value={gstats.alignClivant}
            hint="Hors votes quasi-unanimes"
          />
        </section>
      )}

      {parCategorie.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Profil de vote par thème</h2>
            <p className="text-sm text-[var(--muted)]">
              Position majoritaire du groupe selon le type de texte.
            </p>
          </div>
          <div className="card p-5">
            <CategorieVotesList rows={parCategorie} />
          </div>
        </section>
      )}

      {accords.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Avec qui vote ce groupe ?</h2>
            <p className="text-sm text-[var(--muted)]">
              Blocs et alliances : qui vote dans le même sens, qui s&apos;oppose.
            </p>
          </div>
          <div className="card p-5">
            <GroupeAccords abrege={g.abrege} accords={accords} />
          </div>
        </section>
      )}

      <CondamnationsGroupe membres={condamnes} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold">Scrutins &amp; position du groupe</h2>
            <Link href={`/groupes/${uid}/votes`} className="text-sm link-accent">
              Voir tous les votes (par thème) →
            </Link>
          </div>
          <div className="inline-flex overflow-hidden rounded-lg border border-[var(--border)] text-xs">
            {POSITIONS.map(([v, label]) => {
              const active = (pos ?? "") === v;
              return (
                <Link
                  key={v}
                  href={v ? `?pos=${v}` : "?"}
                  className={`px-3 py-1.5 font-medium ${
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="divide-y divide-[var(--border)]">
            {scrutinsList.map((s) => (
              <Link
                key={s.uid}
                href={`/scrutins/${s.uid}`}
                className="block p-4 transition-colors hover:bg-[var(--background)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--muted)]">{formatDate(s.date)}</span>
                  <span className="whitespace-nowrap text-xs text-[var(--muted)]">
                    {s.pour} / {s.contre} / {s.abstention}
                  </span>
                </div>
                <div className="mt-1 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <ScrutinCard titre={s.titre} className="min-w-0 flex-1" />
                  <div className="flex flex-wrap gap-1 sm:shrink-0 sm:justify-end">
                    <CategoriePill categorie={s.categorie} />
                    <OrientationPill
                      categorie={s.categorie}
                      orientation={s.orientation}
                      score={s.orientation_score}
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
                  <span>Position du groupe :</span>
                  <PositionPill position={s.majorite} />
                </div>
              </Link>
            ))}
            {scrutinsList.length === 0 && (
              <div className="p-6 text-center text-sm text-[var(--muted)]">
                Aucun scrutin pour ce filtre.
              </div>
            )}
          </div>
          {scrutinsTotal > scrutinsList.length && (
            <div className="border-t border-[var(--border)] p-3 text-center text-xs text-[var(--muted)]">
              Aperçu des {scrutinsList.length} plus récents ·{" "}
              <Link href={`/groupes/${uid}/votes`} className="link-accent font-medium">
                voir les {scrutinsTotal.toLocaleString("fr-FR")} scrutins →
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Membres · {membres.length}</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {membresApercu.map((d) => MemberCard(d))}
        </div>
        {membresReste.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer list-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-center text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
              <span className="group-open:hidden">
                Voir les {membresReste.length} autres membres ▾
              </span>
              <span className="hidden group-open:inline">Réduire ▴</span>
            </summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {membresReste.map((d) => MemberCard(d))}
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
