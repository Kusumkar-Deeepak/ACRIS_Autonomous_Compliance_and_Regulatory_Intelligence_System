# ACRIS — Product Requirements Document

**Autonomous Compliance & Regulatory Intelligence System**
Status: Living document — rebuild baseline
Last audited against actual codebase on: current session

> This PRD reflects what the ACRIS codebase **actually does today** (verified by
> reading every backend route, every Python agent, every frontend component, and
> the original pitch PDF), not what the original documentation _claims_ it does.
> Every requirement below is tagged `[CURRENT]`, `[REQUIRED]`, or `[FUTURE]`.

---

## 1. Product Overview

ACRIS is a compliance intelligence and controlled policy-change orchestration
system for Indian financial institutions. It analyzes regulatory change,
identifies affected company policies, and helps teams review and authorize
controlled policy updates without silently overwriting official company
records.

The governing principle is:

> The company's external document repository is the source of truth.
> ACRIS may ingest, synchronize, analyze, propose, and publish approved
> policy changes through authorized connectors, but it must never silently
> overwrite an official company document.

**What exists today** is a working _single-tenant, single-user, PDF-upload
proof of concept_ of the compliance pipeline. It is not yet a monitoring
system, not multi-user, not fully asynchronous, and not secured beyond a
login screen. The final architecture preserves the working AI pipeline while
adding the missing document lifecycle, connector, authorization, audit, and
version-control model.

## 1.1 Source-of-Truth Principle

- `[REQUIRED]` The company's external document repository remains the
  authoritative source of truth for official policy content.
- `[REQUIRED]` ACRIS must not silently overwrite a company document or
  publish an amendment to the live repository without authorization.
- `[REQUIRED]` ACRIS may ingest, synchronize, detect changes, analyze impact,
  propose draft amendments, create proposed versions, and publish through an
  authorized connector — but all actions remain versioned, auditable, and
  human-reviewed.
- `[REQUIRED]` Company-policy changes must remain authorized, versioned,
  traceable, stale-safe, and concurrency-safe.
- `[REQUIRED]` Human approval remains mandatory before any proposal becomes a
  formal policy change.

## 2. Problem Statement

Compliance teams at Indian financial companies must manually read long
regulatory PDFs, determine what changed since the last version, identify
which internal policies are affected, draft amendment language, and produce a
report — a process that takes days to weeks and is error-prone. ACRIS
addresses this by automating clause-diffing, policy-impact mapping,
draft-amendment generation, and controlled publication workflows while
preserving the authoritative source-of-truth held by the company document
repository.

## 3. Goals

- `[CURRENT]` Extract clean text from a regulatory PDF and detect clause-level
  changes against the most recent prior version of the same regulation.
- `[CURRENT]` Identify which uploaded or synchronized company policy
  documents are relevant to each changed clause, using a similarity search
  over indexed policy text.
- `[CURRENT]` Draft a plain-language amendment suggestion per affected policy,
  using a local LLM, with a deterministic fallback if the LLM is unavailable.
- `[CURRENT]` Produce a professional multi-section PDF report (executive
  summary, clause diffs, impact analysis, draft amendments) that a human can
  download.
- `[CURRENT]` Let a human approve or reject each suggested amendment.
- `[REQUIRED]` Separate review status from implementation status so
  "approved" does not mean "implemented".
- `[REQUIRED]` Keep the company's external repository as the authoritative
  source of truth for all official policy documents.
- `[REQUIRED]` Add a document connector layer that can discover, sync,
  version, and publish through external repositories such as SharePoint,
  OneDrive, Google Drive, internal DMS, and S3-compatible storage without
  forcing every provider into the core pipeline.
- `[REQUIRED]` Record the exact company-document version and regulation
  version used to generate every recommendation, and block stale updates from
  being published.
- `[REQUIRED]` Surface evidence, confidence, model version, and prompt
  version for every AI-generated amendment so output is traceable and
  reviewable.
