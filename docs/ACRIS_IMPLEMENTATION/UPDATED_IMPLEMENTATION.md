# ACRIS — Implementation Plan (UPDATED)

**Autonomous / AI Compliance & Regulatory Intelligence System**

- Document type: Authoritative implementation roadmap and status register
- Supersedes: `IMPLEMENTATION.md`
- Status source of truth: `QA.md` (repository-grounded audit)
- Product intent source: `PRD.md` → superseded by `UPDATED_PRD.md`
- Technical intent source: `ARCHITECTURE.md` → superseded by `UPDATED_ARCHITECTURE.md`
- Execution companion: `PHASE_11_REMEDIATION_AND_EXECUTION.md`

---

## 0. How to read this document

### 0.1 Precedence rules used to build this file

When the four input documents disagreed, the following precedence was applied
and the disagreement was recorded rather than hidden:

| Rank | Document            | Authority                                   |
| ---- | ------------------- | ------------------------------------------- |
| 1    | `QA.md`             | Actual verified repository / runtime status |
| 2    | `PRD.md`            | Product intent                              |
| 3    | `ARCHITECTURE.md`   | Intended technical architecture             |
| 4    | `IMPLEMENTATION.md` | Implementation plan and _claimed_ status    |

`QA.md` was NOT modified and is not reproduced here. It is cited.

### 0.2 Status vocabulary (mandatory)

| Tag                 | Meaning                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `[VERIFIED]`        | QA.md contains direct evidence that the capability exists **and** is wired into the live runtime path **and** behaves as intended. |
| `[PARTIAL]`         | Implementation exists but integration and/or verification is incomplete.                                                           |
| `[NOT IMPLEMENTED]` | Absent from the codebase per QA.md.                                                                                                |
| `[BROKEN]`          | Present but non-functional, unsafe by default, or contradicting intended behaviour.                                                |
| `[BLOCKED]`         | Cannot be started or verified until a named dependency is fixed.                                                                   |
| `[NOT VERIFIED]`    | QA.md does not cover it; requires runtime validation before any claim is made.                                                     |

**Rule enforced throughout this document:** a task is never `[VERIFIED]`
because code exists, a file exists, a checkbox was ticked, a model is
declared, a Docker service is defined, or an endpoint is routed. It is
`[VERIFIED]` only when QA.md shows it is connected and functional.

### 0.3 Scope of "Phase 11"

The original `IMPLEMENTATION.md` defines Phases 0–20 plus lettered sub-phases
(4B, 6B, 7B, 10B, 11B, 14B, 18B). The remediation target requested is
"Phase 1–11 genuinely complete."

QA.md §18 demonstrates that Phase 1–11 **cannot honestly be closed** using
only Phases 1–11, because several capabilities that Phases 1–11 depend on
were originally scheduled later:

- real job-status UI (originally Phase 13) — Phase 6's `GET /api/jobs/:id`
  contract is unobservable without it
- stale-recommendation protection (originally Phase 14B) — Phase 4B/11B
  version lineage is pointless without an enforcement point
- audit events (originally Phase 18B) — Phase 5's authorization work is not
  auditable without it
- security hardening (originally Phase 16) — Phase 5 is not closable while
  the default JWT secret is weak
- test suite (originally Phase 15) — nothing in Phases 1–11 can be
  _verified_ without it

This document therefore defines:

- **Phase 1–11 core scope** — classified item by item below
- **Phase 11 Completion Gate** — the minimum pulled-forward subset of Phases
  13/14/14B/15/16/18/18B without which Phase 11 is not honestly complete

Phases 12, 17, 19, 20 and the non-gate remainder of 13–18B stay
post-Phase-11 and are listed in §14 for continuity only.

---

## 1. Reconciliation register — explicit contradictions

These are contradictions between the input documents. They are resolved in
favour of `QA.md` and recorded here so no reader has to rediscover them.

### C-1 — "Every business route is unauthenticated"

- `PRD.md` §16, §7.3, §11 and `ARCHITECTURE.md` §1/§2 state that
  `authMiddleware` is wired only to `GET /api/auth/me` and that every
  business route is open.
- `IMPLEMENTATION.md` Phase 0 "Current Reality" repeats this.
- **QA.md §4.7 contradicts all three:** `/regulations`, `/policies`,
  `/reports`, `/amendments`, `/dashboard`, `/jobs` each apply
  `router.use(authMiddleware)`.
- **Resolution:** the PRD/ARCHITECTURE/IMPLEMENTATION "current state"
  narrative is **stale and overly pessimistic**. Route-level authentication
  is `[VERIFIED]`. The residual exposure is different and narrower — see C-2.

### C-2 — Unauthenticated static file exposure

- No input document except QA.md mentions this.
- **QA.md §4.6** lists `static /uploads` and `static /reports` among the
  public endpoints in `acris/backend/app.js`.
- **Resolution:** this is an **active data-isolation defect**. It bypasses
  the org-scoped `GET /api/reports/:id/download` guard that QA.md §13.5
  confirms works. Classified `[BROKEN]` under Phase 5.

### C-3 — "Zero tests exist"

- `PRD.md` §21 and `IMPLEMENTATION.md` Phase 15 state zero test files exist.
- **QA.md §14.1** lists four Node test files and one Python test file, and
  §14.5 records `npm test` → **PASS, 4 passing**.
- **Resolution:** stale claim. Testing is `[PARTIAL]`, not absent. The real
  defect is coverage (QA.md §14.2/§14.3) plus a **hard Python blocker**
  (C-4).

### C-4 — Python test suite cannot run

- Not present in PRD/ARCHITECTURE/IMPLEMENTATION.
- **QA.md §14.5:** `pytest` → **FAIL at import/collection**,
  `ModuleNotFoundError: No module named 'langchain_community'`.
- **Resolution:** `[BROKEN]`. This is the single highest-priority blocker
  because it makes every Python-side acceptance criterion in Phases 8–11B
  unverifiable. Everything downstream is `[BLOCKED]` on it.

### C-5 — "No Docker, no docker-compose, no CI"

- `ARCHITECTURE.md` §26 and `IMPLEMENTATION.md` Phase 0 claim none exist.
- **QA.md §2** confirms `docker-compose.yml` exists with `mongo`, `redis`,
  `chroma`, `ollama`, `backend`, `worker`, `frontend`.
- **QA.md §8.4** confirms the `worker` service command is a literal
  placeholder: `python -c "print('ACRIS worker container ready - queue implementation is the next phase')"`.
- **Resolution:** compose file `[PARTIAL]`; worker service `[BROKEN]` (it
  advertises a worker that does not consume anything). CI remains
  `[NOT IMPLEMENTED]`.

### C-6 — "Async pipeline implemented" vs "queue implemented"

- `IMPLEMENTATION.md` Phase 6 describes returning `202 {jobId}`; Phase 7
  describes BullMQ + a separate worker.
- **QA.md §8.1–§8.6:** the `202` contract is real, but `runPipeline()` is a
  plain in-process JS async function; there is no `bullmq`, `ioredis`,
  `bee-queue` or `agenda` dependency in `acris/backend/package.json`, and
  Redis has no consumer.
- **Resolution:** Phase 6 = `[PARTIAL]` (contract only). Phase 7 =
  `[NOT IMPLEMENTED]`. **The system must not be described as having worker
  architecture.**

### C-7 — Hashing embeddings vs real embeddings

- `PRD.md` §7.2 and `ARCHITECTURE.md` §10 describe the embedding function as
  a hand-rolled hashing pseudo-embedding.
- **QA.md §9.7:** `chroma_store.py` now calls `OllamaEmbeddingFunction` by
  default; the `HashingEmbeddingFunction` remains in the same file as a
  legacy path selected by `EMBEDDING_PROVIDER=hashing`.
- **Resolution:** Phase 10 = `[PARTIAL]`. The PRD claim is stale; the real
  defects are (a) the dual path is not versioned or namespaced, (b) the
  embedding model defaults to `OLLAMA_MODEL` (`llama3`) which is a **chat**
  model being used as an embedding model, (c) no metadata isolation filters.

### C-8 — Document versioning "modelled" vs "operational"

- `IMPLEMENTATION.md` Phase 4B and `ARCHITECTURE.md` §41.3 define
  `CompanyDocument` / `CompanyDocumentVersion` / `DocumentChunk`.
- **QA.md §5.5 / §17 Step D:** the models exist, but `policy_ingest.py`
  still executes `db.companydocs.insert_one({...})` — the legacy flat
  collection. `mapping_agent.py`, `drafting_agent.py` and `report_agent.py`
  all still read `db.companydocs`.
- **Resolution:** Phase 4B = `[PARTIAL]`. The runtime document model is the
  **legacy flat one**. This is the root cause of the stale-recommendation
  failure (C-9).

### C-9 — Stale recommendation handling

- `PRD.md` §11/§8.4 FR-22 and `ARCHITECTURE.md` §8/§41.6 require it.
- **QA.md §7.6, §17 Step F/G, §18.3:** `implementationStatus` enum on
  `ImpactMapping` includes `"stale"`, **but no runtime code ever sets it**,
  and `routes/amendments.js` updates only `reviewStatus`.
- **Resolution:** `[NOT IMPLEMENTED]`, and treated as the system's most
  safety-critical missing control.

### C-10 — Vector store organization isolation

- `ARCHITECTURE.md` §41.16/§41.17 and `PRD.md` FR-31 assume metadata-filtered
  retrieval.
- **QA.md §11.3/§11.4:** Chroma metadata contains only `name`, `doc_id`,
  `type`, `owner_team`. There is **no** `organizationId`, `documentVersionId`
  or `embeddingVersion` filter on query. QA verdict: **"NOT PROTECTED"**.
- **Resolution:** `[BROKEN]`. Cross-organization vector leakage is possible
  at the retrieval layer even though the Mongo layer filters by org.

### C-11 — Internal QA contradiction on `POST /api/auth/register`

- **QA.md §4.5** table: `/api/auth/register` — Auth required **Yes**, role
  **admin**, org scoped **Yes**.
- **QA.md §4.6** lists `/api/auth/register` among the **public** endpoints in
  `app.js`.
- **Resolution:** these two statements cannot both be true.
  **Not verified — requires runtime validation.** Treated as `[NOT VERIFIED]`
  with a mandatory Stage 11 inspection task. Do not assume it is protected.

### C-12 — Secrets in the repository

- `PRD.md` §16 states `.env` is correctly gitignored and calls it "the one
  thing done right".
- **QA.md §13.8:** an `.env` file **is present** at `acris/.env` containing
  `MONGODB_URI` and `JWT_SECRET`.
- **Resolution:** the PRD claim is stale/incorrect. `[BROKEN]`. Requires
  secret rotation, not just a `.gitignore` edit.

### C-13 — Prompt registry

