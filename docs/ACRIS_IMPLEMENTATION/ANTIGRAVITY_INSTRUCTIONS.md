# ACRIS — ANTIGRAVITY IMPLEMENTATION INSTRUCTIONS

## 1. PURPOSE OF THIS DOCUMENT

This document defines how you must use the ACRIS implementation documentation stored in this folder.

You are working on an existing ACRIS codebase.

ACRIS is an AI Compliance & Regulatory Intelligence System.

The documentation in this folder describes:

- the current verified state of the project
- the intended architecture
- the product requirements
- the remaining implementation/remediation work
- the required acceptance criteria
- the required verification process

You MUST use these documents as the implementation source of truth.

---

# 2. DOCUMENTS YOU MUST READ

Before making any code change, read ALL of the following files:

1. `UPDATED_IMPLEMENTATION.md`
2. `UPDATED_ARCHITECTURE.md`
3. `UPDATED_PRD.md`
4. `PHASE_11_REMEDIATION_AND_EXECUTION.md`

Also read this file:

5. `ANTIGRAVITY_INSTRUCTIONS.md`

Do not start implementation until you understand all five documents.

---

# 3. DOCUMENT PRIORITY

When interpreting the documentation, use this priority order:

1. `PHASE_11_REMEDIATION_AND_EXECUTION.md`
2. `UPDATED_IMPLEMENTATION.md`
3. `UPDATED_ARCHITECTURE.md`
4. `UPDATED_PRD.md`
5. Existing source code

The purpose of this priority is to ensure that the remediation plan is followed while still respecting the actual architecture and product requirements.

However:

DO NOT assume that a statement in an MD file means the feature already exists.

You MUST inspect the actual repository code and verify the implementation.

---

# 4. IMPORTANT RULE — NEVER BLINDLY TRUST DOCUMENTATION

The MD files describe the desired and/or verified state of the system.

The actual repository is the final implementation reality.

Therefore, before implementing a feature:

1. Inspect the existing code.
2. Identify what already exists.
3. Identify what is incomplete.
4. Identify what is broken.
5. Identify what is missing.
6. Reuse existing working implementation where possible.
7. Avoid duplicating functionality.
8. Avoid unnecessarily rewriting working code.

Never implement something merely because an MD file says it should exist.

First verify the repository.

---

# 5. IMPLEMENTATION MUST BE PHASE-WISE

DO NOT implement the entire remediation plan in one operation.

The remediation plan contains multiple stages.

You must implement ONLY the stage explicitly requested by the user.

For example:

If the user says:

"Implement Stage 1"

you must implement ONLY Stage 1.

Do NOT automatically implement:

- Stage 2
- Stage 3
- Stage 4
- Stage 5
- Stage 6
- Stage 7
- Stage 8
- Stage 9
- Stage 10
- Stage 11
- future production improvements

unless the user explicitly asks for them.

---

# 6. NEVER EXPAND THE SCOPE

During implementation, you may discover problems outside the current stage.

Do NOT automatically fix unrelated problems.

Instead:

1. Record the issue.
2. Explain which future stage it belongs to.
3. Continue with the current stage.

Exception:

If the unrelated problem directly prevents the current stage from working, you may make the smallest necessary fix.

Clearly document that dependency in the final report.

---

# 7. DO NOT OVERENGINEER

ACRIS should become production-ready, but implementation must remain practical.

Do NOT introduce unnecessary architecture such as:

- Kubernetes
- Kafka
- dozens of microservices
- service mesh
- unnecessary event buses
- unnecessary distributed systems
- unnecessary cloud infrastructure
- unnecessary databases

unless the current documentation explicitly requires them for the current stage.

Prefer the documented architecture.

The current architecture should remain modular and maintainable.

---

# 8. EXISTING TECHNOLOGY STACK

Respect the existing technology choices.

Expected major components include:

- React frontend
- React Router
- Express / Node.js backend
- MongoDB
- Redis
- BullMQ / background worker
- Python AI pipeline
- Ollama
- Chroma vector database
- RAG pipeline
- JWT authentication

Do not replace these technologies with alternatives without a strong technical reason and explicit user approval.

---

# 9. CORE BUSINESS FLOW

The intended ACRIS lifecycle is approximately:

