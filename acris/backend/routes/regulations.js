import express from "express";
import fs from "fs";
import multer from "multer";
import Regulation from "../models/Regulation.js";
import ImpactMapping from "../models/ImpactMapping.js";
import { runAgent } from "../utils/runAgent.js";
import { ensureDirectory, uploadsDir, reportsDir } from "../utils/paths.js";
import authMiddleware from "../middleware/auth.js";
import crypto from "crypto";
import { createJob } from "../services/jobService.js";
import { runPipeline } from "../jobs/pipelineOrchestrator.js";

const router = express.Router();
router.use(authMiddleware);

ensureDirectory(uploadsDir);
ensureDirectory(reportsDir);

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadsDir),
  filename: (req, file, callback) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    callback(null, `${Date.now()}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

router.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "A regulatory PDF is required" });
    }

    const { source, title, company_name = "Your Company" } = req.body;
    if (!source || !title) {
      return res.status(400).json({ message: "Source and title are required" });
    }

    // Generate idempotency hash based ONLY on file contents
    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash("sha256");
    hash.update(fileBuffer);
    const fileHash = hash.digest("hex");

    // Check if job exists
    let job = await createJob(
      req.user.organizationId,
      null, // we don't have regulationId yet
      fileHash
    );

    let regulationId = job.regulationId;

    if (job.status === "queued" && !regulationId) {
      // Run monitor_agent synchronously because it's fast (just DB insert)
      // and we need the regulationId for the response.
      const monitor = await runAgent("monitor_agent.py", {
        pdf_path: req.file.path,
        source,
        title,
        organization_id: req.user.organizationId,
      });

      regulationId = monitor.regulation_id;

      job.regulationId = regulationId;
      await job.save();

      // Start the background orchestrator for the rest of the pipeline
      runPipeline(job._id, regulationId, req.file.path, company_name).catch(console.error);
    }

    return res.status(202).json({
      jobId: job._id,
      regulation_id: regulationId,
      status: job.status,
    });
  } catch (error) {
    if (error.message === "Only PDF files are allowed") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const regulations = await Regulation.find({
      organizationId: req.user.organizationId,
    }).sort({
      published_date: -1,
      createdAt: -1,
    });
    res.json(regulations);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const regulation = await Regulation.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });
    if (!regulation) {
      return res.status(404).json({ message: "Regulation not found" });
    }

    const mappings = await ImpactMapping.find({
      regulation_id: regulation._id,
      organizationId: req.user.organizationId,
    })
      .populate("doc_id")
      .sort({ relevance_score: -1 });

    res.json({ regulation, mappings });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/diff", async (req, res, next) => {
  try {
    const regulation = await Regulation.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    }).lean();
    if (!regulation) {
      return res.status(404).json({ message: "Regulation not found" });
    }

    res.json({ changes: regulation.changes || [] });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/mappings", async (req, res, next) => {
  try {
    const mappings = await ImpactMapping.find({
      regulation_id: req.params.id,
      organizationId: req.user.organizationId,
    })
      .populate("doc_id")
      .sort({ relevance_score: -1 });
    res.json({ mappings });
  } catch (error) {
    next(error);
  }
});

export default router;
