# ACRIS — Product Requirements Document (UPDATED)

**Autonomous / AI Compliance & Regulatory Intelligence System**

- Supersedes: `PRD.md`
- Capability status source of truth: `QA.md` (not modified, cited throughout)
- Technical design: `UPDATED_ARCHITECTURE.md`
- Build status and roadmap: `UPDATED_IMPLEMENTATION.md`
- Execution plan: `PHASE_11_REMEDIATION_AND_EXECUTION.md`

---

## 0. Status vocabulary

| Tag                | Meaning                                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| `[MVP-NOW]`        | Implemented **and verified** against QA.md evidence — works today.       |
| `[MVP-PARTIAL]`    | PARTIAL — implementation exists but integration/verification incomplete. |
| `[PHASE-11]`       | NOT IMPLEMENTED / BROKEN today; required to close Phase 11.              |
| `[V2]`             | Deliberately deferred beyond Phase 11.                                   |
| `[FUTURE]`         | Long-horizon; not scheduled.                                             |
| `[UNVERIFIED]`     | Not verified — requires runtime validation.                              |

The original PRD used `[CURRENT]`/`[REQUIRED]`/`[FUTURE]`. Several
`[CURRENT]` claims in that document are **stale** — QA.md shows the system has
moved on in some places and is worse than claimed in others. §2 records every
correction explicitly.

---

## 1. Product Overview

ACRIS is a compliance intelligence and controlled policy-change orchestration
system for Indian financial institutions. It analyses regulatory change,
identifies affected company policies, and helps compliance teams review and
authorise controlled policy updates **without silently overwriting official
company records**.

The business purpose is unchanged from the original PRD.

### 1.1 Governing principle (unchanged, and now enforced by design)

> The company's external document repository is the source of truth.
> ACRIS may ingest, synchronise, analyse, propose and — only through an
> authorised connector and an explicit human step — publish approved policy
> changes. It must never silently overwrite an official company document.

### 1.2 Honest one-line description of what ACRIS is today

A **single-organization-in-practice, manual-upload, partially asynchronous
prototype** with real authentication, real organization scoping at the API
layer, a real six-agent AI pipeline (Ollama + Chroma + PyMuPDF + ReportLab),
real regulation versioning and clause diffing, and real PDF reporting — but
**no queue, no worker, no policy version lineage, no staleness protection, no
evidence provenance, and no vector-level organization isolation.**

QA.md scores Phase 1–11 readiness at **38/100**. This PRD does not dispute it.

---

## 2. Corrections to the previous PRD

These are recorded, not silently fixed.

| # | Previous PRD claim                                                  | QA.md finding                                                                 | Correction |
| - | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------- |
| 1 | §6/§16: "one hardcoded admin/admin123, no bcrypt anywhere"           | §13.2 `bcrypt.hash(password, 12)` in `authService.js`; real `User` model (§5.1) | Stale. Real user auth is `[MVP-NOW]`. A **password fallback still exists in config** (§13.8) — separate defect. |
| 2 | §16: "every business route unauthenticated"                          | §4.7 all six business route groups apply `authMiddleware`                       | Stale. Route auth is `[MVP-NOW]`. |
| 3 | §16: "`.env` correctly excluded from git — this one thing is done right" | §13.8 `acris/.env` **is present** with `MONGODB_URI` and `JWT_SECRET`        | **Incorrect.** Now a `[PHASE-11]` security defect. |
| 4 | §14: "No router — App.jsx toggles Login/Dashboard"                   | §3.1 real `BrowserRouter` + `AuthProvider` + `ErrorBoundary`                    | Stale. `[MVP-NOW]`. |
| 5 | §21: "Zero test files exist anywhere"                                | §14.1 four Node tests + one Python test; §14.5 `npm test` PASS                  | Stale. `[MVP-PARTIAL]`. Python suite is **uncollectable** — new defect. |
| 6 | §7.1: "runs all six agents synchronously inside the HTTP request"    | §3.4/§3.6 upload returns `202 {jobId}`; §8.1 pipeline runs as an in-process background function; `monitor_agent` still spawned in-request | Partly stale, partly worse. Contract `[MVP-NOW]`; execution model `[PHASE-11]`. |
| 7 | §7.2: embeddings are a hashing pseudo-embedding                      | §9.7 Ollama embeddings are the default; hashing remains as a legacy path        | Stale. Now `[MVP-PARTIAL]` — but the embedding model defaults to a **chat** model and vectors are unversioned. |
| 8 | §7.3: "approve/reject has no authentication or authorization at all" | §4.8 `authMiddleware` + `requireRole("manager","admin")` + `requireOrgAccess`   | Stale. `[MVP-NOW]`. Missing: reason capture, audit, stale gate. |
| 9 | §13: report generation described as complete                         | §12.2/§12.4 no regulation version, policy version, evidence chain, confidence or reviewer status; no clause→evidence→recommendation trace | Overstated. `[MVP-PARTIAL]`. |
| 10 | §8.4/§11: version lineage and stale protection presented as designed-in | §5.6 "NOT WORKING"; §7.6 stale never set; §17 Step G no publish gate         | Not implemented. Highest-priority `[PHASE-11]` item. |
| 11 | Data isolation assumed sufficient                                   | §11.4 Chroma retrieval **"NOT PROTECTED"** across organizations                 | New critical defect. `[PHASE-11]`. |
| 12 | §12: "no notifications" | consistent with QA (no evidence of any)                     | Unchanged. `[FUTURE]`. |

**Unresolvable contradiction inside QA.md itself, surfaced not hidden:**
`POST /api/auth/register` is described as admin-only in QA.md §4.5 and as a
public endpoint in QA.md §4.6. Status: `[UNVERIFIED]` — must be resolved by
repository inspection during Phase 11 Stage 11.

---

## 3. Problem Statement

