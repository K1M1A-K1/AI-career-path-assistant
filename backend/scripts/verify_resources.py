"""Check every resource URL in resources.yaml and report dead links.  Run: python -m scripts.verify_resources"""
import httpx

from app.careers.taxonomy import load_taxonomy
from app.config import settings


def main() -> None:
    tax = load_taxonomy()
    with httpx.Client(
        headers={"User-Agent": settings.scraper_user_agent}, timeout=15, follow_redirects=True
    ) as client:
        for cid, resources in tax.resources.items():
            for r in resources:
                try:
                    ok = client.head(r.url).status_code < 400
                except httpx.HTTPError:
                    ok = False
                print(("OK  " if ok else "DEAD"), cid, r.url)
    # TODO(P1): write the result back into resources.yaml `verified` flags.


if __name__ == "__main__":
    main()
