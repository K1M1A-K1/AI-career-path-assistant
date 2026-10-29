You are setting up the repository for a ONE-DAY hackathon project built by a team of 4. Your job is to create (1) a small set of description docs and (2) a runnable project skeleton with stubs, so all four people can start coding in parallel within 15 minutes. Do NOT implement the full features — implement the plumbing, contracts and stubs only (exceptions listed below).

HARD CONSTRAINT ON DOCS: create exactly these 5 markdown files and no others: README.md, CLAUDE.md, docs/ARCHITECTURE.md, docs/TASKS.md, docs/REPORT.md. Keep each one short and scannable (TASKS.md is the longest, ~150 lines max). No per-step or per-file docs.

## Project summary
"AI Career Path Assistant" (دستیار مسیر شغلی با هوش مصنوعی) for Persian-speaking users, for the Rahnama College ML Bootcamp hackathon (RFP RC-MLB-HACK-2026-01). Two modules:
- Module A – Career roadmap: Persian chat (max 6 questions) → LLM outputs a JSON profile {target_role, target_level, current_level, known_concepts} validated against a skill taxonomy → roadmap computed DETERMINISTICALLY in code (target concepts + all prerequisites − known concepts, topologically ordered, layered) → shown as a graph with verified learning-resource links. User can correct ("من اکسل بلد نیستم") and the roadmap regenerates. Unknown roles/concepts from the LLM are discarded, never shown.
- Module B – Resume job matching: upload PDF/DOCX resume (Persian or English) → LLM extracts profile {skills, years_experience, education, previous_roles, location} → rank ≥50 cached real job postings from ≥2 public sources (normalised schema: title, company, location, requirements, published_at, url) → top 10 with score, matched skills, missing skills, link to original. Filters: location, seniority, remote. Dedup across sources. Optional: "make roadmap for this job's missing skills" (calls Module A).
- Evaluation: labelled set (3 synthetic resumes × ≥20 postings, relevant/not) → Precision@5 and nDCG@10 for our ranker vs a keyword-overlap (BM25) baseline.
- Non-functional musts: UI in Persian, RTL. Resumes/profiles kept in memory per session only, never logged; UI shows a privacy notice before upload. API keys server-side only, read from .env, never committed. All LLM errors/timeouts/malformed JSON handled gracefully. Scraper respects robots.txt, rate-limits (≥2s between requests per host), sends an identifying User-Agent. Track token usage + estimated cost per session. Start everything with one command.

## Tech stack
- Backend: Python 3.11, FastAPI, Pydantic v2, uvicorn, `openai` SDK pointed at an OpenAI-compatible gateway via env vars (LLM_BASE_URL, LLM_API_KEY, CHAT_MODEL, EXTRACT_MODEL, EMBED_MODEL), networkx, PyYAML, PyMuPDF, python-docx, hazm (Persian normalisation), httpx, rank_bm25, numpy, scikit-learn, pytest.
- Frontend: React + Vite + TypeScript, `dir="rtl"` and `lang="fa"` on <html>, Vazirmatn font (Google Fonts / fontsource), React Flow for the roadmap graph. Plain CSS or a minimal library — no heavy design system.
- Run: docker-compose.yml with `backend` (port 8000) and `frontend` (port 5173) services; also a `make dev` or `scripts/dev.sh` alternative without Docker.

