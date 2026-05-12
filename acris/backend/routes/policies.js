import express from "express";
import multer from "multer";
import { runAgent } from "../utils/runAgent.js";
import { ensureDirectory, uploadsDir } from "../utils/paths.js";

const router = express.Router();

ensureDirectory(uploadsDir);

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
      return res.status(400).json({ message: "Policy PDF file is required" });
    }

    const result = await runAgent("policy_ingest.py", {
      pdf_path: req.file.path,
      name: req.body.name || req.file.originalname,
      type: req.body.type || "policy",
      owner_team: req.body.owner_team || "Compliance",
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
