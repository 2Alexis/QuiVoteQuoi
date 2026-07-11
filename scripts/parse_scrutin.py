"""Analyse des intitulés de scrutins de l'Assemblée nationale.

Les titres bruts de l'open data suivent une grammaire régulière mais verbeuse,
p. ex. :

    « l'amendement n° 183 de Mme K/Bidi et les amendements identiques suivants
      de suppression de l'article 11 du projet de loi visant à offrir des
      réponses immédiates aux phénomènes troublant l'ordre public
      (première lecture). »

`parse_scrutin` décompose ce pavé en champs typés exploitables par l'UI :

    {
      "type_scrutin": "Amendement",
      "loi_associee": "Offrir des réponses immédiates aux phénomènes troublant l'ordre public",
      "action":       "Suppression de l'article 11",
      "metadonnees":  {"auteur": "Mme K/Bidi", "numero_amendement": 183,
                       "etape_lecture": "Première lecture", ...},
    }

Aucune dépendance externe : uniquement `re`.
"""

from __future__ import annotations

import re

# --- Apostrophes droites ' et typographiques ' traitées indifféremment. --------
AP = r"['’]"

# =============================================================================
#  Types de texte (« projet de loi », « proposition de loi »…)
#  Ordonnés du plus spécifique au plus générique : l'alternance regex étant
#  gourmande de gauche à droite, « projet de loi organique » doit précéder
#  « projet de loi » pour ne pas être tronqué.
# =============================================================================
_BASE_TYPES: list[tuple[str, str]] = [
    ("projet de loi constitutionnelle", "Projet de loi constitutionnelle"),
    ("projet de loi organique", "Projet de loi organique"),
    ("proposition de loi organique", "Proposition de loi organique"),
    ("proposition de résolution européenne", "Proposition de résolution européenne"),
    ("proposition de résolution", "Proposition de résolution"),
    ("proposition européenne", "Proposition européenne"),
    ("projet de loi", "Projet de loi"),
    ("proposition de loi", "Proposition de loi"),
]
_BASE_MAP = {k: v for k, v in _BASE_TYPES}
_ALT = "|".join(re.escape(k) for k, _ in _BASE_TYPES)

# Introduction de la loi : « du projet de loi … », « de la proposition de loi … ».
_LAW_RE = re.compile(rf"(?:du|de la|des)\s+({_ALT})[\s,]+(.*)$", re.IGNORECASE | re.DOTALL)

# Cas où le texte est le sujet grammatical (vote sur l'ensemble) :
# « le projet de loi … », « la proposition de résolution … »,
# « la première partie du projet de loi de finances … ».
_LAW_LEAD_RE = re.compile(
    rf"^\s*(?:le|la|l{AP})\s+"
    rf"(?:(?:première|seconde|nouvelle)\s+partie\s+(?:du|de la)\s+)?"
    rf"({_ALT})[\s,]+(.*)$",
    re.IGNORECASE | re.DOTALL,
)

# Participe introductif = jargon à retirer du nom de la loi.
_PARTICIPLE_RE = re.compile(
    r"^(?:"
    r"visant\s+à\s+|tendant\s+à\s+|"
    r"relati(?:f|ve|fs|ves)\s+(?:à\s+l" + AP + r"|à\s+la\s+|à\s+|au\s+|aux\s+)|"
    r"portant\s+(?:sur\s+)?|pour\s+|afin\s+de\s+|"
    r"instituant\s+|créant\s+|autorisant\s+|ratifiant\s+|modifiant\s+|"
    r"complétant\s+|renforçant\s+|améliorant\s+|garantissant\s+|"
    r"permettant\s+(?:de\s+|d" + AP + r")?|assurant\s+|favorisant\s+|encadrant\s+|"
    r"invitant\s+|demandant\s+|reconnaissant\s+|condamnant\s+|soutenant\s+|"
    r"appelant\s+(?:à\s+)?"
    r")",
    re.IGNORECASE,
)

