import html
import re

from app.careers.taxonomy import Taxonomy
from app.careers.taxonomy import normalize_text as _base_normalize

_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")


def normalize_text(text: str) -> str:
    """Persian normalisation: P1's letter/ZWNJ cleanup + HTML entities, digits -> ASCII, spaces."""
    s = html.unescape(text or "").translate(_DIGITS)
    s = _base_normalize(s)  # ي->ی, ك->ک, drops ZWNJ/tatweel/diacritics, lowercases, collapses spaces
    return re.sub(r"\s+", " ", s).strip()


def clean_text(text: str) -> str:
    """Display-safe cleanup for stored fields: keeps ZWNJ and case (unlike `normalize_text`, which is
    for matching/keys). HTML entities, Arabic ي/ك -> ی/ک, digits -> ASCII, whitespace."""
    s = html.unescape(text or "").translate(_DIGITS)
    s = s.replace("ي", "ی").replace("ى", "ی").replace("ك", "ک")
    return re.sub(r"\s+", " ", s).strip()


_INDEX_CACHE: dict[int, tuple[dict[str, list[str]], list[tuple[str, list[str]]]]] = {}


def _index(taxonomy: Taxonomy) -> tuple[dict[str, list[str]], list[tuple[str, list[str]]]]:
    """(exact name -> ids, [(alias >= 3 chars, id)] longest first). Same normaliser as the input."""
    key = id(taxonomy)
    if key not in _INDEX_CACHE:
        exact: dict[str, list[str]] = {}
        for cid in sorted(taxonomy.concepts):
            c = taxonomy.concepts[cid]
            for name in (c.label_fa, c.label_en, *c.aliases):
                n = normalize_text(name)
                if n:
                    ids = exact.setdefault(n, [])
                    if cid not in ids:
                        ids.append(cid)
        sub = sorted(((n, cid) for n, cid in exact.items() if len(n) >= 3), key=lambda x: (-len(x[0]), x[0]))
        _INDEX_CACHE[key] = (exact, sub)
    return _INDEX_CACHE[key]


def map_skills(skills: list[str], taxonomy: Taxonomy) -> list[str]:
    """Map free-text skills to taxonomy concept ids via label_fa/label_en/aliases (normalised).

    Exact match first, then every alias (>= 3 chars) found as whole words inside the text.
    Unknown skills are dropped. Return unique ids, order preserved.
    """
    exact, sub = _index(taxonomy)
    out: list[str] = []
    for raw in skills:
        text = normalize_text(raw)
        if not text:
            continue
        if text in exact:
            found = exact[text]
        else:
            # pos in text keeps the order of mention; an alias inside an already-matched longer one is skipped
            hits: list[tuple[int, str]] = []
            taken: list[tuple[int, int]] = []
            for alias, cids in sub:
                m = re.search(rf"(?<![\w]){re.escape(alias)}(?![\w])", text)
                if m and not any(a <= m.start() and m.end() <= b for a, b in taken):
                    taken.append((m.start(), m.end()))
                    hits.extend((m.start(), cid) for cid in cids)
            found = [cid for _, cid in sorted(hits)]
        for cid in found:
            if cid not in out:
                out.append(cid)
    return out