- `IMPLEMENTATION.md` Phase 11/11B says to _create_ `agents/prompts/`.
- **QA.md §10.3** references an existing `acris/agents/prompts_registry.py`
  and states no data/instruction boundary is present in it.
- **Resolution:** the registry exists — **do not create a second one**.
  Phase 11 prompt-registry task = `[PARTIAL]`; Phase 11B boundary task =
  `[NOT IMPLEMENTED]`.

---

## 2. Phase 1 — Repository & Development Environment

### Phase 1 execution update

Phase 1 remediation is **PARTIAL — implementation exists but
integration/verification is incomplete.** Python dependencies, lazy Ollama
construction, real backend/Python lint commands, dependency health reporting,
security headers, CORS allow-listing, login throttling, policy upload
validation, and private document paths are implemented. Backend tests, backend
lint, Python tests, and Python lint have been executed in the configured
environment. Queue consumption, full Docker startup, dependency auditing, and
the complete Phase 1 manual verification matrix remain unverified and belong
to follow-up work before this phase can be marked complete.

The dependency audit was executed with `pip-audit` and reported 100 findings
across the currently selected environment. These findings are not silently
accepted as a clean security result; dependency upgrades require compatibility
testing and remain an explicit Phase 1 follow-up.

**Objective (unchanged):** one-command local stack supporting the modular
monolith, workers, Mongo, Redis, Chroma and the LLM provider.

### 1.1 `docker-compose.yml` with all services — `[PARTIAL]`

- **Current state:** compose defines `mongo`, `redis`, `chroma`, `ollama`,
  `backend`, `worker`, `frontend`.
- **Evidence:** QA.md §2 phase matrix (Phase 1: PARTIALLY WORKING); QA.md
  §8.3/§8.4.
- **Gap:** the `worker` service runs a placeholder print statement; Redis is
  present but has no consumer. Per-service health checks are not confirmed by
  QA.
- **Required fix:** replace the worker command with the real BullMQ consumer
  entrypoint delivered in Stage 7; add health checks; make `backend` and
  `worker` depend on `redis` healthy.
- **Dependencies:** Stage 7 (queue), Stage 1 (dependency repair).
- **Verification method:** `docker compose up`; `docker compose ps` shows all
  services healthy; `docker compose logs worker` shows queue-consumer startup
  and at least one job pickup.
- **Acceptance criteria:** no service in compose advertises a capability it
  does not provide; worker logs prove queue attachment.

### 1.2 `.env.example` covering all config — `[NOT VERIFIED]`

- **Current state:** not assessed by QA.md.
- **Evidence:** QA.md does not enumerate `.env.example`. QA.md §13.8 does
  confirm a real `.env` exists in-tree and `acris/README.md` contains example
  env values.
