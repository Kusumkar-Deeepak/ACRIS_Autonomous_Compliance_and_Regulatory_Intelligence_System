import mongoose from "mongoose";
import config from "./config/index.js";
import { createApp } from "./app.js";

const app = createApp();

mongoose
  .connect(config.mongoUri)
  .then(() => {
    app.listen(config.port, () => {
      console.log(`ACRIS backend running on port ${config.port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
