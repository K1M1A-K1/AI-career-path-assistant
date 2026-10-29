import hashlib
import logging

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.jobs import ranking, store
from app.llm.client import LLMError, LLMResult
from app.main import app
from app.schemas import JobPosting, MatchFilters, ResumeProfile
from app.session import get_session

RESUME = ResumeProfile(
    skills=["Python", "SQL", "Excel", "Git"], skill_ids=["python_basics", "sql_basics", "excel", "git_basics"],
    previous_roles=["کارآموز تحلیل داده"], education=["کارشناسی مهندسی کامپیوتر"],
    location="Tehran", level_guess="junior",
)


def jp(id, title, reqs=(), ids=(), loc="تهران", sen="junior", remote=False):
    return JobPosting(id=id, source="t", title=title, company=f"co-{id}", location=loc, remote=remote,
                      seniority=sen, requirements=list(reqs), skill_ids=list(ids), url=f"https://x.test/{id}")


POSTINGS = [
    jp("a", "Junior Python Data Analyst", ["Python", "SQL", "Excel"], ["python_basics", "sql_basics", "excel"]),
    jp("b", "Senior Marketing Manager", ["برند", "تبلیغات"], ["digital_marketing_basics"], sen="senior", loc="شیراز"),
    jp("c", "Backend Developer", ["Python", "Docker", "Git"], ["python_basics", "docker_basics", "git_basics"], sen="mid"),
    jp("d", "Remote SEO Specialist", ["سئو", "Google Search Console"], ["seo_basics"], remote=True, loc="اصفهان"),
]


def fake_embed(session_id, texts, model=None):
    """Hashed bag-of-words vectors: similar texts -> similar vectors, no network."""
    out = []
    for t in texts:
        v = np.zeros(64)
        for w in t.lower().split():
            v[int(hashlib.md5(w.encode()).hexdigest(), 16) % 64] += 1
        out.append(v.tolist())
    return LLMResult(True, data=out)


def failing_embed(session_id, texts, model=None):
    return LLMResult(False, error=LLMError("not_configured", "no key"))


@pytest.fixture(autouse=True)
def isolated(monkeypatch, tmp_path):
    monkeypatch.setattr(ranking, "_cache_path", lambda: tmp_path / "embeddings.npz")
    monkeypatch.setattr(ranking, "embed", fake_embed)


def test_filters_location_seniority_remote():
    assert [p.id for p in ranking.apply_filters(POSTINGS, MatchFilters(location="Tehran"))] == ["a", "c"]
    assert [p.id for p in ranking.apply_filters(POSTINGS, MatchFilters(location="تهران"))] == ["a", "c"]
    assert [p.id for p in ranking.apply_filters(POSTINGS, MatchFilters(location="shiraz"))] == ["b"]
    assert [p.id for p in ranking.apply_filters(POSTINGS, MatchFilters(seniority="mid"))] == ["c"]
    assert [p.id for p in ranking.apply_filters(POSTINGS, MatchFilters(remote=True))] == ["d"]
    assert len(ranking.apply_filters(POSTINGS, MatchFilters())) == 4


def real_postings():
    return store.load_postings()


@pytest.mark.parametrize("method", ["baseline", "hybrid"])
def test_returns_at_most_10_sorted_desc(method):
    posts = real_postings()
    assert len(posts) >= 50
    out = rank(method, posts)
    assert len(out) == 10
    scores = [m.score for m in out]
    assert scores == sorted(scores, reverse=True) and all(0 <= s <= 1 for s in scores)


def rank(method, posts, resume=RESUME, k=10):
    if method == "baseline":
        return ranking.baseline_rank(resume, posts, k)
    return ranking.hybrid_rank("s1", resume, posts, k)


@pytest.mark.parametrize("method", ["baseline", "hybrid"])
def test_zero_results_returns_empty_list(method):
    assert rank(method, []) == []
    assert rank(method, ranking.apply_filters(POSTINGS, MatchFilters(location="تبریز"))) == []


def test_hybrid_falls_back_when_embedding_fails(monkeypatch, caplog):
    monkeypatch.setattr(ranking, "embed", failing_embed)
    with caplog.at_level(logging.WARNING):
        out = ranking.hybrid_rank("s1", RESUME, POSTINGS)
    assert len(out) == 4 and out[0].posting.id == "a"
    assert "embeddings unavailable" in caplog.text
    assert "Python" not in caplog.text and "کارآموز" not in caplog.text  # no resume content in logs


def test_hybrid_prefers_skill_match():
    for method in ("baseline", "hybrid"):
        out = rank(method, POSTINGS)
        ids = [m.posting.id for m in out]
        assert ids.index("a") < ids.index("b"), method
    top = ranking.hybrid_rank("s1", RESUME, POSTINGS)[0]
    assert top.posting.id == "a" and top.matched_skills == ["python_basics", "sql_basics", "excel"]
    assert top.missing_skills == [] and "تمام" in top.explanation_fa


@pytest.mark.parametrize("method", ["baseline", "hybrid"])
def test_rankers_are_deterministic(method):
    posts = real_postings()
    first = [(m.posting.id, m.score) for m in rank(method, posts)]
    assert first == [(m.posting.id, m.score) for m in rank(method, posts)]


def test_embedding_cache_written_and_reused(monkeypatch, tmp_path):
    ranking.hybrid_rank("s1", RESUME, POSTINGS)
    assert (tmp_path / "embeddings.npz").exists()
    calls = []
    monkeypatch.setattr(ranking, "embed", lambda sid, texts, model=None: (calls.append(len(texts)), fake_embed(sid, texts))[1])
    ranking.hybrid_rank("s1", RESUME, POSTINGS)
    assert calls == [1]  # only the resume is embedded; posting vectors come from disk
    with np.load(tmp_path / "embeddings.npz") as z:
        assert sorted(z["ids"].tolist()) == ["a", "b", "c", "d"] and z["vectors"].shape[0] == 4


@pytest.mark.parametrize("method", ["baseline", "hybrid"])
def test_jobs_match_endpoint(method, caplog):
    get_session("sess-rank").resume = RESUME
    client = TestClient(app)
    with caplog.at_level(logging.INFO):
        r = client.post("/api/jobs/match", json={"session_id": "sess-rank", "method": method})
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 10 and "STUB" not in caplog.text
    assert body[0]["explanation_fa"] and "posting" in body[0]
    f = client.post("/api/jobs/match", json={"session_id": "sess-rank", "method": method,
                                             "filters": {"location": "Tehran", "seniority": "junior"}})
    assert f.status_code == 200 and all(m["posting"]["location"] == "تهران" and m["posting"]["seniority"] == "junior" for m in f.json())
    none = client.post("/api/jobs/match", json={"session_id": "sess-rank", "method": method, "filters": {"location": "نبود"}})
    assert none.status_code == 200 and none.json() == []


def test_jobs_match_requires_resume():
    r = TestClient(app).post("/api/jobs/match", json={"session_id": "no-resume", "method": "hybrid"})
    assert r.status_code == 400
