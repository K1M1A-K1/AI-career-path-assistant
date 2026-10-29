# CLAUDE.md — conventions for this repo

- `backend/app/schemas.py` is the contract. Do not change it without telling the team; mirror any agreed change in `frontend/src/types.ts`.
- Deterministic logic (taxonomy, graph, scoring, filters, dedup) must **not** call the LLM.
- Every LLM JSON output goes through `llm.client.chat_json` with a Pydantic model. Handle `LLMResult.ok == False` gracefully; never let LLM errors become 500s.
- Never log or persist resume text, profiles or chat content. Sessions are in-memory only (`session.py`).
- Never hard-code keys. Config comes from `.env` via `config.py`; `.env` is never committed.
- Unknown roles/concepts returned by the LLM are discarded, never shown to the user.
- Persian strings: use Persian `ی` and `ک` (not Arabic `ي`/`ك`) and ZWNJ (‌) where needed; normalise with hazm.
- Stubs raise `NotImplementedError`; the routers then serve fixtures from `backend/data/fixtures/` and log `STUB`. Remove the stub path usage as you implement.
- Stay inside your own workstream's folders (see `docs/TASKS.md`).
- Run `make test` before pushing.
