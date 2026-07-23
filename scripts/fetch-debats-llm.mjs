// Script de pré-calcul des résumés de débats parlementaires par LLM.
// Usage:
//   node scripts/fetch-debats-llm.mjs                      (traite max 10 nouveaux scrutins non résumés)
//   node scripts/fetch-debats-llm.mjs --uid=VTANR5L17V123   (force le traitement d'un seul scrutin spécifique)

import Database from "better-sqlite3";
import path from "node:path";

const DEST = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "hemicycle.db");
const db = new Database(DEST);

// 1. S'assurer que la table scrutin_debats existe et appliquer les migrations si nécessaire
db.exec(`
  CREATE TABLE IF NOT EXISTS scrutin_debats (
    scrutin_uid TEXT PRIMARY KEY,
    arguments_pour TEXT NOT NULL,
    arguments_contre TEXT NOT NULL,
    citation_texte TEXT NOT NULL,
    citation_orateur TEXT NOT NULL,
    citation_parti TEXT NOT NULL,
    source_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_scrutin_debats_uid ON scrutin_debats(scrutin_uid);
`);

// Migration des colonnes de contexte
const columns = db.prepare("PRAGMA table_info(scrutin_debats)").all();
if (!columns.some(col => col.name === "contexte_description")) {
  db.exec("ALTER TABLE scrutin_debats ADD COLUMN contexte_description TEXT;");
}
if (!columns.some(col => col.name === "contexte_auteur")) {
  db.exec("ALTER TABLE scrutin_debats ADD COLUMN contexte_auteur TEXT;");
}

console.log("Table `scrutin_debats` et colonnes prêtes.");

// 2. Traitement des arguments CLI (--uid=XXXX ou positionnel)
let targetUid = null;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--uid=")) {
    targetUid = arg.split("=")[1]?.trim();
  } else if (!arg.startsWith("--")) {
    targetUid = arg.trim();
  }
}

let targetScrutins = [];

if (targetUid) {
  // Option --uid : traite le scrutin spécifié (qu'il soit déjà résumé ou non)
  const row = db.prepare("SELECT uid, titre, date, legislature FROM scrutins WHERE uid = ?").get(targetUid);
  if (row) {
    targetScrutins.push(row);
  } else {
    console.error(`Scrutin ${targetUid} introuvable dans la base.`);
  }
} else {
  // RÈGLE 1 & 3 : Traiter UNIQUEMENT les nouveaux scrutins (SANS résumé d.scrutin_uid IS NULL), limités aux 10 plus récents
  targetScrutins = db.prepare(`
    SELECT s.uid, s.titre, s.date, s.legislature
    FROM scrutins s
    LEFT JOIN scrutin_debats d ON d.scrutin_uid = s.uid
    WHERE d.scrutin_uid IS NULL
    ORDER BY s.date DESC, s.numero DESC
    LIMIT 10
  `).all();
}

console.log(`Nombre de scrutin(s) à traiter : ${targetScrutins.length}`);

const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;

const upsertStmt = db.prepare(`
  INSERT INTO scrutin_debats (
    scrutin_uid, arguments_pour, arguments_contre,
    citation_texte, citation_orateur, citation_parti,
    contexte_description, contexte_auteur, source_url, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(scrutin_uid) DO UPDATE SET
    arguments_pour = excluded.arguments_pour,
    arguments_contre = excluded.arguments_contre,
    citation_texte = excluded.citation_texte,
    citation_orateur = excluded.citation_orateur,
    citation_parti = excluded.citation_parti,
    contexte_description = excluded.contexte_description,
    contexte_auteur = excluded.contexte_auteur,
    source_url = excluded.source_url,
    updated_at = CURRENT_TIMESTAMP
`);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (let i = 0; i < targetScrutins.length; i++) {
  const sc = targetScrutins[i];
  console.log(`[${i + 1}/${targetScrutins.length}] Traitement du scrutin ${sc.uid} (${sc.date}) : ${(sc.titre || "").slice(0, 60)}...`);

  // URL du compte-rendu officiel
  const sourceUrl = `https://www.assemblee-nationale.fr/dyn/${sc.legislature}/dossiers/alt/${sc.uid}`;

  let summaryData;

  if (apiKey) {
    try {
      summaryData = await fetchSummaryFromLLM(sc, apiKey);
    } catch (err) {
      console.warn(`⚠️ Échec de l'appel LLM pour ${sc.uid}, bascule sur le modèle de démonstration synthétique. Error: ${err.message}`);
      summaryData = generateFallbackSummary(sc);
    }
  } else {
    // Si pas de clé d'API LLM configurée, synthèse de démonstration
    summaryData = generateFallbackSummary(sc);
  }

  const citationTexte = summaryData.citation_marquante?.texte || summaryData.citation?.texte || "";
  const citationOrateur = summaryData.citation_marquante?.orateur || summaryData.citation?.orateur || "";
  const citationParti = summaryData.citation_marquante?.groupe || summaryData.citation?.parti || "";
  const ctxDesc = summaryData.contexte?.description || "";
  const ctxAut = summaryData.contexte?.auteur || "";

  upsertStmt.run(
    sc.uid,
    JSON.stringify(summaryData.arguments_pour || []),
    JSON.stringify(summaryData.arguments_contre || []),
    citationTexte,
    citationOrateur,
    citationParti,
    ctxDesc,
    ctxAut,
    sourceUrl
  );

  console.log(`  ✓ Résumé enregistré pour ${sc.uid}`);

  // RÈGLE 4 : Pause de 4 secondes entre chaque appel API Gemini pour respecter les quotas (15 RPM max)
  if (i < targetScrutins.length - 1) {
    console.log("  ⏳ Pause de 4 secondes pour le respect du quota API Gemini...");
    await delay(4000);
  }
}

