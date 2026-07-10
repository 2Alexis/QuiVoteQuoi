import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Méthodologie — QuiVoteQuoi",
  description:
    "Comment sont calculés les indicateurs et graphiques de QuiVoteQuoi : position majoritaire, participation, loyauté, alignement, cohésion, matrice d’accord, carte des groupes (MDS), orientation gauche-droite, catégories thématiques et socio-professionnelles, condamnations.",
};

// Encadré « formule » : présente un calcul de façon lisible et détachée du texte.
function Formule({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-medium leading-relaxed">
      {children}
    </p>
  );
}

function Section({
  id,
  titre,
  children,
}: {
  id: string;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-bold">{titre}</h2>
      {children}
    </section>
  );
}

const TOC = [
  ["sources", "Sources des données"],
  ["vocabulaire", "Vocabulaire de base"],
  ["position", "Position majoritaire d’un groupe"],
  ["depute", "Indicateurs par député"],
  ["clivant", "Scrutins clivants"],
  ["groupe", "Indicateurs par groupe"],
  ["carte", "Carte des groupes (MDS)"],
  ["categories", "Catégories thématiques des scrutins"],
  ["orientation", "Orientation gauche-droite"],
  ["sociopro", "Catégories socio-professionnelles"],
  ["composition", "Composition « instantanée »"],
  ["condamnations", "Condamnations"],
  ["limites", "Limites & avertissements"],
];