Compliance teams at Indian financial companies must manually read long
regulatory PDFs, determine what changed since the last version, identify
which internal policies are affected, draft amendment language, and produce a
report — days to weeks of error-prone work. ACRIS automates clause-diffing,
policy-impact mapping, draft-amendment generation and controlled publication
workflow, while the company's document repository stays authoritative.

Unchanged from the original PRD.

---

## 4. Goals

### 4.1 Achieved and verified today `[MVP-NOW]`

- G-1 Extract clean text from a regulatory PDF (QA.md §9.5).
- G-2 Detect clause-level changes against the correct most-recent prior
  version of the same regulation, scoped by organization + source + title
  (QA.md §6.2, §6.3, §17 A/B/C).
- G-3 Identify which indexed company policy documents are relevant to a
  changed clause via vector similarity (QA.md §11.1, §11.2).
- G-4 Draft a plain-language amendment per affected policy using a local LLM,
  with a deterministic fallback (QA.md §9.2, §9.4, §10.8).
- G-5 Produce a multi-section PDF report a human can download, org-scoped
  (QA.md §12.1, §13.5).
- G-6 Let a human approve or reject each suggested amendment, with role and
  organization checks (QA.md §4.8).

### 4.2 Required to close Phase 11 `[PHASE-11]`

- G-7 Record the exact regulation version **and** the exact company policy
  version behind every recommendation (QA.md §5.6 — currently NOT WORKING).
- G-8 Detect and block stale recommendations (QA.md §7.6, §17 G).
- G-9 Never block the HTTP request on pipeline work; run it on a real queue
  and a real worker (QA.md §8.1–§8.6).
- G-10 Show the user real job state, not inferred state (QA.md §3.7).
- G-11 Guarantee that Organization A's documents are never retrievable by
  Organization B — including at the vector layer (QA.md §11.4).
- G-12 Attach traceable source evidence and a confidence indicator to every
  AI recommendation (QA.md §10.1, §10.2, §12.4).
- G-13 Treat document text as data, never as instructions to the LLM
  (QA.md §10.3, §10.4).
- G-14 Record an audit event for every state-changing action (QA.md §5.4).
- G-15 Make the whole system verifiable: runnable Python tests and a
  business-workflow test suite (QA.md §14.5, §14.3).
- G-16 Separate "approved" from "implemented" (QA.md §7.6 — enum exists,
  never used).

### 4.3 Deferred `[V2]` / `[FUTURE]`

- G-17 `[V2]` One live document connector (SharePoint/OneDrive) with real
  synchronisation and authorised publish-back.
- G-18 `[V2]` Hybrid retrieval (lexical + vector + metadata + reranking).
- G-19 `[FUTURE]` Autonomous RBI/SEBI/MCA monitoring.
- G-20 `[FUTURE]` Email/Slack notifications and deadline tracking.
- G-21 `[FUTURE]` Multi-step governance sign-off, SSO/SAML, per-organization
  LLM provider governance.

---

## 5. Non-Goals

Unchanged in substance from the original PRD:

- ACRIS is not a document-management system and does not replace the
  company's repository.
- Not every Indian regulator on day one (RBI/SEBI/MCA only).
- Not legal advice; AI output is a suggestion for human review, never
  auto-applied.
- No custom-trained LLM or embedding model.
- No multi-region/multi-cloud deployment.
- No microservices, Kubernetes, or Kafka in Phase 11 — explicitly excluded in
  `UPDATED_ARCHITECTURE.md` §30 and Appendix A.
- Not every connector immediately: Phase 11 delivers the **interface plus one
  local adapter only**.

---

## 6. Target Users and Roles

| Role                | Responsibility                                            | Today                                                        |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| Compliance Analyst  | Upload circulars/policies, review diffs, review drafts      | `[MVP-PARTIAL]` — role field exists on `User`; no analyst-specific restriction verified |
| Compliance Manager  | Approve/reject amendments, own the org's policy library     | `[MVP-NOW]` for approve/reject — `requireRole("manager","admin")` (QA.md §4.8) |
| Risk/Audit Reviewer | Read-only access to history and the audit trail             | `[PHASE-11]` — no audit trail exists (QA.md §5.4)             |
| System Administrator| Manage users, organizations, configuration                  | `[MVP-PARTIAL]` — role exists; **no admin UI** (QA.md §3.2)   |

Correction to the original PRD: it stated "none of these roles are
implemented… one hardcoded admin identity." QA.md §5.1/§4.8 shows a real
`User` model with roles and role-gated amendment mutation. The gap is UI,
analyst-level restrictions, auditor read access, and the residual admin
credential fallback in config (QA.md §13.8).

---

## 7. Current MVP Capabilities (verified)

Everything in this section is backed by QA.md evidence of a working, wired
capability. Nothing here is aspirational.