Company / Regulation Document
↓
Document Intake
↓
Document Validation
↓
Document Version Resolution
↓
Compliance Job
↓
Redis / BullMQ
↓
Worker
↓
Extraction
↓
Clause Segmentation
↓
Regulation Diff
↓
Policy Retrieval / RAG
↓
Evidence Validation
↓
AI Recommendation
↓
Draft Amendment
↓
Human Review
↓
Stale Check
↓
Approval
↓
Final Report
↓
Audit Trail

Do not break this lifecycle when implementing individual stages.

---

# 10. CRITICAL DATA LINEAGE REQUIREMENT

ACRIS must maintain traceability between:

- regulation
- regulation version
- regulation clause
- company policy
- company policy version
- policy clause
- recommendation
- evidence
- AI analysis
- draft amendment
- approval
- final report

A recommendation must never become an unexplained AI-generated result.

The system must be able to answer:

"Why did ACRIS make this recommendation?"

and:

"Which exact regulation and policy versions were used?"

---

# 11. CRITICAL VERSIONING RULE

Always distinguish between:

- document
- document version
- current version
- previous version

Do not treat every uploaded file as an unrelated document.

When a new version of the same regulation is uploaded, the system should be able to establish the relationship:

V1 → V2 → V3 → ...

The same principle applies to company policies.

---

# 12. CRITICAL STALE-RECOMMENDATION RULE

If a recommendation was generated using:

Regulation Version X

- Policy Version Y

and the relevant policy later changes to:

Policy Version Z

the previous recommendation may no longer be valid.

The system must be able to detect this condition.

A stale recommendation must not silently remain valid.

It should require re-analysis/revalidation according to the documented workflow.

Do not bypass this requirement merely to make the UI look correct.

---

# 13. CRITICAL REGULATION DIFF RULE

Regulation comparison must operate at meaningful clause/section level.

Do NOT treat an entire PDF as one giant clause when the document contains multiple identifiable sections or clauses.

The implementation should preserve meaningful structure such as:

- section numbers
- clause numbers
- headings
- subsection identifiers
- paragraph boundaries where appropriate

For example:

V1

Clause 1
Clause 2
Clause 3
Clause 4

should be compared against:

V2

Clause 1
Clause 2
Clause 3
Clause 4
Clause 5

rather than:

V1 = Clause 1
V2 = Clause 1

The exact implementation must follow the remediation documentation.

---

# 14. AI / RAG SAFETY

Documents retrieved from:

- regulations
- company policies
- uploaded files
- vector databases
- external connectors

must be treated as DATA.

Do not blindly treat retrieved text as instructions.

Retrieved content may contain malicious or accidental prompt-injection text.

AI prompts should clearly separate:

SYSTEM INSTRUCTIONS

from

RETRIEVED DOCUMENT CONTENT.

Never allow document content to override system instructions.

---

# 15. EVIDENCE AND PROVENANCE

AI-generated recommendations should have traceable evidence.

Where applicable, capture:

- regulation ID
- regulation version
- regulation clause
- policy ID
- policy version
- policy clause
- retrieved evidence
- recommendation
- reasoning/justification
- confidence
- model used
- analysis timestamp
- job ID

Do not invent evidence.

If evidence is unavailable, the system should explicitly represent that instead of pretending evidence exists.

---

# 16. SECURITY REQUIREMENTS

Do not introduce insecure shortcuts.

Pay attention to:

- authentication
- authorization
- organization isolation
- JWT configuration
- environment variables
- upload validation
- file type validation
- file size limits
- API validation
- rate limiting where required
- secure headers
- audit logging
- sensitive data handling
- tenant isolation

Never hardcode secrets.

Never commit real credentials.

Never weaken authentication merely to make tests pass.

---

# 17. MULTI-TENANT / ORGANIZATION ISOLATION

ACRIS must prevent one organization from accessing another organization's data.

When implementing database queries, APIs, jobs, vector retrieval, recommendations, reports, etc., verify that organization boundaries are preserved.

Do not rely only on frontend filtering.

Authorization must be enforced server-side.

---

# 18. DATABASE CHANGES

Before changing a model/schema:

1. Inspect the existing model.
2. Understand current references.
3. Check existing API usage.
4. Check frontend usage.
5. Check tests.
6. Implement backward-compatible changes where reasonable.
7. Avoid breaking existing functionality.

Do not create duplicate models for concepts that already exist.

---

# 19. API CHANGES

When adding or changing an API:

Check:

- route
- controller
- service
- repository/data access layer
- validation
- authentication
- authorization
- error handling
- response format
- frontend API client
- frontend consumers
- tests