- **Gap:** unknown coverage; must at minimum include `MONGODB_URI`,
  `JWT_SECRET`, `REDIS_URL`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`,
  `OLLAMA_EMBEDDING_MODEL`, `EMBEDDING_PROVIDER`, `CHROMA_PERSIST_DIR`,
  `UPLOADS_DIR`, `REPORTS_DIR`, `PORT`, `PYTHON_BIN`, `CORS_ALLOWED_ORIGINS`.
- **Required fix:** inspect repository; complete the file; ensure no real
  secret values appear in it.
- **Dependencies:** none.
- **Verification method:** diff the key set of `.env.example` against every
  `process.env.*` read in `acris/backend/config/index.js` and every
  `os.environ` read in `acris/agents/*.py`; the sets must match.
- **Acceptance criteria:** zero environment variables read at runtime are
  missing from `.env.example`; zero live secrets present in it.

### 1.3 Root scripts `dev` / `test` / `lint` / `build` — `[PARTIAL]`

- **Current state:** `npm test` PASS (4 tests), `npm run build` PASS (Vite),
  `npm run lint` "passes" only because it is a stub.
- **Evidence:** QA.md §14.5.
- **Gap:** `lint` is meaningless; no aggregated Python test script.
- **Required fix:** see 1.4; add `test:py` invoking `pytest`.
- **Dependencies:** 1.6.
- **Verification method:** each script fails the build when the underlying
  tool fails.
- **Acceptance criteria:** deliberately introducing a lint error causes
  `npm run lint` to exit non-zero.

### 1.4 Linting/formatting for backend, frontend, Python — `[BROKEN]`

- **Current state:** backend lint script is
  `echo 'ESLint not configured yet for backend'`.
- **Evidence:** QA.md §14.5 quotes the script verbatim.
- **Gap:** the plan marks linting `[x]`; QA proves the backend has none. A
  passing lint step that lints nothing is worse than no lint step because it
  produces a false green signal.
- **Required fix:** configure real ESLint for `acris/backend`; keep the
  existing frontend lint; add `ruff` (or equivalent) for `acris/agents`.
- **Dependencies:** none.
- **Verification method:** as 1.3.
- **Acceptance criteria:** all three linters run and report real findings; CI
  (post-Phase-11) can consume them.

### 1.5 `CONTRIBUTING.md` one-command setup — `[NOT VERIFIED]`

- **Evidence:** QA.md does not assess it; QA.md §2 references
  `acris/README.md` as existing.
- **Required fix:** inspect repository to determine whether
  `CONTRIBUTING.md` exists; if it does, correct it to match reality
  (specifically: state plainly that the worker is not yet a queue consumer
  until Stage 7 lands).
- **Verification method:** a developer with a clean clone reaches a running
  stack using only the documented commands.
- **Acceptance criteria:** documented setup contains no step that QA.md has
  shown to be non-functional.

### 1.6 Python dependency environment — `[BROKEN]` **(critical blocker)**

- **Current state:** `pytest` aborts during collection.
- **Evidence:** QA.md §14.5 —
  `ModuleNotFoundError: No module named 'langchain_community'`.
- **Gap:** `acris/agents/llm.py` imports `from langchain_community.llms import Ollama`;
  the dependency is not installed/declared in the environment used to run
  tests. Because `llm.py` is imported transitively by the agent modules, the
  entire Python test suite is uncollectable — including
  `acris/agents/test_diff_agent.py`.
- **Required fix:** declare and pin the agent dependency set
  (`langchain-community`, `pymongo`, `chromadb`, `pymupdf`, `reportlab`,
  `requests`, `pytest`), create a reproducible install path, and make the
  import surface test-friendly (lazy LLM construction so importing an agent
  does not require a live Ollama).
- **Dependencies:** none. **Everything Python-side is `[BLOCKED]` on this.**
- **Verification method:** `pytest` collects and runs to completion in a
  clean environment and in the `worker` container image.
- **Acceptance criteria:** `pytest` exit code 0 with at least the existing
  `test_diff_agent.py` executing rather than erroring at import.

### 1.7 Per-service health checks — `[NOT VERIFIED]`

- **Evidence:** QA.md §2 notes compose services exist; QA.md §4.5 confirms
  `GET /api/health` exists and returns basic JSON; QA.md §2 phase matrix
  (16-20) lists "no health checks" among missing items.
- **Gap:** `/api/health` does not check Mongo/Redis/Chroma/Ollama
  connectivity.
- **Required fix:** deep health endpoint + compose healthchecks (Stage 1 and
  Stage 13).
- **Verification method:** stop Mongo; `/api/health` reports Mongo down and
  the endpoint returns a non-200 aggregate status.
- **Acceptance criteria:** health output distinguishes each dependency.

---

## 3. Phase 2 — Frontend Foundation

### 2.1 React Router shell — `Implemented and verified`

- **Evidence:** `acris/frontend/src/app/router.jsx` uses `BrowserRouter`,
  nested protected routes, `Navigate`, and explicit `/dashboard` and
  `/jobs/:jobId` routes. `App.jsx` wraps the router with `AuthProvider` and
  `ErrorBoundary`. The frontend production build passes.
- **Note:** this directly contradicts `PRD.md` §14 and `ARCHITECTURE.md` §1
  ("no router"). Those statements are stale.

### 2.2 `AuthProvider` + route guard — `Implemented and verified`

- **Evidence:** QA.md §3.1 — `acris/frontend/src/app/AuthProvider.jsx`
  handles token persistence and route gating.
- **Residual gap (not a Phase 2 defect):** no automated test covers the
  guard — tracked under Phase 15 / Stage 12.

### 2.3 `ErrorBoundary` — `Implemented and verified`

- **Evidence:** QA.md §3.2 lists `acris/frontend/src/app/ErrorBoundary.jsx`.

### 2.4 Modular `features/` layout — `[PARTIAL]`

- **Current state:** structure is `src/app/`, `src/pages/`,
  `src/components/`, `src/api/`.
- **Evidence:** QA.md §3.2 file listing shows no `features/` directory.
- **Gap:** `ARCHITECTURE.md` §18 specifies a `features/` layout with a
  dedicated `jobs/` feature. The current flat `components/` folder is why the
  job UI has nowhere natural to live.
- **Required fix:** introduce feature folders as the corresponding job,
  evidence, and document workflows are delivered; do not perform a
  wholesale directory rewrite of working screens. Phase 2 now provides the
  routed shell without pulling later workflow stages forward.
- **Dependencies:** Stage 8.
- **Verification method:** `npm run build` passes; all existing dashboard
  behaviour unchanged.
- **Acceptance criteria:** new job screens live under a feature folder; no
  regression in existing routes.

### 2.5 Routed pages for regulations / policies / jobs / documents — `[PARTIAL]` / `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §3.2 scalability assessment:
  - Dashboard — WORKING
  - Regulations — PARTIALLY WORKING (inside dashboard, no standalone route)
  - Policies — PARTIALLY WORKING (upload form only)
  - Jobs — PARTIALLY WORKING (model + endpoint exist, no route/page)
  - **Job Details — NOT IMPLEMENTED** (no `JobDetails.jsx`)
  - Amendments — PARTIALLY WORKING (in dashboard)
  - Documents — PARTIALLY WORKING (uploads only, no registry UI)
  - **Document Versions — NOT IMPLEMENTED**
  - **Settings — NOT IMPLEMENTED**
  - Admin — PARTIALLY WORKING (role field exists, no UI)
- **Gap / Required fix / Dependencies / Verification / Acceptance:** these are
  driven by Stage 8 (job UI), Stage 6 (stale banner), Stage 10 (evidence
  panel). See `PHASE_11_REMEDIATION_AND_EXECUTION.md` Tasks 8.3, 6.4, 10.3.

### 2.6 Document evidence & policy-version views — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §3.2 (Document Versions: NOT IMPLEMENTED); QA.md §12.4
  (no evidence linkage present in the code path).
- **Gap:** reviewers cannot see which regulation version / policy version /
  retrieved evidence produced a recommendation, so "human review" is
  rubber-stamping.
- **Required fix:** Stage 10.
- **Dependencies:** Stage 5 (lineage persisted first — there is nothing to
  render until then).
- **Verification method:** open an amendment; all nine provenance questions
  in `UPDATED_PRD.md` BR-8 are answerable on screen.
- **Acceptance criteria:** an amendment with no evidence renders an explicit
  "no evidence recorded" state and cannot be approved.

### 2.7 Frontend tests — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §2 phase matrix Phase 2 "Test Exists?: No UI tests";
  QA.md §14.3 (no UI integration tests).

---

## 4. Phase 3 — Backend Foundation

### 3.1 `config/index.js` centralising env reads — `[PARTIAL]`

- **Current state:** the file exists and is used.
- **Evidence:** QA.md §13.1/§13.3 cite `acris/backend/config/index.js`.
- **Gap:** it contains
  `jwtSecret: process.env.JWT_SECRET || "your_jwt_secret_here"` and an admin
  password fallback (QA.md §13.3, §13.8). Centralisation succeeded; safety
  did not.
- **Required fix:** fail-fast on missing/weak secrets in non-development
  environments; remove hardcoded fallbacks. Stage 11.
- **Dependencies:** none.
- **Verification method:** start the API with `JWT_SECRET` unset and
  `NODE_ENV=production` — process must exit non-zero with a clear message.
- **Acceptance criteria:** no default secret value exists anywhere in source.

### 3.2 Centralised error handler — `[PARTIAL]`

- **Evidence:** QA.md §4.4 — `middleware/errorHandler.js` exists and is
  mounted in `app.js`; most routes call `next(error)`.
- **Gap:** not every route routes errors centrally; no `APIError` class
  hierarchy; no uniform status-code mapping; some upload paths hand-build
  messages then also call `next(error)`.
- **Required fix:** introduce a typed error class and a single mapping table;
  convert ad-hoc responses. Stage 11.
- **Dependencies:** none.
- **Verification method:** integration tests assert error envelope shape
  `{error:{code,message,requestId}}` for 400/401/403/404/409/422/429/500.
- **Acceptance criteria:** no route returns a raw stack trace or provider
  error string to the client.

### 3.3 Service / repository layer — `[PARTIAL]`

- **Current state:** implemented for the dashboard only.
- **Evidence:** QA.md §4.1 — `services/dashboardService.js` +
  `repositories/dashboardRepository.js` are real; but
  `routes/regulations.js`, `routes/reports.js`, `routes/amendments.js`
  import Mongoose models directly (QA.md §4.2) and contain business logic
  (QA.md §4.3).
- **Gap:** the layers that must host the new enforcement points (stale check,
  audit write, job enqueue, org+version scoping) do not exist for the routes
  that need them most.
- **Required fix:** extract `AmendmentService`, `RegulationService`,
  `PolicyService` — **only** to the extent needed to host Stage 5/6/7/13
  logic. Do not refactor for aesthetics.
- **Dependencies:** none, but sequenced before Stages 6, 7, 13.
- **Verification method:** the stale check and the audit write each exist in
  exactly one place and are unit-testable without HTTP.
- **Acceptance criteria:** `routes/amendments.js` contains no persistence
  logic; approve/reject behaviour is byte-identical for the happy path.

### 3.4 Dashboard migrated to service/repository — `[VERIFIED]`

- **Evidence:** QA.md §4.1, §4.5 (`/api/dashboard/stats` WORKING, tested),
  §14.1 (`dashboardService.test.js`).

### 3.5 Service layer extended for document registry / connector / audit — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §5.4 ("there is no `AuditEvent` model at all"),
  QA.md §7.3 (no connector classes or registry exist),
  QA.md §4.7 (no documents API layer implemented).
- **Required fix:** Stages 2, 13, 14.
- **Dependencies:** Stage 1.
- **Verification method:** per-stage acceptance criteria in the execution
  plan.

---

## 5. Phase 4 — Database & Core Data Model

### 4.1 `Organization` model — `[VERIFIED]`

- **Evidence:** QA.md §1 "highest-confidence code facts"; §5.1.

### 4.2 `User` model with hashed password — `[VERIFIED]`

- **Evidence:** QA.md §5.1; QA.md §13.2 — `bcrypt.hash(password, 12)` and
  `bcrypt.compare()` in `services/authService.js`. QA verdict: WORKING.
- **Note:** this contradicts `PRD.md` §6/§16 ("hardcoded admin/admin123, no
  bcrypt anywhere"). The PRD claim is stale. A **fallback admin password
  still exists in config** (QA.md §13.8) and is handled under Phase 5.9.

### 4.3 `ComplianceJob` model — `[VERIFIED]` (as a schema) / `[PARTIAL]` (as a lifecycle)

- **Evidence:** QA.md §1, §5.1, §5.4 (indexed on `{organizationId,status}`
  and `{organizationId,fileHash}`).
- **Gap:** the _lifecycle_ the model implies is not driven by a queue and has
  no `RETRYING`/`CANCELLED` transitions in practice (QA.md §8.9, §8.11).
  Tracked under Phase 7 and Stage 8.

### 4.4 `organizationId` on every collection — `[PARTIAL]`

- **Current state:** present on `User`, `ComplianceJob`, `Regulation`,
  `ImpactMapping`, `CompanyDocument`, `DocumentSyncJob`,
  `DocumentChangeEvent`, `Report`.
- **Evidence:** QA.md §5.2.
- **Gap:** QA.md §5.2/§5.3 — "not consistently enforced in all code paths,
  especially legacy Python pipeline logic and direct legacy collection
  access." `mapping_agent.py`, `drafting_agent.py` and `report_agent.py`
  query `db.companydocs` and `db.impactmappings` with incomplete scoping
  (`drafting_agent.py` filters `{regulation_id, reviewStatus}` only).
- **Required fix:** every Python Mongo query must carry `organizationId`;
  add a shared scoped-query helper in `acris/agents/shared.py`. Stage 11.
- **Dependencies:** Stage 1 (so the change is testable).
- **Verification method:** automated test seeds two orgs and asserts an agent
  run for Org A never reads an Org B document (Stage 12 TEST 6).
- **Acceptance criteria:** grep shows zero `db.<collection>.find*` calls in
  `acris/agents/` without an `organizationId` term.

### 4.5 Compound indexes — `[PARTIAL]`

- **Present (QA.md §5.4):** `Regulation{organizationId,source,title,version}`,
  `ComplianceJob{organizationId,status}` and `{organizationId,fileHash}`,
  `ImpactMapping{organizationId,regulation_id,doc_id}`,
  `Report{organizationId,generated_at}`,
  `CompanyDocumentVersion{documentId,isCurrent}`.
- **Missing (QA.md §5.4):** `DocumentChunk{documentVersionId,chunkIndex}`,
  `DocumentSyncJob{organizationId,status}`, any index/query convention on
  `DocumentChangeEvent`, and there is **no `AuditEvent` model at all**.
- **Also not verified:** whether the `ImpactMapping{organizationId,regulation_id,doc_id}`
  index is **unique** (the plan required uniqueness because it is the upsert
  key in `mapping_agent.py`), and whether
  `CompanyDocumentVersion{documentId,isCurrent}` is a **partial unique**
  index enforcing exactly one current version. QA.md states the indexes exist
  but not their uniqueness. **Not verified — requires repository inspection.**
- **Required fix:** Stage 2.
- **Verification method:** `db.<coll>.getIndexes()` in a seeded database;
  attempt to insert a duplicate/second-current row and expect rejection.
- **Acceptance criteria:** a second `isCurrent:true` version for the same
  `documentId` is rejected at the database level, not only in application
  code.

### 4.6 Default-organization migration script — `[NOT VERIFIED]`

- **Evidence:** not assessed in QA.md.
- **Required fix:** inspect repository to determine whether
  `scripts/migrate-default-org.js` exists and has been run against dev data.
- **Verification method:** count documents lacking `organizationId` in every
  collection; must be zero.
- **Acceptance criteria:** zero unscoped documents remain in any environment
  the team uses.

---

## 6. Phase 4B — Document Registry & Version Data Model

**This phase is the root cause of the two most serious product failures:
policy version lineage and stale-recommendation detection.**

### 4B.1 `CompanyDocument` model — `[PARTIAL]`

- **Current state:** the model file exists with `organizationId` and the
  registry shape.
- **Evidence:** QA.md §5.1, §5.5.
- **Current update:** Stage 4 policy ingestion now writes to
  `db.companydocuments`; the new path is not yet verified against a live
  MongoDB run and legacy readers remain in later pipeline stages.
- **Required fix:** Stage 2 + Stage 4.
- **Dependencies:** Stage 1.
- **Verification method:** upload a policy PDF; assert exactly one
  `CompanyDocument` and one `CompanyDocumentVersion` are created and that
  `db.companydocs` receives no new row.
- **Acceptance criteria:** no new writes to the legacy collection after
  cutover; legacy rows migrated, not deleted.

### 4B.2 `CompanyDocumentVersion` model — `[PARTIAL]`

- **Evidence:** QA.md §5.1, §5.4 (indexed `{documentId,isCurrent}`), §5.5.
- **Current update:** Stage 4 now creates content-hash-based versions and
  sets exactly one current version through the new ingestion path. The
  partial unique index and concurrent-writer behaviour still require live
  MongoDB verification.
- **Required fix:** Stage 2, Stage 4.
- **Verification method / Acceptance criteria:** see 4.5 and Stage 4 tasks.

### 4B.3 `DocumentChunk` model — `[PARTIAL]`

- **Evidence:** QA.md §5.1; §5.4 (missing `{documentVersionId,chunkIndex}`
  index); §11.3 (Chroma metadata does not carry the corresponding fields).
- **Current update:** Stage 4 now persists per-version chunks with
  organization/document/version metadata and embeds one vector per chunk.
  The one-to-one database/vector acceptance test still requires a live
  MongoDB and Chroma verification.
- **Required fix:** Stage 4.
- **Dependencies:** Stage 2.
- **Verification method:** after ingesting a 20-page policy, `DocumentChunk`
  count > 1 and every Chroma vector id matches a `DocumentChunk.embeddingId`.
- **Acceptance criteria:** 1:1 correspondence between persisted chunks and
  vectors for the current version.

### 4B.4 `DocumentSyncJob` / `DocumentChangeEvent` models — `[PARTIAL]`

- **Evidence:** QA.md §5.1 (exist), §5.4 (no indexes), §7.5 ("the models
  exist… but no actual sync logic is implemented").
- **Required fix:** indexes now (Stage 2); population in Stage 14.

### 4B.5 `ImpactMapping` extended with version/evidence fields — `[PARTIAL]` → effectively `[BROKEN]` as a guarantee

- **Current state:** the schema declares `regulationVersion`,
  `documentVersionId`, `embeddingVersion`, `implementationStatus` (including
  `stale`), `draft_source`, `policy_section`.
- **Evidence:** QA.md §5.6, §10.1, §10.2, §11.6, §17 Step E.
- **Gap — verbatim QA verdict (§5.6): NOT WORKING.** "no code path populates
  them in current mapping generation." `mapping_agent.py` writes only
  `organizationId`, `regulation_id`, `doc_id`, `relevance_score`,
  `affected_clauses`, `clause`, `clause_text`, `old_text`, `new_text`,
  `policy_section`, `reviewStatus`. There is **no `evidence` block in the
  schema at all** (QA.md §10.1) and no `sourceDocumentHash`, `generatedAt`,
  `model`, `promptVersion`, or `confidence` populated.
- **Why this matters:** a declared-but-unpopulated field is more dangerous
  than a missing field, because downstream code and reviewers may assume it
  is meaningful.
- **Required fix:** Stage 5 (persist lineage) + Stage 10 (evidence).
- **Dependencies:** Stage 2, Stage 4.
- **Verification method:** Stage 12 TEST 16 — every mapping produced by a
  pipeline run has non-null `regulationVersionId`, `policyDocumentId`,
  `policyVersionId`, `jobId`, `sourceEvidence`, `model`, `promptVersion`,
  `confidence`.
- **Acceptance criteria:** the API rejects/flags any mapping written without
  complete lineage; no mapping with null lineage is approvable.

### 4B.6 Migration `CompanyDoc` → `CompanyDocument`/`CompanyDocumentVersion` — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §5.1 lists `models/CompanyDoc.js` as still present and
  "still used in some code paths… evidence of incomplete migration."
- **Required fix:** Stage 2 migration script; keep the legacy model readable
  until Stage 4 cutover is verified, then retire it.
- **Verification method:** every legacy `companydocs` row maps to exactly one
  `CompanyDocument` + one `CompanyDocumentVersion(versionNumber:1,isCurrent:true,sourceType:"manual-upload")`,
  and every existing `ImpactMapping.doc_id` still resolves.
- **Acceptance criteria:** zero orphaned mappings after migration; migration
  is idempotent and re-runnable.

### 4B.7 `policy_ingest.py` writing the versioned shape — `[PARTIAL]`

- **Current update:** `policy_ingest.py` now computes a normalized-content
  hash, creates or reuses a `CompanyDocument`, creates immutable
  `CompanyDocumentVersion` records, persists `DocumentChunk` rows, and skips
  re-embedding identical content. The existing Python environment cannot run
  the integration test because `pymongo`/`bson` is unavailable, and queue
  execution remains a later Stage 7 concern.
- **Dependencies:** 4B.1, 4B.2, Stage 1.
- **Verification method:** Stage 12 TEST 7 (policy version lineage).
- **Acceptance criteria:** uploading the same policy name twice produces
  `versionNumber` 1 then 2, with the older version `isCurrent:false` and both
  retained.

---

## 7. Phase 5 — Authentication & RBAC

### Phase 5 execution update

The requested remediation Stage 5 (Recommendation lineage) is implemented
for the `ImpactMapping` schema, pipeline context, mapping/drafting/report
agents, migration handling, and amendment-card display. Automated schema,
agent, lint, and frontend build checks pass. Full MongoDB pipeline execution
and cross-organization runtime verification remain **PARTIAL —
implementation exists but integration/verification is incomplete.**

### 5.1 Password hashing (bcrypt) — `[VERIFIED]`

- **Evidence:** QA.md §13.2 — `bcrypt.hash(password, 12)` / `bcrypt.compare()`
  in `acris/backend/services/authService.js`. QA verdict: WORKING.

### 5.2 `POST /api/auth/login` against a real `User` — `[VERIFIED]`

- **Evidence:** QA.md §4.5 (WORKING, tested), §14.1
  (`tests/auth.login.test.js`).

### 5.3 JWT verification middleware carrying `organizationId` / `role` — `[VERIFIED]`

- **Evidence:** QA.md §13.1 — `middleware/auth.js` verifies the JWT and
  checks required claims; §4.9 — `requireOrgAccess` compares
  `resource[orgField]` to `req.user.organizationId`, which requires the claim
  to be present.

### 5.4 `requireRole` middleware — `[VERIFIED]`

- **Evidence:** QA.md §2 phase matrix Phase 5; §4.8 — amendments apply
  `requireRole("manager","admin")`.

### 5.5 `requireOrgAccess` middleware — `[VERIFIED]` (for org) / `[PARTIAL]` (as an authorization gate)

- **Evidence:** QA.md §4.8, §4.9, §13.5, §13.6 — protection against
  cross-organization mutation is real in the tested paths, and
  `tests/amendments.org-access.test.js` exists.
- **Gap — verbatim QA (§18.10):** "`requireOrgAccess` protects only by org,
  not by version or freshness." It is not, and must not be mistaken for, a
  stale-recommendation guard.
- **Required fix:** add an independent freshness gate in Stage 6 —
  do **not** overload `requireOrgAccess`.

### 5.6 `authMiddleware` applied to every business route — `[PARTIAL]`

- **Verified applied (QA.md §4.7):** `/regulations`, `/policies`, `/reports`,
  `/amendments`, `/dashboard`, `/jobs`.
- **Gap 1 — `[BROKEN]`:** QA.md §4.6 lists `static /uploads` and
  `static /reports` as public. Report PDFs and uploaded regulation/policy
  PDFs are therefore reachable without a token and without an org check,
  defeating the guarded `GET /api/reports/:id/download` path.
- **Gap 2 — `[BROKEN]`:** `POST /api/auth/bootstrap` is public
  (QA.md §4.5 "NOT WORKING for secure production"; §4.7 "bootstrap is public
  and insecure by design"; §18.6).
- **Gap 3 — `[NOT VERIFIED]`:** `POST /api/auth/register` — see contradiction
  C-11. QA.md states both "auth required, admin role" (§4.5) and "public"
  (§4.6).
- **Required fix:** Stage 11 — serve files only through authenticated,
  org-scoped, path-normalised handlers; make bootstrap a one-time,
  token-gated or CLI-only operation that self-disables once any user exists;
  resolve the register contradiction by inspection.
- **Dependencies:** none.
- **Verification method:** unauthenticated `curl` sweep of every route **and**
  every static path; expect 401/404 everywhere except `/api/health` and
  `/api/auth/login`.
- **Acceptance criteria:** zero unauthenticated paths return organization
  data or organization files.

### 5.7 JWT secret configuration — `[BROKEN]`

- **Evidence:** QA.md §13.3 quotes
  `jwtSecret: process.env.JWT_SECRET || "your_jwt_secret_here"`.
  QA verdict: "NOT WORKING by default."
- **Gap:** any deployment that forgets to set `JWT_SECRET` signs tokens with
  a value that is public in the source tree — trivially forgeable
  organization-scoped tokens.
- **Required fix:** Stage 11 — remove the fallback; fail fast outside
  development; rotate.
- **Verification method:** boot with the variable unset in production mode →
  non-zero exit; a token signed with the old default is rejected.
- **Acceptance criteria:** the literal default string does not exist in the
  repository.

### 5.8 Secret hygiene — `[BROKEN]`

- **Evidence:** QA.md §13.8 — `acris/.env` is present in the repo containing
  `MONGODB_URI` and `JWT_SECRET`; `config/index.js` contains a default JWT
  secret and an admin password fallback; `acris/README.md` contains example
  env values.
- **Note:** contradicts `PRD.md` §16's claim that `.env` exclusion is "done
  right" (C-12).
- **Required fix:** Stage 11 — remove from tracking, purge history if the
  values were ever real, rotate all affected credentials, add a secret
  scanner to the lint step.
- **Verification method:** `git ls-files | grep -E '(^|/)\.env$'` returns
  nothing; scanner reports clean.
- **Acceptance criteria:** no credential material is retrievable from the
  repository at HEAD, and rotation is documented.

### 5.9 Admin credential fallback removed — `[BROKEN]`

- **Evidence:** QA.md §13.8 — "default JWT secret and admin password
  fallback" in `config/index.js`.
- **Required fix:** delete the fallback; provision the first admin via the
  hardened bootstrap path only.
- **Acceptance criteria:** no username/password constant exists in source.

### 5.10 Frontend login uses email — `[VERIFIED]`

- **Evidence:** QA.md §3.4 — `/api/auth/login` `POST {email,password}`,
  status WORKING.

---

## 8. Phase 6 — Asynchronous Upload Contract

### 6.1 Regulation upload validation (type + size) — `[VERIFIED]`

- **Evidence:** QA.md §13.4 — file type check and a 20 MB limit exist in
  `routes/regulations.js`; §4.5 confirms "PDF file filter + title/source
  required".

### 6.2 Policy upload validation — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §13.4 — "`policies.js` upload does not have fileFilter
  or size limits"; §4.5 lists input validation for `/api/policies/upload` as
  "file existence only".
- **Gap:** an unbounded, any-MIME upload path exists next to a correctly
  guarded one. Content is subsequently fed to a PDF parser and to the LLM.
- **Required fix:** Stage 11 — mirror the regulation Multer configuration,
  add magic-byte sniffing (not extension trust), enforce a size cap, and
  normalise stored filenames.
- **Dependencies:** none.
- **Verification method:** upload a `.exe` renamed to `.pdf` → 415/400;
  upload a 100 MB file → 413.
- **Acceptance criteria:** both upload endpoints share one validated upload
  middleware.

### 6.3 `202 {jobId, regulationId}` response — `[VERIFIED]`

- **Evidence:** QA.md §3.4 and §3.6 —
  `202 { jobId, regulation_id, status }` returned by
  `routes/regulations.js`.

### 6.4 `GET /api/jobs/:id` — `[VERIFIED]` (endpoint) / `[PARTIAL]` (usefulness)

- **Evidence:** QA.md §4.5 (WORKING, org-filtered via
  `ComplianceJob.findOne({_id, organizationId})`), §3.4.
- **Gap:** no consumer. QA.md §3.7 — the frontend receives `jobId` but never
  navigates to, polls, or renders job state; job `error` is never rendered.
- **Required fix:** Stage 8.

### 6.5 Idempotent job creation — `[PARTIAL]`

- **Evidence:** QA.md §13.4 — "duplicate uploads: createJob idempotency
  exists in `services/jobService.js`"; §5.4 — `ComplianceJob` is indexed on
  `{organizationId, fileHash}`.
- **Gap:** no test proves the behaviour (QA.md §2 phase matrix Phase 6:
  "Test Exists?: No"); the index uniqueness is not stated; behaviour on a
  _completed_ prior job with the same hash is unspecified.
- **Required fix:** Stage 7 — define idempotency precisely (same
  `organizationId + source + title + fileHash` with a non-terminal job →
  return the existing `jobId`, HTTP 200/202, never a second pipeline).
- **Verification method:** Stage 12 TEST 10 variant — double-submit returns
  the same `jobId` and creates exactly one job row.
- **Acceptance criteria:** duplicate submission never produces two pipelines.

### 6.6 Upload route no longer executes agents inline — `[PARTIAL]`

- **Evidence:** QA.md §17 Step A — the route "calls `runAgent("monitor_agent.py", ...)`
  for the fast DB insert" **before** returning; §8.1 confirms `monitor_agent`
  runs synchronously for a few DB writes and then `runPipeline()` is invoked
  directly.
- **Gap:** an external process spawn still sits in the request path, so
  upload latency depends on Python interpreter start-up and Mongo
  availability; and `runPipeline()` runs inside the API process.
- **Required fix:** Stage 7 — move version assignment into the job payload /
  worker or into a pure Node service call; the HTTP handler must only
  validate, persist, enqueue, respond.
- **Verification method:** the upload handler contains no `spawn` and no
  pipeline invocation; p95 upload response < 2 s under a cold Python
  environment.
- **Acceptance criteria:** killing the Python runtime does not affect the
  upload endpoint's success response (the job simply fails later, visibly).

---

## 9. Phase 6B — Document Connector Layer

### 6B.1 `DocumentConnector` interface — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §7.3 — "No connector classes or registry exist in the
  repository."

### 6B.2 `LocalUploadConnector` adapter — `[NOT IMPLEMENTED]`

- **Evidence:** as above; QA.md §7.1 — policy documents arrive only via
  `routes/policies.js` → `policy_ingest.py`.

### 6B.3 Connector registry keyed by `sourceType` — `[NOT IMPLEMENTED]`

### 6B.4 `ConnectorConfig` model / credential scope — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §5.1 model list contains no `ConnectorConfig`.

### 6B.5 Interface-conformance test suite — `[NOT IMPLEMENTED]`

**Shared block for 6B.1–6B.5**

- **Gap:** `PRD.md` FR-24 requires the abstraction to exist before any
  provider-specific code, precisely so a future SharePoint adapter is not a
  rewrite. Today the manual-upload path is hardwired into the route and the
  Python ingest script.
- **Required fix:** Stage 14 — build the interface plus exactly one adapter
  (`LocalUploadConnector`) wrapping the existing upload flow. **Do not
  implement SharePoint/Drive/S3 providers** — QA.md §7.4 confirms none are
  required or present, and `ARCHITECTURE.md` §39 defers them.
- **Dependencies:** Stage 2 (the registry writes `CompanyDocument`/
  `CompanyDocumentVersion`).
- **Verification method:** the conformance suite runs green against
  `LocalUploadConnector`; `publishVersion()` returns an explicit
  "not supported" result rather than silently succeeding.
- **Acceptance criteria:** the policy ingestion path calls the connector
  registry, not a provider directly; adding a second adapter requires no
  change to ingestion business logic.

---

## 10. Phase 7 — Queue & Worker System

### 7.1 Queue library installed and used — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §8.2 — "no `bullmq`, `ioredis`, `bee-queue`, or
  `agenda` dependency exists in `acris/backend/package.json`."

### 7.2 Redis connected to a queue — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §8.3 — "There is a Redis service defined in
  `docker-compose.yml`, but there is no actual connection or job queue code
  using it."

### 7.3 Separate worker process consuming jobs — `[BROKEN]`

- **Evidence:** QA.md §8.4 quotes the compose worker command as a `print`
  statement. QA verdict: "This is not a real worker process."
- **Why `[BROKEN]` and not `[NOT IMPLEMENTED]`:** the service exists and
  reports "ready", which is a false operational signal.

### 7.4 Per-stage consumers driving the six agents — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §8.1 — `pipelineOrchestrator.js` is "plain async
  logic" invoked directly in the API process.

### 7.5 Stage failure marks the job failed — `[PARTIAL]`

- **Evidence:** QA.md §8.8 — the orchestrator catches errors and marks the
  job failed.
- **Gap:** no retry policy, no stage-level retry queue, no stale recovery
  (QA.md §8.8, §8.9, §8.11); a crashed process leaves the job stuck
  (QA.md §8.10 "YES, possible in current design").

### 7.6 Bounded retry with backoff — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §8.9 — "No queue retry/backoff logic is visible."

### 7.7 Dead-letter / permanent-failure handling — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §18.11 — "no dead-letter queue, no retry backlog, and
  no worker heartbeat."

### 7.8 Stale-job recovery — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §8.11.

### 7.9 Concurrent independent job processing — `[BROKEN]`

- **Evidence:** QA.md §8.5 "NOT WORKING"; §8.6 "YES, in effect" (one long PDF
  blocks another).

**Shared block for 7.1–7.9**

- **Required fix:** Stage 7 in full.
- **Dependencies:** Stage 1 (Redis reachable, Python importable).
- **Verification method:** Stage 12 TESTs 10–13; plus a manual two-upload
  concurrency check.
- **Acceptance criteria:** stopping the worker container leaves jobs in
  `QUEUED`; restarting it drains them; the API never executes a pipeline
  stage.

---

## 11. Phase 7B — Document Synchronization Workflow

### 7B.1 Sync consumer / change detection — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §7.5 — no polling, webhook, scheduled sync, file-hash
  comparison, version detection or change-event generation exists.

### 7B.2 Metadata-first comparison before re-download — `[NOT IMPLEMENTED]`

### 7B.3 `DocumentChangeEvent` recording — `[NOT IMPLEMENTED]`

### 7B.4 Scheduled trigger — `[NOT IMPLEMENTED]`

**Shared block**

- **Gap:** with no external connector in scope (QA.md §7.4), full external
  synchronisation is out of Phase 11 scope. However **change detection itself
  is in scope**, because Stage 6 stale detection needs a reliable
  "current version changed" signal.
- **Required fix:** Stage 14 delivers a minimal, connector-shaped change
  pipeline driven by re-upload of the same logical document
  (`contentHash` comparison → new `CompanyDocumentVersion` →
  `DocumentChangeEvent`). External polling stays post-Phase-11.
- **Dependencies:** Stage 2, Stage 4, Stage 14.1.
- **Verification method:** re-upload an unchanged policy → zero new versions,
  zero re-embeds; re-upload a changed policy → exactly one new version, one
  change event, one re-embed set.
- **Acceptance criteria:** version creation is driven by content hash, never
  by upload count.

---

## 12. Phase 8 — PDF Parser Hardening

### 8.1 PyMuPDF extraction — `[VERIFIED]` (functionally)

- **Evidence:** QA.md §9.5 — `parser_agent.py` does PDF extraction with
  PyMuPDF; QA.md §18.1 lists the agent pipeline as real and working.

### 8.2 Hardening for large / malformed / scanned PDFs — `[NOT VERIFIED]`

- **Evidence:** QA.md does not test large, encrypted, image-only or
  malformed PDFs.
- **Gap:** unknown behaviour for a scanned (no text layer) circular — a
  realistic RBI/SEBI scenario. Silent empty extraction would cascade into a
  diff that reports every clause as `removed`.
- **Required fix:** Stage 3 — treat empty/near-empty extraction as an
  explicit stage failure with a typed error, not as valid empty text.
- **Dependencies:** Stage 1, Stage 7 (so failure is visible in job state).
- **Verification method:** feed an image-only PDF; job reaches `FAILED` with
  `stage="EXTRACTING"` and a human-readable reason.
- **Acceptance criteria:** no pipeline run ever proceeds past extraction with
  zero extracted characters.

### 8.3 stdout/stderr discipline for the Node↔Python contract — `[NOT VERIFIED]`

- **Evidence:** `ARCHITECTURE.md` §2.6 flags `JSON.parse(stdout)` as fragile;
  QA.md does not confirm whether it was fixed.
- **Required fix:** inspect repository to determine the current
  `utils/runAgent.js` parsing strategy; enforce "final JSON on stdout only,
  everything else on stderr".
- **Verification method:** inject a stray `print()` into an agent; the stage
  must still succeed.
- **Acceptance criteria:** the contract tolerates arbitrary non-JSON stderr
  output and stray stdout lines are impossible by construction (e.g. a single
  sentinel-delimited payload).

---

## 13. Phase 9 — Diff Engine Hardening

### 9.1 Previous-version resolution — `[PARTIAL]`

- **Current update:** Stage 3 now prefers the persisted `previousVersionId`,
  verifies organization and `regulationKey`, and retains a compatibility
  fallback for legacy records without that field. Live MongoDB verification
  remains required.

### 9.2 Sequential regulation version assignment — `[PARTIAL]`

- **Current update:** `monitor_agent.py` now persists a normalized
  `regulationKey` and `previousVersionId` while assigning the next version.
  The existing legacy-title fallback remains for old records and requires
  migration/runtime verification.

### 9.3 Clause segmentation and matching — `[VERIFIED]` (mechanism) / `[PARTIAL]` (quality)

- **Evidence:** QA.md §6.4 — `shared.py` provides `split_clauses()` and
  `best_match()`; `best_match` uses `SequenceMatcher` over normalised text
  with a **hardcoded 0.45 threshold**.
- **Gap:** the threshold is a magic number with no regression test; QA.md
  §6.6 confirms no test covers a single-sentence delta.
- **Required fix:** Stage 3 — make the threshold configurable, add fixtures.

### 9.4 Change types `added` / `modified` / `removed` — `[PARTIAL]`

- **Current update:** the three change types remain supported, but Stage 3
  now forces the deterministic detector to own `changeType`; the LLM may only
  provide a summary. Regression tests cover the new row contract.

### 9.5 `unchanged` and `renumbered` change types — `[PARTIAL]`

- **Evidence:** QA.md §6.5 — "no explicit `unchanged` type is emitted";
  "`renumbered`: not explicitly implemented".
- **Gap:** without `unchanged`, the system cannot prove it examined a clause
  and found no change — which is exactly what an auditor asks. Without
  `renumbered`, a pure renumbering shows up as one `removed` + one `added`,
  inflating apparent regulatory change.
- **Current update:** Stage 3 emits explicit `unchanged` and `renumbered`
  rows, excludes unchanged rows from `total_changes`, and exposes counts to
  the API/UI. Live V1/V2 fixture verification is still required.
- **Dependencies:** Stage 1.
- **Verification method:** Stage 12 TEST 2 (identical V1→V2 yields zero
  add/modify/remove and a full set of `unchanged`), plus a renumbering
  fixture.
- **Acceptance criteria:** identical documents produce zero non-`unchanged`
  changes; a clause whose number changed but text did not is reported
  `renumbered`, not `added`+`removed`.

### 9.6 Diff rows carry version + evidence + confidence — `[PARTIAL]`

- **Evidence:** QA.md §6.7 — preserved: clause, old_text, new_text,
  change_type; **missing: source/version, confidence**. QA.md §17 Step C —
  no `old_version`/`new_version` pair persisted, no evidence metadata.
- **Current update:** new diff rows record `clauseId`, clause number, version
  pair, regulation ids, match ratio, threshold, deterministic/LLM-assisted
  detection method, and both legacy and normalized text field names.
  Confidence/evidence provenance remains a later Stage 10 concern.
- **Verification method:** Stage 12 TESTs 1–4 assert the fields.
- **Acceptance criteria:** a diff row is self-describing without joining back
  to the regulation record.

### 9.7 LLM-assisted diff summarisation with fallback — `[PARTIAL]`

- **Evidence:** QA.md §9.4 (diff agent uses the LLM), §10.6 —
  `parse_json_response()` catches parse errors and returns `{}`; §10.7 — no
  retry/correction loop.
- **Required fix:** Stage 9.

### 9.8 Empty extraction precondition — `[PARTIAL]`

- **Current update:** `parser_agent.py` now fails with `EMPTY_EXTRACTION`
  when extracted text is below `MIN_EXTRACTED_CHARS`, and `diff_agent.py`
  rejects empty current or previous text with `PRECONDITION_FAILED`.
  Runtime worker-state propagation remains a later Stage 7/8 concern.

---

## 14. Phase 10 — Vector Search & Mapping

### 10.1 Chroma persistence and retrieval — `[VERIFIED]`

- **Evidence:** QA.md §11.1/§11.2 — persistent Chroma collection
  `company_policies`; `policy_ingest.py` → `embed_document`;
  `mapping_agent.py` → `query_similar`.

### 10.2 Real embedding provider — `[PARTIAL]`

- **Evidence:** QA.md §9.7 — `OllamaEmbeddingFunction(model_name=model, ...)`
  where `model` is `OLLAMA_MODEL` defaulting to `llama3`; a legacy
  `HashingEmbeddingFunction` remains in the same file (QA.md §9.8: "not a
  real semantic embedding model… not production-grade").
- **Gap:** (a) `llama3` is a chat model being used for embeddings — a
  dedicated embedding model should be configured separately; (b) two
  incompatible vector spaces can be written into one collection depending on
  `EMBEDDING_PROVIDER`, with no marker distinguishing them.
- **Required fix:** Stage 4 — separate `OLLAMA_EMBEDDING_MODEL` config;
  stamp `embeddingModel` + `embeddingVersion` on every vector; refuse to
  query across mismatched embedding versions.
- **Dependencies:** Stage 1, Stage 2.
- **Verification method:** switch providers and confirm old vectors become
  invisible to queries rather than silently mixed.
- **Acceptance criteria:** a single Chroma collection never returns vectors
  from two embedding versions in one result set.

### 10.3 Vector metadata isolation — `[BROKEN]`

- **Evidence:** QA.md §11.3 — actual metadata is only `name`, `doc_id`,
  `type`, `owner_team`; **no** `organizationId`, `documentVersionId`,
  `documentType`, `ownerTeam`(structured), `embeddingVersion`.
  QA.md §11.4 verdict: **"NOT PROTECTED"** — Org A vectors can be returned
  for Org B because the vector query applies no metadata filter.
- **Gap:** the strongest data-isolation guarantee in the PRD
  (`Documents from Organization A must never be retrievable by Organization B`)
  is violated at the retrieval layer.
- **Required fix:** Stage 4 — write full isolation metadata on every vector
  and apply a mandatory `where` filter
  `{organizationId, documentVersionId ∈ current, embeddingVersion}` on every
  query. Backfill or re-index existing vectors; unfiltered query helpers must
  be removed, not merely unused.
- **Dependencies:** Stage 2 (version ids must exist first).
- **Verification method:** Stage 12 TEST 6 — seed Org A and Org B with
  deliberately similar policy text; query as Org B; assert zero Org A chunk
  ids in the result and in the resulting mappings.
- **Acceptance criteria:** it is impossible to call the retrieval helper
  without an `organizationId` filter (enforced by function signature, not
  convention).

### 10.4 Stale-version vectors excluded — `[BROKEN]`

- **Evidence:** QA.md §11.5 — "YES, possible under current code"; single
  collection, no version namespace or filter.
- **Required fix:** as 10.3, plus deactivating superseded versions' vectors
  on new-version ingestion.
- **Acceptance criteria:** after Policy V2 ingestion, retrieval returns only
  V2 chunks unless a historical query is explicitly requested.

### 10.5 Single `relevance_score > 0.75` threshold — `[PARTIAL]`

- **Evidence:** `ARCHITECTURE.md` §10/§41.17 flag it; QA.md §11.1 confirms
  distance-based ranking is the sole mechanism.
- **Required fix:** keep the threshold for Phase 11 but make it configurable,
  record the raw score as `confidence` input, and record the retrieved chunk
  ids as evidence (Stage 10). Hybrid retrieval remains **post-Phase-11**.

---

## 15. Phase 10B — Embedding Versioning & Hybrid Retrieval Groundwork

### 10B.1 `embeddingVersion` end-to-end — `[PARTIAL]`

- **Evidence:** QA.md §11.6 — the field exists on `ImpactMapping` and
  `DocumentChunk`, "but there is no actual versioned Chroma cutover or read
  filter in the retrieval flow."

### 10B.2 Protection against mixing embedding generations — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §11.7.

### 10B.3 Hybrid retrieval — `[NOT IMPLEMENTED]` — **deferred beyond Phase 11**

- **Evidence:** QA.md §11.1 (similarity only).
- **Decision:** explicitly out of Phase 11 scope. `ARCHITECTURE.md` §16 marks
  unimplemented retrieval stages as `REQUIRED`/`FUTURE`; this document marks
  hybrid retrieval **FUTURE** to avoid inflating Phase 11.

---

## 16. Phase 11 — AI Drafting Hardening

### 11.1 Prompt registry — `[PARTIAL]`

- **Evidence:** QA.md §10.3 references `acris/agents/prompts_registry.py` as
  an existing file.
- **Gap:** it holds prompts but no versioning surfaced onto outputs
  (`promptVersion` is never persisted — QA.md §5.6) and no
  data/instruction boundaries (QA.md §10.3).
- **Required fix:** Stage 9 — extend the **existing** registry. Do not create
  `agents/prompts/` as a parallel structure (contradiction C-13).

### 11.2 `draft_source` (`llm` | `fallback`) — `[PARTIAL]`

- **Evidence:** QA.md §10.8 — the enum exists on `ImpactMapping` and
  `drafting_agent.py` sets it. "This is real but incomplete because the UI
  and report generation do not consistently show or validate this flag."
- **Required fix:** surface it in the reviewer UI (Stage 10) and in the
  report (Stage 10.4).
- **Verification method:** force an LLM outage; the amendment renders a
  visible "deterministic fallback — review with extra care" indicator and the
  report reflects it.
- **Acceptance criteria:** a fallback-sourced draft is never visually
  indistinguishable from an LLM-sourced draft.

### 11.3 Output sanity checks — `[PARTIAL]`

- **Evidence:** QA.md §10.4 — `drafting_agent.py` does "basic validation for
  a leaked prompt or empty response, but it is not a real injection defense
  system."

### 11.4 Structured output schema validation — `[PARTIAL]`

- **Evidence:** QA.md §10.6 — `parse_json_response()` returns `{}` on parse
  failure; "weak validation and not real schema validation."
  QA.md §10.7 — fallback exists; **no structured retry/correction loop**.
- **Required fix:** Stage 9.
- **Verification method:** Stage 12 TEST 14.
- **Acceptance criteria:** a malformed LLM response never results in a
  persisted mapping that looks valid; it produces either a corrected retry, a
  clearly-flagged fallback, or a stage failure.

### 11.5 Confidence populated — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §18.7 — "No confidence/calibration scoring is enforced
  in the core output path"; QA.md §5.6 confirms the mapping write omits it.

---

## 17. Phase 11B — AI Evidence, Hallucination & Prompt-Injection Defense

### 11B.1 Evidence stored on every mapping — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §10.1 — "The model schema has some version fields but
  **no evidence block**"; §10.2 — regulatory source / regulation version /
  clause / company document / document version / section / chunk are "not in
  the code as currently used"; §12.4 — "No real evidence linkage is present
  in the code path."

### 11B.2 Grounding instructions in prompts — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §10.3.

### 11B.3 Data-vs-instruction context boundaries — `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §10.3 — "No clear prompt boundary or instruction like
  'these blocks are data, not instructions' is visible"; §10.4 — "no
  sanitization of retrieved content before sending it to the LLM, no marker
  blocks."

### 11B.4 Injection resistance — `[BROKEN]` as a control, `[PARTIAL]` as code

- **Evidence:** QA.md §10.5 — "by code inspection the system is not robustly
  protected… a malicious retrieved chunk could still influence the model."
- **Note:** QA marks the runtime behaviour `UNKNOWN`. This document therefore
  states: **Not verified at runtime — but code inspection shows no control
  exists.** Treated as a required Phase 11 fix.

### 11B.5 Suspicious-content flagging and logging — `[NOT IMPLEMENTED]`

**Shared block for 11B.1–11B.5**

- **Required fix:** Stages 9 and 10.
- **Dependencies:** Stage 1, Stage 2, Stage 4, Stage 5.
- **Verification method:** Stage 12 TESTs 14, 15, 16.
- **Acceptance criteria:** (a) every persisted recommendation has non-empty
  `sourceEvidence` referencing at least one regulation clause id and at least
  one `DocumentChunk` id; (b) a document containing
  `IGNORE PREVIOUS INSTRUCTIONS…` produces a normal, grounded recommendation
  and a logged `suspicious_content_detected` event; (c) the injected string is
  never echoed into the amendment text.

---

## 18. Phase 11 Completion Gate (pulled-forward dependencies)

These are not "Phase 12+ nice-to-haves". Without them, nothing above can be
honestly marked complete.

| Gate | Original phase | Capability                                                        | Status                         | QA evidence               |
| ---- | -------------- | ----------------------------------------------------------------- | ------------------------------ | ------------------------- |
| G-1  | 15             | Python test suite executable                                      | `[BROKEN]`                     | §14.5                     |
| G-2  | 13             | Job-details UI polling real backend state                         | `[NOT IMPLEMENTED]`            | §3.7, §2 matrix Ph.13     |
| G-3  | 14B            | Stale-recommendation detection + approval gate                    | `[NOT IMPLEMENTED]`            | §7.6, §17 F/G, §18.3      |
| G-4  | 16             | JWT secret, static file exposure, bootstrap, rate limits, headers | `[BROKEN]`/`[NOT IMPLEMENTED]` | §13.3, §4.6, §13.7, §18.6 |
| G-5  | 18B            | `AuditEvent` model + write path                                   | `[NOT IMPLEMENTED]`            | §5.4, §4.8                |
| G-6  | 15             | Business-workflow test suite (18 tests)                           | `[PARTIAL]`                    | §14.2, §14.3, §14.4       |
| G-7  | 18             | Structured logs + correlation IDs + deep health                   | `[NOT IMPLEMENTED]`            | §2 matrix 16-20           |
| G-8  | 14             | Rejection reason capture                                          | `[NOT IMPLEMENTED]`            | §4.8                      |

### G-2 detail — frontend job tracking `[NOT IMPLEMENTED]`

- **Current state:** QA.md §3.7 checklist — receives `jobId`: **Yes**;
  navigates to job details: **No**; polls job status: **No**; shows each
  agent stage: **No** (only static timeline from `Regulation.status`); shows
  failures: **No**; shows retry: **No**; stops polling when complete: **No**.
- **Additional defect:** QA.md §3.6/§3.8 — `UploadPanel.jsx` still displays
  "Processing can take up to a couple of minutes… keep this page open", which
  contradicts the `202` contract that already ships. QA calls this "stale".
- **Gap:** job completion is inferred from `Regulation.status`
  (`AgentTimeline.jsx` is "a hardcoded status inference component").
- **Required fix:** Stage 8.
- **Verification method:** Stage 12 TEST 18.
- **Acceptance criteria:** the UI never infers job state from regulation
  status; a failed job shows stage, message and a retry affordance.

### G-3 detail — stale recommendation `[NOT IMPLEMENTED]`

- **Current state:** `implementationStatus` enum includes `stale`; nothing
  sets it; `routes/amendments.js` updates only `reviewStatus`.
- **Evidence:** QA.md §7.6, §17 Step F, §17 Step G, §18.3.
- **Gap — verbatim QA (§17 Final verdict):** "ACRIS cannot correctly
  determine the full V1-to-V2 plus policy-change state in a production-safe
  manner, and it cannot prevent publishing an outdated recommendation over a
  newer company policy."
- **Required fix:** Stage 5 (lineage) then Stage 6 (detection + gate).
- **Verification method:** Stage 12 TESTs 8 and 9.
- **Acceptance criteria:** approving a recommendation whose
  `policyVersionId` ≠ the document's `currentVersionId` returns `409` and
  transitions the recommendation to `stale`; no state change to `approved`
  occurs.

### G-5 detail — audit events `[NOT IMPLEMENTED]`

- **Evidence:** QA.md §5.4 — "there is no `AuditEvent` model at all, despite
  the phase plan requiring it"; §4.8 — approve/reject has "no audit log or
  event trail"; §18.6 — "no audit log for document and recommendation
  approvals".
- **Required fix:** Stage 13.
- **Acceptance criteria:** a complete amendment lifecycle is reconstructable
  from `AuditEvent` alone.

---

## 19. CURRENT VERIFIED STATE — "what is actually working right now?"

Every item below is backed by explicit QA.md evidence of a working, wired
capability.

1. **Express API bootstrap and route registration** — `acris/backend/app.js`
   (QA.md §18.1).
2. **JWT authentication** — token issuance and verification with required
   claims (QA.md §13.1, §4.5).
3. **Password security** — bcrypt cost 12, compare on login (QA.md §13.2).
4. **Route-level authentication on all six business route groups** —
   regulations, policies, reports, amendments, dashboard, jobs
   (QA.md §4.7).
5. **Role-based authorization on amendment mutation** —
   `requireRole("manager","admin")` (QA.md §4.8).
6. **Organization-scoped resource access in the API layer** —
   `requireOrgAccess` plus `organizationId` filters on regulations, reports,
   jobs, dashboard (QA.md §4.9, §5.3, §13.5, §13.6).
7. **React Router application shell with auth guard and error boundary**
   (QA.md §3.1, §3.2).
8. **Frontend↔backend integration for the current dashboard workflow** — 13
   endpoints wired with bearer tokens (QA.md §3.3, §3.4).
9. **Asynchronous _contract_** — `POST /api/regulations/upload` returns
   `202 {jobId, regulation_id, status}` (QA.md §3.4, §3.6).
   _(The contract only — see BROKEN state for the execution model.)_
10. **`GET /api/jobs/:id`** org-scoped job read (QA.md §4.5).
11. **Regulation upload validation** — PDF filter + 20 MB cap
    (QA.md §13.4).
12. **Job idempotency key** — `fileHash` based, indexed
    (QA.md §13.4, §5.4).
13. **Sequential regulation versioning** — `monitor_agent.py` increments
    `version` per `{organizationId, source, title}` (QA.md §17 Step A).
14. **Correct previous-version resolution for diffing** — exact query
    verified (QA.md §6.2, §6.3).
15. **Clause segmentation and similarity matching** — `split_clauses()`,
    `best_match()` with `SequenceMatcher` (QA.md §6.4).
16. **Clause-level change detection for `added` / `modified` / `removed`**
    (QA.md §6.5).
17. **Real Ollama LLM invocation** — not mocked (QA.md §9.2, §9.3).
18. **Real Chroma vector store usage** — persistent collection, embed and
    query paths wired (QA.md §11.1, §11.2).
19. **Ollama-backed embeddings as the default provider** (QA.md §9.7).
20. **Six-agent Python pipeline executes end to end** (QA.md §18.1).
21. **PDF report generation from real regulation and mapping data**
    (QA.md §12.1) with org-scoped download (QA.md §13.5).
22. **`draft_source` recorded** on mappings (QA.md §10.8).
23. **Centralised error handler mounted** (QA.md §4.4).
24. **Four backend tests pass; frontend production build passes**
    (QA.md §14.5).

---

## 20. CURRENT PARTIAL STATE

| Area                           | What exists                              | What is missing                                                                    | QA ref           |
| ------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------- | ---------------- |
| Service/repository layering    | dashboard only                           | regulations, reports, amendments, policies still hold logic in routes              | §4.1–§4.3        |
| Error handling                 | central handler                          | inconsistent use, no typed errors, no uniform status mapping                       | §4.4             |
| `organizationId` coverage      | on 8 models, enforced in most routes     | not enforced in Python agent queries                                               | §5.2, §5.3       |
| Indexes                        | 6 compound indexes                       | `DocumentChunk`, `DocumentSyncJob`, `DocumentChangeEvent`; uniqueness unverified   | §5.4             |
| Document registry              | 5 models exist                           | zero runtime writes; legacy `companydocs` still authoritative                      | §5.5, §17 Step D |
| `ImpactMapping` lineage fields | declared in schema                       | never populated                                                                    | §5.6             |
| Async processing               | 202 + job record + background function   | no queue, no worker, no retry, no isolation                                        | §8.1–§8.11       |
| Job failure handling           | outer catch marks job failed             | no retries, no stale-job sweep, no dead letter                                     | §8.8–§8.11       |
| Embeddings                     | Ollama provider default                  | chat model used for embeddings; hashing path still present; unversioned            | §9.7, §9.8       |
| LLM output handling            | fallback on exception; JSON try/except   | no schema validation, no retry-with-correction                                     | §10.6, §10.7     |
| Injection defense              | leaked-prompt / empty-response check     | no sanitisation, no boundaries, no logging                                         | §10.4            |
| `draft_source`                 | persisted                                | not surfaced in UI or report                                                       | §10.8            |
| `embeddingVersion`             | field on two models                      | no cutover, no read filter                                                         | §11.6            |
| Reports                        | generated from real data                 | no regulation version, policy version, evidence chain, confidence, reviewer status | §12.2, §12.3     |
| Upload validation              | regulations hardened                     | policies unvalidated                                                               | §13.4            |
| Testing                        | 4 Node tests pass                        | no coverage of pipeline, versioning, staleness, queue, injection, reports, UI      | §14.2–§14.4      |
| Frontend surface               | dashboard workflow works                 | no routed pages for regulations/policies/jobs/documents/settings/admin             | §3.2             |
| TanStack Query usage           | queries, mutations, invalidation correct | no deliberate `retry`/`staleTime`/`refetchInterval` strategy                       | §3.5             |
| Diff quality                   | add/modify/remove                        | no `unchanged`, no `renumbered`, no version/confidence on rows                     | §6.5, §6.7       |

---

## 21. CURRENT BROKEN STATE

Ordered by severity.

1. **Python test suite cannot be collected** —
   `ModuleNotFoundError: No module named 'langchain_community'` (QA.md §14.5).
   Blocks verification of every AI-side acceptance criterion.
2. **Cross-organization vector retrieval is unprotected** — Chroma queries
   apply no `organizationId` filter and vectors carry no org metadata
   (QA.md §11.3, §11.4). Direct violation of the product's hardest data rule.
3. **Recommendations cannot be tied to a policy version** — QA verdict
   "NOT WORKING" (QA.md §5.6, §17 Step E). Makes evidence, staleness and
   audit impossible.
4. **No stale-recommendation detection or publish gate** — an outdated
   recommendation can be approved against a newer policy (QA.md §7.6,
   §17 Step G, §18.3).
5. **Weak default JWT secret in source** — `"your_jwt_secret_here"`
   (QA.md §13.3). Enables token forgery in any misconfigured deployment.
6. **Secrets present in the repository** — `acris/.env` with `MONGODB_URI`
   and `JWT_SECRET`; admin password fallback in config (QA.md §13.8).
7. **Unauthenticated static exposure of `/uploads` and `/reports`**
   (QA.md §4.6). Bypasses the org-scoped download guard.
8. **Public `POST /api/auth/bootstrap`** (QA.md §4.5, §4.7, §18.6).
9. **Worker container advertises readiness but consumes nothing** — literal
   `print` placeholder (QA.md §8.4).
10. **Long pipelines block the API process; two PDFs cannot be processed
    independently** (QA.md §8.5, §8.6).
11. **Jobs can become permanently stuck** on process crash (QA.md §8.10,
    §8.11).
12. **Frontend contradicts the shipped async contract** — "keep this page
    open" copy (QA.md §3.6, §3.8) and job state inferred from
    `Regulation.status` (QA.md §3.7).
13. **Backend lint is a no-op `echo`** producing a false green
    (QA.md §14.5).
14. **Old-version policy vectors can be retrieved after an update**
    (QA.md §11.5).

---

## 22. CURRENT MISSING STATE (`[NOT IMPLEMENTED]`)

- Redis/BullMQ queue; any queue client dependency (QA.md §8.2, §8.3)
- Separate worker process consuming a queue (QA.md §8.4)
- Retry, backoff, dead-letter, stale-job recovery, worker heartbeat
  (QA.md §8.9, §8.11, §18.11)
- Job cancellation
- `AuditEvent` model, service, API (QA.md §5.4, §18.6)
- Rejection reason capture (QA.md §4.8)
- Stale detection and re-analysis workflow (QA.md §7.6)
- Proposed-version / publish workflow (QA.md §4.8)
- `DocumentConnector` interface, registry, adapters, `ConnectorConfig`
  (QA.md §7.3, §7.4)
- External document synchronization, change detection, change events
  (QA.md §7.5)
- Evidence block on `ImpactMapping`; evidence in reports and UI
  (QA.md §10.1, §10.2, §12.4)
- Prompt data/instruction boundaries and content sanitisation
  (QA.md §10.3, §10.4)
- LLM output schema validation with retry/correction (QA.md §10.6, §10.7)
- Confidence scoring in the core output path (QA.md §18.7)
- Chroma isolation metadata and version-filtered retrieval
  (QA.md §11.3, §11.7)
- `unchanged` / `renumbered` diff types; version + confidence on diff rows
  (QA.md §6.5, §6.7)
- Job details page, job polling hook, retry affordance, stale banner
  (QA.md §3.7, §18.9)
- Routed pages: regulations, policies, jobs, documents, document versions,
  settings, admin (QA.md §3.2)
- Documents API layer (QA.md §4.7)
- Policy upload file-type/size validation (QA.md §13.4)
- Rate limiting (QA.md §13.7); security headers; strict CORS (QA.md §18.6)
- Structured logging, correlation IDs, deep health checks, metrics
  (QA.md §2 matrix 16-20)
- CI/CD (QA.md §2 matrix 16-20)
- E2E test flow and 13 of the 18 required business tests
  (QA.md §14.3, §14.4)
- Pagination/filtering on list endpoints
- Notifications, autonomous regulator monitoring, deadline tracking
  (product-`FUTURE`, unchanged)

---

## 23. CRITICAL BLOCKERS

| #   | Blocker                                                                     | Blocks                                               | Must be fixed in |
| --- | --------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------- |
| B-1 | `langchain_community` missing → `pytest` uncollectable                      | All Python verification: Stages 3, 4, 5, 9, 10, 12   | Stage 1          |
| B-2 | No queue client dependency / no worker consumer                             | Stages 7, 8; PRD async guarantee; concurrency        | Stage 7          |
| B-3 | Runtime still writes legacy `companydocs`                                   | Stages 4, 5, 6, 10, 14 — all version lineage         | Stage 2 + 4      |
| B-4 | `ImpactMapping` lineage fields never populated                              | Stage 6 staleness, Stage 10 evidence, Stage 13 audit | Stage 5          |
| B-5 | Chroma has no org/version metadata or query filter                          | Data-isolation guarantee; Stage 12 TEST 6            | Stage 4          |
| B-6 | Weak JWT default + committed `.env` + public bootstrap + public static dirs | Any production claim                                 | Stage 11         |
| B-7 | No `AuditEvent` collection                                                  | Auditability requirement; Stage 6/13 acceptance      | Stage 13         |
| B-8 | Backend lint is a stub                                                      | Trustworthy CI signal                                | Stage 1          |

**B-1 is first.** Nothing Python-side can be honestly verified until
`pytest` runs.

---

## 24. PHASE 11 EXIT CRITERIA

Phase 11 may be declared complete **only** when every line below is
independently demonstrable. Each maps to a stage in
`PHASE_11_REMEDIATION_AND_EXECUTION.md` and to a row in its final
verification matrix.

### Baseline

- [ ] E-1 `pytest` collects and passes in a clean environment and inside the
      worker image. _(Stage 1)_
- [ ] E-2 `npm test` (backend), frontend tests, and `pytest` all run from one
      documented command; backend lint performs real linting. _(Stage 1)_
- [ ] E-3 `GET /api/health` reports per-dependency status for Mongo, Redis,
      Chroma and Ollama, and returns non-200 when any is down. _(Stages 1, 13)_

### Version lineage

- [ ] E-4 Every company policy ingestion creates `CompanyDocument` +
      `CompanyDocumentVersion` with `contentHash`; **zero** new writes to
      `companydocs`. _(Stages 2, 4)_
- [ ] E-5 Uploading the same logical policy twice with different content
      produces `versionNumber` 1 and 2 with exactly one `isCurrent:true`,
      enforced by a database constraint. _(Stages 2, 4)_
- [ ] E-6 Regulation diff rows carry `fromVersion`, `toVersion`, `clauseId`,
      `changeType`, `matchRatio`, and emit `unchanged` and `renumbered`.
      _(Stage 3)_
- [ ] E-7 Every `ImpactMapping` records `regulationId`, `regulationVersionId`,
      `policyDocumentId`, `policyVersionId`, `sourceDocumentHash`, `jobId`,
      `model`, `promptVersion`, `embeddingVersion`, `confidence`,
      `generatedAt`, `sourceEvidence`. _(Stage 5)_
- [ ] E-8 The system answers, for any recommendation, "which exact regulation
      version and which exact company policy version produced this?" from
      stored data alone. _(Stage 5)_

### Staleness

- [ ] E-9 Publishing a new policy version marks dependent recommendations
      `stale` deterministically. _(Stage 6)_
- [ ] E-10 Approving or publishing a `stale` recommendation is rejected with
      `409` and a re-analysis instruction; no silent success path exists.
      _(Stage 6)_
- [ ] E-11 The UI shows a stale banner and disables approve/publish.
      _(Stages 6, 8)_

### Asynchronous processing

- [ ] E-12 A real queue client is a declared dependency and connects to Redis.
      _(Stage 7)_
- [ ] E-13 A separate worker process consumes jobs; stopping it leaves jobs
      `QUEUED`; starting it drains them. _(Stage 7)_
- [ ] E-14 The API process executes **no** pipeline stage and spawns **no**
      agent during an HTTP request. _(Stage 7)_
- [ ] E-15 Bounded retry with backoff, terminal `FAILED`, and dead-letter
      behaviour are implemented and tested. _(Stage 7)_
- [ ] E-16 Two concurrent uploads process independently. _(Stage 7)_
- [ ] E-17 Job lifecycle exposes `QUEUED → PROCESSING → EXTRACTING → DIFFING →
  MAPPING → DRAFTING → REPORTING → COMPLETED` plus `FAILED`, `RETRYING`,
      `CANCELLED`. _(Stage 8)_
- [ ] E-18 The frontend renders real backend job state, never inferred from
      `Regulation.status`; the "keep this page open" copy is gone. _(Stage 8)_

### AI safety, evidence, isolation

- [ ] E-19 Every prompt separates trusted instructions from untrusted
      document content with explicit boundaries. _(Stage 9)_
- [ ] E-20 LLM outputs are schema-validated with a bounded retry-correction
      loop; invalid output never persists as a valid recommendation.
      _(Stage 9)_
- [ ] E-21 A document containing `IGNORE PREVIOUS INSTRUCTIONS` does not alter
      system behaviour and raises a logged suspicious-content event.
      _(Stages 9, 12)_
- [ ] E-22 Every recommendation carries source evidence resolvable to at
      least one regulation clause and at least one `DocumentChunk`.
      _(Stage 10)_
- [ ] E-23 The reviewer UI and the PDF report expose all nine provenance
      questions. _(Stage 10)_
- [ ] E-24 Chroma vectors carry `organizationId`, `documentId`,
      `documentVersionId`, `chunkId`, `embeddingModel`, `embeddingVersion`,
      and every query filters on organization and current version.
      _(Stage 4)_
- [ ] E-25 A cross-organization retrieval test proves zero leakage.
      _(Stage 12 TEST 6)_

### Security

- [ ] E-26 No default JWT secret exists; the app fails fast without one.
      _(Stage 11)_
- [ ] E-27 No `.env` or credential material is tracked; affected secrets are
      rotated. _(Stage 11)_
- [ ] E-28 `/uploads` and `/reports` are not statically public; file access is
      authenticated, org-scoped, and path-traversal safe. _(Stage 11)_
- [ ] E-29 `POST /api/auth/bootstrap` is not publicly usable once a user
      exists; the register-route contradiction (C-11) is resolved and tested.
      _(Stage 11)_
- [ ] E-30 Policy uploads enforce type and size limits. _(Stage 11)_
- [ ] E-31 Rate limiting on auth and upload endpoints; security headers; CORS
      allow-list. _(Stage 11)_

### Verification and auditability

- [ ] E-32 All 18 business-workflow tests in Stage 12 exist and pass in one
      command. _(Stage 12)_
- [ ] E-33 Structured logs carry `requestId`, `jobId`, `organizationId`;
      an API request and its worker stages are correlatable. _(Stage 13)_
- [ ] E-34 `AuditEvent` records every state change; a full amendment
      lifecycle is reconstructable from the log alone. _(Stage 13)_
- [ ] E-35 A `DocumentConnector` interface with one conformant local adapter
      exists, and ingestion goes through the registry. _(Stage 14)_

### Honesty gate

- [ ] E-36 No document in the repository claims a capability that lacks a
      passing automated test or a recorded manual verification. Any remaining
      uncertainty is written as "Not verified — requires runtime validation."

---

## 25. Post-Phase-11 scope (explicitly NOT part of Phase 11)

Retained from `IMPLEMENTATION.md` for continuity; not classified here because
they are out of the remediation window.

- Phase 12 — report object storage (S3 adapter) and report retry
- Phase 14 (remainder) — multi-step governance workflow
- Phase 14B (remainder) — proposed-version creation and connector
  `publishVersion()` against a **live** external repository
- Phase 17 — Dockerfiles per service, GitHub Actions CI/CD
- Phase 19 — load testing and per-queue replica tuning
- Phase 20 — production deployment, backups, disaster-recovery drill
- Hybrid retrieval (lexical + vector + metadata + reranking)
- Live SharePoint / OneDrive / Google Drive / S3 connectors
- Autonomous RBI/SEBI/MCA monitoring, notifications, deadline tracking
- SSO/SAML, multi-region, per-organization LLM provider governance

---

## 26. Honest one-paragraph summary

ACRIS today is a **credible, partially working prototype with a real
foundation**: authentication, password hashing, role and organization checks
on the API surface, a routed React shell, a genuine six-agent Python pipeline
that really calls Ollama and really uses Chroma, correct sequential
regulation versioning, correct previous-version resolution, working
clause-level diffing, and real PDF report generation — with four passing
backend tests and a passing frontend build. It is **not** an asynchronous
system (no queue, no worker), it **cannot** state which policy version
produced a recommendation, it **cannot** detect or block stale
recommendations, its vector retrieval is **not** organization-isolated, its
AI layer has **no** injection boundary or output schema validation, it has
**no** audit log, and its Python tests **cannot even be collected**.
QA.md scores Phase 1–11 at **38/100**; this document does not dispute that
score. `PHASE_11_REMEDIATION_AND_EXECUTION.md` is the ordered plan to close
the gap.
