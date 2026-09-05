import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../app.js";
import config from "../config/index.js";
import ImpactMapping from "../models/ImpactMapping.js";

test("Org A cannot approve amendment owned by Org B", async () => {
  const app = createApp();
  const originalFindById = ImpactMapping.findById;

  ImpactMapping.findById = () => ({
    select: () => ({
      lean: async () => ({
        _id: "507f1f77bcf86cd799439011",
        organizationId: "507f1f77bcf86cd7994390bb",
      }),
    }),
  });

  const token = jwt.sign(
    {
      userId: "507f1f77bcf86cd799439001",
      organizationId: "507f1f77bcf86cd7994390aa",
      role: "manager",
      email: "manager@orga.com",
      name: "Org A Manager",
    },
    config.jwtSecret,
    { expiresIn: "12h" },
  );

  try {
    const response = await request(app)
      .post("/api/amendments/507f1f77bcf86cd799439011/approve")
      .set("Authorization", `Bearer ${token}`)
      .send();

    assert.equal(response.status, 403);
    assert.equal(response.body.message, "Forbidden");
  } finally {
    ImpactMapping.findById = originalFindById;
  }
});
