import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import ImpactMapping from "../models/ImpactMapping.js";

const ids = {
  organizationId: new mongoose.Types.ObjectId(),
  regulationId: new mongoose.Types.ObjectId(),
  jobId: new mongoose.Types.ObjectId(),
  policyDocumentId: new mongoose.Types.ObjectId(),
  policyVersionId: new mongoose.Types.ObjectId(),
};

function completeMapping(overrides = {}) {
  return new ImpactMapping({
    organizationId: ids.organizationId,
    regulation_id: ids.regulationId,
    doc_id: ids.policyDocumentId,
    jobId: ids.jobId,
    regulationId: ids.regulationId,
    regulationVersionId: ids.regulationId,
    regulationVersionNumber: 2,
    policyDocumentId: ids.policyDocumentId,
    policyVersionId: ids.policyVersionId,
    policyVersionNumber: 3,
    documentVersionId: ids.policyVersionId,
    regulationVersion: 2,
    sourceDocumentHash: "hash",
    model: "llama3",
    promptVersion: "drafting-amendment-v1",
    embeddingVersion: "hashing:v1",
    chunkingVersion: "paragraph-v1",
    relevance_score: 0.8,
    relevanceScore: 0.8,
    relevanceThreshold: 0.5,
    clauseId: "Clause 1",
    draft_source: "fallback",
    confidence: 0.7,
    sourceEvidence: { chunkIds: ["chunk-1"] },
    ...overrides,
  });
}

test("Stage 5 requires policy version lineage", () => {
  const mapping = completeMapping({ policyVersionId: undefined });
  const error = mapping.validateSync();

  assert.ok(error);
  assert.ok(error.errors.policyVersionId);
});

test("Stage 5 exposes the version-aware successor uniqueness index", () => {
  const index = ImpactMapping.schema.indexes().find(
    ([fields]) =>
      JSON.stringify(fields) ===
      JSON.stringify({
        organizationId: 1,
        regulation_id: 1,
        doc_id: 1,
        regulationVersionId: 1,
      }),
  );

  assert.equal(index?.[1]?.unique, true);
});

test("Stage 5 accepts complete recommendation lineage", () => {
  assert.equal(completeMapping().validateSync(), undefined);
});