# Référence d'article : « premier », « unique », « 2 », « 1er bis »…
_ART_INNER = (
    r"(premier|unique|liminaire|\d+(?:er|ère|ème|e)?"  # « 1er » : suffixe collé, jamais « 2 et… »
    r"(?:\s+(?:bis|ter|quater|quinquies|sexies))?)"
)
_ART_RE = re.compile(rf"l{AP}article\s+{_ART_INNER}", re.IGNORECASE)

# Étapes de lecture reconnues dans la parenthèse finale.
_READING_RE = re.compile(
    r"(première lecture|deuxième lecture|troisième lecture|"
    r"nouvelle lecture|lecture définitive|commission mixte paritaire)",
    re.IGNORECASE,
)


# =============================================================================
#  Petits utilitaires
# =============================================================================
def _cap(s: str) -> str:
    """Majuscule sur la première lettre alphabétique, reste inchangé."""
    s = s.strip()
    for i, ch in enumerate(s):
        if ch.isalpha():
            return s[:i] + ch.upper() + s[i + 1:]
    return s


def _norm_art(ref: str) -> str:
    """Normalise une référence d'article (« 2  bis » → « 2 bis »)."""
    return re.sub(r"\s+", " ", ref).strip().lower()


def _first_article(text: str) -> str | None:
    m = _ART_RE.search(text)
    return _norm_art(m.group(1)) if m else None


def _etape_lecture(title: str) -> str | None:
    """Dernière parenthèse correspondant à une étape de lecture (ignore
    « (examen prioritaire) » qui, lui, qualifie l'article et non la lecture)."""
    etape = None
    for paren in re.findall(r"\(([^)]*)\)", title):
        m = _READING_RE.search(paren)
        if m:
            found = m.group(1).lower()
            etape = "Commission mixte paritaire" if "commission" in found else _cap(found)
    return etape


def _auteur(title: str, keyword: str) -> str | None:
    """Auteur introduit par `keyword` (« de » pour un amendement, « par » pour
    une motion). Capture la civilité + le nom jusqu'au prochain séparateur."""
    m = re.search(
        rf"\b{keyword}\s+(M\.|MM\.|Mmes?|Mme)\s+(.+?)"
        rf"(?=\s+et\s+(?:les\s+amendements|l{AP}amendement|\d+|plusieurs)|"
        rf"\s+à\s+l{AP}|\s+après\s+l{AP}|\s+de\s+suppression|"
        rf"\s+du\s+projet|\s+de\s+la\s+proposition|"
        rf",\s+de\b|,\s+du\b|,\s+M(?:me|M)?\.|,|\.\s*$|$)",
        title,
        re.IGNORECASE,
    )
    return f"{m.group(1)} {m.group(2).strip()}" if m else None


def _extract_loi(title: str):
    """(type_texte, loi_associee, index_de_début) ou (None, None, None)."""
    m = _LAW_RE.search(title) or _LAW_LEAD_RE.match(title)
    if not m:
        return None, None, None
    type_texte = _BASE_MAP.get(m.group(1).lower(), _cap(m.group(1)))
    loi = _clean_loi(m.group(2))
    return type_texte, loi, m.start()


def _clean_loi(intitule: str) -> str | None:
    """Nettoie l'intitulé de la loi : retire l'étape de lecture finale puis le
    participe introductif (« visant à », « relatif à », « portant »…). Les noms
    fixes (« de finances », « d'urgence », « d'orientation »…) sont préservés et
    préfixés par « Loi »."""
    s = re.sub(r"[.\s]+$", "", intitule.strip())     # points / espaces finaux
    s = re.sub(r"\s*\([^)]*\)\s*$", "", s)            # parenthèse d'étape de lecture
    # incise procédurale « , adoptée par le Sénat, » / « par l'Assemblée nationale, »
    s = re.sub(
        rf"^,?\s*adoptée?\s+par\s+(?:le\s+Sénat|l{AP}Assemblée nationale)\s*,?\s*",
        "", s, flags=re.IGNORECASE,
    )
    s = re.sub(r"[.\s]+$", "", s).strip()
    if not s:
        return None
    low = s.lower()
    if low.startswith(("de ", "d'", "d’", "des ")):
        return "Loi " + s  # loi de finances / d'urgence / d'orientation…
    return _cap(_PARTICIPLE_RE.sub("", s, count=1))


