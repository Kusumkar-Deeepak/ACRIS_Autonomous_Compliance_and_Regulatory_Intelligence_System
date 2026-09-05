import mongoose from "mongoose";

const documentChangeEventSchema = new mongoose.Schema(
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
    eventType: {
      type: String,
      enum: [
        "DocumentCreated",
        "DocumentUpdated",
        "DocumentDeleted",
        "DocumentMoved",
        "DocumentRenamed",
        "PermissionChanged",
      ],
      default: "DocumentUpdated",
    },
    sourceVersionId: { type: String, default: "" },
    contentHash: { type: String, default: "" },
    occurredAt: { type: Date, default: Date.now },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("DocumentChangeEvent", documentChangeEventSchema);
