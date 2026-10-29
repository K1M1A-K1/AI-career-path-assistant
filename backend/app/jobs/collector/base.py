"""Polite fetcher: robots.txt, >=2s per-host rate limit, identifying User-Agent, disk cache."""
import hashlib
import time
import urllib.robotparser
from pathlib import Path
from urllib.parse import urlparse

import httpx

from app.config import settings


class PoliteFetcher:
    def __init__(self, cache_dir: Path | None = None) -> None:
        self.cache_dir = cache_dir or settings.data_dir / "jobs" / "raw"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._last_request: dict[str, float] = {}
        self._robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}
        self._client = httpx.Client(
            headers={"User-Agent": settings.scraper_user_agent}, timeout=20, follow_redirects=True
        )

    def _allowed(self, url: str) -> bool:
        p = urlparse(url)
        origin = f"{p.scheme}://{p.netloc}"
        if origin not in self._robots:
            rp = urllib.robotparser.RobotFileParser()
            try:
                self._wait(p.netloc)
                resp = self._client.get(f"{origin}/robots.txt")
                if resp.status_code == 200:
                    rp.parse(resp.text.splitlines())
                elif resp.status_code in (401, 403):
                    rp.disallow_all = True
                else:  # no robots.txt -> everything allowed
                    rp.parse([])
                self._robots[origin] = rp
            except httpx.HTTPError:
                self._robots[origin] = None  # cannot verify -> be conservative
        rp = self._robots[origin]
        return rp is not None and rp.can_fetch(settings.scraper_user_agent, url)

    def _wait(self, host: str) -> None:
        elapsed = time.monotonic() - self._last_request.get(host, 0.0)
        if elapsed < settings.scraper_min_delay_s:
            time.sleep(settings.scraper_min_delay_s - elapsed)
        self._last_request[host] = time.monotonic()

    def _cache_path(self, url: str) -> Path:
        return self.cache_dir / (hashlib.sha1(url.encode()).hexdigest() + ".txt")

    def get(self, url: str, use_cache: bool = True) -> str | None:
        """Return response text, or None if disallowed by robots.txt / request failed."""
        cache = self._cache_path(url)
        if use_cache and cache.exists():
            return cache.read_text(encoding="utf-8")
        if not self._allowed(url):
            return None
        self._wait(urlparse(url).netloc)
        try:
            resp = self._client.get(url)
            resp.raise_for_status()
        except httpx.HTTPError:
            return None
        cache.write_text(resp.text, encoding="utf-8")
        return resp.text
