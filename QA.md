# ACRIS repository audit (code-verified)

This document is based on the actual repository contents, runtime checks, and test output in the current workspace. It does not assume that a phase is complete just because the plan says so.

## Status key

- WORKING = verified by code and/or tests
- PARTIALLY WORKING = present but incomplete, disabled, stale, or not wired through the live path
- NOT WORKING = clearly broken or contradicts the intended behavior
- NOT IMPLEMENTED = missing from the codebase
- UNKNOWN = cannot be verified from the codebase with current evidence

---

## 1) Executive summary

### Overall verdict

The repository is in a mixed state:

- The app has a real Node/Express backend, a React frontend, Mongo models, Python agents, Chroma integration, Ollama LLM use, and some actual automated tests.
- Some deeper architecture requirements are present in code or models but are not wired to the actual production flow.
- The major gaps are in genuine async queue processing, real document version tracking, complete organization isolation in all business flows, true connector architecture, prompt-injection protection, and end-to-end queue/worker behavior.

### Highest-confidence code facts

- Real routing and auth shell: [acris/frontend/src/app/router.jsx](acris/frontend/src/app/router.jsx), [acris/frontend/src/app/AuthProvider.jsx](acris/frontend/src/app/AuthProvider.jsx)
- Real JWT auth: [acris/backend/middleware/auth.js](acris/backend/middleware/auth.js), [acris/backend/services/authService.js](acris/backend/services/authService.js)
- Real Mongo multi-tenancy fields exist on many collections: [acris/backend/models/Organization.js](acris/backend/models/Organization.js), [acris/backend/models/User.js](acris/backend/models/User.js), [acris/backend/models/ComplianceJob.js](acris/backend/models/ComplianceJob.js), [acris/backend/models/Regulation.js](acris/backend/models/Regulation.js), [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js), [acris/backend/models/CompanyDocument.js](acris/backend/models/CompanyDocument.js)
- Real Python AI pipeline exists: [acris/agents/monitor_agent.py](acris/agents/monitor_agent.py), [acris/agents/parser_agent.py](acris/agents/parser_agent.py), [acris/agents/diff_agent.py](acris/agents/diff_agent.py), [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py), [acris/agents/drafting_agent.py](acris/agents/drafting_agent.py), [acris/agents/report_agent.py](acris/agents/report_agent.py)
- Real Chroma usage exists: [acris/agents/chroma_store.py](acris/agents/chroma_store.py)
- Real Ollama usage exists: [acris/agents/llm.py](acris/agents/llm.py)
- Real async job model exists: [acris/backend/models/ComplianceJob.js](acris/backend/models/ComplianceJob.js), [acris/backend/jobs/pipelineOrchestrator.js](acris/backend/jobs/pipelineOrchestrator.js)
- But the queue is not backed by Redis/BullMQ in the actual code path: [acris/backend/jobs/pipelineOrchestrator.js](acris/backend/jobs/pipelineOrchestrator.js), [docker-compose.yml](docker-compose.yml)

---

## 2) Audit of IMPLEMENTATION.md vs actual repo

### Phase status matrix

| Phase | Task                                    | Status            | Actual File(s)                                                                                                                                                                                                                                                                       | Working?                                            | Test Exists?                                         | Evidence                                                               | Problem                                                                                                         |
| ----- | --------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1     | Dev environment and docker compose      | PARTIALLY WORKING | [docker-compose.yml](docker-compose.yml), [acris/README.md](acris/README.md)                                                                                                                                                                                                         | Yes for local stack config but no real worker queue | No                                                   | Docker defines mongo, redis, chroma, ollama, backend, worker, frontend | Worker command is just a placeholder; no real queue consumer                                                    |
| 2     | Frontend routing shell                  | WORKING           | [acris/frontend/src/app/router.jsx](acris/frontend/src/app/router.jsx), [acris/frontend/src/App.jsx](acris/frontend/src/App.jsx)                                                                                                                                                     | Yes                                                 | No UI tests                                          | BrowserRouter and protected route exist                                | Only login/dashboard routes; no job details, regulations, policies pages                                        |
| 3     | Backend service/repository layer        | PARTIALLY WORKING | [acris/backend/services/dashboardService.js](acris/backend/services/dashboardService.js), [acris/backend/repositories/dashboardRepository.js](acris/backend/repositories/dashboardRepository.js)                                                                                     | Partial                                             | Yes, one dashboard service test                      | Dashboard uses service/repository                                      | Most routes directly use Mongoose models instead of services/controllers                                        |
| 4     | Database + organization fields          | PARTIALLY WORKING | [acris/backend/models/User.js](acris/backend/models/User.js), [acris/backend/models/Organization.js](acris/backend/models/Organization.js), [acris/backend/models/ComplianceJob.js](acris/backend/models/ComplianceJob.js)                                                           | Partial                                             | Minimal                                              | organizationId exists on many models                                   | Legacy flat CompanyDoc still used in agent code; not all business queries are org-isolated                      |
| 4B    | Versioned document registry             | PARTIALLY WORKING | [acris/backend/models/CompanyDocument.js](acris/backend/models/CompanyDocument.js), [acris/backend/models/CompanyDocumentVersion.js](acris/backend/models/CompanyDocumentVersion.js), [acris/backend/models/DocumentChunk.js](acris/backend/models/DocumentChunk.js)                 | Partial                                             | No                                                   | Versioning models exist                                                | Actual ingestion still writes to legacy CompanyDoc and companydocs in Python                                    |
| 5     | Auth + RBAC                             | PARTIALLY WORKING | [acris/backend/middleware/auth.js](acris/backend/middleware/auth.js), [acris/backend/middleware/requireRole.js](acris/backend/middleware/requireRole.js), [acris/backend/middleware/requireOrgAccess.js](acris/backend/middleware/requireOrgAccess.js)                               | Yes for token validation + org access               | Yes, 2 auth tests                                    | 401/403 enforcement works in tested paths                              | Bootstrap route is public and the default JWT secret is weak in code defaults                                   |
| 6     | Async upload contract                   | PARTIALLY WORKING | [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js), [acris/backend/services/jobService.js](acris/backend/services/jobService.js), [acris/backend/jobs/pipelineOrchestrator.js](acris/backend/jobs/pipelineOrchestrator.js)                                   | Partial                                             | No                                                   | upload returns 202 with jobId and starts background pipeline           | pipeline is still a thread-local background function, not Redis/BullMQ; no worker process consuming queue state |
| 7     | Real queue + worker system              | NOT IMPLEMENTED   | [docker-compose.yml](docker-compose.yml), [acris/backend/jobs/pipelineOrchestrator.js](acris/backend/jobs/pipelineOrchestrator.js)                                                                                                                                                   | No                                                  | No                                                   | Redis exists only as service                                           | No BullMQ or worker consumer; job runner is direct JS function                                                  |
| 10    | Real embeddings                         | PARTIALLY WORKING | [acris/agents/chroma_store.py](acris/agents/chroma_store.py)                                                                                                                                                                                                                         | Partial                                             | No                                                   | Ollama embeddings and hashing function both exist                      | Hashing function remains and no versioned Chroma namespaces or metadata filters are enforced                    |
| 11    | Drafting hardening and draft_source     | PARTIALLY WORKING | [acris/agents/drafting_agent.py](acris/agents/drafting_agent.py), [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js)                                                                                                                                     | Partial                                             | No                                                   | draft_source stored                                                    | evidence/confidence fields not populated                                                                        |
| 13    | Frontend job details + polling          | NOT IMPLEMENTED   | [acris/frontend/src/pages/Dashboard.jsx](acris/frontend/src/pages/Dashboard.jsx), [acris/frontend/src/components/AgentTimeline.jsx](acris/frontend/src/components/AgentTimeline.jsx), [acris/frontend/src/components/UploadPanel.jsx](acris/frontend/src/components/UploadPanel.jsx) | No                                                  | No                                                   | old timeline is status-based and not polling job API                   | no JobDetails page, no jobId-driven UI flow                                                                     |
| 14    | Approval/reject hardening               | PARTIALLY WORKING | [acris/backend/routes/amendments.js](acris/backend/routes/amendments.js)                                                                                                                                                                                                             | Partial                                             | Yes, org access test                                 | requireOrgAccess is applied                                            | no reason capture, no proof of stale state, no publish workflow                                                 |
| 15    | Full test suite                         | PARTIALLY WORKING | [acris/backend/tests](acris/backend/tests), [acris/agents/test_diff_agent.py](acris/agents/test_diff_agent.py)                                                                                                                                                                       | Partial                                             | Yes, limited Node tests; Python test fails at import | backend tests pass                                                     | Python tests do not run because langchain_community missing                                                     |
| 16-20 | Security, CI, observability, deployment | NOT IMPLEMENTED   | [acris/backend/server.js](acris/backend/server.js), [docker-compose.yml](docker-compose.yml)                                                                                                                                                                                         | No                                                  | No                                                   | some baseline security pieces exist                                    | no Helmet, rate limits, CI workflow, health checks, audit log                                                   |

### Task-level verdict on IMPLEMENTATION.md checkboxes

- The repo contains code for some checked items, but they are not all complete in the way the plan expects.
- The repository is definitely not in a state where every task marked `[x]` in the plan is complete and production-ready.
- The code proves a smaller subset is real and working; the rest is plan text or partially implemented scaffolding.

---

## 3) Frontend audit

### 3.1 Is the frontend using proper routing or conditional rendering?

Status: WORKING

Evidence:

- [acris/frontend/src/app/router.jsx](acris/frontend/src/app/router.jsx) uses React Router `BrowserRouter`, `Routes`, `Route`, and `Navigate`.
- [acris/frontend/src/App.jsx](acris/frontend/src/App.jsx) wraps the app with `AuthProvider` and `AppRouter`.
- [acris/frontend/src/app/AuthProvider.jsx](acris/frontend/src/app/AuthProvider.jsx) handles auth token persistence and route gating.

Result:

This is a real route-based app shell, not a single `if (!token) return ...` toggle.

### 3.2 Complete frontend structure and scalability

Status: PARTIALLY WORKING

Current frontend file structure:

- [acris/frontend/src/main.jsx](acris/frontend/src/main.jsx)
- [acris/frontend/src/App.jsx](acris/frontend/src/App.jsx)
- [acris/frontend/src/app/router.jsx](acris/frontend/src/app/router.jsx)
- [acris/frontend/src/app/AuthProvider.jsx](acris/frontend/src/app/AuthProvider.jsx)
- [acris/frontend/src/app/ErrorBoundary.jsx](acris/frontend/src/app/ErrorBoundary.jsx)
- [acris/frontend/src/pages/Login.jsx](acris/frontend/src/pages/Login.jsx)
- [acris/frontend/src/pages/Dashboard.jsx](acris/frontend/src/pages/Dashboard.jsx)
- [acris/frontend/src/components/UploadPanel.jsx](acris/frontend/src/components/UploadPanel.jsx)
- [acris/frontend/src/components/AgentTimeline.jsx](acris/frontend/src/components/AgentTimeline.jsx)
- [acris/frontend/src/components/DiffViewer.jsx](acris/frontend/src/components/DiffViewer.jsx)
- [acris/frontend/src/components/PolicyMappings.jsx](acris/frontend/src/components/PolicyMappings.jsx)
- [acris/frontend/src/components/AmendmentCards.jsx](acris/frontend/src/components/AmendmentCards.jsx)
- [acris/frontend/src/components/ReportDownload.jsx](acris/frontend/src/components/ReportDownload.jsx)
- [acris/frontend/src/api/axios.js](acris/frontend/src/api/axios.js)

Scalability assessment:

- Dashboard: WORKING
- Regulations: PARTIALLY WORKING — there is a selected regulation page inside the dashboard, but no standalone routed regulations page
- Policies: PARTIALLY WORKING — upload form exists, but no dedicated route or management page
- Jobs: PARTIALLY WORKING — job model and endpoint exist, but no dedicated job detail route/page
- Job Details: NOT IMPLEMENTED — there is no actual `JobDetails.jsx` page in the frontend
- Amendments: PARTIALLY WORKING — approval/rejection exists in dashboard; no dedicated route/approval workflow screen
- Documents: PARTIALLY WORKING — policy uploads are supported, but not a real document registry UI
- Document Versions: NOT IMPLEMENTED — no version-specific UI is present
- Settings: NOT IMPLEMENTED
- Admin: PARTIALLY WORKING — role can be set on user model, but admin UI is not implemented

### 3.3 Is the frontend correctly connected to the backend API?

Status: PARTIALLY WORKING

Evidence:

- [acris/frontend/src/api/axios.js](acris/frontend/src/api/axios.js) sets a base URL and attaches the JWT bearer token.
- [acris/frontend/src/pages/Dashboard.jsx](acris/frontend/src/pages/Dashboard.jsx) calls `/dashboard/stats`, `/regulations`, `/reports`, `/regulations/:id`, `/regulations/:id/diff`, `/regulations/:id/mappings`, and `/amendments/:id/approve|reject`.
- [acris/frontend/src/components/UploadPanel.jsx](acris/frontend/src/components/UploadPanel.jsx) calls `/regulations/upload` and `/policies/upload`.

This is connected and working for the current dashboard flow, but the app does not yet implement the newer job-detail architecture described in the plan.

### 3.4 Every frontend API call

| Endpoint                      | Method | Request body                                      | Response expected                      | Auth             | Error handling                                                | Status            |
| ----------------------------- | ------ | ------------------------------------------------- | -------------------------------------- | ---------------- | ------------------------------------------------------------- | ----------------- |
| /api/auth/login               | POST   | `{ email, password }`                             | `{ token, user }`                      | No               | `catch` sets error state                                      | WORKING           |
| /api/dashboard/stats          | GET    | none                                              | stats JSON                             | Yes              | React Query `useQuery` with default error boundary            | WORKING           |
| /api/regulations              | GET    | none                                              | array of regulation documents          | Yes              | query failure surfaces in component                           | WORKING           |
| /api/regulations/upload       | POST   | multipart PDF + `source`, `title`, `company_name` | `202 { jobId, regulation_id, status }` | Yes              | `UploadPanel` sets message from `error.response.data.message` | PARTIALLY WORKING |
| /api/regulations/:id          | GET    | none                                              | `{ regulation, mappings }`             | Yes              | query failure surfaces                                        | WORKING           |
| /api/regulations/:id/diff     | GET    | none                                              | `{ changes }`                          | Yes              | query failure surfaces                                        | WORKING           |
| /api/regulations/:id/mappings | GET    | none                                              | `{ mappings }`                         | Yes              | query failure surfaces                                        | WORKING           |
| /api/policies/upload          | POST   | multipart PDF + `name`, `type`, `owner_team`      | agent result JSON                      | Yes              | form catches error response                                   | WORKING           |
| /api/reports                  | GET    | none                                              | array of report records                | Yes              | query failure surfaces                                        | WORKING           |
| /api/amendments/:id/approve   | POST   | none                                              | updated impact mapping                 | Yes + org access | mutation catches API error                                    | WORKING           |
| /api/amendments/:id/reject    | POST   | none                                              | updated impact mapping                 | Yes + org access | mutation catches API error                                    | WORKING           |
| /api/reports/:id/download     | GET    | none                                              | PDF stream                             | Yes + org access | route checks file existence                                   | WORKING           |
| /api/jobs/:id                 | GET    | none                                              | `{ job }`                              | Yes              | route 404/next(error)                                         | WORKING           |

### 3.5 Is TanStack Query used correctly?

Status: PARTIALLY WORKING

Evidence: [acris/frontend/src/pages/Dashboard.jsx](acris/frontend/src/pages/Dashboard.jsx) uses `useQuery`, `useMutation`, and `useQueryClient` correctly for loading and invalidation.

What is correct:

- queries are created with `queryKey` and `queryFn`
- `useMutation` is used for approve/reject
- invalidation is run after mutation success

What is not correct for the full design:

- no `retry`, `staleTime`, `refetchOnWindowFocus` configuration is used to intentionally manage server state
- no dedicated job detail query with `refetchInterval` bounded by terminal states
- the job architecture in the plan requires polling job details, but the frontend does not implement a real job screen

### 3.6 Upload workflow with asynchronous job architecture

Status: PARTIALLY WORKING

Evidence:

- [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js) creates a `ComplianceJob`, then starts `runPipeline(job._id, regulationId, req.file.path, company_name)` in a background call.
- [acris/backend/jobs/pipelineOrchestrator.js](acris/backend/jobs/pipelineOrchestrator.js) updates job stage statuses and calls the stages sequentially.

Problems:

- It is not using Redis or a queue library.
- It is not running in a separate worker process/container.
- The upload response is immediate, but the actual pipeline is still run using a plain JS async function in the API process.
- The UI still says “Processing can take up to a couple of minutes… keep this page open” in [acris/frontend/src/components/UploadPanel.jsx](acris/frontend/src/components/UploadPanel.jsx), which is stale and contradicts the job-based architecture.

### 3.7 After uploading a regulation, does the frontend do the expected job tracking?

Status: NOT WORKING / NOT IMPLEMENTED

Checklist:

- receive a `jobId`: Yes, route returns `jobId` in [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js)
- navigate to job details: No, there is no `/jobs/:id` route in the router, and no `JobDetails` component
- poll job status: No, no job polling hook exists
- show each agent stage: No in the real job flow; only static timeline states based on regulation status in [acris/frontend/src/components/AgentTimeline.jsx](acris/frontend/src/components/AgentTimeline.jsx)
- show failures: Not in a proper job-detail way; job `error` is not rendered in the UI
- show retry: No
- stop polling when complete: No

### 3.8 Any frontend code still assuming the old synchronous pipeline?

Status: YES, definitely

Examples:

- [acris/frontend/src/components/UploadPanel.jsx](acris/frontend/src/components/UploadPanel.jsx) still says “Processing can take up to a couple of minutes... keep this page open.”
- [acris/frontend/src/pages/Dashboard.jsx](acris/frontend/src/pages/Dashboard.jsx) uses the regulation’s string status directly and references a single status timeline rather than a job-level stage chart.
- [acris/frontend/src/components/AgentTimeline.jsx](acris/frontend/src/components/AgentTimeline.jsx) is a hardcoded status inference component, not a job detail panel.

### 3.9 Loading/empty/error/success/partial-processing states

Status: PARTIALLY WORKING

Examples of good handling:

- Dashboard uses `useQuery` and conditionally renders empty states
- `UploadPanel` shows loading and error text
- `AuthProvider` handles signed-out state

Examples of missing or stale handling:

- There is no explicit `job pending / failed / retrying / complete` UI on a dedicated job page
- `partial-processing` states are not modeled as a real multi-stage status view

---

## 4) Backend/API audit

### 4.1 Is the backend following the intended Route → Controller → Service → Repository → Database architecture?

Status: PARTIALLY WORKING

Evidence of service/repository use:

- [acris/backend/services/dashboardService.js](acris/backend/services/dashboardService.js)
- [acris/backend/repositories/dashboardRepository.js](acris/backend/repositories/dashboardRepository.js)
- [acris/backend/routes/dashboard.js](acris/backend/routes/dashboard.js)

Evidence against the ideal architecture:

- [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js) directly imports Mongo models and performs DB logic inline.
- [acris/backend/routes/reports.js](acris/backend/routes/reports.js) directly uses `Report.find` and `Report.findById`.
- [acris/backend/routes/amendments.js](acris/backend/routes/amendments.js) directly uses `ImpactMapping.findByIdAndUpdate`.

So: some layered structure exists, but it is not consistently used across the application.

### 4.2 Routes that directly access Mongoose models

Status: Yes, these routes access models directly:

- [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js) — imports `Regulation` and `ImpactMapping`
- [acris/backend/routes/reports.js](acris/backend/routes/reports.js) — imports `Report`
- [acris/backend/routes/dashboard.js](acris/backend/routes/dashboard.js) — imports `Regulation`, `CompanyDoc`, `ImpactMapping` then wires service/repository
- [acris/backend/routes/amendments.js](acris/backend/routes/amendments.js) — imports `ImpactMapping`
- [acris/backend/routes/policies.js](acris/backend/routes/policies.js) — no direct Mongoose model, but it invokes the Python lifecycle directly

### 4.3 Business logic still in routes

Status: YES, in several places

Examples:

- [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js) performs upload validation, hashing, idempotency, job creation, and calls `runPipeline` directly.
- [acris/backend/routes/policies.js](acris/backend/routes/policies.js) calls `runAgent("policy_ingest.py", ...)` directly from the route.
- [acris/backend/routes/amendments.js](acris/backend/routes/amendments.js) performs update logic directly in the route and sets review status.

This is not the full route → controller → service pattern.

### 4.4 Centralized error handling

Status: PARTIALLY WORKING

Evidence:

- [acris/backend/middleware/errorHandler.js](acris/backend/middleware/errorHandler.js) exists and is mounted in [acris/backend/app.js](acris/backend/app.js).
- Most routes call `next(error)` or return structured JSON errors.

What is missing:

- not every route catches and passes error to central handler consistently
- some upload logic manually handles specific messages and then calls `next(error)`
- no custom APIError classes or uniform status code mapping across the app

### 4.5 Every API endpoint currently available

| Endpoint                      | Method | Auth required? | Role required? | Org scoped? | Input validation?                       | Error handling?          | Test? | Current status                    |
| ----------------------------- | ------ | -------------- | -------------- | ----------- | --------------------------------------- | ------------------------ | ----- | --------------------------------- |
| /api/auth/login               | POST   | No             | No             | No          | Yes: email/password check               | Yes                      | Yes   | WORKING                           |
| /api/auth/register            | POST   | Yes            | admin          | Yes         | Yes                                     | Yes                      | No    | PARTIALLY WORKING                 |
| /api/auth/bootstrap           | POST   | No             | No             | No          | Yes                                     | Yes                      | No    | NOT WORKING for secure production |
| /api/auth/me                  | GET    | Yes            | No             | Yes         | token validation                        | Yes                      | No    | WORKING                           |
| /api/health                   | GET    | No             | No             | No          | none                                    | basic JSON               | No    | WORKING                           |
| /api/dashboard/stats          | GET    | Yes            | No             | Yes         | token + org filter                      | route -> service -> repo | Yes   | WORKING                           |
| /api/regulations              | GET    | Yes            | No             | Yes         | org filter                              | yes                      | Yes   | WORKING                           |
| /api/regulations/upload       | POST   | Yes            | No             | Yes         | PDF file filter + title/source required | yes                      | No    | PARTIALLY WORKING                 |
| /api/regulations/:id          | GET    | Yes            | No             | Yes         | org filter                              | yes                      | No    | WORKING                           |
| /api/regulations/:id/diff     | GET    | Yes            | No             | Yes         | org filter                              | yes                      | No    | WORKING                           |
| /api/regulations/:id/mappings | GET    | Yes            | No             | Yes         | org filter                              | yes                      | No    | WORKING                           |
| /api/policies/upload          | POST   | Yes            | No             | Yes         | file existence only                     | yes                      | No    | PARTIALLY WORKING                 |
| /api/reports                  | GET    | Yes            | No             | Yes         | org filter                              | yes                      | No    | WORKING                           |
| /api/reports/:id/download     | GET    | Yes            | No             | Yes         | org filter + file existence             | yes                      | No    | WORKING                           |
| /api/amendments/:id/approve   | POST   | Yes            | manager/admin  | Yes         | org access check                        | yes                      | Yes   | WORKING                           |
| /api/amendments/:id/reject    | POST   | Yes            | manager/admin  | Yes         | org access check                        | yes                      | Yes   | WORKING                           |
| /api/jobs/:id                 | GET    | Yes            | No             | Yes         | jobId + org filter                      | yes                      | No    | WORKING                           |

### 4.6 Are there any endpoints accessible without auth?

Status: YES

Public endpoints in [acris/backend/app.js](acris/backend/app.js):

- /api/health
- /api/auth/login
- /api/auth/register
- /api/auth/bootstrap
- static /uploads and /reports

The security requirement for the product is not fully met because some business endpoints are intentionally public while they should require auth. The repo has some layered auth guard but the route set is not fully locked down.

### 4.7 Specifically verify /regulations /policies /reports /amendments /dashboard /jobs /documents /auth

Main status summaries:

- /regulations: Yes, auth required in [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js) via `router.use(authMiddleware)`
- /policies: Yes, auth required in [acris/backend/routes/policies.js](acris/backend/routes/policies.js)
- /reports: Yes, auth required in [acris/backend/routes/reports.js](acris/backend/routes/reports.js)
- /amendments: Yes, auth required in [acris/backend/routes/amendments.js](acris/backend/routes/amendments.js)
- /dashboard: Yes, auth required in [acris/backend/routes/dashboard.js](acris/backend/routes/dashboard.js)
- /jobs: Yes, auth required in [acris/backend/routes/jobs.js](acris/backend/routes/jobs.js)
- /documents: No explicit route grouping exists in this repo; there are document model files but not a real documents API layer implemented
- /auth: login/register/bootstrap/me are present, but bootstrap is public and insecure by design

### 4.8 Amendment approve/reject endpoints protection

Status: PARTIALLY WORKING

Evidence: [acris/backend/routes/amendments.js](acris/backend/routes/amendments.js) applies `authMiddleware`, `requireRole("manager", "admin")`, and `requireOrgAccess({ Model: ImpactMapping, ... })`.

This protects from cross-organization mutation in the intended path.

Missing elements:

- no reason capture on reject
- no audit log or event trail
- no stale-status enforcement

### 4.9 Can a user from Org A access or modify Org B's data?

Status: PARTIALLY WORKING

The code intends to prevent it via org filtering and `requireOrgAccess`.

Actual evidence:

- [acris/backend/middleware/requireOrgAccess.js](acris/backend/middleware/requireOrgAccess.js) checks `resource[orgField]` against `req.user.organizationId`
- [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js) query filters by `organizationId`
- [acris/backend/routes/reports.js](acris/backend/routes/reports.js) query filters by `organizationId`
- [acris/backend/routes/jobs.js](acris/backend/routes/jobs.js) query includes org filter

But the repo still has legacy and partial paths that can violate true isolation in Python or legacy code:

- [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py) queries `db.companydocs.find_one(...)` with `organizationId` but also still uses legacy `companydocs` naming
- There are model and route paths still calling the older `CompanyDoc` object model and `db.companydocs` naming pattern

So the intent is there, but the full multi-tenant implementation is not consistently enforced across all data access paths.

---

## 5) Database / multi-tenancy audit

### 5.1 Models implemented?

Status: PARTIALLY WORKING

Implemented in code:

- [acris/backend/models/Organization.js](acris/backend/models/Organization.js)
- [acris/backend/models/User.js](acris/backend/models/User.js)
- [acris/backend/models/ComplianceJob.js](acris/backend/models/ComplianceJob.js)
- [acris/backend/models/Regulation.js](acris/backend/models/Regulation.js)
- [acris/backend/models/CompanyDocument.js](acris/backend/models/CompanyDocument.js)
- [acris/backend/models/CompanyDocumentVersion.js](acris/backend/models/CompanyDocumentVersion.js)
- [acris/backend/models/DocumentChunk.js](acris/backend/models/DocumentChunk.js)
- [acris/backend/models/DocumentSyncJob.js](acris/backend/models/DocumentSyncJob.js)
- [acris/backend/models/DocumentChangeEvent.js](acris/backend/models/DocumentChangeEvent.js)
- [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js)
- [acris/backend/models/Report.js](acris/backend/models/Report.js)

Also present but legacy:

- [acris/backend/models/CompanyDoc.js](acris/backend/models/CompanyDoc.js)

Competing model names are present, and the old one is still used in some code paths. That is evidence of incomplete migration.

### 5.2 organizationId present and enforced?

Status: PARTIALLY WORKING

Present in:

- [acris/backend/models/User.js](acris/backend/models/User.js)
- [acris/backend/models/ComplianceJob.js](acris/backend/models/ComplianceJob.js)
- [acris/backend/models/Regulation.js](acris/backend/models/Regulation.js)
- [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js)
- [acris/backend/models/CompanyDocument.js](acris/backend/models/CompanyDocument.js)
- [acris/backend/models/DocumentSyncJob.js](acris/backend/models/DocumentSyncJob.js)
- [acris/backend/models/DocumentChangeEvent.js](acris/backend/models/DocumentChangeEvent.js)
- [acris/backend/models/Report.js](acris/backend/models/Report.js)

Enforced in route queries:

- yes for many routes, e.g. [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js)

But not consistently enforced in all code paths, especially legacy Python pipeline logic and direct legacy collection access.

### 5.3 Every MongoDB query and org isolation status

Status: PARTIALLY WORKING

Working patterns:

- [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js) uses `organizationId: req.user.organizationId`
- [acris/backend/routes/reports.js](acris/backend/routes/reports.js) uses `organizationId: req.user.organizationId`
- [acris/backend/routes/jobs.js](acris/backend/routes/jobs.js) uses `ComplianceJob.findOne({ _id, organizationId })`
- [acris/backend/repositories/dashboardRepository.js](acris/backend/repositories/dashboardRepository.js) counts by organization

Problematic patterns:

- [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py) still finds `db.companydocs.find_one` and `db.impactmappings.update_one` without a clear version-safe scope beyond `organizationId`
- [acris/agents/drafting_agent.py](acris/agents/drafting_agent.py) reads `db.companydocs.find_one` and `db.impactmappings.find({ regulation_id, reviewStatus })` without additional document-version scoping
- [acris/agents/report_agent.py](acris/agents/report_agent.py) reads `db.companydocs.find_one` and `db.impactmappings.find` without version metadata constraints

### 5.4 Missing indexes

Status: PARTIALLY WORKING

Implemented indexes:

- [acris/backend/models/Regulation.js](acris/backend/models/Regulation.js) indexes `{ organizationId, source, title, version }`
- [acris/backend/models/ComplianceJob.js](acris/backend/models/ComplianceJob.js) indexes `{ organizationId, status }` and `{ organizationId, fileHash }`
- [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js) indexes `{ organizationId, regulation_id, doc_id }`
- [acris/backend/models/Report.js](acris/backend/models/Report.js) indexes `{ organizationId, generated_at }`
- [acris/backend/models/CompanyDocumentVersion.js](acris/backend/models/CompanyDocumentVersion.js) indexes `{ documentId, isCurrent }`

Missing or incomplete:

- [acris/backend/models/DocumentChunk.js](acris/backend/models/DocumentChunk.js) has no compound index on `{ documentVersionId, chunkIndex }`
- [acris/backend/models/DocumentSyncJob.js](acris/backend/models/DocumentSyncJob.js) has no index on `{ organizationId, status }`
- [acris/backend/models/DocumentChangeEvent.js](acris/backend/models/DocumentChangeEvent.js) has no index or query conventions visible
- there is no `AuditEvent` model at all, despite the phase plan requiring it

### 5.5 Does versioning support the exact document-version model?

Status: PARTIALLY WORKING

Evidence of actual versioning model files:

- [acris/backend/models/CompanyDocument.js](acris/backend/models/CompanyDocument.js)
- [acris/backend/models/CompanyDocumentVersion.js](acris/backend/models/CompanyDocumentVersion.js)
- [acris/backend/models/DocumentChunk.js](acris/backend/models/DocumentChunk.js)

The schema is aligned with the idea of a document with multiple versions.

But the actual operational flow does not use it: [acris/agents/policy_ingest.py](acris/agents/policy_ingest.py) still inserts into `db.companydocs` and not into `CompanyDocument`/`CompanyDocumentVersion`. The code also does not record a version-aware recommendation against a specific document version in the mapping or draft flow.

### 5.6 Can the system determine which company-document version an AI recommendation was generated against?

Status: NOT WORKING

Reason:

- [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js) defines `documentVersionId` and `regulationVersion`, but no code path populates them in current mapping generation.
- [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py) sets only the legacy doc payload values and does not write `documentVersionId` or `embeddingVersion` into the mapping record.
- [acris/agents/drafting_agent.py](acris/agents/drafting_agent.py) queries `db.companydocs` and writes `draft_amendment` and `draft_source` only, not evidence or document-version metadata.

Therefore the system cannot currently prove which exact version of a policy document a recommendation was generated against.

---

## 6) Regulation version/change detection test

### 6.1 Is this a real V1/V2 comparison or just a generic clause-added result?

Status: PARTIALLY WORKING

Evidence in [acris/agents/diff_agent.py](acris/agents/diff_agent.py):

- It queries the previous regulation using:
  - same `organizationId`
  - same `source`
  - same `title`
  - lower `version`
  - latest version first
- It then compares current clauses against old clauses by using `best_match` and `normalize_text`.
- It only emits `change_type` values such as `added`, `removed`, `modified`.

This is a real comparison against previous regulation versions when the record exists.

However, it is not a robust version-aware diff engine because:

- no explicit `renumbered` change type is implemented
- no explicit `version` or `source` metadata is stored in diff output rows
- no `confidence` or `evidence` fields are stored with the diff result

### 6.2 Exact database records used when comparing V2 against V1

Status: VERIFIED

The comparison is done in [acris/agents/diff_agent.py](acris/agents/diff_agent.py):

```python
previous = db.regulations.find_one(
    {
        "organizationId": regulation.get("organizationId"),
        "source": regulation.get("source"),
        "title": regulation.get("title"),
        "version": {"$lt": regulation.get("version", 1)},
    },
    sort=[("version", -1)],
)
```

This means the previous record is the latest prior version of the same regulation in the same org and source/title.

### 6.3 Exact function that determines the previous regulation version

Status: VERIFIED

Function: `main()` in [acris/agents/diff_agent.py](acris/agents/diff_agent.py)

Key logic: the `previous` variable is selected using `version: { "$lt": regulation.get("version", 1) }` and sorted by `version` descending.

### 6.4 How are clauses matched between V1 and V2?

Status: VERIFIED

Code path:

- [acris/agents/shared.py](acris/agents/shared.py) defines `split_clauses()` and `best_match()`
- [acris/agents/diff_agent.py](acris/agents/diff_agent.py) calls `split_clauses()` on both old and new text
- `best_match()` uses `SequenceMatcher` to compare normalized text and selects the closest old clause above a ratio threshold

Important detail:

- `best_match` threshold is hardcoded to 0.45 in [acris/agents/shared.py](acris/agents/shared.py)
- If no candidate is close enough, the new clause is treated as `added`
- If old clause is unmatched, it is treated as `removed`

### 6.5 Can it detect: Added, Modified, Deleted, Unchanged, Renumbered?

Status: PARTIALLY WORKING

- Added: yes, implemented in `process_added()`
- Modified: yes, implemented in `process_modified()`
- Deleted: yes, implemented in `process_removed()`
- Unchanged: no explicit `unchanged` type is emitted; unchanged clauses are simply not listed as diffs
- Renumbered: not explicitly implemented; there is no specific `renumbered` change type

### 6.6 Test with a single-sentence change

Status: PARTIALLY WORKING

This should usually generate a `modified` diff for the matching clause, because:

- `normalize_text` removes formatting differences
- `best_match` uses ratio-based matching
- if a clause only changes by one sentence, the matching still happens if the clause text remains similar enough

However, there is no explicit validation or threshold test in the repo for this exact scenario. No dedicated regression test covers single-sentence delta detection.

### 6.7 Does diff output preserve clause number, old text, new text, change type, source/version, confidence?

Status: NOT WORKING / PARTIALLY WORKING

Preserved:

- clause number: yes, `clause` field is included
- old_text: yes
- new_text: yes
- change_type: yes

Missing:

- source/version: not in diff rows
- confidence: not included

So the diff output is not fully production-grade evidence data.

---

## 7) Company policy/document mapping

### 7.1 How does ACRIS currently obtain company policy documents?

Status: PARTIALLY WORKING

Evidence:

- [acris/backend/routes/policies.js](acris/backend/routes/policies.js) accepts a PDF upload and calls `runAgent("policy_ingest.py", ...)`
- [acris/agents/policy_ingest.py](acris/agents/policy_ingest.py) extracts text from a PDF and inserts a record into `db.companydocs`

No external connector architecture is used here.

### 7.2 Are company documents manually uploaded, stored in MongoDB, stored as files, indexed in Chroma, connected to external repo?

Status: PARTIALLY WORKING

- manually uploaded: yes, via [acris/backend/routes/policies.js](acris/backend/routes/policies.js)
- stored in MongoDB: yes, via `db.companydocs.insert_one` in [acris/agents/policy_ingest.py](acris/agents/policy_ingest.py)
- stored as files: yes, the PDF can be on disk and `file_path` is recorded in the legacy schema [acris/backend/models/CompanyDoc.js](acris/backend/models/CompanyDoc.js)
- indexed in Chroma: yes, via [acris/agents/chroma_store.py](acris/agents/chroma_store.py)
- connected to external company repository: NOT IMPLEMENTED

### 7.3 Is there a real connector architecture?

Status: NOT IMPLEMENTED

No connector classes or registry exist in the repository.

The plan describes a future connector model, but the actual code does not include it.

### 7.4 Can it connect to SharePoint / Google Drive / OneDrive / S3 / internal API?

Status: NOT IMPLEMENTED

No implementation exists for:

- SharePoint
- Google Drive
- OneDrive
- S3 storage adapter
- internal API connector

The codebase currently supports manual PDF upload only.

### 7.5 If a company policy changes externally, how does ACRIS know?

Status: NOT IMPLEMENTED

No evidence of:

- polling
- webhook
- scheduled synchronization
- file hash comparison
- version detection
- change event generation

The models exist for this in [acris/backend/models/DocumentSyncJob.js](acris/backend/models/DocumentSyncJob.js) and [acris/backend/models/DocumentChangeEvent.js](acris/backend/models/DocumentChangeEvent.js), but no actual sync logic is implemented.

### 7.6 If a policy changes after AI recommendation generation, is stale detection implemented?

Status: NOT IMPLEMENTED

Evidence:

- [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js) defines `implementationStatus` as enum values including `stale`, but this is not enforced in the actual flow
- no stale-check or publish workflow exists

Therefore ACRIS cannot currently mark a recommendation as `STALE` and require re-analysis.

---

## 8) Queue / asynchronous AI pipeline

### 8.1 Is the six-agent pipeline actually asynchronous now?

Status: PARTIALLY WORKING

The route returns early with a job ID in [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js), but the actual pipeline is still being run in the same Node process by calling `runPipeline()` as a background function.

The expected pipeline state is:

```text
Upload
 -> Job created
 -> Queue
 -> Worker
 -> Agent 1..6
 -> Completed
```

Actual code path:

```text
Upload route
 -> createJob()
 -> monitor_agent runs synchronously for a few db writes
 -> runPipeline(jobId, ...) is invoked directly
 -> sequential stage run in JS, no Redis/BullMQ queue or separate worker
```

### 8.2 Which queue technology is actually being used?

Status: NOT IMPLEMENTED

There is no BullMQ, Agenda, or Redis worker logic in the codebase.

Evidence:

- [acris/backend/jobs/pipelineOrchestrator.js](acris/backend/jobs/pipelineOrchestrator.js) is plain async logic
- [docker-compose.yml](docker-compose.yml) includes Redis, but no consumer or queue code is connected to it
- no `bullmq`, `ioredis`, `bee-queue`, or `agenda` dependency exists in [acris/backend/package.json](acris/backend/package.json)

### 8.3 Is Redis actually connected to the queue?

Status: NOT IMPLEMENTED

There is a Redis service defined in [docker-compose.yml](docker-compose.yml), but there is no actual connection or job queue code using it.

### 8.4 Is the worker separate from the API?

Status: NOT IMPLEMENTED

The `worker` service in [docker-compose.yml](docker-compose.yml) only runs a placeholder command:

```yaml
command: python -c "print('ACRIS worker container ready - queue implementation is the next phase')"
```

This is not a real worker process.

### 8.5 Can two PDFs be processed independently?

Status: NOT WORKING

Because there is no real queue system, uploads are processed in a direct JS async process inside the API runtime. The code still behaves like a single process pipeline rather than independent job workers.

### 8.6 Does one long PDF block another request?

Status: YES, in effect

The direct `runPipeline()` process would still run in the same API process and can block the event loop in practice, especially when the stage timeout and sequential calls are in effect.

### 8.7 What if the worker crashes halfway through a job?

Status: UNKNOWN / NOT IMPLEMENTED

No actual queue or worker crash recovery is present.

### 8.8 What if an individual AI agent fails?

Status: PARTIALLY WORKING

The orchestrator catches errors and marks the job as failed in [acris/backend/jobs/pipelineOrchestrator.js](acris/backend/jobs/pipelineOrchestrator.js).

