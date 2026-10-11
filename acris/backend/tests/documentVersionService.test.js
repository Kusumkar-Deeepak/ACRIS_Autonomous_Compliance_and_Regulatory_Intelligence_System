import test from "node:test";
import assert from "node:assert/strict";

import {
  hashDocumentText,
  normalizeDocumentText,
  resolveVersion,
} from "../services/documentVersionService.js";

test("document text normalization is deterministic", () => {
  assert.equal(normalizeDocumentText(" Policy\n\n text "), "Policy text");
  assert.equal(hashDocumentText("Policy\ntext"), hashDocumentText("Policy text"));
});

test("version resolution requires an organization scope", async () => {
  await assert.rejects(
    resolveVersion("", { name: "Policy", extractedText: "text" }),
    /organizationId is required/,
  );
});
