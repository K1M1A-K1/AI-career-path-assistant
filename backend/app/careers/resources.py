from app.careers.taxonomy import Taxonomy
from app.schemas import Resource


def pick_resources(concept_id: str, taxonomy: Taxonomy, limit: int = 2) -> list[Resource]:
    """Return up to `limit` resources for a concept.

    Prefer verified=True, then lang == "fa", then free ones. Only return resources whose
    url was checked by scripts/verify_resources.py (verified flag in resources.yaml).
    """
    raise NotImplementedError
