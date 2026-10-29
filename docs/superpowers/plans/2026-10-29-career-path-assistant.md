# AI Career Path Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing skeleton into a working Persian-first app: Module A (chat → deterministic roadmap graph) and Module B (resume → top-10 ranked real job postings), with eval numbers, report and demo.

**Architecture:** FastAPI backend with deterministic taxonomy/graph/ranking code and an LLM used only for conversation and extraction (via `llm.client.chat_json` + Pydantic). React/Vite RTL frontend renders the roadmap with React Flow. Every endpoint already falls back to fixtures (`STUB` log) until its real component lands; each phase removes stubs.

**Tech Stack:** see "Technologies & Tools" below.

**Spec:** the RFP `Rahnama_Hackathon_RFP.docx` (RC-MLB-HACK-2026-01, authoritative; requirement IDs below follow it), plus `docs/TASKS.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md`. **The IDs in `docs/TASKS.md` do not match the RFP** (see the reconciliation table); Task 0.1 fixes `TASKS.md`.

## Global Constraints

- `backend/app/schemas.py` is the contract; any change is mirrored in `frontend/src/types.ts` and announced to the team.
- Taxonomy, graph, scoring, filters, dedup must NOT call the LLM.
- Every LLM JSON output goes through `llm.client.chat_json` with a Pydantic model; `LLMResult.ok == False` never becomes a 500.
- Never log or persist resume text, profiles or chat content; sessions are in-memory only.
- Keys only from `.env` via `config.py`; `.env` never committed.
- Unknown roles/concepts from the LLM are discarded, never shown.
- Persian text uses `ی`/`ک` (not `ي`/`ك`) and ZWNJ; normalise with hazm. UI is `dir="rtl"`, `lang="fa"`, Vazirmatn font.
- Chat asks at most 6 questions. Roadmap = targets + transitive prerequisites − known, topologically ordered; `heard_of_only` is NOT known.
- Postings: ≥50 from ≥2 public sources, normalised schema, cached by 11:00. Scraper: obey robots.txt, ≥2 s between requests per host, identifying User-Agent.
- Top 10 results with score, matched/missing skills, link to original posting. Filters: location, seniority, remote.
- Eval: 3 synthetic resumes × ≥20 labelled postings; Precision@5 and nDCG@10 vs BM25.
- Each workstream stays inside its own folders (P1 taxonomy/graph, P2 LLM, P3 jobs/ranking, P4 frontend/integration).
- Timeline: 09:45 skeleton runs · 11:00 postings cached · 13:00 end-to-end · 15:30 feature freeze · 16:00 eval+report · 16:30 code freeze AND submission deadline (repo, README, 1-2 page report, PDF slides, 5 min talk; late = not evaluated).
- NF-02: chat reply within 10 s; ranked list of >=50 postings within 60 s.
- Disqualification: any secret in the repo, third-party personal data, scraping against a source's terms. Only synthetic or consenting-own resumes.
- The jury may test with a hidden resume: parser and ranker must not be tuned only to the 3 eval resumes.
- Roadmap must be readable on a single screen (A-06); text summary must match the graph (A-09).

## Review Focus

- Empty/garbled/scanned (image-only) PDF or a password-protected/oversized file upload → friendly Persian error, no 500.
- User types English, mixed Persian/English or Arabic-letter (`ي`/`ك`) text in chat or resume → still maps to taxonomy concepts.
- LLM returns role/concept ids not in the taxonomy, or a valid role with an empty/odd level → dropped silently, roadmap still renders.
- Filters that match zero postings, or a resume with zero matched skills → empty state with message, not an empty crash.
- User says "I don't know X" for a concept that is a prerequisite of known ones, or corrects the same concept twice → roadmap stays consistent (idempotent).
- Same posting from two sources with slightly different titles/companies → deduped to one.

---

## RFP Reconciliation (priority = MoSCoW from the RFP)

