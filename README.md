# AI Career Path Assistant — دستیار مسیر شغلی با هوش مصنوعی

Persian-first (RTL) web app for the Rahnama College ML Bootcamp hackathon (RFP RC-MLB-HACK-2026-01).
**Module A** turns a short Persian chat into a deterministic, prerequisite-ordered learning roadmap.
**Module B** parses an uploaded resume (PDF/DOCX) and ranks cached real job postings with matched/missing skills.
The LLM only extracts and converses; roadmap and scoring logic are plain code.

## Quick start

```bash
cp .env.example .env     # fill LLM_BASE_URL, LLM_API_KEY, model names
docker compose up        # backend :8000, frontend :5173
```

Without Docker: `make install && make dev`. Other targets: `make test`, `make collect`, `make eval`.
Until the real components exist, every endpoint falls back to `backend/data/fixtures/` (look for `STUB` in the logs).

## Endpoints (`/api`)

`POST /chat` · `POST /roadmap` · `POST /roadmap/correct` · `POST /resume` (multipart) · `POST /jobs/match` · `GET /jobs/count` · `GET /usage/{session_id}` · `GET /health`

Interactive docs: http://localhost:8000/docs

## Models used

| Purpose | Model |
|---|---|
| Chat | _TBD (CHAT_MODEL)_ |
| Extraction | _TBD (EXTRACT_MODEL)_ |
| Embeddings | _TBD (EMBED_MODEL)_ |

## Data sources

| Source | Type | Postings | Notes |
|---|---|---|---|
| _TBD_ | public API | | |
| _TBD_ | | | |

## Acknowledgements

FastAPI, Pydantic, openai SDK, networkx, PyYAML, PyMuPDF, python-docx, hazm, httpx, rank_bm25, numpy, scikit-learn, pytest, React, Vite, React Flow (@xyflow/react), Vazirmatn font.

AI coding assistants (Claude Code) were used to build this project.

## Frontend (P4)

Vite + React 18 + TypeScript (strict) + Tailwind 3.4, zustand store, `@xyflow/react` + dagre graph. Persian RTL, Vazirmatn self-hosted.

```bash
cd frontend
npm run dev          # http://localhost:5173, proxies /api to VITE_API_PROXY (default :8000)
npm run typecheck && npm test && npm run lint:rtl && npm run build
VITE_USE_FIXTURES=1 npm run dev   # demo-safety mode: serves backend/data/fixtures shapes, no backend needed
npm run sync:taxonomy             # regenerate src/data/taxonomy.generated.json from backend/data/taxonomy/*.yaml
```

Optional: `VITE_SESSION_BUDGET_USD` shows a budget bar in the usage badge.
The taxonomy JSON is committed because `docker compose` builds the image from `./frontend` only; re-run `sync:taxonomy` whenever the YAML changes.
