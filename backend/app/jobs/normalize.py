"""Display cleaning and exact, conservative matching against the live taxonomy."""
import re
import unicodedata

from app.careers import taxonomy as taxonomy_module
from app.careers.taxonomy import Taxonomy


def normalize_text(text: str) -> str:
    # Hazm-compatible character/spacing cleanup without changing technical punctuation.
    text = unicodedata.normalize("NFKC", text).translate(str.maketrans({"ي": "ی", "ك": "ک", "ى": "ی", "ة": "ه", "ۀ": "ه"}))
    text = text.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    text = text.replace("\u200f", "").replace("\u200e", "").replace("\ufeff", "")
    text = re.sub(r"[\u064b-\u065f\u0670\u0640]", "", text)
    return " ".join(text.split()).casefold()


def _key(text: str) -> str:
    cleaned = normalize_text(text).replace("\u200c", " ")
    helper = getattr(taxonomy_module, "normalize_text", None)
    # P1's matching convention is authoritative when integrated.
    # Keep punctuation significant for technical names and approved IDs.
    if re.search(r"[+#._]", cleaned):
        return " ".join(cleaned.split())
    return helper(cleaned) if helper else " ".join(cleaned.split())


def map_skills(skills: list[str], taxonomy: Taxonomy) -> list[str]:
    index: dict[str, set[str]] = {}
    for cid, concept in taxonomy.concepts.items():
        for label in [cid, concept.label_fa, concept.label_en, *concept.aliases]:
            index.setdefault(_key(label), set()).add(cid)
    approved = []
    for skill in skills:
        candidates = index.get(_key(skill), set())
        if len(candidates) == 1:
            cid = next(iter(candidates))
            if cid not in approved:
                approved.append(cid)
    return approved
