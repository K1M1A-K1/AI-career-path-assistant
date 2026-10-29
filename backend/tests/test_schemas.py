"""Fixtures and fixture-backed endpoints must satisfy the shared contracts."""
import json

from fastapi.testclient import TestClient

from app.config import settings
from app.jobs.store import load_postings
from app.main import app
from app.schemas import CareerProfile, JobMatch, ResumeProfile, Roadmap

client = TestClient(app)
FIX = settings.data_dir / "fixtures"


def _load(name):
    return json.loads((FIX / name).read_text(encoding="utf-8"))


def test_fixtures_match_schemas():
    CareerProfile(**_load("career_profile.json"))
    Roadmap(**_load("roadmap.json"))
    ResumeProfile(**_load("resume_profile.json"))
    [JobMatch(**m) for m in _load("job_matches.json")]


def test_fixture_postings_load():
    assert len(load_postings()) >= 5


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_chat_stub_reaches_done_with_profile():
    last = None
    for _ in range(6):
        last = client.post("/api/chat", json={"session_id": "t1", "message": "x"}).json()
        if last["done"]:
            break
    assert last["done"] and last["profile"]["target_role"]


def test_roadmap_stub():
    profile = _load("career_profile.json")
    assert client.post("/api/roadmap", json=profile).status_code == 200


def test_resume_then_match_stub():
    import fitz

    doc = fitz.open()
    doc.new_page().insert_text((72, 72), "Python SQL")
    files = {"file": ("cv.pdf", doc.tobytes(), "application/pdf")}
    assert client.post("/api/resume", data={"session_id": "t2"}, files=files).status_code == 200
    r = client.post("/api/jobs/match", json={"session_id": "t2", "method": "hybrid"})
    assert r.status_code == 200 and len(r.json()) >= 1


def test_match_without_resume_is_400():
    assert client.post("/api/jobs/match", json={"session_id": "nobody"}).status_code == 400


def test_usage_starts_at_zero():
    assert client.get("/api/usage/fresh").json()["calls"] == 0
