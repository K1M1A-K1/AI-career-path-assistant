"""Skill taxonomy: load + validate YAML (concepts, roles, resources)."""
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
    # Target concepts per level. Cumulative: level N includes all lower levels.
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
    raise NotImplementedError


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