| RFP ID | Requirement | Priority | Task |
|---|---|---|---|
| A-01 | Persian chat, max 6 questions | Must | 2.2 |
| A-02 / A-03 | >=10 roles, >=3 domains; DAG, cycles reported | Must | 1.1 |
| A-04 | LLM JSON validated, unknowns discarded | Must | 1.2, 2.2 |
| A-05 | Deterministic roadmap | Must | 1.2 |
| A-06 | Graph readable on a single screen | Must | 3.2 |
| A-07 | Verified resources, no invented URLs | Must | 1.3 |
| A-08 | User correction regenerates roadmap | Should | 2.2 |
| A-09 | Summary consistent with graph | Should | 1.2, 3.2 |
| A-10 | Voice STT + TTS (gateway provides both) | Could (bonus) | 2.5 |
| A-11 | Export roadmap as image/PDF | Could | 3.4 |
| B-01 / B-02 | PDF/DOCX upload; structured profile | Must | 2.3 |
| B-03 | >=50 postings, >=2 sources | Must | 2.4 |
| B-04 / B-05 / B-06 | Top 10 + score; matched/missing; link | Must | 3.1, 3.2 |
| B-07 | Ranking beyond keywords, measured (10.2) | Should | 3.1, 4.1 |
| B-08 | Filters location/seniority/remote | Should | 3.1, 3.2 |
| B-09 | Dedup | Should | 2.4 |
| B-10 | Roadmap for a job's missing skills | Could (bonus) | 1.4, 3.3 |
| B-11 | Scheduled/incremental refresh | Could | 2.4 optional |
| NF-01 | Persian RTL UI | Must | 3.2 |
| NF-02 | Latency 10 s / 60 s | Should | 3.1, 4.2 |
| NF-03 | Privacy, no logs, notice before upload | Must | 2.1, 2.3, 3.2 |
| NF-04 | Keys server-side only, not committed | Must | 0.1, 4.2 |
| NF-05 | Token/cost per session | Should (bonus: cost dashboard) | 2.1, 3.2 |
| NF-06 | Robust to model errors | Must | 2.1 |
| NF-07 | Single-command start | Should | 0.1, 4.2 |
| NF-08 | Responsible collection | Must | 2.4 |

Scoring weights: Module A 25, Module B 25, AI/ML quality 20, engineering 10, UX/Persian 10, presentation 10; bonus up to 10 (voice, A+B integration, cost dashboard). Order of work: Musts, then Shoulds, then bonuses.

---

## Technologies & Tools

| Layer | Choice | Why / notes |
|---|---|---|
| Language/runtime | Python 3.11+ (Makefile says 3.12), Node 20 | already in skeleton |
| API | FastAPI, uvicorn, python-multipart, Pydantic v2, pydantic-settings | contracts + validation |
| LLM access | `openai` SDK → OpenAI-compatible gateway (`LLM_BASE_URL`, `LLM_API_KEY`, `CHAT_MODEL`, `EXTRACT_MODEL`, `EMBED_MODEL`) | model names still TBD in README; pick one cheap fast chat model, one JSON-capable extraction model, one multilingual embedding model |
| Graph | networkx (DAG, ancestors, topological sort) | roadmap |
| Taxonomy data | PyYAML in skeleton; existing sibling `taxonomy/` package uses JSON (154 concepts, 12 roles, 4 domains, 303 verified links) | Phase 1 decides one format — see Task 1.1 |
| Persian NLP | hazm | normalisation, tokenisation |
| Resume parsing | PyMuPDF (PDF), python-docx (DOCX) | OCR (pytesseract) optional only |
| Scraping | httpx, `urllib.robotparser`, JSON APIs first (HTML + selectolax/BeautifulSoup only if needed) | polite fetcher in `collector/base.py` |
| Ranking | rank_bm25 (baseline), numpy + scikit-learn (cosine, metrics), LLM embeddings | hybrid = skill overlap + embedding cosine |
| Frontend | React 18, Vite 5, TypeScript, @xyflow/react (React Flow), @fontsource/vazirmatn, plain CSS | no design system |
| Voice (optional, bonus) | gateway STT + TTS models (RFP 6.1: the gateway provides them); browser MediaRecorder for capture | A-10 |
| Testing | pytest (backend), `tsc --noEmit` + Vite build (frontend); optional Vitest/Playwright | |
| Dev/run | Docker + docker-compose, Makefile (`install dev test collect eval`) | one-command start |
| Collaboration | git/GitHub, Claude Code (disclosed in README/REPORT), `.env.example` | |
| Report/slides | Markdown (`docs/REPORT.md`), slides exported to **PDF** (required format) | |
| Export (optional) | html-to-image / React Flow `toObject` | A-11 |

