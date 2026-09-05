import mongoose from "mongoose";

const companyDocSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      default: null,
    },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["policy", "SOP", "template"],
      default: "policy",
    },
    content_text: { type: String, default: "" },
    embedding_id: { type: String, default: "" },
    file_path: { type: String, default: "" },
    last_updated: { type: Date, default: Date.now },
    owner_team: { type: String, default: "Compliance" },
    source: { type: String, default: "upload" },
    sourceType: { type: String, default: "manual" },
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
  },
  { timestamps: true },
);

companyDocSchema.index({ organizationId: 1, name: 1, source: 1 });

export default mongoose.model("CompanyDoc", companyDocSchema);
