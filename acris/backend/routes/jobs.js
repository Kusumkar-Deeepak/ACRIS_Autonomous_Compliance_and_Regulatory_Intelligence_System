import express from "express";
import authMiddleware from "../middleware/auth.js";
import { getJobById } from "../services/jobService.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/:id", async (req, res, next) => {
  try {
    const job = await getJobById(req.params.id, req.user.organizationId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    return res.json({ job });
  } catch (error) {
    return next(error);
  }
});

export default router;
