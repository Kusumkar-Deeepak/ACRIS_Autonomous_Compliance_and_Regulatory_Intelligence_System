import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createApp } from "../app.js";

test("document directories are not publicly mounted", async () => {
  const app = createApp();

  const uploadsResponse = await request(app).get("/uploads/example.pdf");
  const reportsResponse = await request(app).get("/reports/example.pdf");

  assert.equal(uploadsResponse.status, 404);
  assert.equal(reportsResponse.status, 404);
});

test("security headers and CORS allow-list are applied", async () => {
  const app = createApp();

  const response = await request(app)
    .get("/api/health")
    .set("Origin", "http://localhost:5173");

  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-frame-options"], "DENY");
  assert.equal(
    response.headers["access-control-allow-origin"],
    "http://localhost:5173",
  );
});
