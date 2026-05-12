import express from "express";
import jwt from "jsonwebtoken";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
const adminUsername = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (username !== adminUsername || password !== adminPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { username, role: "admin", name: "Compliance Admin" },
    process.env.JWT_SECRET || "your_jwt_secret_here",
    { expiresIn: "12h" },
  );

  return res.json({
    token,
    user: { username, role: "admin", name: "Compliance Admin" },
  });
});

router.get("/me", authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

export default router;
