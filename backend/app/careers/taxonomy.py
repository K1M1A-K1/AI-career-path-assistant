"""Skill taxonomy: load + validate YAML (concepts, roles, resources)."""
import re
import unicodedata
from functools import lru_cache

import yaml
from pydantic import BaseModel, Field

from app.config import settings
from app.schemas import Resource


class TaxonomyError(ValueError):
    pass


class Concept(BaseModel):
    id: str
    label_fa: str
    label_en: str
    prerequisites: list[str] = Field(default_factory=list)
    aliases: list[str] = Field(default_factory=list)  # used by jobs/normalize.py


class Role(BaseModel):
    id: str
    label_fa: str
    label_en: str
    domain: str
    aliases: list[str] = Field(default_factory=list)  # spellings users/LLMs may use for the role
    # Target concepts per level. Cumulative: level N includes all lower levels, so each list
    # holds only the EXTRA concepts introduced at that level.
    levels: dict[str, list[str]] = Field(default_factory=dict)


class Taxonomy(BaseModel):
    concepts: dict[str, Concept]
    roles: dict[str, Role]
    resources: dict[str, list[Resource]] = Field(default_factory=dict)  # concept id -> resources


def check_acyclic(concepts: dict[str, Concept]) -> None:
    """Raise TaxonomyError if the prerequisite graph has a cycle or a dangling reference.

    Algorithm: DFS with white/grey/black colouring (or networkx.is_directed_acyclic_graph).
    Also raise TaxonomyError for prerequisites that are not keys of `concepts`.
    """
    for cid in sorted(concepts):
        for p in concepts[cid].prerequisites:
            if p not in concepts:
                raise TaxonomyError(f"{cid}: unknown prerequisite {p!r}")
    grey, black = set(), set()
    for start in sorted(concepts):
        if start in black:
            continue
        path = [start]
        stack = [iter(sorted(concepts[start].prerequisites))]
        grey.add(start)
        while stack:
            nxt = next(stack[-1], None)
            if nxt is None:
                black.add(path[-1])
                grey.discard(path[-1])
                stack.pop()
                path.pop()
            elif nxt in grey:
                cycle = path[path.index(nxt):] + [nxt]
                raise TaxonomyError("cycle in prerequisites: " + " -> ".join(cycle))
            elif nxt not in black:
                grey.add(nxt)
                path.append(nxt)
                stack.append(iter(sorted(concepts[nxt].prerequisites)))


def ancestors(concepts: dict[str, Concept], ids) -> set[str]:
    """`ids` plus all their transitive prerequisites. Ids that are not concepts are ignored."""
    out: set[str] = set()
    todo = [i for i in ids if i in concepts]
    while todo:
        c = todo.pop()
        if c not in out:
            out.add(c)
            todo.extend(p for p in concepts[c].prerequisites if p in concepts)
    return out


def normalize_text(text: str) -> str:
    """Lowercase, unify Arabic/Persian letters, drop ZWNJ/tatweel/diacritics, collapse spaces."""
    s = unicodedata.normalize("NFKC", text or "").lower()
    s = s.replace("ي", "ی").replace("ى", "ی").replace("ك", "ک")
    s = re.sub("[‌‍ـً-ٰٟ]", "", s)
    return re.sub(r"\s+", " ", re.sub(r"[_\-]+", " ", s)).strip()


def find_role(text: str, taxonomy: "Taxonomy") -> str | None:
    """Role id for a role id/label/alias (exact after normalisation), else the longest alias
    found as whole words inside `text` (e.g. «می‌خوام تحلیلگر داده بشم»). None if unknown."""
    q = normalize_text(text)
    if not q:
        return None
    index: dict[str, str] = {}
    for rid in sorted(taxonomy.roles):
        r = taxonomy.roles[rid]
        for name in (rid, r.label_fa, r.label_en, *r.aliases):
            n = normalize_text(name)
            if n:
                index.setdefault(n, rid)
    if q in index:
        return index[q]
    hits = sorted(((len(n), n, rid) for n, rid in index.items() if len(n) >= 4 and f" {n} " in f" {q} "),
                  key=lambda h: (-h[0], h[1]))
    if hits and len({h[2] for h in hits if h[0] == hits[0][0]}) == 1:
        return hits[0][2]
    return None


def load_taxonomy(validate: bool = False) -> Taxonomy:
    d = settings.data_dir / "taxonomy"
    concepts = {c["id"]: Concept(**c) for c in yaml.safe_load((d / "concepts.yaml").read_text("utf-8"))}
    roles = {r["id"]: Role(**r) for r in yaml.safe_load((d / "roles.yaml").read_text("utf-8"))}
    resources: dict[str, list[Resource]] = {}
    for r in yaml.safe_load((d / "resources.yaml").read_text("utf-8")):
        resources.setdefault(r.pop("concept"), []).append(Resource(**r))
    tax = Taxonomy(concepts=concepts, roles=roles, resources=resources)
    if validate:
        check_acyclic(tax.concepts)
    return tax


@lru_cache
def get_taxonomy() -> Taxonomy:
    return load_taxonomy()
