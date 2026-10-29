from app.schemas import JobPosting, ResumeProfile


def matched_missing(resume: ResumeProfile, posting: JobPosting) -> tuple[list[str], list[str]]:
    """Return (matched_skill_ids, missing_skill_ids): posting.skill_ids ∩ / − resume.skill_ids."""
    raise NotImplementedError


def explanation_fa(matched: list[str], missing: list[str]) -> str:
    """Short deterministic Persian explanation built from the two lists (no LLM)."""
    raise NotImplementedError
