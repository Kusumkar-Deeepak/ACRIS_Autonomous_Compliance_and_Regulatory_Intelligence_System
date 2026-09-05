import mongoose from "mongoose";

const companyDocumentVersionSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDocument",
      required: true,
      index: true,
    },
    versionNumber: { type: Number, required: true, default: 1 },
    externalVersionId: { type: String, default: "" },
    contentHash: { type: String, default: "" },
    storageKey: { type: String, default: "" },
    extractedText: { type: String, default: "" },
    embeddingVersion: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, default: "system" },
    isCurrent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

companyDocumentVersionSchema.index({ documentId: 1, isCurrent: 1 });

export default mongoose.model(
  "CompanyDocumentVersion",
  companyDocumentVersionSchema,
);