However:

- there is no retry policy implemented in the code
- no stage-level retry queue backed by the worker
- no stale recovery mechanism

### 8.9 Are retries implemented?

Status: NOT IMPLEMENTED

No queue retry/backoff logic is visible.

### 8.10 Can a job become permanently stuck in running/processing/pending?

Status: YES, possible in current design

The code marks job status as failed on outer catch, but there is no stale-job sweep or recovery for crashed worker processes or partial job completion.

### 8.11 Is there stale-job recovery?

Status: NOT IMPLEMENTED

No stale-job recovery, no queue monitor, no worker heartbeat, no queue retry/resume logic.

---

## 9) AI / LLM audit

### 9.1 Exactly which AI/LLM is the system using right now?

Status: VERIFIED

Provider: Ollama
Model: default `llama3` via `OLLAMA_MODEL`
Version/tag: not pinned beyond `llama3`; runtime environment variable sets the model name
Local or cloud: local
API: Ollama HTTP API at `http://localhost:11434`
Embedding model: `OLLAMA_MODEL` is used for embeddings by default in [acris/agents/chroma_store.py](acris/agents/chroma_store.py)
Vector database: Chroma persistent client in [acris/agents/chroma_store.py](acris/agents/chroma_store.py)
Temperature: 0.1 in [acris/agents/llm.py](acris/agents/llm.py)
Context window: not explicitly configured or managed in the code

### 9.2 Is Ollama actually being called or is it fake/mock/deterministic?

Status: ACTUAL OLLAMA CALLS ARE PRESENT

Evidence:

- [acris/agents/llm.py](acris/agents/llm.py) uses `from langchain_community.llms import Ollama`
- [acris/agents/llm.py](acris/agents/llm.py) constructs `Ollama(model=..., base_url=...)`
- [acris/agents/chroma_store.py](acris/agents/chroma_store.py) calls `requests.post(.../api/embeddings)` to Ollama if `EMBEDDING_PROVIDER` is not set to `hashing`

This is real Ollama usage, not a mock.

### 9.3 Exact code path: Agent → LLM wrapper → Ollama/API → model → response

Status: VERIFIED

Examples:

- [acris/agents/diff_agent.py](acris/agents/diff_agent.py) calls `try_generate()`
- [acris/agents/llm.py](acris/agents/llm.py) defines `try_generate()` and uses `get_llm()`
- `get_llm()` returns `Ollama(...)`
- `Ollama.invoke(prompt)` makes the actual API call to local Ollama server
- response is returned as string and parsed to JSON or fallback text

### 9.4 Which agents use the LLM?

- [acris/agents/diff_agent.py](acris/agents/diff_agent.py)
- [acris/agents/drafting_agent.py](acris/agents/drafting_agent.py)
- [acris/agents/report_agent.py](acris/agents/report_agent.py)

### 9.5 Which agents use deterministic logic?

- [acris/agents/monitor_agent.py](acris/agents/monitor_agent.py) performs basic DB insert logic
- [acris/agents/parser_agent.py](acris/agents/parser_agent.py) does PDF extraction with PyMuPDF
- [acris/agents/shared.py](acris/agents/shared.py) contains pure deterministic helpers such as `split_clauses()` and `best_match()`

### 9.6 Which agents use embeddings?

- [acris/agents/chroma_store.py](acris/agents/chroma_store.py)
- [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py) queries Chroma embeddings
- [acris/agents/policy_ingest.py](acris/agents/policy_ingest.py) calls `embed_document()`

### 9.7 Which embedding model is actually being used?

Status: VERIFIED

By default, [acris/agents/chroma_store.py](acris/agents/chroma_store.py) calls `OllamaEmbeddingFunction(model_name=model, url=...)` where `model` is `OLLAMA_MODEL` defaulting to `llama3`.

There is also a legacy manual hashing embedding function that remains in the same file.

### 9.8 Is the embedding implementation production-quality or hand-rolled?

Status: PARTIALLY WORKING / NOT PRODUCTION-GRADE

The repo contains a hand-rolled hashing embedding implementation in [acris/agents/chroma_store.py](acris/agents/chroma_store.py):

- `HashingEmbeddingFunction`
- tokenizes text, hashes each token, and creates a 384-dim vector by bucket counts

This is not a real semantic embedding model. It is a bag-of-words token-hash method. It is therefore not equivalent to a real sentence-embedding model and is not production-grade for semantic retrieval.

---

## 10) AI hallucination / prompt injection audit

### 10.1 Does the system store evidence for every AI-generated mapping?

Status: NOT IMPLEMENTED

The model schema has some version fields but no evidence block in [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js).

### 10.2 Does every mapping contain regulatory source, regulation version, clause, company document, document version, section/page, document chunk?

Status: NOT IMPLEMENTED

Not in the code as currently used.

The model defines some fields like `regulationVersion`, `documentVersionId`, `policy_section`, but they are not wired into live generation in [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py).

### 10.3 Do LLM prompts explicitly instruct that retrieved text is data, not instructions?

Status: NOT IMPLEMENTED

No clear prompt boundary or instruction like “these blocks are data, not instructions” is visible in the actual prompt templates in [acris/agents/prompts_registry.py](acris/agents/prompts_registry.py).

### 10.4 Is prompt injection protection implemented?

Status: PARTIALLY WORKING

The `drafting_agent.py` file does basic validation for a leaked prompt or empty response, but it is not a real injection defense system. There is no sanitization of retrieved content before sending it to the LLM, no marker blocks, and no explicit “data not instructions” boundary.

### 10.5 Conceptual test: document text contains “IGNORE PREVIOUS INSTRUCTIONS…”

Status: UNKNOWN for real runtime, but by code inspection the system is not robustly protected

There is no content sanitization in [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py) or [acris/agents/drafting_agent.py](acris/agents/drafting_agent.py) before sending the text to the LLM. So a malicious retrieved chunk could still influence the model if the model follows the instruction.

### 10.6 Is the LLM output schema validated?

Status: PARTIALLY WORKING

`diff_agent.py` has `parse_json_response()` which catches JSON parse errors and returns `{}`. This is weak validation and not real schema validation.

### 10.7 If invalid JSON is returned, does the system retry, correct, fallback, or log failure?

Status: PARTIALLY WORKING

- fallback exists in [acris/agents/llm.py](acris/agents/llm.py): `try_generate()` catches exceptions and returns the fallback
- invalid JSON in [acris/agents/diff_agent.py](acris/agents/diff_agent.py) is caught and replaced with a default modified message
- no structured retry/correction loop is implemented

### 10.8 Can the system distinguish draft_source = llm vs fallback?

Status: PARTIALLY WORKING

Evidence:

- [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js) has `draft_source: { enum: ["llm", "fallback"] }`
- [acris/agents/drafting_agent.py](acris/agents/drafting_agent.py) sets `draft_source` to `fallback` or `llm`

This is real but incomplete because the UI and report generation do not consistently show or validate this flag in downstream artifacts.

---

## 11) RAG / Chroma audit

### 11.1 Explain the actual RAG flow

Status: VERIFIED

Actual flow in code:

- PDF uploaded through [acris/backend/routes/policies.js](acris/backend/routes/policies.js)
- [acris/agents/policy_ingest.py](acris/agents/policy_ingest.py) extracts text from PDF
- `embed_document(...)` from [acris/agents/chroma_store.py](acris/agents/chroma_store.py) writes document to Chroma
- [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py) calls `query_similar(...)`
- matching chunks are ranked by distance-based relevance
- mapping is saved back to `impactmappings`
- LLM is then called via [acris/agents/drafting_agent.py](acris/agents/drafting_agent.py)

This is the real pipeline in the repo.

### 11.2 Is Chroma actually used for company policy retrieval?

Status: YES

Evidence:

- [acris/agents/chroma_store.py](acris/agents/chroma_store.py) creates a persistent Chroma collection `company_policies`
- [acris/agents/policy_ingest.py](acris/agents/policy_ingest.py) calls `embed_document`
- [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py) calls `query_similar`

### 11.3 Does every vector contain metadata for organizationId, documentId, documentVersionId, documentType, ownerTeam, embeddingVersion?

Status: NOT IMPLEMENTED

Actual metadata from Chroma is only:

- `name`
- `doc_id`
- extra metadata like `type` and `owner_team`

The metadata set does not include `organizationId`, `documentVersionId`, `documentType`, `ownerTeam`, or `embeddingVersion` in the actual `embed_document` call in [acris/agents/chroma_store.py](acris/agents/chroma_store.py).

### 11.4 Can vectors from Org A be returned for Org B?

Status: NOT PROTECTED

The code does not enforce metadata filters like `organizationId` or `documentVersionId` in Chroma queries. It relies on the user’s organization in the Mongo query path, but the vector retrieval itself does not use those filters in a controlled way.

### 11.5 Can old document version vectors return after an update?

Status: YES, possible under current code

The code still stores documents under a single Chroma collection with no version namespace or filter logic. So stale versions can be reused if the index is not rebuilt properly.

### 11.6 Is embeddingVersion implemented?

Status: PARTIALLY WORKING

The schema has `embeddingVersion` on [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js) and [acris/backend/models/DocumentChunk.js](acris/backend/models/DocumentChunk.js), but there is no actual versioned Chroma cutover or read filter in the retrieval flow.

### 11.7 Is there protection against mixing embedding generations?

Status: NOT IMPLEMENTED

No versioned collection or metadata-based filtering is implemented.

---

## 12) Reports / compliance output

### 12.1 Is the final report generated from actual pipeline results or static template text?

Status: PARTIALLY WORKING

The report is generated from actual regulation and mapping data in [acris/agents/report_agent.py](acris/agents/report_agent.py), but the content is not fully evidence-driven or version-aware.

### 12.2 Does the report contain the required fields?

Status: PARTIALLY WORKING

The report includes:

- regulation title
- regulation source
- total changes
- docs affected
- critical_count
- plain language summary
- recommended actions

It does not include a full set of the required evidence metadata such as:

- regulation version
- company document version
- evidence chain
- confidence
- reviewer status
- deadline tracking with proper business state

### 12.3 Can the report explain why a policy was considered impacted?

Status: PARTIALLY WORKING

The report does include `affected_clauses` and relevance scores in [acris/agents/report_agent.py](acris/agents/report_agent.py), but there is no complete evidence chain from clause to document chunk to version metadata.

