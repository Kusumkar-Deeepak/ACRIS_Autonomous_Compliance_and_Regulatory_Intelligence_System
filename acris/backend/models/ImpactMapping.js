import mongoose from "mongoose";

const impactMappingSchema = new mongoose.Schema(
  {
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
    relevance_score: { type: Number, default: 0 },
    affected_clauses: [{ type: String }],
    clause: { type: String, default: "" },
    clause_text: { type: String, default: "" },
    old_text: { type: String, default: "" },
    new_text: { type: String, default: "" },
    policy_section: { type: String, default: "" },
    draft_amendment: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewed_by: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("ImpactMapping", impactMappingSchema);
