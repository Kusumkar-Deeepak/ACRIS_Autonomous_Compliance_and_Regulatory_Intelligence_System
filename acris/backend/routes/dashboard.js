import express from "express";
import Regulation from "../models/Regulation.js";
import CompanyDoc from "../models/CompanyDoc.js";
import ImpactMapping from "../models/ImpactMapping.js";

const router = express.Router();

router.get("/stats", async (req, res, next) => {
  try {
    const [circularsProcessed, pendingActions, docsIndexed] = await Promise.all(
      [
        Regulation.countDocuments({ status: "done" }),
        ImpactMapping.countDocuments({ status: "pending" }),
        CompanyDoc.countDocuments(),
      ],
    );

    res.json({
      circulars_processed: circularsProcessed,
      pending_actions: pendingActions,
      docs_indexed: docsIndexed,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