---

## File Structure (what changes where)

- P1: `backend/app/careers/{taxonomy,graph,resources}.py`, `backend/data/taxonomy/*`, `backend/scripts/{validate_taxonomy,verify_resources}.py`, `backend/tests/test_graph.py`
- P2: `backend/app/llm/*`, `backend/app/careers/conversation.py`, `backend/app/jobs/{resume_parser,normalize}.py`, `backend/app/api/{chat,resume,usage}.py`
- P3: `backend/app/jobs/{collector/*,dedup,store,ranking,explain}.py`, `backend/scripts/{collect_jobs,evaluate_ranking}.py`, `backend/data/{jobs,eval}/`, `backend/app/api/jobs.py`
- P4: `frontend/src/**`, `docker-compose.yml`, `Makefile`, `README.md`, `docs/REPORT.md`, slides

---

# Phase 0 — Foundations (target: by 09:45)

Goal: everyone runs the skeleton and agrees on contracts.

### Task 0.1: Environment + contract freeze (Mandatory - NF-04, NF-07)

**Files:** Modify `.env.example`, `README.md` (model table), `Makefile`; verify `backend/tests/test_schemas.py`.

- [ ] **Step 1:** Run `make install && make test`; fix Makefile for Windows users (use `python -m venv` + `Scripts/` path or document WSL/Docker as the supported path). Expected: `test_schemas.py` passes; `test_graph.py` xfails only.
- [ ] **Step 2:** Run `docker compose up`; open `:5173` and click through both pages on fixtures. Expected: no console errors.
- [ ] **Step 3:** Choose gateway models; fill README "Models used" and local `.env`. Verify with one `chat_json` smoke call. Expected: `LLMResult.ok == True` and `/api/usage/{sid}` non-zero.
- [ ] **Step 3b:** Rewrite requirement IDs in `docs/TASKS.md` to the RFP numbering (reconciliation table above) and mark Must/Should/Could on each item.
- [ ] **Step 4:** Team confirms `schemas.py` ↔ `types.ts` parity; commit `chore: freeze contracts`.

**Optional:** GitHub Actions workflow running `make test` and `npm run build`; pre-commit hook that rejects `.env` and `ي`/`ك` in source strings.

---

# Phase 1 — Deterministic Core (Module A engine) (target: by 11:00)

### Task 1.1: Taxonomy data + loader (Mandatory — A-02, A-03)

**Files:** Modify `backend/app/careers/taxonomy.py`, `backend/data/taxonomy/{roles,concepts,resources}.yaml`; Create `backend/scripts/validate_taxonomy.py` (exists as stub), Test `backend/tests/test_graph.py`.

**Interfaces:** Produces `Taxonomy` (with `.concepts`, `.roles`), `get_taxonomy() -> Taxonomy`, `ancestors(taxonomy, concept_id) -> set[str]`, `check_acyclic(taxonomy) -> None` (raises `ValueError` naming the cycle).

- [ ] **Step 1:** Write failing test `test_cycle_rejected` (A→B→A raises `ValueError`) and `test_taxonomy_has_min_coverage` (≥10 roles, domains ⊇ {software, data, business}, every role has junior/mid/senior).
- [ ] **Step 2:** Run `cd backend && python -m pytest tests/test_graph.py -k "cycle or coverage" -v`; expect FAIL.
- [ ] **Step 3:** Decide data source: **convert** the existing sibling `taxonomy/taxonomy.json` + `resources.json` (154 concepts, 12 roles) into the skeleton's YAML schema with a one-off script (`ids`, `label_fa`, `label_en`, `prerequisites`, `aliases`), preserving "levels are cumulative". Do not hand-retype data. Implement `check_acyclic` with `networkx.is_directed_acyclic_graph`.
- [ ] **Step 4:** Run `python -m scripts.validate_taxonomy` → 0 errors; tests PASS.
- [ ] **Step 5:** Commit `feat: taxonomy data and loader`.

