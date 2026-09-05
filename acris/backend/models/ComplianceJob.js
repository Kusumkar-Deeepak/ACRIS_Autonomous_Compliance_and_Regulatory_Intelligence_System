import mongoose from "mongoose";

const complianceJobSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      default: null,
    },
    regulationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Regulation",
      default: null,
    },
    fileHash: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "queued",
        "running",
        "completed",
        "failed",
        "retrying",
        "cancelled",
      ],
      default: "queued",
      index: true,
    },
    currentStage: {
      type: String,
      enum: ["monitor", "parser", "diff", "mapping", "drafting", "report"],
      default: "monitor",
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    retryCount: { type: Number, default: 0 },
    error: {
      stage: { type: String, default: null },
      message: { type: String, default: null },
      retryable: { type: Boolean, default: false },
    },
    stages: [
      {
        name: { type: String, required: true },
        status: {
          type: String,
          enum: ["pending", "running", "completed", "failed"],
          default: "pending",
        },
        startedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        error: { type: String, default: null },
        outputRef: { type: String, default: null },
      },
    ],
  },
  { timestamps: true },
);

complianceJobSchema.index({ organizationId: 1, status: 1 });
complianceJobSchema.index({ organizationId: 1, fileHash: 1 });

export default mongoose.model("ComplianceJob", complianceJobSchema);