- `[REQUIRED]` Do all of the above without blocking the HTTP request for
  minutes, without a single hardcoded admin account, and with authorization
  enforced on every mutating endpoint.
- `[FUTURE]` Autonomously monitor RBI/SEBI/MCA websites for new circulars
  without a human uploading anything.
- `[FUTURE]` Notify compliance teams (email/Slack) automatically when a new
  circular affects them, and track review deadlines.

## 4. Non-Goals (for the rebuild's initial phases)

- Becoming a general-purpose document-management system, or a replacement
  for the company's existing document repository. ACRIS is a **compliance
  intelligence and controlled policy-change orchestration platform** that
  connects to and reads from that repository — not a competing DMS.
- Building a general-purpose document-management system.
- Supporting every Indian regulator on day one (RBI/SEBI/MCA only).
- Real legal advice or guaranteed regulatory compliance — ACRIS surfaces
  AI-drafted suggestions for **human review**, never auto-applies changes.
- Building a custom LLM or embedding model — the system wraps existing
  providers (currently Ollama; provider-swappable in the target design).
- Multi-region/multi-cloud deployment on day one.
- Implementing every external connector immediately; initial work focuses on
  a pluggable interface and the first connector only after the document
  lifecycle model is in place.

## 5. Target Users

- **Compliance Analyst** — uploads circulars/policies, reviews clause diffs,
  approves/rejects draft amendments.
- **Compliance Manager** — oversees the whole queue of jobs across an
  organization, reviews high-relevance mappings, signs off on reports.
- **Risk/Audit Reviewer** — read-only access to historical reports and the
  audit trail of who approved what and when.
- **System Administrator** — manages users, organizations, and API/LLM
  configuration.

`[CURRENT]`: **none of these roles are implemented.** There is exactly one
hardcoded admin identity (`admin` / `admin123` by default) and no user
database.

## 6. User Roles

| Role                | `[CURRENT]`                                                 | `[REQUIRED]` (MVP rebuild)                                                   |
| ------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Admin               | Hardcoded single account, env-var credentials, no DB record | Real user with org-scoped admin rights                                       |
| Compliance Analyst  | Not modeled                                                 | Can upload, view, cannot approve/reject high-value amendments (configurable) |
| Compliance Manager  | Not modeled                                                 | Can approve/reject, manage org's policy library                              |
| Auditor / Read-only | Not modeled                                                 | Read-only across an organization's history                                   |

## 7. Core Workflows

### 7.1 `[CURRENT]` Regulation ingestion (manual, synchronous)

1. User logs in with the shared admin password.
2. User uploads a regulatory PDF with a `source` (RBI/SEBI/MCA) and `title`.
3. The Express request handler runs all six agents **one after another,
   synchronously, inside the same HTTP request** (monitor → parser → diff →
   mapping → drafting → report). The frontend literally tells the user to
   "keep this page open" while this happens.
4. On success, the response includes the finished report path. On failure at
   any stage, the whole request 500s and the regulation record is left in
   whatever intermediate status it reached, with no explicit "failed" state.

### 7.2 `[CURRENT]` Policy ingestion

User uploads a company policy PDF; text is extracted and indexed into a local
Chroma vector store using a **custom hashing-based pseudo-embedding**
(bag-of-words hashed into a 384-dim vector), not a trained semantic embedding
model. This works for exact/near-exact term overlap but will not capture true
semantic similarity the way a real embedding model would.

### 7.3 `[CURRENT]` Review and approval

User views clause diffs, mapped policies, and AI-drafted amendments on a
single dashboard screen, and clicks Approve/Reject per mapping.
`[BROKEN/MISSING]`: this endpoint has **no authentication or authorization
check at all** — anyone who can reach the API can approve or reject any
amendment by ID.

### 7.4 `[FUTURE]` Autonomous monitoring