Do not implement only the backend endpoint and declare the feature complete.

---

# 20. FRONTEND CHANGES

When implementing a frontend feature:

Check the complete flow:

User action
↓
React component
↓
API client
↓
Backend API
↓
Database/service
↓
Response
↓
UI state
↓
Error handling

Do not create UI that only looks functional.

Every important UI action must connect to the real backend behavior.

---

# 21. BACKGROUND JOBS

If the current stage involves background processing:

Verify the complete chain:

API
↓
Job creation
↓
Redis
↓
BullMQ queue
↓
Worker
↓
Processing
↓
Job status update
↓
Database
↓
Frontend job status

Do not simulate job processing with frontend timers.

Do not claim asynchronous processing exists unless an actual worker executes the job.

---

# 22. TESTING RULE

Every implementation stage must include appropriate automated testing.

Depending on the stage, this can include:

- unit tests
- integration tests
- API tests
- database tests
- worker tests
- AI pipeline tests
- RAG tests
- frontend tests
- end-to-end tests

Do not only test the happy path.

Test important failure cases too.

---

# 23. MANUAL VERIFICATION

Automated tests are not enough.

For every stage, perform meaningful manual verification where applicable.

Examples:

- login
- dashboard loading
- document upload
- version detection
- regulation comparison
- policy mapping
- recommendation generation
- stale recommendation
- job processing
- report generation

Use actual application behavior.

Do not claim manual verification without actually performing it.

---

# 24. DO NOT HIDE FAILURES

If something fails:

DO NOT:

- remove the test
- weaken the assertion
- mock away the actual behavior
- ignore the error
- suppress the error
- claim success
- mark the feature complete

Instead:

1. Investigate the failure.
2. Fix it if it belongs to the current stage.
3. If it belongs to another stage, document it.
4. Clearly report the limitation.

---

# 25. DEFINITION OF DONE

A stage is NOT considered complete merely because code was written.

A stage is complete only when applicable:

- implementation exists
- integration works
- automated tests pass
- important failure paths work
- existing functionality is not broken
- security requirements are satisfied
- manual verification is completed
- documentation/status is updated
- acceptance criteria are satisfied

If any critical requirement is not satisfied, report:

PARTIAL

or

BLOCKED

instead of claiming:

DONE

---

# 26. DOCUMENTATION UPDATE RULE

After completing a stage:

Update only the relevant implementation/remediation documentation.

Do not rewrite unrelated documentation.

Do not modify the QA baseline unless the user explicitly asks for it.

If QA.md exists, treat it as an evidence/baseline document.

DO NOT silently rewrite QA results to make the project appear healthier.

---

# 27. REQUIRED FINAL REPORT

After implementation, provide a concise but evidence-based report containing:

## Stage Implemented

Name the exact stage implemented.

## Files Changed

List every changed/created/deleted file.

## What Was Implemented

Explain the actual changes.

## Database Changes

List schema/model/index changes.

## API Changes

List endpoint changes.

## Frontend Changes

List UI/client changes.

## Backend Changes

List service/controller/job changes.

## AI/RAG Changes

List AI/vector/retrieval changes if applicable.

## Tests Run

For each test command:

- command
- result
- pass/fail

## Manual Verification

Describe what was actually tested manually.

## Known Issues

List remaining issues.

## Scope Violations

Explicitly state whether any work outside the requested stage was required.

## Final Status

Use exactly one:

PASS
PARTIAL
BLOCKED

Do not use "100% complete" unless the evidence supports it.

---

# 28. STOP CONDITION

After completing the requested stage:

STOP.

Do not automatically continue to the next stage.

Wait for the user to explicitly request the next stage.

This is mandatory.

---

# 29. IF REQUIREMENTS ARE AMBIGUOUS

If the current stage contains an ambiguity that materially affects architecture, data integrity, security, or business behavior:

Do not silently make a major assumption.

Explain the ambiguity and use the safest minimal implementation that preserves existing behavior.

If implementation cannot safely continue, report:

BLOCKED

and explain exactly what information is required.

---

# 30. GENERAL ENGINEERING PRINCIPLE

The goal is not to produce the maximum amount of code.

The goal is to make ACRIS:

- correct
- testable
- maintainable
- secure
- traceable
- production-oriented
- understandable
- reliable

Prefer:

small correct changes

over:

large risky rewrites.

Always verify the real system behavior before claiming completion.
