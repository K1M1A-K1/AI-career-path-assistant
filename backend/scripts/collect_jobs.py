"""Collect job postings from all sources into data/jobs/postings.jsonl.

Run from backend/:  python -m scripts.collect_jobs
Add a new source by creating app/jobs/collector/sources/<name>.py with fetch(fetcher)
and listing it in SOURCES below. Needs >= 50 postings from >= 2 sources.
"""
from app.jobs import dedup, store
from app.jobs.collector.base import PoliteFetcher
from app.jobs.collector.sources import example_api

SOURCES = [example_api]  # TODO(P3): add a second source


def main() -> None:
    fetcher = PoliteFetcher()
    postings = []
    for src in SOURCES:
        try:
            got = src.fetch(fetcher)
        except NotImplementedError:
            print(f"[skip] {src.__name__}: parse() not implemented yet")
            continue
        print(f"[ok] {src.__name__}: {len(got)} postings")
        postings.extend(got)
    if not postings:
        print("No postings collected; postings.jsonl left untouched.")
        return
    try:
        postings = dedup.dedup(postings)
    except NotImplementedError:
        print("[warn] dedup not implemented; writing raw postings")
    store.save_postings(postings)
    print(f"Wrote {len(postings)} postings to {store.postings_path()}")


if __name__ == "__main__":
    main()
