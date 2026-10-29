from app.schemas import JobPosting


def dedup(postings: list[JobPosting]) -> list[JobPosting]:
    """Remove duplicates across sources.

    Algorithm: key = normalised (title, company, location); also treat identical urls as
    duplicates; optionally fuzzy match titles (token-set ratio >= 0.9). Keep the posting
    with the most requirements/most recent published_at.
    """
    raise NotImplementedError