The original product pitch describes a scheduled scraper (BeautifulSoup)
polling RBI/SEBI/MCA every six hours and auto-triggering the pipeline. **None
of this exists.** There is no scheduler, no scraper, and no
`beautifulsoup4`/`requests` dependency anywhere in the codebase. "Monitor
Agent" today just creates a MongoDB record from a file the user manually
uploaded.

### 7.5 `[FUTURE]` Notifications

The pitch describes email + Slack alerts on report completion. `[MISSING]`:
no email/Slack integration exists in code or dependencies.

## 8. Functional Requirements

### 8.1 `[CURRENT]`

- FR-1: Upload a regulatory PDF and run it through a 6-stage pipeline.
- FR-2: Upload a company policy PDF and index its text.
- FR-3: View a list of ingested regulations with status.
- FR-4: View clause-level diffs for a selected regulation.
- FR-5: View policy documents mapped to a regulation, with a relevance score.
- FR-6: Approve or reject a draft amendment.
- FR-7: Download a generated PDF report.
- FR-8: View aggregate dashboard stats (circulars processed, pending actions,
  policies indexed).

### 8.2 `[REQUIRED]` (must exist before this can be called production software)

- FR-9: Real user accounts with hashed passwords, not one shared admin login.
- FR-10: Authorization enforced on every route that reads or mutates
  organization data — especially amendment approve/reject.
- FR-11: The regulation-processing pipeline must run as a background job, not
  inside the HTTP request, with a queryable job/stage status model (see
  ARCHITECTURE.md).
- FR-12: File type/size validation on all uploads (currently: none — the
  backend accepts any file regardless of MIME type or size).
- FR-13: An explicit "failed" job/regulation state with an error message and
  the ability to retry, instead of a record stuck silently at whatever
  intermediate stage it reached when an agent threw.
- FR-14: Pagination and filtering on all list endpoints (regulations, reports).
  None exist today — `Regulation.find()` returns the entire collection.
- FR-15: Organization-scoped data isolation (multi-tenant `organizationId` on
  every collection). Today there is no concept of an organization; all data
  is global and shared by whoever has the login.

### 8.3 `[FUTURE]`

- FR-16: Scheduled autonomous monitoring of RBI/SEBI/MCA publication pages.
- FR-17: Email/Slack notification on report completion or high-severity
  changes.
- FR-18: Deadline tracking per regulation (the current PDF report literally
  prints "Manual placeholder: confirm internal review deadline..." — this is
  not implemented, only a placeholder string).
- FR-19: Governance workflow with multi-step sign-off, not a single
  approve/reject click.

### 8.4 `[REQUIRED]` Document Source-of-Truth & Lifecycle

The current `CompanyDoc` model treats a policy as a single, static,
one-time-uploaded blob of text — sufficient for a prototype, not sufficient
for an enterprise compliance system where the company's real document
repository keeps changing independently of ACRIS. The final design keeps the
external repository as the authoritative source of truth, while ACRIS
maintains a synchronized internal registry of versions, chunks, change events,
and publication decisions.

- FR-20: ACRIS must never silently overwrite a company's official policy
  document. Every AI-approved amendment produces a **proposed version**, not
  an in-place edit of the source.
- FR-21: Every company document must be tracked through a document lifecycle
  built around `CompanyDocument` and `CompanyDocumentVersion`, with internal
  indexing and historical preservation for every official change.
- FR-22: Every AI-generated amendment (`ImpactMapping`) must record the
  regulation version and company-document version it was generated against.
  Before publishing an approved amendment, ACRIS must verify the source
  document version is still current; if it has changed, the recommendation
  is marked `stale` and requires re-analysis rather than being published
  against outdated content.
- FR-23: "Approved" (a human's review decision) and "Implemented" (whether
  the change actually reached the official document) must be tracked as two
  separate status fields, never conflated.
