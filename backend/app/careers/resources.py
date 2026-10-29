from app.careers.taxonomy import Taxonomy
from app.schemas import Resource


def pick_resources(concept_id: str, taxonomy: Taxonomy, limit: int = 2) -> list[Resource]:
    """Return up to `limit` resources for a concept.

    Prefer verified=True, then lang == "fa", then free ones. Only return resources whose
    url was checked by scripts/verify_resources.py (verified flag in resources.yaml).

    Only verified resources are returned, so an unchecked or dead link is never shown.
    Persian first, then non-encyclopedia sources (docs/courses) before Wikipedia; file order
    breaks ties, so the result is deterministic.
    """
    verified = [r for r in taxonomy.resources.get(concept_id, []) if r.verified]
    ranked = sorted(
        enumerate(verified),
        key=lambda ir: (ir[1].lang != "fa", "wikipedia.org" in ir[1].url, ir[0]),
    )
    return [r for _, r in ranked[:limit]]
