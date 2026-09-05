import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import regulationRoutes from "./routes/regulations.js";
import policyRoutes from "./routes/policies.js";
import reportRoutes from "./routes/reports.js";
import amendmentRoutes from "./routes/amendments.js";
import dashboardRoutes from "./routes/dashboard.js";
import jobRoutes from "./routes/jobs.js";
import errorHandler from "./middleware/errorHandler.js";
import { reportsDir, uploadsDir } from "./utils/paths.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.use("/uploads", express.static(uploadsDir));
  app.use("/reports", express.static(reportsDir));

  app.use("/api/auth", authRoutes);
  app.use("/api/regulations", regulationRoutes);
  app.use("/api/policies", policyRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/amendments", amendmentRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/jobs", jobRoutes);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use(errorHandler);
  return app;
}

export default createApp;
