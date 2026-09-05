import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      default: null,
    },
    regulation_ids: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Regulation" },
    ],
    generated_at: { type: Date, default: Date.now },
    pdf_path: { type: String, required: true },
    summary: {
      total_changes: { type: Number, default: 0 },
      docs_affected: { type: Number, default: 0 },
      critical_count: { type: Number, default: 0 },
      plain_language_summary: { type: String, default: "" },
      recommended_actions: [{ type: String }],
    },
    status: { type: String, enum: ["sent", "pending"], default: "pending" },
    recipients: [{ type: String }],
  },
  { timestamps: true },
);

reportSchema.index({ organizationId: 1, generated_at: -1 });

export default mongoose.model("Report", reportSchema);
