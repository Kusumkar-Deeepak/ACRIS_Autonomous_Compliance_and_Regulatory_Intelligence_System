import express from "express";
import multer from "multer";
import { runAgent } from "../utils/runAgent.js";
import { ensureDirectory, uploadsDir } from "../utils/paths.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware);

ensureDirectory(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadsDir),
  filename: (req, file, callback) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    callback(null, `${Date.now()}-${safeName}`);
  },
});

const fileFilter = (req, file, callback) => {
  if (file.mimetype === "application/pdf") {
    return callback(null, true);
  }
  const error = new Error("Only PDF files are allowed");
  error.status = 415;
  return callback(error, false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

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
      organization_id: req.user.organizationId,
    });

    res.status(201).json(result);
  } catch (error) {
    if (error.message === "Only PDF files are allowed") {
      return res.status(415).json({ message: error.message });
    }
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "PDF must be 20 MB or smaller" });
    }
    return next(error);
  }
});

export default router;
