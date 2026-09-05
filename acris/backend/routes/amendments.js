import express from "express";
import ImpactMapping from "../models/ImpactMapping.js";
import authMiddleware from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import requireOrgAccess from "../middleware/requireOrgAccess.js";

const router = express.Router();
router.use(authMiddleware);

router.post(
  "/:id/approve",
  requireRole("manager", "admin"),
  requireOrgAccess({ Model: ImpactMapping, resourceName: "Amendment" }),
  async (req, res, next) => {
    try {
      const updated = await ImpactMapping.findByIdAndUpdate(
        req.params.id,
        { reviewStatus: "approved", reviewed_by: req.user?.email || "admin" },
        { new: true },
      )
        .populate("doc_id")
        .populate("regulation_id");

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
      const updated = await ImpactMapping.findByIdAndUpdate(
        req.params.id,
        { reviewStatus: "rejected", reviewed_by: req.user?.email || "admin" },
        { new: true },
      )
        .populate("doc_id")
        .populate("regulation_id");

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
