import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import request from "supertest";
import { createApp } from "../app.js";
import User from "../models/User.js";

test("POST /api/auth/login returns 401 for wrong password", async () => {
  const app = createApp();
  const originalFindOne = User.findOne;

  const passwordHash = await bcrypt.hash("correct-password", 10);

  User.findOne = async () => ({
    _id: "507f1f77bcf86cd799439011",
    organizationId: "507f1f77bcf86cd799439012",
    email: "admin@acme.com",
    role: "admin",
    name: "Admin",
    passwordHash,
  });

  try {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@acme.com", password: "wrong-password" });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Invalid credentials");
  } finally {
    User.findOne = originalFindOne;
  }
});
