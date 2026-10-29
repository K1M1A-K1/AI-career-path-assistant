"""Validate the taxonomy YAML: references resolve, no cycles, size rules.  Run: python -m scripts.validate_taxonomy"""
import re
import sys
from collections import Counter

import yaml

from app.careers.graph import LEVELS, compute_roadmap
from app.careers.taxonomy import TaxonomyError, check_acyclic, load_taxonomy
from app.config import settings
from app.schemas import CareerProfile

ID_RE = re.compile(r"^[a-z][a-z0-9_]*$")
MAX_NODES = 40  # warn above this; the UI must show a roadmap on one screen


def main() -> int:
    tax = load_taxonomy()
    errors: list[str] = []
    warnings: list[str] = []

    d = settings.data_dir / "taxonomy"
    for name in ("concepts", "roles"):
        ids = Counter(x["id"] for x in yaml.safe_load((d / f"{name}.yaml").read_text("utf-8")))
        errors += [f"{name}: duplicate id {i!r}" for i, n in ids.items() if n > 1]

    for c in tax.concepts.values():
        if not ID_RE.match(c.id):
            errors.append(f"{c.id}: id must be lowercase snake_case")
        if not c.label_fa.strip() or not c.label_en.strip():
            errors.append(f"{c.id}: missing label_fa/label_en")
        errors += [f"{c.id}: unknown prerequisite {p}" for p in c.prerequisites if p not in tax.concepts]
    for r in tax.roles.values():
        if not ID_RE.match(r.id):
            errors.append(f"{r.id}: id must be lowercase snake_case")
        seen: dict[str, str] = {}
        for level in LEVELS:
            ids = r.levels.get(level) or []
            if not ids:
                errors.append(f"{r.id}: level {level!r} is missing or empty")
            for i in ids:
                if i not in tax.concepts:
                    errors.append(f"{r.id}/{level}: unknown concept {i}")
                elif i in seen:
                    errors.append(f"{r.id}: concept {i} listed in both {seen[i]} and {level}")
                else:
                    seen[i] = level
    for cid in tax.resources:
        if cid not in tax.concepts:
            errors.append(f"resources: unknown concept {cid}")
    try:
        check_acyclic(tax.concepts)
    except TaxonomyError as exc:
        errors.append(str(exc))

    domains = {r.domain for r in tax.roles.values()}
    if len(tax.roles) < 10:
        errors.append(f"only {len(tax.roles)} roles (need >= 10)")
    if len(domains) < 3:
        errors.append(f"only {len(domains)} domains (need >= 3)")

    if not errors:  # roadmaps need a valid graph
        for r in tax.roles.values():
            for level in LEVELS:
                n = len(compute_roadmap(CareerProfile(target_role=r.id, target_level=level,
                                                      current_level="junior"), tax).nodes)
                if n > MAX_NODES:
                    warnings.append(f"{r.id}/{level}: roadmap has {n} nodes (> {MAX_NODES})")
    used = {c for r in tax.roles.values() for ids in r.levels.values() for c in ids}
    prereqs = {p for c in tax.concepts.values() for p in c.prerequisites}
    warnings += [f"orphan concept (no role, not a prerequisite): {c}" for c in tax.concepts
                 if c not in used and c not in prereqs]
    warnings += [f"no verified resource: {c}" for c in tax.concepts
                 if not any(r.verified for r in tax.resources.get(c, []))]

    for e in errors:
        print("ERROR  ", e)
    for w in warnings:
        print("WARNING", w)
    print(f"{len(tax.roles)} roles, {len(domains)} domains, {len(tax.concepts)} concepts, "
          f"{len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