### 12.4 Can a reviewer trace the chain from regulation clause to evidence to recommendation?

Status: NOT IMPLEMENTED

No real evidence linkage is present in the code path.

---

## 13) Security audit

### 13.1 Is JWT auth implemented correctly?

Status: PARTIALLY WORKING

Evidence: [acris/backend/middleware/auth.js](acris/backend/middleware/auth.js) verifies JWT and checks required claims.

But it is not fully hardened because:

- default secret in [acris/backend/config/index.js](acris/backend/config/index.js) is weak
- `.env` file is present in the repo root with a non-production secret placeholder
- route coverage is incomplete

### 13.2 Are passwords hashed securely?

Status: WORKING

Evidence: [acris/backend/services/authService.js](acris/backend/services/authService.js) uses `bcrypt.hash(password, 12)` and `bcrypt.compare()`.

### 13.3 Is JWT secret configuration safe?

Status: NOT WORKING by default

Evidence: [acris/backend/config/index.js](acris/backend/config/index.js) contains:

```js
jwtSecret: process.env.JWT_SECRET || "your_jwt_secret_here";
```

This is not safe as a default in production.

### 13.4 Are uploads validated for file type, size, malicious files, path traversal, duplicate uploads?

Status: PARTIALLY WORKING

- file type: yes for regulations in [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js)
- file size: yes for regulations in [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js) with 20 MB limit
- malicious files: not explicitly checked
- path traversal: safe file names are generated, but not a full secure upload validation strategy
- duplicate uploads: createJob idempotency exists in [acris/backend/services/jobService.js](acris/backend/services/jobService.js)
- `policies.js` upload does not have fileFilter or size limits

### 13.5 Can a user download another organization’s report by guessing an ID?

Status: PROTECTED by org access in the route, but not fully hardened end-to-end

Evidence: [acris/backend/routes/reports.js](acris/backend/routes/reports.js) uses `requireOrgAccess({ Model: Report, ... })`.

### 13.6 Can a user approve/reject another organization’s amendment by guessing an ID?

Status: PROTECTED by org access in the actual route defense

Evidence: [acris/backend/routes/amendments.js](acris/backend/routes/amendments.js)

### 13.7 Are rate limits implemented?

Status: NOT IMPLEMENTED

No `express-rate-limit` usage exists in the repo.

### 13.8 Are secrets accidentally committed to Git?

Status: YES, at least one `.env` file is present in the repo root

Evidence: root file exists at [acris/.env](acris/.env) and is likely part of the workspace. This is not a secure production practice.

Dangerous secret-like values present in repo:

- [acris/backend/config/index.js](acris/backend/config/index.js): default JWT secret and admin password fallback
- [acris/.env](acris/.env): `MONGODB_URI`, `JWT_SECRET`
- [acris/README.md](acris/README.md): example env values

---

## 14) Testing audit

### 14.1 Run/list all existing tests

Status: VERIFIED

Node tests in [acris/backend/tests](acris/backend/tests):

- [acris/backend/tests/amendments.org-access.test.js](acris/backend/tests/amendments.org-access.test.js)
- [acris/backend/tests/auth.login.test.js](acris/backend/tests/auth.login.test.js)
- [acris/backend/tests/dashboardService.test.js](acris/backend/tests/dashboardService.test.js)
- [acris/backend/tests/regulations.auth.test.js](acris/backend/tests/regulations.auth.test.js)

Python tests:

- [acris/agents/test_diff_agent.py](acris/agents/test_diff_agent.py)

### 14.2 What percentage of important functionality has automated tests?

Status: LOW

Only a small subset is covered:

- auth failure
- org access check
- dashboard service aggregation
- regulation auth guard
- one diff helper partial-failure case

The meaningful pipeline items are mostly untested, such as:

- queue processing
- worker failure handling
- PDF parsing
- multi-tenancy in all routes
- version comparison regression test
- mapping quality/retrieval quality
- prompt injection
- report generation

### 14.3 Does the repo have tests for all the required areas?

Status: NO

Missing coverage for the requested items:

- Authentication: partial
- RBAC: partial
- Multi-tenancy: partial at best
- PDF parsing: no clear test suite
- Version comparison: no regression suite
- Diff detection: partial only in one Python sample test
- Policy mapping: no tests
- LLM failure: no tests
- LLM fallback: no tests
- Prompt injection: no tests
- Queue processing: no tests
- Worker failure: no tests
- Report generation: no tests

### 14.4 Is there at least one complete E2E flow?

Status: NOT IMPLEMENTED

The app does not have an end-to-end flow from login → upload V1 → upload V2 → detect change → map policy → generate amendment → review → approve/reject.

### 14.5 Test run results from this repo (fresh verification)

Status: Verified by terminal output.

#### `npm test`

Result: PASS

Evidence: 4 passing tests, 0 failing.

#### `npm run lint`

Result: PASS in shell script sense, but not meaningful linting because backend lint is stubbed.

Evidence:

```text
> backend@1.0.0 lint
> echo 'ESLint not configured yet for backend'
```

#### `npm run build`

Result: PASS

Evidence: Vite build succeeded and produced production assets.

#### `pytest`

Result: FAIL during import/collection

Evidence:

```text
ModuleNotFoundError: No module named 'langchain_community'
```

This is a real environment/dependency issue, not a code logic failure.

---

## 15) Answers to the user’s numbered questions (compressed QA)

### Q1. Overall Phase 1–11 status

Status: PARTIALLY WORKING overall. The repo includes real code for routing, auth, Mongo models, agent pipeline, Chroma, and Ollama, but not all of the required architecture in the implementation plan is consistently wired or production-ready.

### Q2. For each checked task in IMPLEMENTATION.md, what code proves it?

This can only be partially proven. The strongest real examples are:

- Router + dashboard: [acris/frontend/src/app/router.jsx](acris/frontend/src/app/router.jsx), [acris/frontend/src/pages/Dashboard.jsx](acris/frontend/src/pages/Dashboard.jsx)
- Auth: [acris/backend/middleware/auth.js](acris/backend/middleware/auth.js), [acris/backend/services/authService.js](acris/backend/services/authService.js)
- Multi-tenancy models: [acris/backend/models/User.js](acris/backend/models/User.js), [acris/backend/models/Organization.js](acris/backend/models/Organization.js), [acris/backend/models/ComplianceJob.js](acris/backend/models/ComplianceJob.js)
- Agent pipeline: [acris/agents/monitor_agent.py](acris/agents/monitor_agent.py), [acris/agents/parser_agent.py](acris/agents/parser_agent.py), [acris/agents/diff_agent.py](acris/agents/diff_agent.py), [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py), [acris/agents/drafting_agent.py](acris/agents/drafting_agent.py), [acris/agents/report_agent.py](acris/agents/report_agent.py)

### Q3. For each unchecked item, was functionality implemented elsewhere?

Some items are partially implemented elsewhere:

- async job architecture = partial in [acris/backend/jobs/pipelineOrchestrator.js](acris/backend/jobs/pipelineOrchestrator.js)
- document version models = partial in [acris/backend/models/CompanyDocumentVersion.js](acris/backend/models/CompanyDocumentVersion.js)
- draft source = partial in [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js)
- queue services and job status = partial in [acris/backend/models/ComplianceJob.js](acris/backend/models/ComplianceJob.js)

But there is no full implementation of the later phases such as Redis worker queue, audit events, stale detection, connector abstractions, or real document sync.

### Q4. Main contradiction between plan and repository

Status: YES, there are contradictions.

The implementation plan describes a much more complete system than the current codebase actually delivers. The repository has partial scaffolding and some real functionality, but major plan items are still future work or unintegrated code.

---

## 16) Final conclusion

### Verified code status

The codebase is real and functional for a limited local proof-of-concept pipeline, but it is not yet the full system described in the implementation plan.

The strongest actual implementation points are:

- JWT auth with user and org data
- React router shell
- Mongo-based regulation/job/report records
- Python regulation diffing and report generation
- Chroma indexing and retrieval
- Ollama LLM use
- basic approval/rejection route protection

The biggest missing or broken items are:

- real Redis/BullMQ worker queue
- real job-detail polling UI
- true document version tracking in the active pipeline
- true stale recommendation detection
- prompt-injection hardening
- connector architecture and sync workflow
- production security hardening
- comprehensive test suite

This repository is best described as a partially working prototype with several real components, not a fully implemented production-grade compliance system.

---

## 17) V1/V2 regulation + company policy version stale-check trace

### Short answer

Status: NO — not correctly, not end-to-end, and not safely.

If Regulation V1 is uploaded on day 1, then Regulation V2 with one changed clause is uploaded six months later, while the company policy was also updated in the meantime, the current ACRIS code does not reliably answer all four questions in a safe way:

1. which regulation version changed
2. which company policy version was analyzed
3. whether the older AI recommendation is stale
4. whether the system blocks publishing an outdated recommendation against the newer policy

### Actual code path for V1 and V2

#### Step A: V1 upload

- [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js) accepts the regulation PDF.
- It calls `createJob()` in [acris/backend/services/jobService.js](acris/backend/services/jobService.js).
- It then calls `runAgent("monitor_agent.py", ...)` for the fast DB insert.
- [acris/agents/monitor_agent.py](acris/agents/monitor_agent.py) checks the latest same `organizationId`, `source`, and `title`, then computes:

```python
latest = db.regulations.find_one(
    {"organizationId": object_id(organization_id), "source": source, "title": title},
    sort=[("version", -1)],
)
version = (latest.get("version", 0) + 1) if latest else 1
```

This means the repo does track a sequential `version` field for regulation records. So for V1, version = 1 is created.

#### Step B: V2 upload six months later

- The same monitor_agent logic repeats on upload.
- It finds the latest regulation for the same org/source/title and increments the version.
- That is the real versioning logic in [acris/agents/monitor_agent.py](acris/agents/monitor_agent.py).

So the code can determine that a new regulation version exists and increments it. That part works.

#### Step C: diffing V2 against previous version

- [acris/agents/diff_agent.py](acris/agents/diff_agent.py) loads the regulation by `_id` and then searches for the previous version using:

```python
previous = db.regulations.find_one(
    {
        "organizationId": regulation.get("organizationId"),
        "source": regulation.get("source"),
        "title": regulation.get("title"),
        "version": {"$lt": regulation.get("version", 1)},
    },
    sort=[("version", -1)],
)
```