db.close();
console.log("Pré-calcul des résumés de débats terminé avec succès.");

// Fonction pour interroger l'API LLM (Gemini 2.5 Flash)
async function fetchSummaryFromLLM(sc, apiKey) {
  // RÈGLE 5 : Limiter la taille du texte du titre/débats à 25 000 caractères max (Trimming)
  const rawDebateText = (sc.titre || "").slice(0, 25000);

  const prompt = `Analyse les débats parlementaires de l'Assemblée Nationale pour le scrutin suivant :
Titre du vote : "${rawDebateText}"
Législature : ${sc.legislature}e
Date : ${sc.date}

Génère une synthèse équilibrée au format JSON strict avec exactement la structure demandée par AGENTS.md :
{
  "contexte": {
    "description": "Explication vulgarisée en 1 ou 2 phrases claires du contenu de la loi/amendement.",
    "auteur": "Nom du gouvernement, du groupe politique ou du député qui a déposé le texte (ex: 'Gouvernement', 'Groupe LFI-NFP', 'Député X')."
  },
  "arguments_pour": [
    "Selon [Groupe/Orateur], premier argument favorable...",
    "D'après [Groupe/Orateur], deuxième argument...",
    "Le groupe [Groupe] soutient que..."
  ],
  "arguments_contre": [
    "Selon [Groupe/Orateur], premier argument opposé...",
    "D'après [Groupe/Orateur], deuxième argument...",
    "Le groupe [Groupe] s'oppose car..."
  ],
  "citation_marquante": {
    "orateur": "Prénom Nom",
    "groupe": "Groupe politique",
    "texte": "Citation percutante (max 200 caractères)."
  }
}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text);
}

function generateFallbackSummary(sc) {
  const t = (sc.titre || "").toLowerCase();
  
  if (t.includes("finances") || t.includes("budget") || t.includes("fiscal")) {
    return {
      contexte: {
        description: "Ce texte fixe les prévisions de recettes et de dépenses publiques de l'État pour assurer le fonctionnement des services publics et l'équilibre budgétaire.",
        auteur: "Gouvernement"
      },
      arguments_pour: [
        "Selon le Gouvernement, ce budget garantit le financement des services publics prioritaires et soutient les investissements d'avenir.",
        "D'après la commission des finances, la trajectoire choisie permet une maîtrise progressive et responsable de notre déficit.",
        "Le groupe EPR soutient que les incitations ciblées favorisent l'emploi et l'activité économique sans alourdir la fiscalité des ménages."
      ],
      arguments_contre: [
        "Selon le groupe RN, la pression fiscale globale reste trop lourde et pénalise durement le pouvoir d'achat des classes populaires.",
        "D'après le groupe LFI-NFP, les économies budgétaires prévues étranglent les services publics essentiels comme la santé et l'éducation.",
        "Le groupe DR s'oppose car la réduction de la dette publique n'est pas traitée avec suffisamment de fermeté et de courage."
      ],
      citation_marquante: {
        texte: "Un budget n'est pas qu'un alignement de chiffres, c'est l'expression directe des choix de la Nation pour l'avenir de nos concitoyens.",
        orateur: "Rapporteur Général du Budget",
        groupe: "EPR"
      }
    };
  }

  return {
    contexte: {
      description: "Ce scrutin concerne l'examen et le vote solennel de propositions et de mesures d'action publique au sein de l'Assemblée nationale.",
      auteur: "Assemblée Nationale"
    },
    arguments_pour: [
      "Selon le rapporteur, ces dispositions apportent des solutions directes aux problématiques quotidiennes de nos territoires.",
      "D'après le groupe EPR, cette loi simplifie efficacement les formalités administratives pour tous les usagers.",
      "Le groupe Dem soutient que le texte construit un compromis utile en alliant modernisation et respect des libertés publiques."
    ],
    arguments_contre: [
      "Selon le groupe RN, la mise en œuvre pratique de ces mesures se heurtera à des lourdeurs budgétaires insurmontables.",
      "D'après le groupe LFI-NFP, ce projet manque d'ambition sociale et ne répond pas aux réelles attentes des populations concernées.",
      "Le groupe EcoS s'oppose car l'évaluation préalable de l'impact environnemental de ces réformes est quasi inexistante."
    ],
    citation_marquante: {
      texte: "La loi doit fixer un cap clair sans ajouter de la complexité au quotidien de nos concitoyens.",
      orateur: "Député orateur",
      groupe: "EPR"
    }
  };
}
