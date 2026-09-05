import express from "express";
import authMiddleware from "../middleware/auth.js";
import { authenticateUser, registerUser } from "../services/authService.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const result = await authenticateUser(req.body || {});
    if (!result.ok) {
      return res.status(result.code).json({ message: result.message });
    }

    return res.json({ token: result.token, user: result.user });
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/register",
  authMiddleware,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const result = await registerUser({
        ...(req.body || {}),
        actor: req.user,
      });
      if (!result.ok) {
        return res.status(result.code).json({ message: result.message });
      }

      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  },
);

router.post("/bootstrap", async (req, res, next) => {
  try {
    const result = await registerUser(req.body || {});
    if (!result.ok) {
      return res.status(result.code).json({ message: result.message });
    }

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/me", authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

export default router;