This is the real V1/V2 comparison path.

What it does correctly:

- it can find the immediately prior rule version
- it can compare the new clause text against the old clause text
- it can produce `added`, `modified`, and `removed` change entries

What it does not do correctly:

- it does not persist a clear `old_version`/`new_version` pair in the diff output
- it does not record each diff with evidence metadata
- it does not record `confidence`, `evidence`, `source_version`, or `policy_version` context
- it does not explicitly mark a clause as `unchanged` or `renumbered`

So: ACRIS can discover the previous version and compare V1 vs V2 at a clause level, but not with a robust audit trail.

#### Step D: policy upload and policy version tracking

- The company policy upload path is in [acris/backend/routes/policies.js](acris/backend/routes/policies.js).
- The actual ingestion is in [acris/agents/policy_ingest.py](acris/agents/policy_ingest.py).
- That function does this:

```python
doc = db.companydocs.insert_one({
    "organizationId": object_id(organization_id),
    "name": name,
    "type": doc_type,
    "content_text": content_text,
    "embedding_id": "",
    "file_path": pdf_path,
    "last_updated": datetime.utcnow(),
    "owner_team": owner_team,
})
```

and then:

```python
embed_document(doc_id, name, content_text, {"type": doc_type, "owner_team": owner_team})
```

This means the repo stores the uploaded policy as a document record, but there is no version number, no document version record ID, and no policy version lineage. It records `last_updated`, but not `policyVersion` or `documentVersionId` in a reliable, traceable way.

So the code can tell there is a policy doc, but not exactly which version of the policy was analyzed when the mapping or recommendation was generated.

#### Step E: mapping generation and policy version used

The mapping step is in [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py).

The critical logic is:

```python
doc = db.companydocs.find_one({
    "embedding_id": doc_id,
    "organizationId": regulation.get("organizationId"),
}) or db.companydocs.find_one({
    "_id": object_id(doc_id),
    "organizationId": regulation.get("organizationId"),
})
```

Then it writes to impactmappings:

```python
db.impactmappings.update_one(
    {"regulation_id": object_id(regulation_id), "doc_id": doc["_id"]},
    {
        "$set": {
            "organizationId": regulation.get("organizationId"),
            "regulation_id": object_id(regulation_id),
            "doc_id": doc["_id"],
            "relevance_score": entry["relevance_score"],
            "affected_clauses": entry["affected_clauses"],
            "clause": first_change.get("clause", ""),
            "clause_text": first_change.get("new_text") or first_change.get("old_text") or "",
            "old_text": first_change.get("old_text", ""),
            "new_text": first_change.get("new_text", ""),
            "policy_section": doc.get("name", ""),
            "reviewStatus": "pending",
        },
```

This proves:

- the mapping stores a `doc_id` for the policy document
- it stores the regulation id and clause info
- but it does not store an immutable `documentVersionId`, `sourceDocumentHash`, `embeddingVersion`, `policyVersion`, or `effectiveFrom` timestamp
- it also does not compare the policy document's change date against the time the recommendation was generated

So ACRIS knows which policy document record it matched against, but not which policy version it was relative to a changed policy file.

#### Step F: stale recommendation detection

The stale concept exists in the schema, not in the runtime logic:

- [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js) has an `implementationStatus` enum including `"stale"`.
- But no actual code sets `implementationStatus` to `stale`.
- [acris/backend/routes/amendments.js](acris/backend/routes/amendments.js) only updates `reviewStatus` to `approved` or `rejected`.
- There is no check that compares:
  - recommendation generation time
  - policy document last_updated
  - regulation version
  - policy version hash
  - current document override state

So stale detection is not implemented.

#### Step G: prevent publishing outdated recommendation over newer policy

This is the critical failure.

There is no code path that does this:

- compare recommendation generation date with policy `last_updated`
- compare current policy `last_updated` to the policy document that was used in the mapping
- compare current regulation version with the version used in the recommendation
- reject approve/publish if old version is stale
- force re-run of mapping and draft generation when policy file changes

The only protection present is org access in [acris/backend/middleware/requireOrgAccess.js](acris/backend/middleware/requireOrgAccess.js), which guards by organization only. It does not protect against stale recommendation publication.

### This means the system cannot safely answer the user’s full scenario

#### Can it determine which regulation version changed?

Partially yes.

- [acris/agents/monitor_agent.py](acris/agents/monitor_agent.py) increments `version`
- [acris/agents/diff_agent.py](acris/agents/diff_agent.py) finds the prior version by `version: { "$lt": ... }`
- This part works.

#### Can it determine which company policy version was analyzed?

No.

- [acris/agents/policy_ingest.py](acris/agents/policy_ingest.py) only creates a document record with `last_updated`
- no `policy_version`, `documentVersionId`, `sourceDocumentHash`, `effectiveAt`, or versioned policy lineage is enforced
- [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py) stores only the doc record `_id`, not the policy version lineage

#### Can it detect if the previous recommendation is stale?

No.

- `implementationStatus: "stale"` exists in the schema but is never actually set in runtime code
- there is no logic comparing policy change dates or recommendation timestamps

#### Can it prevent outdated recommendation publication over a newer policy?

No.

- there is no stale-check before approve
- there is no blocking logic in the route layer before [acris/backend/routes/amendments.js](acris/backend/routes/amendments.js) marks a recommendation as approved
- the user can approve based only on org access, not freshness or version validation

### Exact code path summary for the scenario

```text
Upload V1
 -> monitor_agent.py sets version = 1
 -> regulation stored with organizationId/source/title/version

Six months later upload V2
 -> monitor_agent.py finds latest same org/source/title and sets version = 2
 -> diff_agent.py finds previous version with version < 2 and compares clauses

Company policy changed in meantime
 -> policy_ingest.py inserts new companydoc record with last_updated, no version lineage
 -> mapping_agent.py matches to doc_id and writes impactmapping with doc_id and regulation_id
 -> drafting_agent.py generates draft using that doc content as currently stored

Recommend / approve
 -> amendments.js only checks org access and reviewStatus, no stale/version validation
 -> stale detection is absent
 -> outdated recommendation may be approved against newer policy
```

### Final verdict for Q17

Status: NOT WORKING for the full requirement.

The repo does implement basic regulation version detection and a coarse clause diff, but it does not implement a complete evidence chain for versioned policy analysis and stale recommendation prevention. So the answer is: ACRIS cannot correctly determine the full V1-to-V2 plus policy-change state in a production-safe manner, and it cannot prevent publishing an outdated recommendation over a newer company policy.

---

## 18) Phase 1–11 final readiness report

### 1. `WORKING`

- Real Node/Express backend bootstrap and route registration in [acris/backend/app.js](acris/backend/app.js)
- JWT auth middleware in [acris/backend/middleware/auth.js](acris/backend/middleware/auth.js)
- Org-scoped access enforcement in [acris/backend/middleware/requireOrgAccess.js](acris/backend/middleware/requireOrgAccess.js)
- Dashboard API and service pattern in [acris/backend/routes/dashboard.js](acris/backend/routes/dashboard.js) and [acris/backend/services/dashboardService.js](acris/backend/services/dashboardService.js)
- Basic auth tests in [acris/backend/tests/auth.login.test.js](acris/backend/tests/auth.login.test.js)
- Amendments org-access tests in [acris/backend/tests/amendments.org-access.test.js](acris/backend/tests/amendments.org-access.test.js)
- Dashboard service tests in [acris/backend/tests/dashboardService.test.js](acris/backend/tests/dashboardService.test.js)
- Regulation auth guard tests in [acris/backend/tests/regulations.auth.test.js](acris/backend/tests/regulations.auth.test.js)
- Real upload route flow with job creation in [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js)
- Real Python agent pipeline in [acris/agents/monitor_agent.py](acris/agents/monitor_agent.py), [acris/agents/parser_agent.py](acris/agents/parser_agent.py), [acris/agents/diff_agent.py](acris/agents/diff_agent.py), [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py), [acris/agents/drafting_agent.py](acris/agents/drafting_agent.py), and [acris/agents/report_agent.py](acris/agents/report_agent.py)
- Basic React route shell in [acris/frontend/src/app/router.jsx](acris/frontend/src/app/router.jsx)
- Frontend production build passes via Vite

### 2. `PARTIALLY WORKING`

- Async upload contract: the route returns a job ID and starts a background pipeline in [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js), but it is not a real queue/worker system
- Pipeline orchestration in [acris/backend/jobs/pipelineOrchestrator.js](acris/backend/jobs/pipelineOrchestrator.js)
- Job model in [acris/backend/models/ComplianceJob.js](acris/backend/models/ComplianceJob.js)
- Multi-tenancy fields in models across [acris/backend/models](acris/backend/models)
- Chroma retrieval and embedding calls in [acris/agents/chroma_store.py](acris/agents/chroma_store.py)
- Draft source tracking in [acris/agents/drafting_agent.py](acris/agents/drafting_agent.py) and [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js)
- Dashboard UI data flow in [acris/frontend/src/pages/Dashboard.jsx](acris/frontend/src/pages/Dashboard.jsx)
- Approval/rejection routes in [acris/backend/routes/amendments.js](acris/backend/routes/amendments.js)
- Basic diffing and version detection in [acris/agents/diff_agent.py](acris/agents/diff_agent.py)
- Regulation version field in [acris/backend/models/Regulation.js](acris/backend/models/Regulation.js)

### 3. `BROKEN`

- The asynchronous pipeline is not a real queue/worker design; it is a direct JS function call inside the API process in [acris/backend/jobs/pipelineOrchestrator.js](acris/backend/jobs/pipelineOrchestrator.js)
- No stale recommendation detection exists despite `implementationStatus: "stale"` in [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js)
- No versioned policy lineage exists in the active code path, so a new policy version cannot be reliably tied to a recommendation
- No publish gate exists to stop an outdated recommendation from being approved over a newer policy
- The frontend still presents a synchronous upload experience in [acris/frontend/src/components/UploadPanel.jsx](acris/frontend/src/components/UploadPanel.jsx), contradicting real background-job behavior
- Python tests fail to run because the environment missing `langchain_community` blocks imports in the agent layer

### 4. `NOT IMPLEMENTED`