# =============================================================================
#  Fonction principale
# =============================================================================
def parse_scrutin(title: str) -> dict:
    """Décompose l'intitulé d'un scrutin en champs typés.

    Renvoie toujours un dict de la forme :
        {type_scrutin, loi_associee, action, metadonnees:{auteur,
         numero_amendement, etape_lecture, ...}}
    """
    raw = title or ""
    t = re.sub(r"\s+", " ", raw).strip()
    low = t.lower()

    etape = _etape_lecture(t)
    type_texte, loi, law_start = _extract_loi(t)
    head = t[:law_start] if law_start is not None else t  # partie « action »

    meta: dict = {
        "auteur": None,
        "numero_amendement": None,
        "etape_lecture": etape,
        "type_texte": type_texte,
    }

    # --- MOTION -------------------------------------------------------------
    if re.match(rf"\s*la\s+motion\b", low):
        if "motion de censure" in low:
            nature = "Motion de censure"
        elif "rejet préalable" in low:
            nature = "Motion de rejet préalable"
        elif "motion de rejet" in low:
            nature = "Motion de rejet"
        elif "référendaire" in low:
            nature = "Motion référendaire"
        elif "ajournement" in low:
            nature = "Motion d'ajournement"
        else:
            nature = "Motion"
        m49 = re.search(r"article\s+49,?\s+alinéa\s+(\d)", low)
        alinea = m49.group(1) if m49 else None
        cos = re.search(r"et\s+(\d+)\s+(?:députés|membres)", low)
        meta.update(
            auteur=_auteur(t, "par"),
            article_constitution=f"49.{alinea}" if alinea else None,
            cosignataires=int(cos.group(1)) if cos else None,
        )
        return {
            "type_scrutin": "Motion",
            "loi_associee": loi,  # loi visée (rejet préalable) ou None (censure)
            "action": f"{nature} (49.{alinea})" if alinea else nature,
            "metadonnees": meta,
        }

    # --- AMENDEMENT / SOUS-AMENDEMENT --------------------------------------
    if re.match(rf"\s*(?:l{AP}|le\s+|les\s+)(?:sous-)?amendements?\b", low):
        nums = re.findall(r"n\s*°\s*(\d+)", t)
        sous = bool(re.match(rf"\s*le\s+sous-amendement", low))
        meta.update(
            auteur=_auteur(t, "de"),
            numero_amendement=int(nums[0]) if nums else None,
            sous_amendement=sous,
            amendement_cible=int(nums[1]) if sous and len(nums) > 1 else None,
            identiques=bool(re.search(rf"amendements?\s+identiques?\s+suivants?", low)),
            examen_prioritaire="(examen prioritaire)" in low,
        )
        if "de suppression" in low:
            m = re.search(rf"de\s+suppression\s+de\s+l{AP}article\s+{_ART_INNER}", t, re.I)
            ref = _norm_art(m.group(1)) if m else _first_article(head)
            action = f"Suppression de l'article {ref}" if ref else "Suppression d'article"
        elif re.search(rf"après\s+l{AP}article", low):
            m = re.search(rf"après\s+l{AP}article\s+{_ART_INNER}", t, re.I)
            action = f"Après l'article {_norm_art(m.group(1))}" if m else "Article additionnel"
        else:
            ref = _first_article(head)
            action = f"Article {ref}" if ref else "Amendement"
        return {
            "type_scrutin": "Amendement",
            "loi_associee": loi,
            "action": action,
            "metadonnees": meta,
        }

    # --- VOTE FINAL (« l'ensemble … ») -------------------------------------
    if re.match(rf"\s*l{AP}ensemble\b", low):
        return {
            "type_scrutin": "Vote final",
            "loi_associee": loi,
            "action": "Vote sur l'ensemble du texte",
            "metadonnees": meta,
        }

    # --- ARTICLE -----------------------------------------------------------
    if re.match(rf"\s*l{AP}article\b", low):
        ref = _first_article(head)
        meta["examen_prioritaire"] = "(examen prioritaire)" in low
        return {
            "type_scrutin": "Article",
            "loi_associee": loi,
            "action": f"Article {ref}" if ref else "Article",
            "metadonnees": meta,
        }

    # --- VOTE FINAL, texte sujet (« le projet de loi … », « la première
    #     partie du projet de loi de finances … », « la proposition de
    #     résolution … ») : vote sur l'ensemble ou sur une partie du texte.
    lead = re.match(
        rf"\s*(?:le\s+projet de loi|la\s+proposition de loi|"
        rf"la\s+proposition de résolution|"
        rf"la\s+(première|seconde|nouvelle)\s+partie\s+(?:du|de la))",
        low,
    )
    if lead:
        partie = lead.group(1)
        return {
            "type_scrutin": "Vote final",
            "loi_associee": loi,
            "action": f"Vote sur la {partie} partie" if partie else "Vote sur l'ensemble du texte",
            "metadonnees": meta,
        }

    # --- AUTRE -------------------------------------------------------------
    return {
        "type_scrutin": "Autre",
        "loi_associee": loi,
        "action": None,
        "metadonnees": meta,
    }


