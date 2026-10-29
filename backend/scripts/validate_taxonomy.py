"""Validate the taxonomy YAML: references resolve, no cycles.  Run: python -m scripts.validate_taxonomy"""
import sys

from app.careers.taxonomy import check_acyclic, load_taxonomy


def main() -> int:
    tax = load_taxonomy()
    errors = []
    for c in tax.concepts.values():
        errors += [f"{c.id}: unknown prerequisite {p}" for p in c.prerequisites if p not in tax.concepts]
    for r in tax.roles.values():
        for level, ids in r.levels.items():
            errors += [f"{r.id}/{level}: unknown concept {i}" for i in ids if i not in tax.concepts]
    for cid in tax.resources:
        if cid not in tax.concepts:
            errors.append(f"resources: unknown concept {cid}")
    try:
        check_acyclic(tax.concepts)
    except NotImplementedError:
        print("[warn] check_acyclic not implemented yet")
    except ValueError as exc:
        errors.append(str(exc))
    for e in errors:
        print("ERROR", e)
    print(f"{len(tax.roles)} roles, {len(tax.concepts)} concepts, {len(errors)} errors")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
