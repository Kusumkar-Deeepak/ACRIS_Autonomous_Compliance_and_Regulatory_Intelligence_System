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
import { getHealth } from "./services/healthService.js";
import securityHeaders from "./middleware/securityHeaders.js";

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed"));
    },
  }));
  app.use(securityHeaders);
  app.use(express.json({ limit: "10mb" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/regulations", regulationRoutes);
  app.use("/api/policies", policyRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/amendments", amendmentRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/jobs", jobRoutes);

  app.get("/api/health", (req, res) => {
    getHealth().then((health) => {
      res.status(health.status === "ok" ? 200 : 503).json(health);
    }).catch(() => {
      res.status(503).json({ status: "degraded", dependencies: {} });
    });
  });

  app.use(errorHandler);
  return app;
}

export default createApp;