- FR-24: A pluggable `DocumentConnector` interface must exist in the
  architecture (`discoverDocuments`, `getDocument`, `getDocumentVersion`,
  `detectChanges`, `downloadDocument`, `publishVersion`) so provider-specific
  code (SharePoint, Google Drive, S3, internal DMS) never leaks into the core
  compliance pipeline.
- FR-25: `[FUTURE → V2]` At least one live connector implementation
  (SharePoint/OneDrive is the recommended first target) that can discover,
  sync, and — only with explicit authorization — publish an approved
  proposed version back to the source repository.
- FR-26: A deleted or archived source document must never destroy its ACRIS
  history — it is marked archived, removed from active retrieval, and its
  versions/audit records are preserved indefinitely for audit purposes.
- FR-27: Every AI-generated recommendation must expose its evidence: the
  regulatory clause/source it responded to, the company-document
  section/chunk it was matched against, and a confidence indicator — not
  just the final drafted text.
- FR-28: An `AuditEvent` log must record who did what, to which resource,
  because of which regulation/document version, with which AI
  model/prompt version, and when — sufficient for a compliance
  investigation to reconstruct the full history of any policy change.
- FR-29: Company documents and any text retrieved from them must be treated
  as untrusted data by the LLM layer, never as instructions — see the
  prompt-injection defense requirement in this document and the architecture
  section on document lifecycle security.
- FR-30: Document synchronization must detect `NEW`, `MODIFIED`, `DELETED`,
  `RENAMED`, `MOVED`, and `PERMISSION_CHANGED` states and update the
  internal registry without unnecessary re-downloads.
- FR-31: The system must support controlled re-indexing whenever an
  embedding model, embedding version, or chunking strategy changes, while
  preserving a historical record of the prior index version.

## 9. AI Requirements

- `[CURRENT]` LLM calls go through a single wrapper (`llm.py`) using
  LangChain's Ollama integration, hardcoded to local `http://localhost:11434`
  unless overridden by env var. Every LLM call has a deterministic fallback
  string if the call throws or returns empty — this is a genuinely good
  design choice that keeps the pipeline running even without a working LLM,
  but it also means **LLM failures are silent**: nothing logs or surfaces that
  a fallback was used instead of a real AI-generated answer.
- `[REQUIRED]` Model/provider abstraction so Ollama can be swapped for a
  hosted provider without touching agent code; structured-output validation
  (today: `try: json.loads(response) except: return {}` — no schema
  enforcement, no retry-with-correction loop); visible confidence/fallback
  indicators surfaced to the reviewer, not hidden.
- `[REQUIRED]` Every AI-drafted amendment must remain human-reviewable before
  it is considered "applied" — this already holds today (approve/reject exists)
  and must be preserved, not weakened, in the rebuild.
- `[FUTURE]` Prompt versioning, per-call token/cost tracking, automated
  evaluation harness against a golden test set.
- `[REQUIRED]` **Evidence and traceability.** Every AI-generated amendment
  must expose the regulatory source (regulator, circular, version, clause,
  source reference) and the company source (document, document version,
  section/page/chunk) that produced it, alongside the AI output (proposed
  amendment, reasoning, confidence, model, prompt version). AI-generated
  text must never be presented as authoritative regulatory fact on its own —
  it is a suggestion grounded in cited evidence, for a human to verify. See
  ARCHITECTURE.md §41.11.
- `[REQUIRED]` **Hallucination safeguards.** Amendment generation must be
  grounded in retrieved regulatory and company-policy evidence, must not
  invent deadlines or regulatory requirements not present in the source
  text, must return structured output the backend validates, and must
  surface a confidence/review indicator rather than presenting every draft
  with equal authority. The human reviewer remains the final
  decision-maker — this does not change from today's design. See
  ARCHITECTURE.md §41.12.
