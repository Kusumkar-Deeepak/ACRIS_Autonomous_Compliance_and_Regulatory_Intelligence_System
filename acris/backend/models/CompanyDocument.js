import mongoose from "mongoose";

const companyDocumentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      default: null,
    },
    name: { type: String, required: true, trim: true },
    documentType: { type: String, default: "policy" },
    ownerTeam: { type: String, default: "Compliance" },
    source: { type: String, default: "manual" },
    sourceType: { type: String, default: "upload" },
    externalDocumentId: { type: String, default: "" },
    sourceUrl: { type: String, default: "" },
    currentVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDocumentVersion",
      default: null,
    },
    syncStatus: {
      type: String,
      enum: ["pending", "synced", "archived", "error"],
      default: "pending",
    },
    lastSyncedAt: { type: Date, default: null },
    lastModifiedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

companyDocumentSchema.index({
  organizationId: 1,
  source: 1,
  externalDocumentId: 1,
});

export default mongoose.model("CompanyDocument", companyDocumentSchema);