## Repository layout to create
```
README.md  CLAUDE.md  .env.example  .gitignore  docker-compose.yml  Makefile
docs/ARCHITECTURE.md  docs/TASKS.md  docs/REPORT.md
backend/
  Dockerfile  requirements.txt
  app/
    main.py            # FastAPI app, CORS, routers, /health
    config.py          # pydantic-settings, reads .env
    schemas.py         # ALL shared Pydantic contracts (see below) — single source of truth
    session.py         # in-memory session store (dict), no persistence, no logging of content
    llm/client.py      # gateway wrapper: chat(), chat_json(schema) with validation + 1 retry on bad JSON, embed(), timeouts, usage/cost tracking per session_id
    llm/prompts.py     # prompt templates (Persian system prompts as constants)
    careers/taxonomy.py   # load + validate YAML, cycle check
    careers/graph.py      # compute_roadmap(profile) -> Roadmap
    careers/resources.py  # pick resources for roadmap concepts
    careers/conversation.py # chat state machine, ≤6 questions, emits CareerProfile
    jobs/resume_parser.py   # pdf/docx -> text -> ResumeProfile
    jobs/normalize.py       # hazm normalisation + skill alias mapping to taxonomy concept ids
    jobs/collector/base.py  # polite fetcher: robots.txt check, rate limit, User-Agent, cache to disk
    jobs/collector/sources/example_api.py  # one example source adapter (e.g. a public JSON jobs API) as template
    jobs/dedup.py
    jobs/store.py           # load cached postings from data/jobs/postings.jsonl
    jobs/ranking.py         # baseline_rank() and hybrid_rank() signatures
    jobs/explain.py         # matched/missing skills
    api/chat.py  api/roadmap.py  api/resume.py  api/jobs.py  api/usage.py
  data/
    taxonomy/roles.yaml  concepts.yaml  resources.yaml   # SMALL sample only: 2 roles (data_analyst, backend_developer), ~10 concepts, prerequisite edges, 3 resources — shows the format, team fills the rest
    jobs/postings.jsonl      # 5 fixture postings in the normalised schema
    eval/resumes/            # empty with .gitkeep
    eval/labels.csv          # header only: resume_id,posting_id,relevant
    fixtures/                # sample JSON responses used by stubs
  scripts/
    collect_jobs.py  validate_taxonomy.py  verify_resources.py  evaluate_ranking.py
  tests/test_graph.py  tests/test_schemas.py
frontend/
  Dockerfile  package.json  vite.config.ts  index.html
  src/main.tsx  src/App.tsx  src/api.ts  src/types.ts (mirror of schemas.py)
  src/pages/CareerChat.tsx  src/pages/JobMatch.tsx
  src/components/RoadmapGraph.tsx  ChatBox.tsx  ResumeUpload.tsx  JobCard.tsx  PrivacyNotice.tsx
```

## Contracts (put in schemas.py and mirror in frontend/src/types.ts)
- Level = "junior" | "mid" | "senior"
- CareerProfile {target_role: str (role id), target_level, current_level, known_concepts: list[str] (concept ids), heard_of_only: list[str]}
- ChatRequest {session_id, message}; ChatResponse {reply: str, profile: CareerProfile | None, done: bool, questions_asked: int}
- RoadmapNode {id, label_fa, label_en, layer: int, status: "todo" | "known", resources: list[Resource]}; RoadmapEdge {source, target}; Roadmap {role, level, nodes, edges, order: list[str], summary_fa: str}
- Resource {title, url, lang, type, verified: bool}
- CorrectionRequest {session_id, message} → returns new Roadmap
- ResumeProfile {skills: list[str], skill_ids: list[str], years_experience: float, education: list[str], previous_roles: list[str], location: str | None, level_guess: Level | None}
- JobPosting {id, source, title, company, location, remote: bool, seniority: Level | None, requirements: list[str], skill_ids: list[str], published_at: str | None, url}
- JobMatch {posting: JobPosting, score: float, matched_skills: list[str], missing_skills: list[str], explanation_fa: str}
- MatchRequest {session_id, filters: {location?, seniority?, remote?}, method: "baseline" | "hybrid"} → list[JobMatch] (top 10)
- UsageReport {session_id, prompt_tokens, completion_tokens, est_cost_usd, calls}

## API endpoints (all under /api)
POST /chat, POST /roadmap (body: CareerProfile), POST /roadmap/correct, POST /resume (multipart), POST /jobs/match, GET /jobs/count, GET /usage/{session_id}, GET /health.

