import test from "node:test";
import assert from "node:assert/strict";

import { AmendmentService } from "../services/amendmentService.js";

const buildRepository = (amendment) => ({
  async findById(id) {
    return id === "missing" ? null : amendment;
  },
  async updateReviewStatus(id, reviewStatus, reviewedBy) {
    return {
      _id: id,
      reviewStatus,
      reviewed_by: reviewedBy,
    };
  },
});

test("amendment approval only transitions a pending record", async () => {
  const service = new AmendmentService(buildRepository({ reviewStatus: "pending" }));
  const approved = await service.approve("abc", "manager@example.com");

  assert.equal(approved.reviewStatus, "approved");
  assert.equal(approved.reviewed_by, "manager@example.com");
});

test("amendment review rejects already-reviewed records", async () => {
  const service = new AmendmentService(buildRepository({ reviewStatus: "approved" }));

  await assert.rejects(
    () => service.reject("abc", "manager@example.com"),
    (error) => error.statusCode === 409,
  );
});