- `[REQUIRED]` **Prompt injection / untrusted content defense.** Company
  documents and any regulator text retrieved into a prompt are data, never
  instructions — if a document contains text like "ignore previous
  instructions," the LLM layer must not treat it as a command. This is
  defense-in-depth (prompt isolation, structured context boundaries, output
  schema validation, input sanitization, suspicious-content logging), not a
  claim that prompt injection is fully solved. See ARCHITECTURE.md §41.13.
- `[REQUIRED]` **Organization-level AI processing policy.** Different
  organizations may require different data-handling rules for what gets sent
  to an LLM or embedding provider (local-only, an approved private provider,
  external hosted provider allowed, or external processing disabled for
  sensitive documents). This must be a configurable, per-organization
  setting, not a global assumption — and using an external provider must
  never be presented as automatically safe. See ARCHITECTURE.md §41.15.

## 10. Compliance Workflow

`[CURRENT]`: Upload → (six agents run inline) → view diffs/mappings/drafts →
approve/reject → download report. Single pass, no revision history on the
amendment itself beyond its final approved/rejected state.

`[REQUIRED]`: The same conceptual workflow, but asynchronous, resumable, and
with an audit trail of every state transition and who performed it — extended
per the target document lifecycle in ARCHITECTURE.md §41 so that "approve" no
longer means "silently apply." Conceptually:

```text
Regulation changes → ACRIS analyzes → ACRIS proposes amendment →
authorized reviewer approves → ACRIS creates a proposed document version →
document owner / authorized workflow → publish new official version
```

An approved recommendation is only published if the source document version
it was analyzed against is still current (§8.4 FR-22); otherwise it is
marked stale and sent back for re-analysis.

## 11. Approval Workflow

`[CURRENT]`: `POST /api/amendments/:id/approve` and `/reject` update an
`ImpactMapping` document's `status` and `reviewed_by` field. `reviewed_by`
reads `req.user?.username`, but since no auth middleware runs on this route,
`req.user` is always `undefined`, so `reviewed_by` is always the fallback
string `"admin"` regardless of who actually clicked the button.

`[REQUIRED]`: Real authenticated `reviewed_by`, plus prevention of a user
approving/rejecting an amendment outside their organization simply by
guessing or enumerating its MongoDB ID (IDOR).

`[REQUIRED]` **Review status is not implementation status.** Today,
"approved" is the terminal state of an amendment — there is no concept of
whether the approved text actually reached the official policy document.
That conflation is not acceptable for a compliance product: a reviewer
approving a recommendation only records a decision, not a fact about the
real world. The rebuild must track these as two independent state machines:

- **Review status:** `pending → approved | rejected`
- **Implementation status:** `not_started → proposed → implementation_pending
→ published → verified`, with a separate `blocked` and `stale` state.

`[REQUIRED]` **Stale-recommendation protection.** Before an approved
amendment can move to `published`, ACRIS must re-check that the company
document version it was analyzed against (§8.4 FR-22) is still the current
version. If the source document changed after analysis (e.g. a human edited
the policy directly, or a newer sync pulled in an updated version), the
system must refuse to publish and instead mark the recommendation `stale`,
requiring re-analysis before it can be approved again. This is an
optimistic-concurrency / stale-analysis safeguard — see ARCHITECTURE.md
§41.6–§41.7 for the full mechanism, including the concurrent-edit case
where a human edits the policy while ACRIS is analyzing it.

## 12. Notifications

`[FUTURE]` — entirely unimplemented today; no email or Slack SDKs are present
in either `package.json`.

## 13. Reporting

`[CURRENT]`: `report_agent.py` builds a genuinely well-structured multi-page
PDF (ReportLab) with a cover page, executive summary, an LLM-written plain
English narrative with fallback, a clause-diff table, impact analysis per
mapped document, and draft-amendment text — this is one of the most complete
parts of the system. It is saved to disk and a `Report` document is written
to MongoDB. `/api/reports` and `/api/reports/:id/download` both work.