## What to implement vs stub
IMPLEMENT fully (it's plumbing everyone needs):
- config.py, session.py, schemas.py, main.py, all routers wired up.
- llm/client.py: working gateway client with timeout, JSON-mode call validated by a Pydantic model, one repair retry, graceful error object instead of exceptions, per-session token counting, cost estimate from a price table in config.
- Collector base.py: robots.txt check via urllib.robotparser, per-host rate limit, User-Agent from env, disk cache.
- Every endpoint must work NOW by returning data from data/fixtures/ when the real function raises NotImplementedError, so the frontend is fully clickable from minute one. Log "STUB" to console when falling back.
- Frontend: both pages working against the stub API — RTL layout, chat box, React Flow graph rendering a Roadmap, resume upload with privacy notice shown first, job cards with score/matched/missing/link, filters, tab or route switch between the two modules, Persian labels.
- docker-compose, Dockerfiles, .env.example (no real values), .gitignore (must include .env, data/jobs/raw/, __pycache__, node_modules), Makefile targets: dev, test, collect, eval.
- tests/test_graph.py with test cases (cycle rejected, prerequisites ordered before dependents, known concepts excluded, heard_of_only NOT counted as known) — they may fail until P1 implements graph.py; mark with clear names.

STUB with typed signature + docstring describing the algorithm + `raise NotImplementedError` (team members own these):
- careers/graph.py compute_roadmap, careers/taxonomy.py cycle check, careers/resources.py, careers/conversation.py logic, jobs/resume_parser.py, jobs/normalize.py, jobs/dedup.py, jobs/ranking.py (both methods), jobs/explain.py, scripts/evaluate_ranking.py (describe P@5 and nDCG@10 computation in the docstring), the example source adapter's parsing.

## Content of the 5 docs
- README.md: one-paragraph pitch, quick start (`cp .env.example .env`, fill key, `docker compose up`), endpoints list, models used (placeholders), data sources (placeholder table), third-party libraries acknowledgement, note that AI coding assistants were used.
- CLAUDE.md: conventions for anyone using Claude Code on this repo: schemas.py is the contract — don't change it without telling the team; deterministic logic (taxonomy, graph, scoring) must not call the LLM; every LLM JSON output goes through chat_json with a Pydantic model; never log resume text or profiles; never hard-code keys; Persian strings in UI are normalised with hazm-compatible characters (ی ک and ZWNJ); keep changes inside your own workstream folders; run `make test` before pushing.
- docs/ARCHITECTURE.md: component diagram in Mermaid, the contracts table, data flow for Module A and Module B, taxonomy YAML format with an example, ranking design (baseline BM25 vs hybrid = taxonomy skill overlap + embedding cosine + optional LLM re-rank of top 20, with weights as config), evaluation protocol.
- docs/TASKS.md: four workstreams, each with owner placeholder, folders owned, a checklist mapped to RFP requirement IDs, and "done when" criteria:
  - P1 Taxonomy & Graph: A-02, A-03, A-05, A-07 (resources + verify_resources.py), A-08 deterministic side. ≥10 roles, ≥3 domains (software, data, business), junior/mid/senior concept sets.
  - P2 LLM Layer: A-01, A-04, A-09, B-02, NF-05, NF-06; resume parser B-01/B-02; optional A-10 voice.
  - P3 Jobs & Ranking: B-03, B-04, B-05, B-07, B-09, NF-08, Section 10.2 eval. Jobs must be cached by 11:00.
  - P4 Frontend & Integration: A-06, B-06, B-08, NF-01, NF-03 notice, NF-07, B-10, A-11 optional, slides and demo script.
  Plus a timeline: 09:45 contracts frozen & skeleton runs · 11:00 postings cached · 13:00 end-to-end with real components · 15:30 feature freeze · 16:00 eval numbers + report · 16:30 code freeze. Plus a "demo script" checklist following the three RFP scenarios (beginner → junior data analyst; junior backend → senior; graduate uploads resume).
- docs/REPORT.md: 1–2 page technical report template with headings: Architecture, Models & why, Taxonomy design, Ranking method, Evaluation results (table: method | P@5 | nDCG@10), Cost per session, AI-assistant disclosure, Limitations.

## Finish by
1. Running backend tests and a quick `uvicorn` import check; installing frontend deps and running `npm run build` to confirm it compiles.
2. Printing a short summary of what's implemented vs stubbed, and the exact commands to start.
Do not create any additional markdown files. Do not commit anything containing a real API key.