**Optional:** keep the sibling `taxonomy/` package as the source of truth and import its `engine` instead of converting (cheaper, but then `schemas.py` field names must be mapped in one adapter file).

### Task 1.2: `compute_roadmap` (Mandatory - A-04, A-05; Should - A-09)

**Files:** Modify `backend/app/careers/graph.py`, Test `backend/tests/test_graph.py`.

**Interfaces:** Consumes `get_taxonomy`, `pick_resources`. Produces `compute_roadmap(profile: CareerProfile, taxonomy: Taxonomy | None = None) -> Roadmap` and `sanitize_profile(profile, taxonomy) -> tuple[CareerProfile, list[str]]` (second item = dropped ids).

- [ ] **Step 1:** Write tests: `test_prerequisites_before_dependents` (order index of prereq < dependent), `test_known_concepts_excluded_as_todo` (status `known` for known, and their own prerequisites not required), `test_heard_of_only_not_known`, `test_senior_includes_junior_and_mid`, `test_unknown_ids_dropped`, `test_unknown_role_raises_valueerror`.
- [ ] **Step 2:** Run `python -m pytest tests/test_graph.py -v`; expect FAIL (NotImplementedError).
- [ ] **Step 3:** Implement per the docstring in `graph.py` (cumulative levels, `networkx.ancestors`, layer = longest path from root, topological `order`). Generate the Persian `summary_fa` from the same `nodes`/`order` so it cannot disagree with the graph (A-09); add `test_summary_mentions_only_graph_nodes`.
- [ ] **Step 4:** Run tests; PASS, no xfail left. Remove the fixture fallback for `/roadmap` in `api/roadmap.py`.
- [ ] **Step 5:** Commit `feat: deterministic roadmap`.

### Task 1.3: Resources with verified links (Mandatory — A-07)

**Files:** Modify `backend/app/careers/resources.py`, `backend/scripts/verify_resources.py`.

**Interfaces:** Produces `pick_resources(concept_id: str, limit: int = 3) -> list[Resource]` (verified first, Persian before English when both exist).

- [ ] **Step 1:** Test `test_every_concept_has_verified_resource` and `test_pick_resources_prefers_verified`.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement `pick_resources`; make `verify_resources.py` HEAD/GET each URL with httpx (rate-limited) and write `verified` back to `resources.yaml`. Never invent URLs.
- [ ] **Step 4:** Run script then tests; PASS.
- [ ] **Step 5:** Commit `feat: verified resources`.

**Optional:** weekly link re-check GitHub Action; per-resource `level` hint (beginner/advanced).

### Task 1.4: Roadmap from a skill list (Optional/bonus - supports B-10)

**Files:** Modify `careers/graph.py`.
**Interfaces:** Produces `compute_roadmap_for_concepts(concept_ids: list[str], known: list[str]) -> Roadmap` (the sibling `taxonomy/engine.py` already has this algorithm to port).

- [ ] **Step 1:** Test `test_roadmap_for_missing_skills_orders_prereqs`. **Step 2:** fail. **Step 3:** implement. **Step 4:** pass. **Step 5:** commit.

---

# Phase 2 — LLM Layer + Job Data (parallel, target: 11:00 postings cached, 13:00 end-to-end)

### Task 2.1: Resilient LLM client (Mandatory — NF-05, NF-06)

**Files:** Modify `backend/app/llm/client.py`, `backend/app/llm/prompts.py`, `backend/app/api/usage.py`; Test `backend/tests/test_llm_client.py`.

**Interfaces:** Existing `chat_json(session_id, system, messages, schema) -> LLMResult`; `LLMResult(ok: bool, data, error_fa: str | None)`; `embed(session_id, texts) -> list[list[float]]`.