`[REQUIRED]`: Object storage instead of local disk for report PDFs (so the
system survives a redeploy/restart on ephemeral infrastructure), and
report-generation retry if it fails partway.

## 13.5 Document Source of Truth & Publishing (new requirement)

**Principle, stated explicitly because it governs every design decision in
this section:** _"The company's document management repository remains the
authoritative source of truth. ACRIS must not silently overwrite official
company policies."_

`[CURRENT]`: N/A — there is no publishing step today; `CompanyDoc` is a
one-time upload with no source-repository connection and no versioning.

`[REQUIRED]` (architecture and data model; see ARCHITECTURE.md §41):

- A pluggable `DocumentConnector` interface (discover, read, detect changes,
  download, and — only when explicitly authorized — publish) so the core
  pipeline never talks to SharePoint/Google Drive/S3/a DMS directly.
- A document synchronization workflow that detects new, modified, deleted,
  renamed, and moved documents using cheap metadata (external ID, version
  ID, ETag, `lastModified`, content hash) **before** deciding whether to
  re-download and reprocess a document — not a full re-scan of everything on
  every run.
- Deleted/archived source documents are never destroyed in ACRIS; they are
  marked archived, removed from active retrieval, and their version history
  and audit trail are preserved.
- An approved amendment produces a **proposed document version**
  (e.g. `ESG_Policy_v5_DRAFT`), never an in-place edit of the current
  official version. Publishing that proposed version back to the source
  repository is a separate, explicitly authorized step, performed through
  the connector's `publishVersion()` — never automatic.
- Connectors operate on least-privilege access (a specific organization's
  specific authorized sites/folders/document types only, never a blanket
  grant to "the whole repository"), and connector credentials are stored
  separately from ACRIS user permissions and are never written to logs.

`[FUTURE → V2]`: The first live connector implementation (SharePoint/
OneDrive recommended), automatic re-indexing on detected source changes,
and a sync-loop-protection mechanism so ACRIS's own publish actions are not
re-processed as new external changes (see ARCHITECTURE.md §41.18).

## 14. Frontend Requirements

`[CURRENT]`: React 18 + Vite + Tailwind + Axios + TanStack Query. No router —
`App.jsx` just toggles between `<Login/>` and `<Dashboard/>` based on token
presence. Dashboard polls four endpoints every 8–10 seconds for pseudo-live
updates. All data is real (fetched from the backend), not mocked.

`[REQUIRED]`: React Router for real navigation/deep-linking, a proper
Job/Pipeline Details view with per-stage status (not just a single-string
regulation status), auth-aware routing/guards, loading/empty/retry states
(today: mostly present via TanStack Query defaults but not deliberately
designed), and pagination/search UI once the backend supports it.

## 15. Backend Requirements

`[CURRENT]`: Express 5, Mongoose, JWT signing, Multer for uploads,
`child_process.spawn` to invoke Python agents synchronously. No RBAC, no
centralized validation library, no rate limiting, no security headers, no
API versioning, no OpenAPI spec, no structured logging (only
`console.error`), no health checks beyond a static `{status:"ok"}`, no
graceful shutdown handling.

`[REQUIRED]`: All of the above (see ARCHITECTURE.md and IMPLEMENTATION.md for
the concrete build order).

## 16. Security Requirements

`[CURRENT — CRITICAL GAPS]`:

- Single hardcoded admin/admin123 fallback credential pair, comparable in
  plaintext, no bcrypt/argon2 anywhere in the codebase.
- **Every business route (`/api/regulations/*`, `/api/policies/*`,
  `/api/reports/*`, `/api/amendments/*`, `/api/dashboard/*`) is completely
  unauthenticated.** `authMiddleware` exists and is correctly written, but is
  only wired to `GET /api/auth/me`.
- No file-type/size validation on uploads.
- `cors()` with no origin restriction (wide open).
- No rate limiting, no Helmet-style security headers, no CSRF concern review
  (N/A for pure bearer-token API, but worth stating explicitly once cookies
  are considered).
