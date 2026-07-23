<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:Gemini-3.5-Flash-rules -->

# 🏛️ Consignes & Prompt Spec : Résumé des Débats

Ce document définit les règles de génération pour les résumés de débats de l'Assemblée nationale (`scripts/fetch-debats-llm.mjs`).

## 1. Exigences de Neutralité & Synthèse
- Neutralité 100% factuelle et impartiale. Aucun jugement de valeur.
- Contexte obligatoire : une phrase simple expliquant le sujet précis du texte et l'auteur/origine de la proposition.
- Attribution obligatoire : chaque argument doit être rattaché à son orateur ou groupe politique (ex: "Selon le groupe RN...", "D'après le rapporteur...").

## 2. Format de sortie JSON strict

{
  "contexte": {
    "description": "Explication vulgarisée en 1 ou 2 phrases claires du contenu de la loi/amendement.",
    "auteur": "Nom du gouvernement, du groupe politique ou du député qui a déposé le texte (ex: 'Gouvernement', 'Groupe LFI-NFP', 'Député X')."
  },
  "arguments_pour": [
    "Selon [Groupe/Orateur], argument 1...",
    "D'après [Groupe/Orateur], argument 2...",
    "Le groupe [Groupe] soutient que argument 3..."
  ],
  "arguments_contre": [
    "Selon [Groupe/Orateur], argument 1...",
    "D'après [Groupe/Orateur], argument 2...",
    "Le groupe [Groupe] s'oppose car argument 3..."
  ],
  "citation_marquante": {
    "orateur": "Nom du député / Ministre",
    "groupe": "Groupe politique",
    "texte": "Citation percutante (max 200 caractères)."
  }
}

## 3. Stockage & Cible Base de Données
- **Fichier SQLite :** `data/hemicycle.db`
- **Table cible :** `scrutin_debats` (Exclusif aux résumés LLM).
- **Clef d'indexation :** Utiliser `scrutin_uid` (ou `id`) relié à la table principale `scrutins`.

### 🚨 3.1 Règle d'Inviolabilité des Données Sources (Non-Destructive Policy)
- **INTERDICTION D'ÉCRASEMENT :** Ne JAMAIS modifier, réécrire ou exécuter un `UPDATE`/`INSERT OR REPLACE` sur les tables principales (`scrutins`, `scrutin_groupe`, `votes`, `deputes`).
- **LECTURE SEULE :** Les données de votes réelles (Pour, Contre, Abstention, Orateurs) présentes dans la table `scrutins` doivent être traitées en STRICT READ-ONLY.
- **ISLEMENT DES RÉSUMÉS :** Toute génération de résumés par LLM ou script de seed doit s'insérer **uniquement** dans la table dédiée `scrutin_debats`.
- **VALIDATION DES DONNÉES :** Si un script de démonstration ou de test est exécuté, il doit vérifier que l'ID/UID existe déjà dans `scrutins` et conserver les chiffres de votes réels originaux.

## 4. Gestion des limites (Edge Cases)
- **Taille du texte :** Tronquer le texte brut aux 20 000 à 25 000 premiers caractères.
- **Bruit procédural :** Ignorer les salutations, rappels au règlement et interruptions.
- **Strict JSON :** Ne renvoyer aucun texte explicatif en dehors de l'objet JSON.

<!-- END:Gemini-3.5-Flash-rules -->