- [ ] **Step 1:** Tests with a fake transport: `test_malformed_json_retries_once_then_graceful`, `test_timeout_returns_persian_error`, `test_usage_accumulates_per_session`, `test_no_content_logged` (caplog contains no message text).
- [ ] **Step 2:** Run; expect FAIL where behaviour is missing.
- [ ] **Step 3:** Fix gaps; confirm price table in `config.py` matches chosen models.
- [ ] **Step 4:** Pass; commit `feat: robust llm client`.

### Task 2.2: Persian career chat (Mandatory - A-01, A-04; Should - A-08)

**Files:** Modify `backend/app/careers/conversation.py`, `backend/app/api/chat.py`, `backend/app/api/roadmap.py`; Test `backend/tests/test_conversation.py`.

**Interfaces:** Produces `advance(session_id: str, message: str) -> ChatResponse` and `correct(session_id: str, message: str) -> Roadmap`. Consumes `sanitize_profile`, `compute_roadmap`.

- [ ] **Step 1:** Tests (LLM faked): `test_stops_at_six_questions`, `test_profile_ids_validated_against_taxonomy`, `test_correction_excel_moves_known_to_todo` ("من اکسل بلد نیستم"), `test_llm_failure_returns_friendly_reply`.
- [ ] **Step 2:** Run; FAIL.
- [ ] **Step 3:** State machine: LLM asks the next question until profile fields are filled or 6 questions asked, then emits `CareerProfile` JSON (extract model). Correction = LLM returns a delta on `known_concepts`; apply deterministically and recompute.
- [ ] **Step 4:** Pass; manually run demo scenarios 1 & 2 on the real LLM.
- [ ] **Step 5:** Commit.

### Task 2.5: Voice interaction (Optional/bonus - A-10)

**Files:** Create `backend/app/api/voice.py`; Modify `frontend/src/components/ChatBox.tsx`.
**Interfaces:** Produces `POST /api/voice/stt` (audio -> `{text}`) and `POST /api/voice/tts` (`{text}` -> audio), using gateway models from config (`STT_MODEL`, `TTS_MODEL`); audio is never stored or logged.

- [ ] **Step 1:** Test `test_stt_failure_returns_persian_error` with a fake client. **Step 2:** FAIL. **Step 3:** implement; push-to-talk button and speaker toggle. **Step 4:** PASS. **Step 5:** commit.

### Task 2.3: Resume parsing + skill mapping (Mandatory - B-01, B-02, NF-03)

**Files:** Modify `backend/app/jobs/resume_parser.py`, `backend/app/jobs/normalize.py`, `backend/app/api/resume.py`; Test `backend/tests/test_resume.py` (+ tiny sample PDF/DOCX in `backend/tests/data/`).

**Interfaces:** Produces `extract_text(filename: str, data: bytes) -> str` (raises `ResumeError` with a Persian message), `parse_resume(session_id, text) -> ResumeProfile | None`, `normalize_fa(text: str) -> str`, `map_skills(skills: list[str]) -> list[str]` (concept ids, aliases + fuzzy).

- [ ] **Step 1:** Tests: `test_extracts_pdf_and_docx_persian_english`, `test_empty_pdf_raises_resumeerror`, `test_arabic_letters_normalised` ("پايتون" → python), `test_map_skills_aliases` ("Excel", "اکسل" → `excel`), `test_oversize_file_rejected` (>5 MB).
- [ ] **Step 2:** FAIL. **Step 3:** implement (PyMuPDF/python-docx, hazm normaliser, alias dict from taxonomy, size/type checks, in-memory only). **Step 4:** PASS. **Step 5:** commit.

**Optional:** OCR fallback for scanned PDFs (pytesseract + `fas` language pack) — document as limitation if skipped.

### Task 2.4: Job collector (Mandatory - B-03, NF-08; Should - B-09)

**Files:** Modify `backend/app/jobs/collector/base.py`, `collector/sources/*.py` (add ≥2 real source adapters), `backend/app/jobs/dedup.py`, `backend/app/jobs/store.py`, `backend/scripts/collect_jobs.py`; Test `backend/tests/test_collector.py`, `test_dedup.py`.

**Interfaces:** Produces `Source.fetch() -> list[JobPosting]` per adapter; `dedup(postings: list[JobPosting]) -> list[JobPosting]`; `store.load_postings() -> list[JobPosting]`.

