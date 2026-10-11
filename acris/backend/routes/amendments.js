import express from "express";
import ImpactMapping from "../models/ImpactMapping.js";
import { AmendmentRepository } from "../repositories/amendmentRepository.js";
import { AmendmentService } from "../services/amendmentService.js";
import authMiddleware from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import requireOrgAccess from "../middleware/requireOrgAccess.js";

const router = express.Router();
router.use(authMiddleware);

const repository = new AmendmentRepository({ ImpactMapping });
const amendmentService = new AmendmentService(repository);

router.post(
  "/:id/approve",
  requireRole("manager", "admin"),
  requireOrgAccess({ Model: ImpactMapping, resourceName: "Amendment" }),
  async (req, res, next) => {
    try {
      const updated = await amendmentService.approve(
        req.params.id,
        req.user?.email || "admin",
      );

      if (!updated) {
        return res.status(404).json({ message: "Amendment not found" });
      }

      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/reject",
  requireRole("manager", "admin"),
  requireOrgAccess({ Model: ImpactMapping, resourceName: "Amendment" }),
  async (req, res, next) => {
    try {
      const updated = await amendmentService.reject(
        req.params.id,
        req.user?.email || "admin",
      );

      if (!updated) {
        return res.status(404).json({ message: "Amendment not found" });
      }

      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
