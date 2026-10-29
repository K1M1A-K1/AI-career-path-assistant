from app.careers.taxonomy import Taxonomy


def normalize_text(text: str) -> str:
    """Persian normalisation with hazm.Normalizer (ي->ی, ك->ک, ZWNJ, digits), lowercase Latin."""
    raise NotImplementedError


def map_skills(skills: list[str], taxonomy: Taxonomy) -> list[str]:
    """Map free-text skills to taxonomy concept ids via label_fa/label_en/aliases (normalised).

    Unknown skills are dropped. Return unique ids, order preserved.
    """
    raise NotImplementedError
