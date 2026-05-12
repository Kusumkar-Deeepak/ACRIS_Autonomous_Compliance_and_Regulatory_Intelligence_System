import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import regulationRoutes from "./routes/regulations.js";
import policyRoutes from "./routes/policies.js";
import reportRoutes from "./routes/reports.js";
import amendmentRoutes from "./routes/amendments.js";
import dashboardRoutes from "./routes/dashboard.js";
import { reportsDir, uploadsDir } from "./utils/paths.js";

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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/acris";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`ACRIS backend running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
