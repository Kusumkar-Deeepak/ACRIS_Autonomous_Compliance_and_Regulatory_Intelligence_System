import mongoose from "mongoose";

const impactMappingSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      default: null,
    },
    regulation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Regulation",
      required: true,
    },
    doc_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDoc",
      required: true,
    },
    documentVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDocumentVersion",
      default: null,
    },
    regulationVersion: { type: Number, default: 1 },
    sourceDocumentHash: { type: String, default: "" },
    generatedAt: { type: Date, default: Date.now },
    model: { type: String, default: "" },
    promptVersion: { type: String, default: "" },
    embeddingVersion: { type: String, default: "" },
    relevance_score: { type: Number, default: 0 },
    affected_clauses: [{ type: String }],
    clause: { type: String, default: "" },
    clause_text: { type: String, default: "" },
    old_text: { type: String, default: "" },
    new_text: { type: String, default: "" },
    policy_section: { type: String, default: "" },
    draft_amendment: { type: String, default: "" },
    draft_source: {
      type: String,
      enum: ["llm", "fallback"],
      default: "llm",
    },
    reviewStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    implementationStatus: {
      type: String,
      enum: [
        "not_started",
        "proposed",
        "implementation_pending",
        "published",
        "verified",
        "blocked",
        "stale",
      ],
      default: "not_started",
    },
    reviewed_by: { type: String, default: "" },
  },
  { timestamps: true },
);

impactMappingSchema.index({ organizationId: 1, regulation_id: 1, doc_id: 1 });

export default mongoose.model("ImpactMapping", impactMappingSchema);
