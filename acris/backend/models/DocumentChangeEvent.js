import mongoose from "mongoose";

const documentChangeEventSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      required: true,
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
    detectedAt: { type: Date, default: Date.now },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

documentChangeEventSchema.index({ organizationId: 1, documentId: 1, detectedAt: 1 });

export default mongoose.model("DocumentChangeEvent", documentChangeEventSchema);
