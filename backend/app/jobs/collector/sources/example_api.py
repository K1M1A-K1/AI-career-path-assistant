"""Template source adapter (Remotive public JSON API). Copy this for a second source."""
import json

from app.jobs.collector.base import PoliteFetcher
from app.schemas import JobPosting

SOURCE = "remotive"
URL = "https://remotive.com/api/remote-jobs?limit=50"


def fetch(fetcher: PoliteFetcher) -> list[JobPosting]:
    raw = fetcher.get(URL)
    if raw is None:
        return []
    return parse(json.loads(raw))


def parse(payload: dict) -> list[JobPosting]:
    """Map the API payload to normalised JobPostings.

    Fields: title, company_name, candidate_required_location, url, publication_date,
    description (HTML -> extract requirements). Set remote=True, id=f"{SOURCE}-{job id}",
    leave skill_ids empty (filled later by jobs.normalize.map_skills).
    """
    raise NotImplementedError