| # | Capability                                                                     | QA evidence          |
| - | ------------------------------------------------------------------------------ | -------------------- |
| 1 | Login with email + password against a real user; bcrypt cost 12                 | §13.2, §4.5, §14.1   |
| 2 | JWT issued and verified with required claims                                    | §13.1                |
| 3 | Authentication enforced on regulations, policies, reports, amendments, dashboard, jobs | §4.7          |
| 4 | Role-gated amendment approve/reject (`manager`/`admin`)                         | §4.8                 |
| 5 | Organization-scoped access to regulations, reports, jobs, dashboard, amendments | §4.9, §5.3, §13.5, §13.6 |
| 6 | Routed React SPA with auth guard and error boundary                             | §3.1, §3.2           |
| 7 | Regulation PDF upload with PDF-type filter and 20 MB cap                        | §13.4                |
| 8 | Upload returns `202 {jobId, regulation_id, status}` immediately                 | §3.4, §3.6           |
| 9 | Duplicate-upload idempotency keyed on file hash                                 | §13.4, §5.4          |
| 10 | Automatic sequential regulation versioning per org + source + title            | §17 Step A           |
| 11 | Correct resolution of the immediately-prior regulation version                 | §6.2, §6.3           |
| 12 | Clause segmentation and similarity matching (`SequenceMatcher`, 0.45)          | §6.4                 |
| 13 | Detection of `added`, `modified`, `removed` clause changes                     | §6.5                 |
| 14 | Company policy PDF upload, text extraction, Chroma indexing                    | §7.2, §11.1          |
| 15 | Vector similarity mapping of changed clauses to policy documents               | §11.1, §11.2         |
| 16 | Real local LLM (Ollama) generation with deterministic fallback                 | §9.2, §9.3           |
| 17 | `draft_source` recorded as `llm` or `fallback`                                 | §10.8                |
| 18 | Multi-section PDF report generated from real data, org-scoped download         | §12.1, §13.5         |
| 19 | Dashboard aggregate statistics via service/repository layer                    | §4.1, §4.5           |
| 20 | `GET /api/jobs/:id` returning org-scoped job state                             | §4.5                 |
| 21 | Four backend tests passing; frontend production build passing                  | §14.5                |

---

## 8. Target Product Capabilities (Phase 11)

| #  | Capability                                                                | Today               | QA evidence   |
| -- | ------------------------------------------------------------------------- | ------------------- | ------------- |
| T1 | Company policy documents versioned as `Document → DocumentVersion`         | `[PHASE-11]`        | §5.5, §17 D   |
| T2 | Every recommendation records exact regulation + policy version             | `[PHASE-11]` (NOT WORKING) | §5.6   |
| T3 | Stale recommendations detected and blocked from approval                   | `[PHASE-11]`        | §7.6, §17 G   |
| T4 | Real Redis/BullMQ queue with a separate worker                             | `[PHASE-11]`        | §8.2–§8.4     |
| T5 | Full job lifecycle with retries, terminal failure, cancellation            | `[PHASE-11]`        | §8.9–§8.11    |
| T6 | Frontend job-details screen polling real backend state                     | `[PHASE-11]`        | §3.7          |
| T7 | Organization isolation at the vector layer                                 | `[PHASE-11]` (NOT PROTECTED) | §11.4 |
| T8 | Version-filtered retrieval; no mixing of embedding generations             | `[PHASE-11]`        | §11.5, §11.7  |
| T9 | Structured, schema-validated LLM output with bounded repair                | `[PHASE-11]`        | §10.6, §10.7  |
| T10| Prompt-injection defence: data/instruction boundaries + sanitisation       | `[PHASE-11]`        | §10.3, §10.4  |
| T11| Evidence and confidence on every recommendation, visible in UI and report  | `[PHASE-11]`        | §10.1, §12.4  |
| T12| `AuditEvent` log covering every state change                               | `[PHASE-11]`        | §5.4          |
| T13| Review status separated from implementation status                         | `[PHASE-11]`        | §7.6          |
| T14| Rejection reason captured                                                  | `[PHASE-11]`        | §4.8          |
| T15| Policy uploads validated for type and size                                 | `[PHASE-11]`        | §13.4         |
| T16| No default secrets; no tracked `.env`; no public bootstrap or static dirs  | `[PHASE-11]`        | §13.3, §13.8, §4.6 |
| T17| Rate limiting, security headers, CORS allow-list                           | `[PHASE-11]`        | §13.7, §18.6  |
| T18| Structured logs with correlation IDs; deep health checks                   | `[PHASE-11]`        | §2 matrix 16-20 |
| T19| `DocumentConnector` interface + one local adapter                          | `[PHASE-11]`        | §7.3          |
| T20| 18 business-workflow tests passing; Python suite runnable                  | `[PHASE-11]`        | §14.3, §14.5  |
| T21| Live external connector + real synchronisation + publish-back              | `[V2]`              | §7.4, §7.5    |
| T22| Hybrid retrieval                                                           | `[V2]`              | §11.1         |
| T23| Notifications, autonomous monitoring, deadline tracking                    | `[FUTURE]`          | —             |

---

## 9. Business Rules (normative)

These are product rules. Violating one is a defect regardless of what the code
does.

### BR-1 — Recommendation lineage is mandatory
Every recommendation must record the exact regulation version and the exact
company policy version used to generate it, plus the job, model, prompt
version, embedding version and generation timestamp.
*Status:* `[PHASE-11]` — QA.md §5.6 verdict NOT WORKING.

### BR-2 — Staleness on policy change
If the company policy version underlying a recommendation is no longer the
document's current version — or its content hash no longer matches — the
recommendation must be marked `STALE`.
*Status:* `[PHASE-11]` — QA.md §7.6.

### BR-3 — Stale recommendations are not approvable or publishable
A `STALE` recommendation must be refused at the action point with an explicit
conflict response and a re-analysis instruction. There is no override that
silently proceeds.
*Status:* `[PHASE-11]` — QA.md §17 Step G.

### BR-4 — Re-analysis produces a successor, never an edit
Revalidation creates a new recommendation linked to the stale one. Historical
recommendations are never rewritten.
*Status:* `[PHASE-11]`.

### BR-5 — Approved ≠ implemented
`reviewStatus` (`pending|approved|rejected`) and `implementationStatus`
(`not_started|proposed|implementation_pending|published|verified|blocked|stale`)
are independent and must both be visible.
*Status:* `[PHASE-11]` — enum exists, never used (QA.md §7.6).

### BR-6 — ACRIS never silently overwrites an official document
An approved amendment produces a proposed version. Publishing to the source
repository is a separate, explicitly authorised step through a connector.
*Status:* `[PHASE-11]` for the abstraction; `[V2]` for live publish.

