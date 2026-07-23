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
```json
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
<!-- END:Gemini-3.5-Flash-rules -->

