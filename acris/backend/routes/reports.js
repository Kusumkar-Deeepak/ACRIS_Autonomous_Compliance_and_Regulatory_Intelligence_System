import express from "express";
import fs from "fs";
import Report from "../models/Report.js";
import { resolveProjectPath } from "../utils/paths.js";
import authMiddleware from "../middleware/auth.js";
import requireOrgAccess from "../middleware/requireOrgAccess.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", async (req, res, next) => {
  try {
    const reports = await Report.find({
      organizationId: req.user.organizationId,
    })
      .sort({ generated_at: -1 })
      .populate("regulation_ids");
    res.json(reports);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:id/download",
  requireOrgAccess({ Model: Report, resourceName: "Report" }),
  async (req, res, next) => {
    try {
      const report = await Report.findById(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      const pdfPath = resolveProjectPath(report.pdf_path);
      if (!fs.existsSync(pdfPath)) {
        return res
          .status(404)
          .json({ message: "Report file not found on disk" });
      }

      res.download(pdfPath, `${report._id}.pdf`);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
