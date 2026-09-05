import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";

test("GET /api/regulations without token returns 401", async () => {
  const app = createApp();
  const response = await request(app).get("/api/regulations");

  assert.equal(response.status, 401);
  assert.equal(response.body.message, "Missing auth token");
});
