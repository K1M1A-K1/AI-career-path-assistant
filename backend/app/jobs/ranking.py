import hashlib
import logging
import os
import re

import numpy as np
from rank_bm25 import BM25Okapi

from app.careers.taxonomy import get_taxonomy
from app.config import settings
from app.jobs.collector.sources.common import canonical_city
from app.jobs.explain import explanation_fa, matched_missing
from app.jobs.normalize import normalize_text
from app.llm.client import embed
from app.schemas import JobMatch, JobPosting, MatchFilters, ResumeProfile

log = logging.getLogger(__name__)
_LEVELS = {"junior": 0, "mid": 1, "senior": 2}


def apply_filters(postings: list[JobPosting], f: MatchFilters) -> list[JobPosting]:
    """Filter by location (Persian/English city names both work), seniority and remote."""
    out = postings
    if f.location:
        want = canonical_city(f.location).lower()
        out = [p for p in out if want in canonical_city(p.location).lower() or want in p.location.lower()]
    if f.seniority:
        out = [p for p in out if p.seniority == f.seniority]
    if f.remote is not None:
        out = [p for p in out if p.remote == f.remote]
    return out


# ---------- shared helpers ----------
def _tokens(text: str) -> list[str]:
    return [t for t in re.split(r"[^\w+#]+", normalize_text(text)) if len(t) > 1]


def _posting_text(p: JobPosting) -> str:
    return " ".join([p.title, *p.requirements])


def _make_match(resume: ResumeProfile, p: JobPosting, score: float) -> JobMatch:
    matched, missing = matched_missing(resume, p)
    return JobMatch(
        posting=p, score=round(float(score), 4), matched_skills=matched, missing_skills=missing,
        explanation_fa=explanation_fa(matched, missing),
    )


def _top(resume: ResumeProfile, postings: list[JobPosting], scores: list[float], k: int) -> list[JobMatch]:
    order = sorted(range(len(postings)), key=lambda i: (-scores[i], postings[i].id))[:k]
    return [_make_match(resume, postings[i], scores[i]) for i in order]


# ---------- baseline: BM25 ----------
def baseline_rank(resume: ResumeProfile, postings: list[JobPosting], k: int = 10) -> list[JobMatch]:
    """BM25 keyword-overlap baseline (rank_bm25).

    Query = resume skills + previous roles + Persian/English labels of resume.skill_ids;
    documents = posting title + requirements. Score divided by the max, so it lies in [0, 1].
    """
    if not postings:
        return []
    concepts = get_taxonomy().concepts
    query_parts = [*resume.skills, *resume.previous_roles]
    for sid in resume.skill_ids:
        if sid in concepts:
            query_parts += [concepts[sid].label_fa, concepts[sid].label_en]
    query = _tokens(" ".join(query_parts))
    docs = [_tokens(_posting_text(p)) or ["_"] for p in postings]
    raw = BM25Okapi(docs).get_scores(query) if query else np.zeros(len(postings))
    top = float(np.max(raw))
    scores = [float(s) / top if top > 0 else 0.0 for s in raw]
    return _top(resume, postings, scores, k)


# ---------- hybrid ----------
def _skill_score(resume: ResumeProfile, p: JobPosting) -> float:
    need, have = set(p.skill_ids), set(resume.skill_ids)
    if not need:
        return 0.0
    inter = len(need & have)
    coverage = inter / len(need)
    jaccard = inter / len(need | have)
    b = settings.skill_jaccard_blend
    return (1 - b) * coverage + b * jaccard


def _seniority_fit(resume: ResumeProfile, p: JobPosting) -> float:
    if resume.level_guess is None or p.seniority is None:
        return 0.5
    return {0: 1.0, 1: 0.5}.get(abs(_LEVELS[resume.level_guess] - _LEVELS[p.seniority]), 0.0)


def _cache_path():
    return settings.data_dir / "jobs" / "embeddings.npz"