### BR-7 — Document text is data, never instructions
Regulation and policy text passed to the LLM must be enclosed in explicit
untrusted-data boundaries. The model must never execute instructions found in
document content. Suspicious content must be logged, not silently stripped.
This reduces risk; it does not eliminate it, and the product must not claim
otherwise.
*Status:* `[PHASE-11]` — QA.md §10.3, §10.4, §10.5.

### BR-8 — Every recommendation must have traceable source evidence
A recommendation must answer: which regulation clause, which policy clause,
which regulation version, which policy version, what evidence was retrieved,
what was recommended, why, what confidence, which model. A recommendation
whose evidence cannot be resolved must not be presented for approval.
*Status:* `[PHASE-11]` — QA.md §10.1, §10.2, §12.4.

### BR-9 — Organization isolation is absolute
Documents, chunks, vectors, jobs, mappings, reports and files belonging to
Organization A must never be retrievable by Organization B — at the API, the
agent, the vector store, or the filesystem.
*Status:* `[PHASE-11]` — QA.md §11.4 "NOT PROTECTED"; §4.6 public static dirs.

### BR-10 — Every state change is auditable
Upload, job creation, job failure, approve, reject, stale marking, version
creation, archive and publish each write an `AuditEvent` sufficient to
reconstruct history without reading source code or server logs.
*Status:* `[PHASE-11]` — QA.md §5.4.

### BR-11 — Long-running processing never blocks the HTTP request
Upload returns a job identifier immediately. All pipeline work runs on a
queue, in a separate worker process.
*Status:* `[MVP-PARTIAL]` — contract met; execution model not (QA.md §8.1).

### BR-12 — A job is always terminal-reachable
No job may remain indefinitely in a non-terminal state. Crash, timeout and
retry exhaustion all resolve to `FAILED` with a stored reason.
*Status:* `[PHASE-11]` — QA.md §8.10, §8.11.

### BR-13 — Duplicate submissions do not duplicate work
Re-submitting the same document for the same organization while a job is
non-terminal returns the existing job.
*Status:* `[MVP-PARTIAL]` — implemented, untested (QA.md §13.4).

### BR-14 — Deleted or archived source documents preserve history
Archiving removes a document from active retrieval but never destroys its
versions or audit records.
*Status:* `[PHASE-11]`.

### BR-15 — Fallback output is never disguised as AI output
When the deterministic fallback produces a draft, the reviewer and the report
must see it.
*Status:* `[MVP-PARTIAL]` — recorded but not surfaced (QA.md §10.8).

### BR-16 — Vectors from different embedding generations are never mixed
Retrieval is pinned to the active embedding version; a model or chunking
change requires a controlled re-index.
*Status:* `[PHASE-11]` — QA.md §11.7.

### BR-17 — Secrets are never defaulted, committed, or logged
No credential constant may exist in source; no `.env` may be tracked;
connector credentials are never written to logs.
*Status:* `[PHASE-11]` — QA.md §13.3, §13.8.

---

## 10. Functional Requirements

### 10.1 Regulation ingestion

- FR-RI-1 `[MVP-NOW]` Upload a regulatory PDF with `source` (RBI/SEBI/MCA),
  `title` and `company_name` (QA.md §3.4).
- FR-RI-2 `[MVP-NOW]` Reject non-PDF files and files over the size cap
  (QA.md §13.4).
- FR-RI-3 `[MVP-NOW]` Return `202` with a job identifier without waiting for
  processing (QA.md §3.6).
- FR-RI-4 `[MVP-NOW]` Deduplicate an identical in-flight submission
  (QA.md §13.4).
- FR-RI-5 `[PHASE-11]` No agent process may be spawned inside the HTTP
  request (QA.md §17 Step A shows `monitor_agent.py` still is).
- FR-RI-6 `[PHASE-11]` Reject an upload whose text extraction yields no
  content, with a clear failure reason, rather than proceeding.

### 10.2 Regulation versioning

- FR-RV-1 `[MVP-NOW]` Assign `version = previous + 1` per
  `{organizationId, source, title}` (QA.md §17 Step A).
- FR-RV-2 `[MVP-NOW]` Resolve the immediately prior version for diffing
  (QA.md §6.2, §6.3).
- FR-RV-3 `[PHASE-11]` Persist `previousVersionId` on the regulation rather
  than re-deriving it.
- FR-RV-4 `[PHASE-11]` Derive lineage from a normalised `regulationKey` so a
  minor title variation does not silently fork the version chain.
- FR-RV-5 `[PHASE-11]` Every diff row records `fromVersion` and `toVersion`
  (QA.md §6.7 — currently missing).

### 10.3 Regulation change detection

- FR-CD-1 `[MVP-NOW]` Detect `added`, `modified`, `removed` clauses
  (QA.md §6.5).
- FR-CD-2 `[MVP-NOW]` Match clauses by normalised-text similarity
  (QA.md §6.4).
- FR-CD-3 `[PHASE-11]` Emit `unchanged` explicitly so "we checked and nothing
  changed" is provable (QA.md §6.5 — not emitted).
- FR-CD-4 `[PHASE-11]` Detect `renumbered` so pure renumbering is not
  reported as removal + addition (QA.md §6.5).
- FR-CD-5 `[PHASE-11]` Record `matchRatio` and the threshold used on every
  diff row (QA.md §6.7 — no confidence stored).
- FR-CD-6 `[PHASE-11]` Preserve clause identity: a document must never be
  treated as a single clause; each clause carries a stable `clauseId`.
- FR-CD-7 `[PHASE-11]` Identical V1 and V2 must yield zero add/modify/remove
  changes.

### 10.4 Company policy ingestion

- FR-PI-1 `[MVP-NOW]` Upload a policy PDF with `name`, `type`, `owner_team`
  (QA.md §3.4).
- FR-PI-2 `[MVP-NOW]` Extract text and index into Chroma (QA.md §7.2).
- FR-PI-3 `[PHASE-11]` Enforce file type and size on the policy upload
  endpoint (QA.md §13.4 — currently absent).
