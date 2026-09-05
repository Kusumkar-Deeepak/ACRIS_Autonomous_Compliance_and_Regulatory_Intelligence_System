import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";

function toObjectIdString(value) {
  if (!value) return null;
  return String(value);
}

export async function authenticateUser({ email, username, password }) {
  const emailInput = (email || username || "").trim().toLowerCase();
  if (!emailInput || !password) {
    return { ok: false, code: 400, message: "Email and password are required" };
  }

  const user = await User.findOne({ email: emailInput });
  if (!user) {
    return { ok: false, code: 401, message: "Invalid credentials" };
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return { ok: false, code: 401, message: "Invalid credentials" };
  }

  const payload = {
    userId: toObjectIdString(user._id),
    organizationId: toObjectIdString(user.organizationId),
    role: user.role,
    email: user.email,
    name: user.name || user.email,
  };

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: "12h" });

  return {
    ok: true,
    token,
    user: {
      id: payload.userId,
      organizationId: payload.organizationId,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    },
  };
}

export async function registerUser({
  email,
  password,
  role,
  name,
  organizationId,
  organizationName,
  actor,
}) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return { ok: false, code: 400, message: "Email and password are required" };
  }

  if (password.length < 8) {
    return {
      ok: false,
      code: 400,
      message: "Password must be at least 8 characters",
    };
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return { ok: false, code: 409, message: "User already exists" };
  }

  const usersCount = await User.countDocuments();
  const isBootstrap = usersCount === 0;

  if (!isBootstrap && (!actor || actor.role !== "admin")) {
    return {
      ok: false,
      code: 403,
      message: "Only admins can invite users",
    };
  }

  let targetOrganizationId = organizationId || actor?.organizationId || null;
  if (!targetOrganizationId && isBootstrap) {
    const orgName = (organizationName || "Default Organization").trim();
    const organization = await Organization.create({ name: orgName });
    targetOrganizationId = organization._id;
  }

  if (!targetOrganizationId) {
    return {
      ok: false,
      code: 400,
      message: "organizationId is required",
    };
  }

  const allowedRoles = ["admin", "analyst", "manager", "auditor"];
  const targetRole = allowedRoles.includes(role)
    ? role
    : isBootstrap
      ? "admin"
      : "analyst";

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    role: targetRole,
    name: (name || "").trim(),
    organizationId: targetOrganizationId,
  });

  return {
    ok: true,
    user: {
      id: toObjectIdString(user._id),
      organizationId: toObjectIdString(user.organizationId),
      email: user.email,
      role: user.role,
      name: user.name || user.email,
    },
  };
}