- [ ] **Step 1:** Tests: `test_respects_robots_disallow`, `test_min_2s_between_requests_per_host` (fake clock), `test_user_agent_sent`, `test_dedup_same_job_two_sources`, `test_dedup_keeps_distinct_jobs`.
- [ ] **Step 2:** FAIL. **Step 3:** pick sources that publish a public API or allow scraping (check robots.txt/terms first); parse to normalised schema incl. `skill_ids` via `map_skills`, `seniority`, `remote`. Dedup key = normalised (title, company, location) with fuzzy ratio threshold.
- [ ] **Step 4:** Run `make collect` → ≥50 deduped postings in `data/jobs/postings.jsonl`; record counts per source in README "Data sources". **By 11:00.**
- [ ] **Step 5:** Commit (raw cache stays git-ignored).

**Optional:** third source; scheduled/incremental refresh with `published_at` cut-off (B-11).

---

# Phase 3 — Ranking, Explanation, UI Integration (target: 13:00 end-to-end, 15:30 freeze)

### Task 3.1: Ranking, explanations, filters (Mandatory - B-04, B-05; Should - B-07, B-08, NF-02)

**Files:** Modify `backend/app/jobs/{ranking,explain}.py`, `backend/app/api/jobs.py`; Test `backend/tests/test_ranking.py`.

**Interfaces:** Produces `baseline_rank(resume: ResumeProfile, postings: list[JobPosting], k: int = 10) -> list[JobMatch]`, `hybrid_rank(session_id, resume, postings, k=10) -> list[JobMatch]`, `apply_filters(postings, filters: dict) -> list[JobPosting]`, `explain(resume, posting) -> tuple[list[str], list[str]]` (matched, missing).

- [ ] **Step 1:** Tests: `test_filters_location_seniority_remote`, `test_matched_missing_are_set_ops`, `test_hybrid_falls_back_when_embedding_fails`, `test_returns_at_most_10_sorted_desc`, `test_zero_results_returns_empty_list`.
- [ ] **Step 2:** FAIL. **Step 3:** BM25 over title+requirements; hybrid `w_skill·overlap + w_embed·cosine`; weights from `config.py`. Persian `explanation_fa` is a deterministic template (no LLM) in the mandatory path.
- [ ] **Step 3b:** Time `/jobs/match` on >=50 postings and assert < 60 s (NF-02); cache posting embeddings on first use.
- [ ] **Step 4:** PASS; wire `/jobs/match` and `/jobs/count`, remove fixture path.
- [ ] **Step 5:** Commit.

**Optional:** LLM re-rank of top 20 (`LLM_RERANK`, `llm_rerank_top_k`); LLM-written Persian explanation sentence (must still use only deterministic matched/missing lists).

### Task 3.2: Frontend polish (Mandatory - A-06, B-06, NF-01, NF-03; Should - A-09, B-08, NF-05)

**Files:** Modify `frontend/src/{api.ts,types.ts,styles.css}`, `components/{RoadmapGraph,JobCard,ChatBox,ResumeUpload,PrivacyNotice}.tsx`, `pages/{CareerChat,JobMatch}.tsx`.

- [ ] **Step 1:** Checklist (manual, verified in browser): graph colours known vs todo and lays out by `layer`; clicking a node lists resources; job card shows score, matched/missing chips, link opening original posting; filter controls (location, seniority, remote); privacy notice must be accepted before upload is enabled; token/cost footer from `/api/usage`.
- [ ] **Step 2:** Error/empty states: LLM down, bad file, zero matches, network failure — all with Persian text, no raw errors.
- [ ] **Step 3:** `cd frontend && npm run build` → passes; browser console shows no errors on the three demo scenarios.
- [ ] **Step 4:** Commit.

**Optional:** Vitest component tests; Playwright smoke test of the three scenarios; dark mode; export roadmap as PNG/PDF (React Flow `toObject` + html-to-image).

### Task 3.3: "Roadmap for this job's missing skills" (Optional/bonus - B-10)

**Files:** Modify `api/roadmap.py` (accept `missing_skills`), `frontend/src/components/JobCard.tsx`.
**Depends on:** Task 1.4.