- FR-PI-4 `[PHASE-11]` Ingestion writes `CompanyDocument` +
  `CompanyDocumentVersion` + `DocumentChunk`, not the legacy flat collection
  (QA.md §5.5).
- FR-PI-5 `[PHASE-11]` Ingestion goes through the connector registry, not a
  direct provider call.

### 10.5 Company policy versioning

- FR-PV-1 `[PHASE-11]` Each policy has a stable `documentId` and an ordered
  chain of immutable `documentVersionId`s (V1 → V2 → V3).
- FR-PV-2 `[PHASE-11]` Version creation is driven by `contentHash`; identical
  re-upload creates no new version.
- FR-PV-3 `[PHASE-11]` Exactly one version is `isCurrent`, enforced at the
  database level.
- FR-PV-4 `[PHASE-11]` Every version records `contentHash`, `storageKey`,
  `createdAt`, `createdBy`, `embeddingVersion`.
- FR-PV-5 `[PHASE-11]` Archiving preserves all versions and audit records
  (BR-14).
- FR-PV-6 `[PHASE-11]` A new version triggers re-chunking, re-embedding, and
  staleness fan-out.

### 10.6 Policy mapping

- FR-PM-1 `[MVP-NOW]` Map changed clauses to policy documents by vector
  similarity with a relevance score (QA.md §11.1).
- FR-PM-2 `[PHASE-11]` Retrieval must filter on `organizationId` and the
  current `documentVersionId` (QA.md §11.4, §11.5).
- FR-PM-3 `[PHASE-11]` The mapping records the retrieved `chunkId`s, not only
  a document id.
- FR-PM-4 `[PHASE-11]` The mapping records the threshold used alongside the
  score.
- FR-PM-5 `[V2]` Hybrid retrieval replaces the single-threshold decision.

### 10.7 AI recommendations

- FR-AR-1 `[MVP-NOW]` Generate a plain-language draft amendment per affected
  policy (QA.md §9.4).
- FR-AR-2 `[MVP-NOW]` Fall back deterministically when the LLM is
  unavailable (QA.md §10.7).
- FR-AR-3 `[MVP-PARTIAL]` Record whether the draft came from the LLM or the
  fallback (QA.md §10.8) — must become visible in UI and report (BR-15).
- FR-AR-4 `[PHASE-11]` LLM output must be schema-validated with one bounded
  repair attempt before falling back (QA.md §10.6, §10.7).
- FR-AR-5 `[PHASE-11]` The model identifier and prompt version must be
  persisted on the recommendation.
- FR-AR-6 `[PHASE-11]` The draft must not introduce deadlines or requirements
  absent from the supplied evidence text.

### 10.8 Evidence and citations

- FR-EV-1 `[PHASE-11]` Every recommendation stores a `sourceEvidence` object
  with regulatory source, company source and AI-output metadata
  (QA.md §10.1 — no evidence block exists).
- FR-EV-2 `[PHASE-11]` Evidence must be resolvable: every referenced clause
  and chunk must exist, in the same organization, in the recorded version.
- FR-EV-3 `[PHASE-11]` A recommendation with unresolvable evidence must not
  be presented for approval.
- FR-EV-4 `[PHASE-11]` The reviewer UI renders regulatory source, company
  source and AI output side by side.
- FR-EV-5 `[PHASE-11]` The PDF report includes the evidence chain
  (QA.md §12.3, §12.4).

### 10.9 Recommendation confidence

- FR-CF-1 `[PHASE-11]` Every recommendation carries a confidence value
  (QA.md §18.7 — none enforced today).
- FR-CF-2 `[PHASE-11]` Confidence is derived from stated inputs (similarity
  score, evidence completeness, draft source) and the derivation is recorded,
  not presented as a model-reported certainty it did not give.
- FR-CF-3 `[PHASE-11]` Low confidence and fallback-sourced drafts are
  visually flagged for extra reviewer scrutiny.

### 10.10 Human review

- FR-HR-1 `[MVP-NOW]` A human reviews every draft before it is considered
  actioned (QA.md §4.8).
- FR-HR-2 `[PHASE-11]` The reviewer sees evidence, confidence, model, prompt
  version, draft source, regulation version and policy version.
- FR-HR-3 `[PHASE-11]` The reviewer sees review status and implementation
  status as distinct indicators.
- FR-HR-4 `[PHASE-11]` The reviewer sees a blocking stale banner where
  applicable.

### 10.11 Approval

- FR-AP-1 `[MVP-NOW]` Approve/reject requires authentication, the
  `manager`/`admin` role, and organization ownership (QA.md §4.8).
- FR-AP-2 `[PHASE-11]` Rejection captures an optional reason, persisted
  (QA.md §4.8 — none today).
- FR-AP-3 `[PHASE-11]` Approval is refused with `409` when the recommendation
  is stale (BR-3).
- FR-AP-4 `[PHASE-11]` Approval writes an `AuditEvent` recording actor, role,
  before/after, regulation version, policy version, model and prompt version.
- FR-AP-5 `[PHASE-11]` Approval sets `reviewStatus` only; it never implies
  publication (BR-5).

### 10.12 Stale recommendation detection

- FR-ST-1 `[PHASE-11]` A recommendation becomes stale when any condition in
  `UPDATED_ARCHITECTURE.md` §22 holds.
- FR-ST-2 `[PHASE-11]` Staleness is detected at write time (fan-out on new
  version), at read time (recomputed on fetch) and at action time
  (authoritative gate).
- FR-ST-3 `[PHASE-11]` Time alone never makes a recommendation stale.
- FR-ST-4 `[PHASE-11]` A stale recommendation exposes `staleReason`, the
  analysed version and the current version.
- FR-ST-5 `[PHASE-11]` Re-analysis is the only path forward, producing a
  successor recommendation.