# =============================================================================
#  Auto-test : `python scripts/parse_scrutin.py`
# =============================================================================
if __name__ == "__main__":
    import json
    import sys

    # La console Windows est en cp1252 ; on force UTF-8 pour l'affichage.
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

    ECHANTILLONS = [
        # L'exemple de la demande (tronqué par « … » comme fourni).
        "l'amendement n° 183 de Mme K/Bidi et les amendements identiques "
        "suivants de suppression de l'article 11 du projet de loi visant à "
        "offrir des réponses immédiates aux phénomènes troublant "
        "l'ordre public (première lecture).",
        "l'amendement n° 111 de M. Descoeur et les amendements identiques "
        "suivants après l'article 4 du projet de loi de finances pour 2023 "
        "(première lecture).",
        "l'amendement n° 437 de Mme Galzy à l'article 2 et rapport "
        "annexé du projet de loi relatif à la programmation militaire "
        "pour les années 2024 à 2030 et portant diverses dispositions "
        "intéressant la défense (première lecture).",
        "le sous-amendement n° 192 de M. Léaument à l'amendement "
        "n° 109 de M. Boudié à l'article 3 de la proposition de loi "
        "visant à renforcer la sécurité, la rétention "
        "administrative et la prévention des risques d'attentat (première lecture).",
        "l'article 20 (examen prioritaire) du projet de loi relatif à "
        "l'organisation des jeux Olympiques et Paralympiques de 2030 (première lecture).",
        "l'article premier de la proposition de loi visant à sortir la France "
        "du piège du marché européen de l'électricité (première lecture).",
        "l'ensemble du projet de loi de finances de fin de gestion pour 2024 "
        "(texte de la commission mixte paritaire).",
        "l'ensemble de la proposition de loi relative au droit à l'aide à "
        "mourir (deuxième lecture).",
        "la motion de censure déposée en application de l'article 49, "
        "alinéa 3, de la Constitution par Mme Mathilde Panot et 74 membres de "
        "l'Assemblée.",
        "la motion de rejet préalable, déposée par M. Boris Vallaud, "
        "du projet de loi relatif à l'accélération des procédures "
        "liées à la construction de nouvelles installations nucléaires "
        "(première lecture).",
    ]

    for titre in ECHANTILLONS:
        print("\n=== " + titre[:70] + "...")
        print(json.dumps(parse_scrutin(titre), ensure_ascii=False, indent=2))
