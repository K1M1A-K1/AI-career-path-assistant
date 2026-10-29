from fastapi import APIRouter, HTTPException

from app.jobs import ranking, store
from app.schemas import JobMatch, MatchRequest
from app.session import get_session

router = APIRouter()


@router.get("/jobs/count")
def jobs_count() -> dict[str, int]:
    return {"count": len(store.load_postings())}


@router.post("/jobs/match", response_model=list[JobMatch])
def match_jobs(req: MatchRequest) -> list[JobMatch]:
    resume = get_session(req.session_id).resume
    if resume is None:
        raise HTTPException(400, "ابتدا رزومه را بارگذاری کنید")
    postings = ranking.apply_filters(store.load_postings(), req.filters)
    if req.method == "baseline":
        return ranking.baseline_rank(resume, postings, k=10)
    return ranking.hybrid_rank(req.session_id, resume, postings, k=10)