### 10.13 Compliance jobs

- FR-CJ-1 `[MVP-NOW]` A job record is created on upload with organization
  scoping (QA.md §5.1, §4.5).
- FR-CJ-2 `[PHASE-11]` Jobs are enqueued to Redis/BullMQ and consumed by a
  separate worker process (QA.md §8.2–§8.4).
- FR-CJ-3 `[PHASE-11]` Two uploads process independently (QA.md §8.5).
- FR-CJ-4 `[PHASE-11]` The API process performs no pipeline work.

### 10.14 Job status

- FR-JS-1 `[MVP-NOW]` `GET /api/jobs/:id` returns org-scoped job state
  (QA.md §4.5).
- FR-JS-2 `[PHASE-11]` The lifecycle exposes `QUEUED`, `PROCESSING`,
  `EXTRACTING`, `DIFFING`, `MAPPING`, `DRAFTING`, `REPORTING`, `COMPLETED`,
  plus `FAILED`, `RETRYING`, `CANCELLED`.
- FR-JS-3 `[PHASE-11]` Per-stage status, timestamps, duration, attempts and
  error are exposed.
- FR-JS-4 `[PHASE-11]` The frontend displays actual backend state and stops
  polling on a terminal state (QA.md §3.7).
- FR-JS-5 `[PHASE-11]` Job completion is never inferred from
  `Regulation.status` (QA.md §3.8).
- FR-JS-6 `[PHASE-11]` The "keep this page open" message is removed
  (QA.md §3.6).

### 10.15 Retry and failure handling

- FR-RF-1 `[PHASE-11]` Bounded retries with exponential backoff per stage
  (QA.md §8.9).
- FR-RF-2 `[PHASE-11]` Retry exhaustion produces terminal `FAILED` with the
  last error retained (QA.md §8.8).
- FR-RF-3 `[PHASE-11]` Failed messages are retained for inspection
  (dead-letter equivalent) (QA.md §18.11).
- FR-RF-4 `[PHASE-11]` A crashed worker's job is recovered via lease expiry,
  never left stuck (QA.md §8.10, §8.11).
- FR-RF-5 `[PHASE-11]` A job can be cancelled; cancellation is honoured
  between stages and before each LLM call.
- FR-RF-6 `[PHASE-11]` A user-visible retry action exists for retryable
  failures.

### 10.16 Reports

- FR-RP-1 `[MVP-NOW]` Generate a multi-section PDF from real pipeline data
  (QA.md §12.1).
- FR-RP-2 `[MVP-NOW]` List and download reports, org-scoped (QA.md §4.5,
  §13.5).
- FR-RP-3 `[PHASE-11]` Reports include regulation version pair, policy
  document versions, evidence chain, confidence and reviewer status
  (QA.md §12.2).
- FR-RP-4 `[PHASE-11]` Reports mark fallback-sourced drafts and stale
  recommendations.
- FR-RP-5 `[PHASE-11]` Report files are not publicly reachable via a static
  mount (QA.md §4.6).
- FR-RP-6 `[PHASE-11]` The deadline placeholder is labelled
  "Not yet tracked by ACRIS" rather than an instruction string.
- FR-RP-7 `[V2]` Object storage for report persistence and report-generation
  retry.

### 10.17 Audit trail

- FR-AU-1 `[PHASE-11]` An `AuditEvent` collection exists (QA.md §5.4 — it
  does not).
- FR-AU-2 `[PHASE-11]` Every state-changing action writes one.
- FR-AU-3 `[PHASE-11]` Events record organization, actor, role, action,
  resource, before, after, context (regulation/policy version, model, prompt
  version, job), reason, requestId and timestamp.
- FR-AU-4 `[PHASE-11]` `GET /api/audit-events` is filterable and restricted
  to admin/auditor roles.
- FR-AU-5 `[PHASE-11]` A full amendment lifecycle is reconstructable from the
  log alone.
- FR-AU-6 `[PHASE-11]` An audit-write failure alerts but does not roll back
  the business transaction.

### 10.18 Organization isolation

- FR-OI-1 `[MVP-NOW]` API queries filter by `organizationId`
  (QA.md §5.3).
- FR-OI-2 `[MVP-NOW]` `requireOrgAccess` blocks cross-org resource mutation
  (QA.md §4.9).
- FR-OI-3 `[PHASE-11]` Python agent queries are all organization-scoped
  (QA.md §5.3).
- FR-OI-4 `[PHASE-11]` Vector retrieval filters by organization
  (QA.md §11.4).
- FR-OI-5 `[PHASE-11]` File access is authenticated and org-scoped; no public
  static mounts (QA.md §4.6).
- FR-OI-6 `[PHASE-11]` A two-organization test proves zero leakage across
  API, agents and vector store.

### 10.19 Role-based access

- FR-RB-1 `[MVP-NOW]` `requireRole` gates amendment mutation
  (QA.md §4.8).
- FR-RB-2 `[PHASE-11]` Auditor role gets read-only access including audit
  events.
- FR-RB-3 `[PHASE-11]` Admin-only user/organization administration endpoints
  are enforced and tested (resolves contradiction C-11).
- FR-RB-4 `[PHASE-11]` Analyst restrictions are defined and enforced or
  explicitly documented as equal to manager for Phase 11.

### 10.20 Document connectors

- FR-CN-1 `[PHASE-11]` A `DocumentConnector` contract exists with
  `discoverDocuments`, `getDocument`, `getDocumentVersion`, `detectChanges`,
  `downloadDocument`, `publishVersion`, `authorizeOperation`
  (QA.md §7.3 — none exists).
- FR-CN-2 `[PHASE-11]` A registry selects an adapter by
  `CompanyDocument.sourceType`.
- FR-CN-3 `[PHASE-11]` Exactly one adapter — `LocalUploadConnector` — is
  implemented.
