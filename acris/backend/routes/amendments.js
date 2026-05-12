import express from "express";
import ImpactMapping from "../models/ImpactMapping.js";

const router = express.Router();

router.post("/:id/approve", async (req, res, next) => {
  try {
    const updated = await ImpactMapping.findByIdAndUpdate(
      req.params.id,
      { status: "approved", reviewed_by: req.user?.username || "admin" },
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
});

router.post("/:id/reject", async (req, res, next) => {
  try {
    const updated = await ImpactMapping.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", reviewed_by: req.user?.username || "admin" },
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
});

export default router;
