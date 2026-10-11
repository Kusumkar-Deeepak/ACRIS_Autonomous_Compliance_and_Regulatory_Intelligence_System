import test from "node:test";
import assert from "node:assert/strict";

import CompanyDocument from "../models/CompanyDocument.js";
import CompanyDocumentVersion from "../models/CompanyDocumentVersion.js";
import DocumentChunk from "../models/DocumentChunk.js";

function indexOptions(schema, keys) {
  return schema.indexes().find(([fields]) => JSON.stringify(fields) === JSON.stringify(keys))?.[1];
}

test("Stage 4 document registry requires organization and version lineage fields", () => {
  assert.equal(CompanyDocument.schema.path("organizationId").isRequired, true);
  assert.equal(CompanyDocumentVersion.schema.path("organizationId").isRequired, true);
  assert.equal(CompanyDocumentVersion.schema.path("contentHash").isRequired, true);
  assert.equal(DocumentChunk.schema.path("organizationId").isRequired, true);
  assert.equal(DocumentChunk.schema.path("documentId").isRequired, true);
  assert.equal(DocumentChunk.schema.path("documentVersionId").isRequired, true);
});

test("Stage 4 registry indexes enforce current-version and chunk uniqueness", () => {
  const currentVersionIndex = indexOptions(CompanyDocumentVersion.schema, { documentId: 1 });
  const versionNumberIndex = indexOptions(CompanyDocumentVersion.schema, {
    documentId: 1,
    versionNumber: 1,
  });
  const chunkIndex = indexOptions(DocumentChunk.schema, {
    documentVersionId: 1,
    chunkIndex: 1,
  });

  assert.equal(currentVersionIndex.unique, true);
  assert.deepEqual(currentVersionIndex.partialFilterExpression, { isCurrent: true });
  assert.equal(versionNumberIndex.unique, true);
  assert.equal(chunkIndex.unique, true);
});