- FR-CN-4 `[PHASE-11]` `publishVersion` on the local adapter returns an
  explicit "not supported" result and never silently succeeds.
- FR-CN-5 `[PHASE-11]` A conformance test suite runs against any adapter.
- FR-CN-6 `[PHASE-11]` `ConnectorConfig` models per-organization authorised
  scope and a credential **reference**, never a raw credential.
- FR-CN-7 `[V2]` First live provider adapter (SharePoint/OneDrive).
- FR-CN-8 `[V2]` Least-privilege scope, credential rotation, no credential
  logging, fail-safe on provider unavailability.

### 10.21 Document synchronization

- FR-DS-1 `[PHASE-11]` Content-hash-based change detection on re-ingestion,
  producing `DocumentChangeEvent` records (QA.md §7.5 — none exists).
- FR-DS-2 `[PHASE-11]` Unchanged content produces no new version, no
  re-embed, no change event.
- FR-DS-3 `[V2]` Scheduled/polling synchronisation against an external
  repository.
- FR-DS-4 `[V2]` Detection of `NEW`, `MODIFIED`, `DELETED`, `RENAMED`,
  `MOVED`, `PERMISSION_CHANGED`.
- FR-DS-5 `[V2]` Metadata-first comparison (ETag/version id/lastModified)
  before download.
- FR-DS-6 `[V2]` Sync-loop protection so ACRIS's own publishes are not
  reprocessed as external changes.

### 10.22 Notifications

- FR-NT-1 `[FUTURE]` Email/Slack notification on job completion or
  high-severity change. No implementation and no dependency exists; this
  PRD makes no claim otherwise.
- FR-NT-2 `[FUTURE]` Deadline tracking and reminders.

### 10.23 Security

- FR-SE-1 `[PHASE-11]` No default JWT secret; fail fast when unset
  (QA.md §13.3).
- FR-SE-2 `[PHASE-11]` No tracked `.env`; affected secrets rotated
  (QA.md §13.8).
- FR-SE-3 `[PHASE-11]` No admin credential fallback in configuration.
- FR-SE-4 `[PHASE-11]` Bootstrap is single-use and self-disabling
  (QA.md §4.5).
- FR-SE-5 `[PHASE-11]` Register is admin-only and tested (C-11).
- FR-SE-6 `[PHASE-11]` Both upload endpoints validate MIME by content
  sniffing, enforce size caps and normalise stored filenames
  (QA.md §13.4).
- FR-SE-7 `[PHASE-11]` No client-supplied path reaches the filesystem.
- FR-SE-8 `[PHASE-11]` Rate limiting on auth and upload endpoints
  (QA.md §13.7).
- FR-SE-9 `[PHASE-11]` Security headers and a CORS allow-list
  (QA.md §18.6).
- FR-SE-10 `[PHASE-11]` Request validation on every mutating endpoint.
- FR-SE-11 `[PHASE-11]` Safe error responses with no internal detail leakage.
- FR-SE-12 `[PHASE-11]` Prompt-injection defence per BR-7.

### 10.24 Observability

- FR-OB-1 `[PHASE-11]` Structured JSON logs with `requestId`,
  `correlationId`, `jobId`, `organizationId`, `stage`.
- FR-OB-2 `[PHASE-11]` A correlation identifier links an HTTP request to its
  worker stages and agent output.
- FR-OB-3 `[PHASE-11]` `GET /api/health` reports per-dependency status for
  Mongo, Redis, Chroma and Ollama.
- FR-OB-4 `[PHASE-11]` Counters for jobs created/failed by stage, stage
  duration, queue depth, retry count, LLM latency, **LLM fallback rate**,
  suspicious-content detections and stale detections.
- FR-OB-5 `[PHASE-11]` Document processing status is queryable per document
  and per version.
- FR-OB-6 `[PHASE-11]` PDF content, full prompts and full LLM responses are
  not logged at default level; credentials are never logged.

---

## 11. Workflows

### 11.1 Regulation analysis — current `[MVP-PARTIAL]`

```text
Login → upload regulation PDF → 202 {jobId}
      → monitor_agent spawned in-request (version assigned)
      → runPipeline() runs in the API process, stage by stage
      → user watches a timeline inferred from Regulation.status
      → view diffs / mappings / drafts on the Dashboard
      → approve or reject
      → download report
```

Known defects in this flow: QA.md §8.1 (no queue), §8.6 (blocking), §3.7 (no
real job tracking), §3.6 (stale "keep this page open" copy).

### 11.2 Regulation analysis — target `[PHASE-11]`

```text
Login → upload → validate → version resolve → create job → enqueue → 202
      → navigate to /jobs/:id
      → worker: EXTRACTING → DIFFING → MAPPING → DRAFTING → REPORTING
      → per-stage progress, timestamps, errors, retry affordance
      → COMPLETED → review with evidence panel
      → stale check → approve (or 409 STALE → re-analyse)
      → report → audit trail
```

### 11.3 Policy update and staleness — target `[PHASE-11]`

```text
Policy V1 ingested → recommendation R1 generated against V1
      ↓
Policy V2 ingested (different contentHash)
      ↓
new CompanyDocumentVersion, previous isCurrent = false
      ↓
staleness fan-out → R1.implementationStatus = "stale"
      ↓
reviewer opens R1 → blocking stale banner, approve disabled
      ↓
approve attempted anyway (API) → 409 STALE_RECOMMENDATION
      ↓
re-analysis job → R2 generated against V2, linked to R1
      ↓
R2 approvable
```

This is the exact scenario QA.md §17 proves the system cannot currently
handle.

### 11.4 Autonomous monitoring `[FUTURE]`

No scheduler, no scraper, no dependency exists. Unchanged from the original
PRD's honest assessment.

---

## 12. Non-Functional Requirements

### 12.1 Performance

