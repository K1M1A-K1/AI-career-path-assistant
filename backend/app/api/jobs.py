from fastapi import APIRouter, HTTPException

from app.jobs import ranking, store
from app.schemas import JobMatch, MatchRequest
from app.session import get_session
from app.stubs import load_fixture, run_or_stub

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

    def real() -> list[JobMatch]:
        if req.method == "baseline":
            return ranking.baseline_rank(resume, postings, k=10)
        return ranking.hybrid_rank(req.session_id, resume, postings, k=10)

    def stub() -> list[JobMatch]:
        matches = [JobMatch(**m) for m in load_fixture("job_matches.json")]
        keep = {p.id for p in ranking.apply_filters([m.posting for m in matches], req.filters)}
        return [m for m in matches if m.posting.id in keep][:10]

    return run_or_stub(real, stub)
