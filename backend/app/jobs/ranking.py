from app.schemas import JobMatch, JobPosting, MatchFilters, ResumeProfile


def apply_filters(postings: list[JobPosting], f: MatchFilters) -> list[JobPosting]:
    """Filter by location (substring, case-insensitive), seniority and remote."""
    out = postings
    if f.location:
        out = [p for p in out if f.location.lower() in p.location.lower()]
    if f.seniority:
        out = [p for p in out if p.seniority == f.seniority]
    if f.remote is not None:
        out = [p for p in out if p.remote == f.remote]
    return out


def baseline_rank(
    resume: ResumeProfile, postings: list[JobPosting], k: int = 10
) -> list[JobMatch]:
    """BM25 keyword-overlap baseline (rank_bm25).

    Query = resume skills + previous roles (normalised tokens); documents = posting
    title + requirements. Score normalised to [0, 1]. Fill matched/missing via jobs.explain.
    """
    raise NotImplementedError


def hybrid_rank(
    session_id: str, resume: ResumeProfile, postings: list[JobPosting], k: int = 10
) -> list[JobMatch]:
    """Our ranker.

    score = w_skill_overlap * taxonomy skill_id overlap (Jaccard/coverage)
          + w_embedding * cosine(embed(resume), embed(posting))   (llm.client.embed, cache vectors)
    Optionally (settings.llm_rerank) re-rank the top settings.llm_rerank_top_k with the LLM.
    Weights come from config. If embeddings fail, fall back to skill overlap only.
    """
    raise NotImplementedError
