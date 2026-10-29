"""OpenAI-compatible gateway wrapper.

All functions return an LLMResult instead of raising, so callers can degrade
gracefully. Prompts/responses are never logged (privacy).
"""
import json
import logging
import re
from dataclasses import dataclass
from typing import Any, Literal, TypeVar

from openai import OpenAI
from pydantic import BaseModel, ValidationError

from app.config import settings
from app.session import get_session

log = logging.getLogger("llm")
T = TypeVar("T", bound=BaseModel)

ErrorKind = Literal["not_configured", "timeout", "bad_json", "api"]


@dataclass
class LLMError:
    kind: ErrorKind
    message: str


@dataclass
class LLMResult:
    ok: bool
    data: Any = None  # str for chat, validated model for chat_json, list[list[float]] for embed
    error: LLMError | None = None


_client: OpenAI | None = None


def _get_client() -> OpenAI | None:
    global _client
    if not settings.llm_api_key:
        return None
    if _client is None:
        _client = OpenAI(
            base_url=settings.llm_base_url or None,
            api_key=settings.llm_api_key,
            timeout=settings.llm_timeout_s,
            max_retries=0,
        )
    return _client


def _record_usage(session_id: str, model: str, usage: Any) -> None:
    if usage is None:
        return
    pt = getattr(usage, "prompt_tokens", 0) or 0
    ct = getattr(usage, "completion_tokens", 0) or 0
    price_in, price_out = settings.price_table.get(model, settings.price_table["default"])
    u = get_session(session_id).usage
    u.prompt_tokens += pt
    u.completion_tokens += ct
    u.calls += 1
    u.est_cost_usd = round(u.est_cost_usd + (pt * price_in + ct * price_out) / 1e6, 6)


def _classify(exc: Exception) -> LLMError:
    name = type(exc).__name__
    kind: ErrorKind = "timeout" if "Timeout" in name else "api"
    return LLMError(kind, name)  # type name only: messages may echo user content


def chat(
    session_id: str,
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.3,
    json_mode: bool = False,
) -> LLMResult:
    client = _get_client()
    if client is None:
        return LLMResult(False, error=LLMError("not_configured", "LLM_API_KEY is not set"))
    model = model or settings.chat_model
    kwargs: dict[str, Any] = {}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    try:
        resp = client.chat.completions.create(
            model=model, messages=messages, temperature=temperature, **kwargs
        )
    except Exception as exc:  # noqa: BLE001 - convert every failure to an error object
        return LLMResult(False, error=_classify(exc))
    _record_usage(session_id, model, resp.usage)
    return LLMResult(True, data=resp.choices[0].message.content or "")


def _parse(text: str, schema: type[T]) -> T:
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    return schema.model_validate(json.loads(text))


def chat_json(
    session_id: str,
    messages: list[dict],
    schema: type[T],
    model: str | None = None,
    temperature: float = 0.0,
) -> LLMResult:
    """JSON-mode call validated by `schema`; one repair retry on bad JSON."""
    model = model or settings.extract_model
    res = chat(session_id, messages, model, temperature, json_mode=True)
    if not res.ok:
        return res
    try:
        return LLMResult(True, data=_parse(res.data, schema))
    except (json.JSONDecodeError, ValidationError) as exc:
        problem = type(exc).__name__
    repair = messages + [
        {"role": "assistant", "content": res.data},
        {
            "role": "user",
            "content": f"Your previous reply was invalid ({problem}). "
            f"Reply again with ONLY valid JSON matching this schema: "
            f"{json.dumps(schema.model_json_schema())}",
        },
    ]
    res = chat(session_id, repair, model, temperature, json_mode=True)
    if not res.ok:
        return res
    try:
        return LLMResult(True, data=_parse(res.data, schema))
    except (json.JSONDecodeError, ValidationError):
        return LLMResult(False, error=LLMError("bad_json", "malformed JSON after retry"))


def embed(session_id: str, texts: list[str], model: str | None = None) -> LLMResult:
    client = _get_client()
    if client is None:
        return LLMResult(False, error=LLMError("not_configured", "LLM_API_KEY is not set"))
    model = model or settings.embed_model
    try:
        resp = client.embeddings.create(model=model, input=texts)
    except Exception as exc:  # noqa: BLE001
        return LLMResult(False, error=_classify(exc))
    _record_usage(session_id, model, resp.usage)
    return LLMResult(True, data=[d.embedding for d in resp.data])
