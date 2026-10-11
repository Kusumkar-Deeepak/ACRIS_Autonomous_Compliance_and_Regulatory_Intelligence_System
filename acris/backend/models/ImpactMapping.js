import mongoose from "mongoose";

const impactMappingSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      required: true,
    },
    regulation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Regulation",
      required: true,
    },
    doc_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDocument",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ComplianceJob",
      required: true,
    },
    regulationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Regulation",
      required: true,
    },
    regulationVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Regulation",
      required: true,
    },
    regulationVersionNumber: { type: Number, required: true },
    policyDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDocument",
      required: true,
    },
    policyVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDocumentVersion",
      required: true,
    },
    policyVersionNumber: { type: Number, required: true },
    documentVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDocumentVersion",
      required: true,
    },
    regulationVersion: { type: Number, required: true },
    sourceDocumentHash: { type: String, required: true },
    generatedAt: { type: Date, required: true, default: Date.now },
    model: { type: String, required: true },
    promptVersion: { type: String, required: true },
    embeddingVersion: { type: String, required: true },
    chunkingVersion: { type: String, required: true },
    retrievedChunkIds: [{ type: String }],
    relevance_score: { type: Number, required: true, min: 0, max: 1 },
    relevanceScore: { type: Number, required: true, min: 0, max: 1 },
    relevanceThreshold: { type: Number, required: true, min: 0, max: 1 },
    clauseId: { type: String, required: true },
    affected_clauses: [{ type: String }],
    clause: { type: String, default: "" },
    clause_text: { type: String, default: "" },
    old_text: { type: String, default: "" },
    new_text: { type: String, default: "" },
    policy_section: { type: String, default: "" },
    draft_amendment: { type: String, default: "" },
    draft_source: {
      type: String,
      enum: ["llm", "repair", "fallback"],
      required: true,
    },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    sourceEvidence: { type: mongoose.Schema.Types.Mixed, required: true },
    lineageComplete: { type: Boolean, default: true },
    staleReason: { type: String, default: null },
    stalenessDetectedAt: { type: Date, default: null },
    supersededByMappingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImpactMapping",
      default: null,
    },
    reviewReason: { type: String, default: null },
    legacyDocId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDoc",
      default: null,
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

impactMappingSchema.index(
  { organizationId: 1, regulation_id: 1, doc_id: 1, regulationVersionId: 1 },
  { unique: true },
);
impactMappingSchema.index({ organizationId: 1, policyDocumentId: 1, implementationStatus: 1 });
impactMappingSchema.index({ organizationId: 1, jobId: 1 });

export default mongoose.model("ImpactMapping", impactMappingSchema);
