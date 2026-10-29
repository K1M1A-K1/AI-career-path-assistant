# Tasks — 4 workstreams

Stubs raise `NotImplementedError`; routers serve fixtures meanwhile. Requirement IDs refer to RFP RC-MLB-HACK-2026-01.

## P1 — Taxonomy & Graph · owner: _TBD_
Folders: `backend/app/careers/{taxonomy,graph,resources}.py`, `backend/data/taxonomy/`, `backend/scripts/{validate,verify}_*.py`, `backend/tests/test_graph.py`
- [ ] A-02 Taxonomy: ≥10 roles, ≥3 domains (software, data, business), junior/mid/senior concept sets
- [ ] A-03 Prerequisite edges + `check_acyclic`
- [ ] A-05 `compute_roadmap` (targets + prerequisites − known, topological order, layers)
- [ ] A-07 Resources with `verified` flags; `verify_resources.py` writes results back
- [ ] A-08 Deterministic correction side (unknown ids dropped, `heard_of_only` ≠ known)

Done when: `make test` has no xfail left in `test_graph.py`; `python -m scripts.validate_taxonomy` is clean; every concept has ≥1 verified resource.

## P2 — LLM Layer · owner: _TBD_
Folders: `backend/app/llm/`, `backend/app/careers/conversation.py`, `backend/app/jobs/resume_parser.py`, `backend/app/jobs/normalize.py`
- [ ] A-01 Persian chat, ≤6 questions
- [ ] A-04 JSON profile validated against taxonomy
- [ ] A-09 Correction handling ("من اکسل بلد نیستم")
- [ ] B-01 PDF/DOCX text extraction, Persian + English
- [ ] B-02 Resume → `ResumeProfile`, `map_skills`
- [ ] NF-05 Graceful LLM errors/timeouts/malformed JSON
- [ ] NF-06 Token + cost tracking per session
- [ ] A-10 (optional) voice input

Done when: the full chat → profile → roadmap flow runs on the real LLM; a bad-JSON/timeout test shows a friendly Persian message; `/api/usage` shows real numbers.

## P3 — Jobs & Ranking · owner: _TBD_
Folders: `backend/app/jobs/{collector,dedup,store,ranking,explain}.py`, `backend/scripts/{collect_jobs,evaluate_ranking}.py`, `backend/data/{jobs,eval}/`
- [ ] B-03 ≥50 postings from ≥2 public sources, normalised schema (cached by **11:00**)
- [ ] B-04 Dedup across sources
- [ ] B-05 `baseline_rank` + `hybrid_rank`, top 10
- [ ] B-07 Matched/missing skills + Persian explanation
- [ ] B-09 Filters (location, seniority, remote) verified
- [ ] NF-08 Scraper: robots.txt, ≥2 s/host, User-Agent
- [ ] §10.2 Eval: 3 synthetic resumes × ≥20 labelled postings; P@5 and nDCG@10 vs BM25

Done when: `make collect` yields ≥50 deduped postings; `make eval` prints the results table for both methods.

## P4 — Frontend & Integration · owner: _TBD_
Folders: `frontend/`, `docker-compose.yml`, `Makefile`, `README.md`, `docs/REPORT.md`
- [ ] A-06 Roadmap graph polish (layers, resources, known/todo)
- [ ] B-06 Job cards with score, matched/missing, link
- [ ] B-08 Filters UI
- [ ] NF-01 RTL, Persian UI, Vazirmatn
- [ ] NF-03 Privacy notice before upload (done in skeleton; verify wording)
- [ ] NF-07 Usage/cost display
- [ ] B-10 Error and empty states
- [ ] A-11 (optional) "roadmap for this job's missing skills" (calls Module A)
- [ ] Slides and demo script

Done when: all three demo scenarios run end-to-end from `docker compose up` with no console errors.

## Timeline

| Time | Milestone |
|---|---|
| 09:45 | Contracts frozen, skeleton runs |
| 11:00 | Postings cached |
| 13:00 | End-to-end with real components |
| 15:30 | Feature freeze |
| 16:00 | Eval numbers + report |
| 16:30 | Code freeze |

## Demo script checklist

- [ ] **1. Beginner → junior data analyst:** chat, roadmap graph, resources, correction "من اکسل بلد نیستم" regenerates it
- [ ] **2. Junior backend → senior:** roadmap shows only missing concepts, prerequisites ordered
- [ ] **3. Graduate uploads resume:** privacy notice, upload, top-10 with matched/missing, filters, link to original posting
- [ ] Show eval table (baseline vs ours) and cost per session
- [ ] Show an LLM failure handled gracefully (e.g. kill the key)