- `.env` is correctly excluded from git (verified) — this one thing is done
  right.

`[REQUIRED]`: Real user auth with hashed passwords, JWT validated on every
protected route, organization-scoped authorization on every read/write,
upload validation (MIME sniffing + size caps), rate limiting on auth and
upload endpoints, CORS allow-list, standard security headers, dependency
auditing in CI.

`[REQUIRED — new, connector-related]`: Once any document connector exists
(§13.5), it must operate on least-privilege scope (specific
organization → specific authorized sites/folders/document types → only
permitted documents, never blanket repository access), connector
credentials must be stored and rotated separately from application secrets
and never appear in logs, and connector configuration must be clearly
separated from organization configuration, document permissions, and ACRIS
user permissions so a compromise of one does not automatically compromise
the others.

`[REQUIRED — new, AI-related]`: Prompt-injection defense-in-depth (§9) and a
configurable per-organization AI data-processing policy (§9) are security
requirements, not just AI-quality requirements — an organization handling
sensitive regulatory filings may require local-only processing, and the
architecture must make that enforceable, not just documented.

## 17. Performance Requirements

`[CURRENT]`: A single regulation upload runs all six stages synchronously,
including up to N sequential LLM calls in the diff agent (one call per
changed clause) — for a 40+ page circular with many clauses this can mean
dozens of blocking LLM calls in one HTTP request, with no timeout on the
`child_process.spawn` call and no overall request timeout guard.

`[REQUIRED]`: p95 time-to-first-status-update under a few seconds (job
enqueued, not "wait for the whole pipeline"), agent stages parallelized where
independent, LLM calls batched/streamed where the provider allows it.

## 18. Scalability Requirements

`[REQUIRED]`: Multiple organizations, many regulations and documents,
thousands of jobs, concurrent processing without one user's large PDF
blocking another user's request (impossible today since it's a shared,
blocking single Express process per upload).

## 19. Reliability Requirements

`[REQUIRED]`: Explicit failed/retrying states, idempotent job creation
(re-clicking upload should not silently double-process), dead-letter handling
for agents that repeatedly fail.

## 20. Observability Requirements

`[CURRENT]`: `console.error` in Express's error middleware; Python agents
write nothing beyond exit code and a JSON error payload on stderr. No request
IDs, no correlation IDs, no metrics, no dashboards.

`[REQUIRED]`: Structured logs with request/job/correlation IDs, health checks
per worker, queue depth and failure-rate metrics, LLM latency/fallback-rate
tracking (today, LLM fallbacks are silent — you cannot currently tell from
the outside whether Ollama is even running).

## 21. Testing Requirements

`[CURRENT]`: **Zero test files exist anywhere in the repository** — no
`*.test.*`/`*.spec.*` in frontend, backend, or Python. Nothing has automated
verification today.

`[REQUIRED]`: See IMPLEMENTATION.md Phase 15 and the golden end-to-end test
described in ARCHITECTURE.md.

## 21.5 Auditability Requirements (new)