- [ ] **Step 1:** Test `test_roadmap_from_missing_skills_endpoint`. **Step 2:** FAIL. **Step 3:** endpoint calls `compute_roadmap_for_concepts`; button on card switches to Career tab with graph. **Step 4:** PASS. **Step 5:** commit.

### Task 3.4: Roadmap export and cost dashboard (Optional - A-11, bonus)

**Files:** Modify `frontend/src/components/RoadmapGraph.tsx`; Create `frontend/src/components/CostPanel.tsx`.

- [ ] **Step 1:** "Download image" button exporting the graph as PNG (html-to-image); verify manually that Persian labels render.
- [ ] **Step 2:** Cost panel from `/api/usage/{sid}`: calls, tokens, est. USD per module (RFP bonus: cost dashboard).
- [ ] **Step 3:** `npm run build` passes; commit.

---

# Phase 4 — Evaluation, Report, Demo (target: 16:00 numbers, 16:30 code freeze)

### Task 4.1: Evaluation harness (Mandatory - section 10.2, worth the 20-point AI/ML criterion)

**Files:** Modify `backend/scripts/evaluate_ranking.py`; fill `backend/data/eval/resumes/*.json` (3 synthetic) and `labels.csv`; Test `backend/tests/test_metrics.py`.

**Interfaces:** Produces `precision_at_k(ranked_ids, relevant_ids, k) -> float`, `ndcg_at_k(ranked_ids, relevant_ids, k) -> float` (binary gains).

- [ ] **Step 1:** Tests with hand-computed values: `test_precision_at_5` (relevant at ranks 1,3 → 0.4), `test_ndcg_at_10_perfect_is_1`, `test_ndcg_empty_relevant_is_0`.
- [ ] **Step 2:** FAIL. **Step 3:** implement metrics; label ≥20 postings per resume as relevant/not (team labels by hand, 2 people if possible).
- [ ] **Step 4:** `make eval` prints baseline vs hybrid table; paste into `docs/REPORT.md`.
- [ ] **Step 5:** Commit.

**Optional:** ablation (overlap-only, embedding-only, +re-rank); weight sweep chart.

### Task 4.2: Report, README, slides, demo rehearsal (Mandatory)

**Files:** Modify `docs/REPORT.md`, `README.md`; Create slides (outside repo or `docs/` link).

- [ ] **Step 1:** Fill REPORT (1-2 pages, RFP section 7): architecture, models & why, taxonomy design, ranking method, eval table, cost per session (from `/api/usage` on real runs), AI-assistant disclosure, limitations.
- [ ] **Step 2:** Export slides to PDF (5 min talk, 3 min Q&A). Hidden-resume check: run a new, unseen synthetic resume end-to-end and confirm parse + rank works.
- [ ] **Step 2b:** Rehearse the three demo scenarios + eval table + killed-key failure demo from `docs/TASKS.md` checklist on a clean `docker compose up`.
- [ ] **Step 3:** Final `make test`, `npm run build`, `git grep -n "LLM_API_KEY=."` shows no secrets; tag release.

**Optional:** 60-second screen-recorded fallback demo video; backup fixtures mode toggle (`USE_FIXTURES=1`) for flaky venue wifi.

---

## Self-Review Notes

- **Spec coverage:** every RFP requirement (A-01..A-11, B-01..B-11, NF-01..NF-08, section 10.2) maps to a task in the reconciliation table; deliverables (section 7) are in Task 4.2.
- **Repo docs drift:** `docs/TASKS.md` and `claude_code_prompt.md` use IDs/priorities that differ from the RFP (e.g. robustness is NF-06 not NF-05; A-08 is Should; voice A-10 and integration B-10 are bonus; A-11 is export). Task 0.1 Step 3b fixes `TASKS.md`.
- **Key risk to resolve first:** the sibling `taxonomy/` folder duplicates P1 work in a different format (JSON vs skeleton YAML); Task 1.1 Step 3 must settle this on day one.
- **Windows note:** Makefile hard-codes `python3.12` and `.venv/bin`; fix in Task 0.1 or use Docker/WSL.