export default function MethodologiePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Méthodologie</h1>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Cette page détaille comment chaque chiffre et chaque graphique du site sont calculés, et
          comment les scrutins et les députés sont catégorisés. Objectif : que rien ne soit une
          boîte noire. Tout est recalculé automatiquement à partir des sources publiques.
        </p>
      </header>

      <nav className="card p-4" aria-label="Sommaire">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Sommaire
        </h2>
        <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {TOC.map(([id, label], i) => (
            <li key={id}>
              <a href={`#${id}`} className="text-[var(--muted)] hover:text-[var(--accent)]">
                {i + 1}. {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="sources" titre="Sources des données">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Les scrutins, votes, députés et groupes proviennent de l’{" "}
          <a
            href="https://data.assemblee-nationale.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            open data officiel de l’Assemblée nationale
          </a>{" "}
          (Licence Ouverte / Etalab 2.0). Les catégories socio-professionnelles proviennent des
          fiches d’acteurs de l’Assemblée (nomenclature INSEE). Les condamnations proviennent de{" "}
          <a
            href="https://www.wikidata.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            Wikidata
          </a>
          . L’ensemble est reconstruit chaque nuit puis redéployé, afin de refléter les données les
          plus récentes.
        </p>
      </Section>

      <Section id="vocabulaire" titre="Vocabulaire de base">
        <ul className="space-y-2 text-sm leading-relaxed text-[var(--muted)]">
          <li>
            <strong className="text-[var(--foreground)]">Scrutin</strong> : un vote public
            (« scrutin public ») sur un texte, un amendement, une motion, etc.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">Position d’un député</strong> :{" "}
            <em>pour</em>, <em>contre</em>, <em>abstention</em> ou <em>non-votant</em>. On considère
            qu’un député a <strong className="text-[var(--foreground)]">exprimé</strong> un vote
            s’il a voté pour, contre ou s’est abstenu ; « non-votant » signifie qu’il n’a pas pris
            part au scrutin.
          </li>
        </ul>
      </Section>

      <Section id="position" titre="Position majoritaire d’un groupe">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Pour chaque scrutin, on compte les <em>pour</em>, <em>contre</em> et{" "}
          <em>abstention</em> des membres d’un groupe. La position majoritaire du groupe est le choix
          le plus fréquent. En cas d’égalité, la priorité est&nbsp;: <em>pour</em> devant{" "}
          <em>contre</em> devant <em>abstention</em>. Les non-votants ne comptent pas. Si personne ne
          s’est exprimé, le groupe n’a pas de position sur ce scrutin.
        </p>
      </Section>

      <Section id="depute" titre="Indicateurs par député">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Ces indicateurs (visibles sur les fiches et le comparateur) sont calculés sur l’ensemble
          des scrutins de la législature.
        </p>
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold">Participation</h3>
            <Formule>
              Participation = votes exprimés ÷ nombre de scrutins où le député est enregistré.
            </Formule>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Part des scrutins où le député a réellement voté (pour, contre ou abstention) plutôt
              que d’être non-votant.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Loyauté au groupe</h3>
            <Formule>
              Loyauté = votes conformes à la position de son groupe ÷ votes exprimés (sur les
              scrutins où le groupe a une position).
            </Formule>
            <p className="mt-1 text-sm text-[var(--muted)]">
              À quel point le député suit la ligne majoritaire de son propre groupe.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Alignement avec la majorité présidentielle</h3>
            <Formule>
              Alignement = votes identiques à la position majoritaire du bloc présidentiel ÷ votes
              exprimés (sur les scrutins où ce bloc a une position).
            </Formule>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Le « bloc présidentiel » regroupe les groupes soutenant le gouvernement (par exemple,
              pour la 17ᵉ législature&nbsp;: EPR, Dem et HOR). Une variante ne retient que les{" "}
              <a href="#clivant" className="text-[var(--accent)] hover:underline">
                scrutins clivants
              </a>{" "}
              pour éviter que les votes quasi-unanimes ne gonflent artificiellement l’alignement.
            </p>
          </div>
        </div>
      </Section>

      <Section id="clivant" titre="Scrutins clivants">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Un scrutin est dit <strong className="text-[var(--foreground)]">clivant</strong> lorsque le
          camp minoritaire pèse au moins 10&nbsp;% des voix <em>pour</em> et <em>contre</em>{" "}
          exprimées par l’ensemble de l’Assemblée.
        </p>
        <Formule>
          Clivant si&nbsp;: min(total pour, total contre) ÷ (total pour + total contre) ≥ 10&nbsp;%.
        </Formule>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Cela écarte les votes consensuels (quasi-unanimes) tout en conservant les votes où un seul
          gros groupe s’oppose. Utile pour mesurer les vraies lignes de fracture.
        </p>
      </Section>

      <Section id="groupe" titre="Indicateurs par groupe">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold">Cohésion interne</h3>
            <Formule>
              Cohésion = moyenne, sur tous les scrutins, de (plus grand camp du groupe ÷ membres
              s’étant exprimés).
            </Formule>
            <p className="mt-1 text-sm text-[var(--muted)]">
              100&nbsp;% = le groupe vote toujours d’un seul bloc ; une valeur plus faible traduit
              des divisions internes fréquentes.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Taux d’accord entre deux groupes</h3>
            <Formule>
              Accord(A, B) = nombre de scrutins où A et B ont la même position majoritaire ÷ nombre
              de scrutins où les deux ont une position.
            </Formule>
            <p className="mt-1 text-sm text-[var(--muted)]">
              C’est la base de la matrice d’accord et de la carte des groupes. Ne sont retenus que
              les groupes d’au moins 3 membres.
            </p>
          </div>
        </div>
      </Section>

      <Section id="carte" titre="Carte des groupes (MDS)">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          La « cartographie des groupes » place chaque groupe sur un plan à deux dimensions de sorte
          que <strong className="text-[var(--foreground)]">deux groupes proches votent de façon
          semblable</strong>. On part d’une distance entre groupes&nbsp;:
        </p>
        <Formule>distance(A, B) = 1 − taux d’accord(A, B).</Formule>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Un algorithme de <em>positionnement multidimensionnel</em> (MDS classique) cherche ensuite
          les coordonnées 2D qui reproduisent au mieux toutes ces distances. Pour rendre la carte
          lisible, les axes sont, si nécessaire, retournés en s’appuyant sur des repères connus (des
          groupes historiquement situés à gauche/à droite, et le bloc présidentiel)&nbsp;:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-sm text-[var(--muted)]">
          <li>axe horizontal&nbsp;: gauche ↔ droite&nbsp;;</li>
          <li>axe vertical&nbsp;: proximité avec la majorité présidentielle ↔ opposition.</li>
        </ul>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Ces repères servent uniquement à <em>orienter</em> la carte&nbsp;: la position de chaque
          groupe découle exclusivement de ses votes, jamais d’un classement décidé à l’avance.
        </p>
      </Section>

      <Section id="categories" titre="Catégories thématiques des scrutins">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Chaque scrutin est rangé dans un thème à partir de son intitulé, par détection de
          mots-clés (après passage en minuscules et suppression des accents). Le thème retenu est
          celui qui obtient le plus de correspondances&nbsp;; en l’absence de correspondance, le
          scrutin est classé « Autre ». Les dix thèmes sont&nbsp;:
        </p>
        <p className="text-sm text-[var(--muted)]">
          Santé · Social · Budget &amp; fiscalité · Environnement &amp; énergie · Économie &amp;
          travail · Justice &amp; sécurité · International &amp; défense · Institutions &amp;
          démocratie · Éducation &amp; culture · Société.
        </p>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          C’est une <strong className="text-[var(--foreground)]">heuristique</strong>&nbsp;: rapide
          et transparente, mais imparfaite. Un intitulé ambigu peut être mal classé.
        </p>
      </Section>

      <Section id="orientation" titre="Orientation gauche-droite">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Chaque scrutin reçoit un score d’orientation entre −1 (pôle « gauche » du thème) et +1
          (pôle « droite »). Deux méthodes, dans cet ordre&nbsp;:
        </p>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-[var(--muted)]">
          <li>
            <strong className="text-[var(--foreground)]">Signal du titre</strong> : des expressions
            typiquement « de gauche » (ex. hausse du SMIC, justice fiscale, encadrement des loyers)
            ou « de droite » (ex. baisse des impôts, allègement, fermeté) sont comptées ; le score
            penche du côté qui l’emporte.
          </li>
          <li>
            <strong className="text-[var(--foreground)]">À défaut, le comportement de vote</strong> :
            on regarde quels groupes ont porté le texte (soutien net = pour − contre), en projetant
            chaque groupe sur l’axe gauche-droite issu de la carte MDS.
          </li>
        </ol>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Un texte dont le score reste proche de 0 est étiqueté « Équilibré ». Les intitulés de
          pôles (par ex. « Redistributif » vs « Allègements/capital » en fiscalité) sont propres à
          chaque thème.
        </p>
        <h3 className="pt-1 font-semibold">Profil d’orientation par thème (groupe ou député)</h3>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Pour résumer l’orientation d’un groupe ou d’un député dans un thème, on utilise une
          logique d’<strong className="text-[var(--foreground)]">endossement</strong>, car s’opposer
          à un texte est aussi révélateur que le soutenir&nbsp;:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-sm text-[var(--muted)]">
          <li>pôle droite = voter POUR un texte de droite, ou CONTRE un texte de gauche&nbsp;;</li>
          <li>pôle gauche = voter POUR un texte de gauche, ou CONTRE un texte de droite.</li>
        </ul>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Seuls les textes nettement orientés sont pris en compte (les « Équilibré » et les
          abstentions sont ignorés).
        </p>
      </Section>

      <Section id="sociopro" titre="Catégories socio-professionnelles">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Le métier déclaré de chaque député (champ INSEE « famille socio-professionnelle » de sa
          fiche d’acteur) est ramené à l’une des huit catégories INSEE standard&nbsp;: Agriculteurs
          exploitants&nbsp;; Artisans, commerçants et chefs d’entreprise&nbsp;; Cadres et professions
          intellectuelles supérieures&nbsp;; Professions intermédiaires&nbsp;; Employés&nbsp;;
          Ouvriers&nbsp;; Retraités&nbsp;; Sans profession déclarée. La répartition affichée porte
          sur la{" "}
          <a href="#composition" className="text-[var(--accent)] hover:underline">
            composition instantanée
          </a>{" "}
          (un titulaire par circonscription).
        </p>
      </Section>

      <Section id="composition" titre="Composition « instantanée » et anciens députés">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          L’Assemblée nationale compte <strong className="text-[var(--foreground)]">577 sièges</strong>,
          mais sur une même législature bien plus de personnes peuvent les occuper successivement
          (nomination au Gouvernement, démission, décès, décision du Conseil constitutionnel,
          suppléants…). Sur la 17<sup>e</sup> législature, plus de 640 personnes ont ainsi détenu un
          mandat de député, alors que 577 sièges seulement existent à un instant donné.
        </p>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Pour refléter l’état réel de l’hémicycle, on ne garde qu’
          <strong className="text-[var(--foreground)]">un seul titulaire par circonscription</strong>{" "}
          (département + numéro de circonscription)&nbsp;: le titulaire courant, déterminé à partir
          des <strong className="text-[var(--foreground)]">dates officielles de mandat</strong> — le
          mandat en cours (sans date de fin) l’emporte, sinon le mandat terminé le plus récemment.
          Cette méthode identifie correctement un député tout juste arrivé, même s’il n’a pas encore
          voté. C’est cette composition (577 sièges) qui sert de base aux cartes et aux agrégats par
          département ou par catégorie.
        </p>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Sur la page des députés, cette logique sépare distinctement les{" "}
          <strong className="text-[var(--foreground)]">577 députés en exercice</strong> des{" "}
          <strong className="text-[var(--foreground)]">anciens députés</strong> de la législature
          (remplacés en cours de mandat), avec pour ces derniers le motif de départ.
        </p>
      </Section>

      <Section id="condamnations" titre="Condamnations">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Les condamnations judiciaires proviennent de Wikidata (propriété « condamné pour »),
          source ouverte et vérifiable. Le rapprochement avec nos députés est{" "}
          <strong className="text-[var(--foreground)]">strict</strong>&nbsp;: il se fait uniquement
          via l’identifiant officiel Assemblée nationale, jamais par ressemblance de nom, afin
          d’éliminer tout risque d’homonymie. Chaque entrée conserve un lien vers sa source
          (Wikipédia / Wikidata) et les doublons sont supprimés.
        </p>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Conséquence de cette rigueur&nbsp;: la liste peut être{" "}
          <em>incomplète</em> (seules figurent les condamnations documentées dans Wikidata avec
          l’identifiant AN). Une absence n’a donc pas valeur de casier vierge.
        </p>
      </Section>

      <Section id="limites" titre="Limites & avertissements">
        <ul className="ml-4 list-disc space-y-2 text-sm leading-relaxed text-[var(--muted)]">
          <li>
            La catégorisation thématique et l’orientation gauche-droite reposent sur des{" "}
            <strong className="text-[var(--foreground)]">heuristiques</strong> : elles sont
            indicatives, pas une mesure scientifique validée. Réduire un texte complexe à un seul axe
            est forcément simplificateur.
          </li>
          <li>
            L’étiquetage des axes de la carte MDS est une aide à la lecture, pas une vérité absolue.
          </li>
          <li>
            Les statistiques dépendent de la qualité et de la complétude des données sources.
          </li>
          <li>
            Ces indicateurs sont des outils d’exploration&nbsp;: en cas de doute, les publications
            officielles de l’Assemblée nationale font foi.
          </li>
        </ul>
        <p className="pt-2 text-sm">
          <Link href="/conditions-utilisation" className="text-[var(--accent)] hover:underline">
            Voir aussi les conditions d’utilisation →
          </Link>
        </p>
      </Section>
    </article>
  );
}
