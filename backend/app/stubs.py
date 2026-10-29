"""Fixture fallback so every endpoint works before the real code exists."""
import json
import logging
from typing import Any, Callable

from app.config import settings

log = logging.getLogger("uvicorn.error")


def load_fixture(name: str) -> Any:
    return json.loads((settings.data_dir / "fixtures" / name).read_text(encoding="utf-8"))


def run_or_stub(real: Callable[[], Any], stub: Callable[[], Any]) -> Any:
    """Call real(); if it raises NotImplementedError, log STUB and return stub()."""
    try:
        return real()
    except NotImplementedError:
        name = getattr(real, "__name__", "real")
        log.warning("STUB: falling back to fixture (%s not implemented)", name)
        return stub()
