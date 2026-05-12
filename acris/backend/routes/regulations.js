import express from "express";
import fs from "fs";
import multer from "multer";
import Regulation from "../models/Regulation.js";
import ImpactMapping from "../models/ImpactMapping.js";
import { runAgent } from "../utils/runAgent.js";
import { ensureDirectory, uploadsDir, reportsDir } from "../utils/paths.js";

const router = express.Router();

ensureDirectory(uploadsDir);
ensureDirectory(reportsDir);

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadsDir),
  filename: (req, file, callback) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    callback(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

router.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "A regulatory PDF is required" });
    }

    const { source, title, company_name = "Your Company" } = req.body;
    if (!source || !title) {
      return res.status(400).json({ message: "Source and title are required" });
    }

    const monitor = await runAgent("monitor_agent.py", {
      pdf_path: req.file.path,
      source,
      title,
    });

    const regulationId = monitor.regulation_id;

    await runAgent("parser_agent.py", {
      regulation_id: regulationId,
      pdf_path: req.file.path,
    });

    await runAgent("diff_agent.py", {
      regulation_id: regulationId,
    });

    await runAgent("mapping_agent.py", {
      regulation_id: regulationId,
    });

    await runAgent("drafting_agent.py", {
      regulation_id: regulationId,
    });

    const reportPath = `${reportsDir}/${regulationId}.pdf`;
    const report = await runAgent("report_agent.py", {
      regulation_id: regulationId,
      company_name,
      output_path: reportPath,
    });

    await Regulation.findByIdAndUpdate(regulationId, {
      status: "done",
    });

    res.json({
      regulation_id: regulationId,
      status: "done",
      report_path: report.report_path,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const regulations = await Regulation.find().sort({
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
    const regulation = await Regulation.findById(req.params.id);
    if (!regulation) {
      return res.status(404).json({ message: "Regulation not found" });
    }

    const mappings = await ImpactMapping.find({ regulation_id: regulation._id })
      .populate("doc_id")
      .sort({ relevance_score: -1 });

    res.json({ regulation, mappings });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/diff", async (req, res, next) => {
  try {
    const regulation = await Regulation.findById(req.params.id).lean();
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
    const mappings = await ImpactMapping.find({ regulation_id: req.params.id })
      .populate("doc_id")
      .sort({ relevance_score: -1 });
    res.json({ mappings });
  } catch (error) {
    next(error);
  }
});

export default router;
