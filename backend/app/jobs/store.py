import json
from pathlib import Path

from app.config import settings
from app.schemas import JobPosting


def postings_path() -> Path:
    return settings.data_dir / "jobs" / "postings.jsonl"


def load_postings() -> list[JobPosting]:
    path = postings_path()
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        return [JobPosting(**json.loads(line)) for line in f if line.strip()]


def save_postings(postings: list[JobPosting]) -> None:
    with postings_path().open("w", encoding="utf-8") as f:
        for p in postings:
            f.write(p.model_dump_json() + "\n")