def _load_cache() -> dict[str, tuple[str, np.ndarray]]:
    path = _cache_path()
    if not path.exists():
        return {}
    try:
        with np.load(path, allow_pickle=False) as z:
            return {i: (h, v) for i, h, v in zip(z["ids"].tolist(), z["hashes"].tolist(), z["vectors"])}
    except Exception:  # noqa: BLE001 - a corrupt cache is just a cold cache
        return {}


def _save_cache(cache: dict[str, tuple[str, np.ndarray]]) -> None:
    if not cache:
        return
    _cache_path().parent.mkdir(parents=True, exist_ok=True)
    ids = sorted(cache)
    tmp = _cache_path().with_suffix(".tmp.npz")
    np.savez(tmp, ids=np.array(ids), hashes=np.array([cache[i][0] for i in ids]),
             vectors=np.stack([cache[i][1] for i in ids]))
    os.replace(tmp, _cache_path())


def _text_hash(text: str) -> str:
    return hashlib.sha1(f"{settings.embed_model}\n{text}".encode()).hexdigest()


def _posting_vectors(session_id: str, postings: list[JobPosting]) -> dict[str, np.ndarray] | None:
    """id -> vector, embedding only postings missing from the disk cache. None if embedding failed."""
    cache = _load_cache()
    todo = [p for p in postings if cache.get(p.id, ("", None))[0] != _text_hash(_posting_text(p))]
    size = settings.embed_batch_size
    for i in range(0, len(todo), size):
        batch = todo[i:i + size]
        res = embed(session_id, [_posting_text(p) for p in batch])
        if not res.ok or len(res.data) != len(batch):
            log.warning("embeddings unavailable (%s); ranking without them", res.error.kind if res.error else "bad_size")
            _save_cache(cache)
            return None
        for p, vec in zip(batch, res.data):
            cache[p.id] = (_text_hash(_posting_text(p)), np.asarray(vec, dtype=np.float32))
    if todo:
        _save_cache(cache)
    return {p.id: cache[p.id][1] for p in postings}


def _embed_scores(session_id: str, resume: ResumeProfile, postings: list[JobPosting]) -> list[float] | None:
    resume_text = " ".join([*resume.skills, *resume.previous_roles, *resume.education]).strip()
    if not resume_text:
        return None
    vecs = _posting_vectors(session_id, postings)
    if vecs is None:
        return None
    res = embed(session_id, [resume_text])  # resume vector lives in memory only
    if not res.ok or not res.data:
        log.warning("embeddings unavailable (%s); ranking without them", res.error.kind if res.error else "empty")
        return None
    q = np.asarray(res.data[0], dtype=np.float32)
    qn = np.linalg.norm(q)
    if qn == 0:
        return None
    cos = []
    for p in postings:
        v = vecs[p.id]
        n = np.linalg.norm(v)
        cos.append(float(v @ q / (n * qn)) if n > 0 and v.shape == q.shape else 0.0)
    lo, hi = min(cos), max(cos)
    if hi - lo > 1e-9:  # stretch to [0, 1] across candidates so the signal has comparable spread
        return [(c - lo) / (hi - lo) for c in cos]
    return [min(max(c, 0.0), 1.0) for c in cos]


def hybrid_rank(
    session_id: str, resume: ResumeProfile, postings: list[JobPosting], k: int = 10
) -> list[JobMatch]:
    """Our ranker: weighted skill overlap + embedding cosine + seniority fit.

    Weights come from config and are renormalised over the signals that are available; if
    embeddings fail the embedding term is dropped (no exception).
    """
    if not postings:
        return []
    emb = _embed_scores(session_id, resume, postings)
    signals = [
        (settings.w_skill_overlap, [_skill_score(resume, p) for p in postings]),
        (settings.w_seniority, [_seniority_fit(resume, p) for p in postings]),
    ]
    if emb is not None:
        signals.append((settings.w_embedding, emb))
    total_w = sum(w for w, _ in signals) or 1.0
    scores = [sum(w * s[i] for w, s in signals) / total_w for i in range(len(postings))]
    return _top(resume, postings, scores, k)
