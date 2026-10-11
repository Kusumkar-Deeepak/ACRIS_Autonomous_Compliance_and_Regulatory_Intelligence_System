import mongoose from "mongoose";

const companyDocumentVersionSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDocument",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    versionNumber: { type: Number, required: true, default: 1 },
    externalVersionId: { type: String, default: "" },
    contentHash: { type: String, required: true },
    storageKey: { type: String, default: "" },
    extractedText: { type: String, default: "" },
    source: { type: String, default: "manual" },
    sourceType: { type: String, default: "manual-upload" },
    name: { type: String, default: "" },
    embeddingVersion: { type: String, default: "" },
    chunkingVersion: { type: String, default: "paragraph-v1" },
    previousVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDocumentVersion",
      default: null,
    },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, default: "system" },
    isCurrent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

companyDocumentVersionSchema.index(
  { documentId: 1, versionNumber: 1 },
  { unique: true },
);
companyDocumentVersionSchema.index(
  { documentId: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true } },
);

export default mongoose.model(
  "CompanyDocumentVersion",
  companyDocumentVersionSchema,
);
