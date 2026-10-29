"""Check every resource URL in resources.yaml and write the result back to the `verified` flags.

Run: python -m scripts.verify_resources
HEAD first, GET as fallback; 2xx/3xx after redirects counts as alive. Uses the project's
scraper User-Agent. Sites that block bots simply stay unverified and are never shown.
"""
import json
from concurrent.futures import ThreadPoolExecutor

import httpx
import yaml

from app.config import settings

HEADER = (
    "# Format: concept (id), title, url, lang (fa|en), type (course|article|video|docs|book),\n"
    "# verified (set by `python -m scripts.verify_resources`; do not edit by hand)\n"
)


def check(client: httpx.Client, url: str) -> tuple[bool, str]:
    last = "no response"
    for method in ("HEAD", "GET"):
        try:
            with client.stream(method, url) as r:
                last = str(r.status_code)
                if r.status_code < 400:
                    return True, last
        except httpx.HTTPError as exc:
            last = type(exc).__name__
    return False, last


def main() -> None:
    path = settings.data_dir / "taxonomy" / "resources.yaml"
    entries = yaml.safe_load(path.read_text("utf-8"))
    urls = sorted({e["url"] for e in entries})
    with httpx.Client(headers={"User-Agent": settings.scraper_user_agent}, timeout=15,
                      follow_redirects=True) as client:
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = dict(zip(urls, pool.map(lambda u: check(client, u), urls)))
    for e in entries:
        e["verified"] = results[e["url"]][0]
    path.write_text(HEADER + "".join(f"- {json.dumps(e, ensure_ascii=False)}\n" for e in entries), "utf-8")

    for url, (ok, status) in results.items():
        if not ok:
            print("DEAD", status, url)
    covered = {e["concept"] for e in entries if e["verified"]}
    print(f"{sum(ok for ok, _ in results.values())}/{len(urls)} URLs alive; "
          f"{len(covered)} concepts with a verified resource")


if __name__ == "__main__":
    main()