- `[MVP-NOW]` Upload responds with `202` without awaiting the pipeline
  (QA.md §3.6).
- `[PHASE-11]` p95 time to a queryable job status < 2 s, measured with the
  Python runtime cold (requires FR-RI-5).
- `[PHASE-11]` Two concurrent uploads must not serialise (QA.md §8.5).

### 12.2 Reliability

- `[PHASE-11]` 100% of jobs reach a terminal state (BR-12).
- `[PHASE-11]` Bounded retries, retained failures, lease-based recovery.
- `[MVP-PARTIAL]` Idempotent job creation (untested).

### 12.3 Scalability

- `[PHASE-11]` Stateless API, independently scalable worker replicas.
- Explicitly **not** in scope: Kubernetes, Kafka, microservices, multi-region.

### 12.4 Auditability

- `[PHASE-11]` Every question in BR-10 answerable from `AuditEvent`.

### 12.5 Testability

- `[PHASE-11]` Python tests must be collectable — currently they are not
  (QA.md §14.5).
- `[PHASE-11]` The 18 business-workflow tests in
  `PHASE_11_REMEDIATION_AND_EXECUTION.md` Stage 12 must pass.

---

## 13. MVP Scope for Phase 11

The Phase 11 feature surface is deliberately **the same product surface as
today**, made correct:

- versioned company documents,
- recommendation lineage,
- staleness protection,
- real queue and worker,
- real job tracking in the UI,
- organization isolation everywhere including vectors,
- AI safety and evidence,
- audit trail,
- security hardening,
- a connector interface with one local adapter,
- and a test suite that proves all of the above.

It does **not** add: a live external connector, external synchronisation,
notifications, autonomous monitoring, deadline tracking, hybrid retrieval,
object storage, CI/CD, or multi-step governance.

---

## 14. V2 Scope

First live document connector (SharePoint/OneDrive) with authorised
publish-back and sync-loop protection; real external synchronisation with
`NEW`/`MODIFIED`/`DELETED`/`RENAMED`/`MOVED`/`PERMISSION_CHANGED` detection;
automatic re-indexing on external change; hybrid retrieval; report object
storage and retry; CI/CD; organization admin console; a dedicated embedding
model with a controlled re-index.

## 15. Future Enterprise Scope

Autonomous regulator monitoring; notifications and deadline tracking;
multi-step governance sign-off; SSO/SAML; additional connectors; per-organization
AI data-residency and processing policy governance; microservice extraction
where a concrete scaling or ownership reason appears; disaster recovery and
multi-region.

---

## 16. Success Metrics

| Metric                                                                  | Target | Verified by |
| ----------------------------------------------------------------------- | ------ | ----------- |
| Time from upload to queryable job status                                 | < 2 s p95 | Stage 7 test |
| Jobs reaching a terminal state                                            | 100%  | Stage 12 TEST 13 |
| Unauthenticated mutations possible on any endpoint                        | 0     | Stage 11 curl sweep + tests |
| Cross-organization data retrievable (API, agent, vector, file)            | 0     | Stage 12 TEST 6 |
| Recommendations lacking exact regulation + policy version                 | 0     | Stage 12 TEST 7 |
| Stale recommendations approved or published                               | 0     | Stage 12 TEST 9 |
| Recommendations lacking resolvable source evidence                        | 0     | Stage 12 TEST 16 |
| State-changing actions without an `AuditEvent`                            | 0     | Stage 13 reconstruction test |
| Malformed LLM outputs persisted as valid recommendations                  | 0     | Stage 12 TEST 14 |
| Injection documents altering system behaviour                             | 0     | Stage 12 TEST 15 |
| Business-workflow tests passing                                           | 18/18 | Stage 12 |
| Python test suite collectable                                             | yes   | Stage 1 |

---

## 17. Acceptance Criteria for "Phase 11 complete"

- [ ] A1 No `/api/*` route and no static path returns organization data
      without a valid JWT.
- [ ] A2 A user cannot read or mutate another organization's resource by id —
      through the API, the agents, the vector store, or file access.
- [ ] A3 Uploading a large PDF returns a job id in under 2 s and no agent
      process is spawned during the request.
- [ ] A4 A real worker process consumes jobs from Redis; stopping it leaves
      jobs `QUEUED`.
- [ ] A5 Two concurrent uploads complete independently.
- [ ] A6 A failed stage surfaces `FAILED` with stage, message and retry
      affordance in the UI; no job is ever stuck.
- [ ] A7 The frontend shows real per-stage job state with timestamps and
      never infers it from `Regulation.status`.
- [ ] A8 Every `ImpactMapping` records the exact regulation version and the
      exact policy version used, and exposes evidence and confidence.
- [ ] A9 Uploading a changed policy marks dependent recommendations `stale`.
- [ ] A10 Approving a stale recommendation is rejected with `409` and a
      re-analysis instruction.
- [ ] A11 "Approved" and "Published" are distinct in the data model and the
      UI.
- [ ] A12 A document containing `IGNORE PREVIOUS INSTRUCTIONS` does not alter
      behaviour and raises a logged suspicious-content event.
- [ ] A13 A malformed LLM response never becomes a persisted recommendation.
- [ ] A14 An `AuditEvent` exists for every approve, reject, stale marking,
      job creation, job failure and version creation; a full amendment
      lifecycle is reconstructable from the log alone.
- [ ] A15 `pytest`, backend tests and frontend tests all run from one
      documented command and pass.
- [ ] A16 No default secret, no tracked `.env`, no public bootstrap, no
      public static document mounts.
- [ ] A17 A `DocumentConnector` interface with a conformant local adapter
      exists and ingestion goes through the registry.
- [ ] A18 No document in the repository claims a capability that lacks a
      passing test or a recorded manual verification; remaining uncertainty is
      written as "Not verified — requires runtime validation."