- Redis/BullMQ worker queue
- Separate worker container and actual queue consumer
- Real event-driven job retries and backoff
- Real stale-job recovery
- Document version registry enforcement in active runtime flow
- Policy change sync and external connector layer
- Document version/time-based policy freshness validation
- Prompt injection defense architecture
- Evidence provenance chain from clause → doc chunk → recommendation → reviewer approval
- Detailed audit logging and governance event history
- Job detail UI and polling flow in frontend
- True multi-tenant policy sync and reconciliation layer
- CI/CD pipeline and production deployment hardening

### 5. `FALSE/STALE CHECKBOXES IN IMPLEMENTATION.md`

The implementation plan contains many items that are only partially represented in the repo but are not fully complete. The repo is not at the production target described by the plan.

False/stale checkbox examples:

- “real async queue + worker” → not implemented; present only as a placeholder in [docker-compose.yml](docker-compose.yml)
- “document version registry fully wired” → partially modeled, not used in active agent flow
- “drafting hardening and evidence provenance” → only partial validation exists in [acris/agents/drafting_agent.py](acris/agents/drafting_agent.py)
- “stale recommendation detection” → no runtime enforcement
- “publish workflow safety” → no stale check before approval
- “full test suite” → not implemented; only narrow Node tests and one partial Python test exist
- “security hardening” → weak default JWT secret and environment file risk remain

### 6. `SECURITY RISKS`

- JWT fallback secret is weak in [acris/backend/config/index.js](acris/backend/config/index.js)
- `.env`-style secrets are present in repo areas, which creates secret leakage risk
- route coverage is incomplete and some public bootstrap routes remain in [acris/backend/app.js](acris/backend/app.js)
- upload validation is partial: PDF type checks exist, but not full malware/path traversal hardening
- rate-limiting is not implemented
- no strict CSRF/CORS policy is evident
- no audit log for document and recommendation approvals

### 7. `AI/LLM RISKS`

- Model output is not strongly schema-validated before being stored or displayed
- Prompt injection risk exists because retrieved policy text is passed directly to the LLM without robust sanitization or instruction boundary markers
- `drafting_agent.py` does some fallback checks, but not full adversarial prompt protection
- Chroma retrieval is similarity-based and not version-aware, so older policy text can be used against new policy decisions
- LLM fallback logic can produce generic text that may look authoritative even when it is heuristic
- No confidence/calibration scoring is enforced in the core output path

### 8. `DATA/VERSIONING RISKS`

- Regulation versioning is only partially implemented and not robustly chained to policy version and recommendation evidence
- Policy version is not tracked as a real `documentVersionId` or `policyVersion` in runtime logic
- Older policy embeddings and new policy embeddings live in the same Chroma collection with no namespace or version boundary in [acris/agents/chroma_store.py](acris/agents/chroma_store.py)
- `ImpactMapping` schema references versioning fields, but the actual mapping logic in [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py) does not populate them
- Stale recommendations can be generated and approved without freshness validation
- A recommendation can be generated from V1 policy and approved against V2 policy without detecting the mismatch

### 9. `FRONTEND RISKS`

- Upload UI still claims synchronous processing instead of real job tracking in [acris/frontend/src/components/UploadPanel.jsx](acris/frontend/src/components/UploadPanel.jsx)
- No job detail page or polling UI exists, so users cannot monitor a true background pipeline
- Dashboard statuses are static and not tied to actual job-stage state
- Approval/rejection actions on the frontend are not guarded against stale recommendation state
- There is no stale or warning banner when a recommendation was generated from outdated evidence

### 10. `BACKEND RISKS`

- Direct route-level business logic remains in [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js), [acris/backend/routes/policies.js](acris/backend/routes/policies.js), and [acris/backend/routes/amendments.js](acris/backend/routes/amendments.js)
- No true centralized approval/publish policy exists
- `requireOrgAccess` protects only by org, not by version or freshness
- No transaction boundary is enforced across regulation diff, policy mapping, and recommendation generation
- No event-sourcing or audit trail for policy-change decisions
- Upload route triggers the pipeline directly instead of a trustworthy queue/worker with persistence and retry

### 11. `SCALING/MICROSERVICE RISKS`

- The app is still effectively a monolith in one API process; there is no real brokered queue or worker partitioning
- The `runPipeline` logic runs sequentially and can block request handling in the same process
- The Python agents are invoked from Node by external process calls, but not isolated by worker pool or queue scheduler
- No horizontal scaling strategy, no idempotent worker leases, no dead-letter queue, no retry backlog, and no worker heartbeat
- A full production deployment would require a real queue, scheduler, message contract, and worker health monitoring

### 12. `TESTING GAPS`

- Only a narrow subset of backend auth and org-access logic is covered by tests
- No regression tests for V1/V2 diff accuracy or single-clause changes
- No data-version or stale recommendation tests
- No policy ingestion/version lineage tests
- No queue-worker test suite
- No LLM failure/fallback test suite
- No UI integration tests for upload-to-job-to-review flow
- No end-to-end policy update and stale-prevention test
- A real Python dependency blocker is present (`ModuleNotFoundError: No module named 'langchain_community'`)

### 13. `EXACT FILES THAT MUST CHANGE`

This is the minimum set of files that must be addressed for Phase 1–11 to be even close to production-ready:

- [acris/backend/routes/regulations.js](acris/backend/routes/regulations.js)
- [acris/backend/routes/policies.js](acris/backend/routes/policies.js)
- [acris/backend/routes/amendments.js](acris/backend/routes/amendments.js)
- [acris/backend/jobs/pipelineOrchestrator.js](acris/backend/jobs/pipelineOrchestrator.js)
- [acris/backend/services/jobService.js](acris/backend/services/jobService.js)
- [acris/backend/models/ComplianceJob.js](acris/backend/models/ComplianceJob.js)
- [acris/backend/models/Regulation.js](acris/backend/models/Regulation.js)
- [acris/backend/models/CompanyDocument.js](acris/backend/models/CompanyDocument.js)
- [acris/backend/models/CompanyDocumentVersion.js](acris/backend/models/CompanyDocumentVersion.js)
- [acris/backend/models/DocumentChunk.js](acris/backend/models/DocumentChunk.js)
- [acris/backend/models/ImpactMapping.js](acris/backend/models/ImpactMapping.js)
- [acris/backend/middleware/requireOrgAccess.js](acris/backend/middleware/requireOrgAccess.js)
- [acris/backend/config/index.js](acris/backend/config/index.js)
- [acris/backend/app.js](acris/backend/app.js)
- [acris/agents/monitor_agent.py](acris/agents/monitor_agent.py)
- [acris/agents/diff_agent.py](acris/agents/diff_agent.py)
- [acris/agents/mapping_agent.py](acris/agents/mapping_agent.py)
- [acris/agents/drafting_agent.py](acris/agents/drafting_agent.py)
- [acris/agents/report_agent.py](acris/agents/report_agent.py)
- [acris/agents/policy_ingest.py](acris/agents/policy_ingest.py)
- [acris/agents/chroma_store.py](acris/agents/chroma_store.py)
- [acris/agents/llm.py](acris/agents/llm.py)
- [acris/frontend/src/pages/Dashboard.jsx](acris/frontend/src/pages/Dashboard.jsx)
- [acris/frontend/src/components/UploadPanel.jsx](acris/frontend/src/components/UploadPanel.jsx)
- [acris/frontend/src/components/AgentTimeline.jsx](acris/frontend/src/components/AgentTimeline.jsx)
- [acris/frontend/src/api/axios.js](acris/frontend/src/api/axios.js)
- [docker-compose.yml](docker-compose.yml)

### 14. `EXACT CHANGES REQUIRED`

The required changes are not small tweaks; they are design-level fixes.

1. Replace direct pipeline calls with a real queue and worker architecture.
   - Introduce BullMQ or equivalent queue broker
   - Persist job state and stage metadata
   - Run individual stages as worker jobs
   - Add retries, dead-letter handling, and timeout tracking

2. Add immutable version tracking for both regulations and policies.
   - Add `regulationVersion` and `policyVersion` to every mapping and recommendation record
   - Add `documentVersionId` and `sourceDocumentHash` as required fields
   - Store `generatedAt`, `evaluatedAgainstPolicyVersion`, and `previousEvaluationHash`
   - Add a policy freshness comparison rule before publish/approval

3. Add stale recommendation detection.
   - Compare policy document `last_updated` against recommendation `generatedAt`
   - Re-run mapping if policy changed after recommendation generation
   - Set `implementationStatus` to `stale` automatically when policy freshness fails
   - Block approval if mapping is stale

4. Add policy lineage and evidence trails.
   - Store clause-level evidence metadata
   - Link each impacted clause to the exact policy section and document version
   - Attach a recommendation proof object with document ID, version ID, timestamp, and source hash

5. Harden the AI layer.
   - Sanitize retrieved text before sending it to the LLM
   - Wrap model calls with explicit schema validation and retries
   - Add confidence metrics and evidence references
   - Add prompt-injection guardrails and boundary markers

6. Enforce runtime security and lifecycle controls.
   - Replace weak default JWT secret logic with environment-only values
   - Remove public bootstrap routes or make them admin-only
   - Add input sanitization and file safety checks for all uploads
   - Add rate limits and migration-safe secret handling

7. Update the frontend to real job-driven UX.
   - Add `/jobs/:id` detail view
   - Poll job state until complete or failed
   - Show each stage, errors, retries, and completion status
   - Show stale recommendation banners and disable publish/approve when stale

8. Build the missing tests.
   - Add V1/V2 diff regression tests
   - Add policy version and stale-check tests
   - Add end-to-end upload → job → mapping → approval tests
   - Add prompt injection and schema validation tests
   - Add worker failure and retry tests

### 15. `PHASE 1–11 FINAL READINESS SCORE / 100`

Status: 38 / 100

Reasoning:

- The project has a real base architecture and several working components
- Auth, org scoping, route shell, and dashboard flow are real and partly tested
- The core AI pipeline and regulation diff exist and can be traced
- But the major production-proof features are still missing or not wired into the runtime path
- Version lineage, stale detection, publish protection, true queueing, and production-safe policy handling are still absent

This score reflects the repo as it actually stands today: a credible prototype with a solid local foundation, but not a production-ready Phase 1–11 implementation.

---