A compliance product must be able to answer, for any policy change, after
the fact: who performed the action, what changed, which regulation caused
it, which company document and document version was affected, which AI
model and prompt version generated the recommendation, who approved or
rejected it and when, whether it was actually implemented, and which final
document version was published. `[CURRENT]`: none of this is tracked today
beyond a single `reviewed_by` string on `ImpactMapping` (and, per §11, that
field is currently always the fallback value `"admin"` regardless of who
clicked, since auth isn't enforced). `[REQUIRED]`: an `AuditEvent` log
(organizationId, actor, action, resourceType, resourceId, before/after,
timestamp, requestId, reason) written on every state-changing action across
the system — see ARCHITECTURE.md §41.10 for the concrete model and
IMPLEMENTATION.md's audit-log phase for the build plan. This is deliberately
kept simple (one append-only event log, not a bespoke audit framework) but
must be complete enough to reconstruct history for a compliance
investigation without reading source code or server logs.

## 22. MVP Scope (for the rebuild)

Everything in `[CURRENT]` above, made asynchronous, authenticated, authorized,
multi-user, and tested — without adding autonomous monitoring, notifications,
or microservices yet. This is deliberately the same feature surface as today,
rebuilt on solid foundations, per the Phase A "modular monolith + workers"
architecture in ARCHITECTURE.md.

The MVP additionally includes the **foundation** of the document
source-of-truth model from §8.4/§13.5, because it changes the data model and
the meaning of "approve" in ways too invasive to retrofit later:
versioned `CompanyDocument`/`CompanyDocumentVersion` records, the
`DocumentConnector` interface (even with only a manual/local implementation
of it, no live SharePoint/Drive integration yet), stale-recommendation
protection, the review-status/implementation-status split, and the
`AuditEvent` log. It does **not** include a live external connector, real
document synchronization from an external repository, or automatic
re-indexing on external change events — those are V2.

## 23. V2 Scope

Autonomous RBI/SEBI/MCA monitoring, real embeddings for the mapping agent,
email/Slack notifications, deadline tracking, multi-step governance workflow,
organization-level admin console, the first live document connector
(SharePoint/OneDrive), real document synchronization (new/modified/deleted/
renamed/moved detection), automatic re-indexing on detected source changes,
and hybrid retrieval (lexical + vector + metadata filtering + reranking)
replacing the single similarity-threshold decision.

## 24. Future Enterprise Scope

Full microservice extraction where justified, SSO/SAML, per-organization LLM
provider configuration, advanced AI evaluation harness, disaster
recovery/multi-region, additional document connectors (Google Drive,
internal DMS, generic S3-compatible storage), a fully event-driven document
change model with sync-loop protection, and per-organization configurable
AI data-residency/processing policy governance.

## 25. Success Metrics

- Time from PDF upload to a queryable job status: < 2 seconds (vs. today's
  "wait for the whole synchronous chain").
- Zero unauthenticated mutations possible on any endpoint.
- 100% of uploaded regulations reach either a terminal `done` or `failed`
  state — never stuck silently mid-pipeline.
- Automated test suite covering the golden end-to-end scenario passes in CI
  on every merge.
- Zero approved amendments are ever published against a company document
  version that is no longer current — stale recommendations are always
  caught and routed to re-analysis, never silently applied.
- Every state-changing action (upload, approve, reject, publish) produces a
  corresponding `AuditEvent`, with no gaps, verifiable by replaying the log
  for any given regulation or document.

## 26. Acceptance Criteria (for calling the MVP rebuild "done")

- [ ] A user cannot access any `/api/*` business route without a valid JWT.
- [ ] A user cannot approve/reject an amendment belonging to another
      organization even if they know its ID.
- [ ] Uploading a large PDF returns a job ID immediately; the HTTP request
      does not block for the duration of processing.
- [ ] A failed agent stage is visible as `failed` with an error message, not
      an indefinitely stuck intermediate status.
- [ ] The frontend shows real per-stage progress (not inferred purely from a
      single enum) with timestamps.
- [ ] CI runs backend, frontend, and Python tests and blocks merge on failure.
- [ ] Every `ImpactMapping` records the regulation version and company
      document version it was generated against, and exposes its
      regulatory/company evidence and confidence to the reviewer.
- [ ] Attempting to publish an approved amendment whose source document
      version has changed since analysis is rejected and the recommendation
      is marked `stale`, not silently applied.
- [ ] "Approved" and "Published" are visibly distinct states in the UI and
      the data model — approving a recommendation never implies the official
      document was actually updated.
- [ ] An `AuditEvent` exists for every approve/reject/publish action,
      queryable per regulation and per document.
