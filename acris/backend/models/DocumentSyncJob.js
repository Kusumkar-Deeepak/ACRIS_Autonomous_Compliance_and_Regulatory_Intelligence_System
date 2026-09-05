import mongoose from "mongoose";

const documentSyncJobSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      default: null,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDocument",
      default: null,
    },
    source: { type: String, default: "connector" },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
    },
    eventType: {
      type: String,
      enum: [
        "NEW",
        "MODIFIED",
        "DELETED",
        "RENAMED",
        "MOVED",
        "PERMISSION_CHANGED",
      ],
      default: "NEW",
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    error: { type: String, default: null },
    lastSyncOperation: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("DocumentSyncJob", documentSyncJobSchema);
