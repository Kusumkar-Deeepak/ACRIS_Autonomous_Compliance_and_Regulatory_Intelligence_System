import express from "express";
import Regulation from "../models/Regulation.js";
import CompanyDoc from "../models/CompanyDoc.js";
import ImpactMapping from "../models/ImpactMapping.js";
import { DashboardService } from "../services/dashboardService.js";
import { DashboardRepository } from "../repositories/dashboardRepository.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware);
const repository = new DashboardRepository({
  Regulation,
  ImpactMapping,
  CompanyDoc,
});
const dashboardService = new DashboardService(repository);

router.get("/stats", async (req, res, next) => {
  try {
    const stats = await dashboardService.getStats(req.user.organizationId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
