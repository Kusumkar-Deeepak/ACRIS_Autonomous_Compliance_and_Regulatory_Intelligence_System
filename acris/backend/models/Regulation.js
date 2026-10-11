import mongoose from "mongoose";

const regulationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      default: null,
    },
    source: { type: String, enum: ["RBI", "SEBI", "MCA"] },
    title: String,
    regulationKey: { type: String, index: true },
    previousVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Regulation",
      default: null,
    },
    published_date: { type: Date, default: Date.now },
    pdf_url: String,
    extracted_text: String,
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: [
        "pending_parse",
        "pending_diff",
        "pending_map",
        "pending_draft",
        "done",
      ],
    },
    changes: [
      {
        clause: String,
        clauseId: String,
        clauseNumber: String,
        old_text: String,
        new_text: String,
        oldText: String,
        newText: String,
        change_type: String,
        changeType: String,
        matchRatio: Number,
        matchThreshold: Number,
        fromVersion: Number,
        toVersion: Number,
        fromRegulationId: String,
        toRegulationId: String,
        oldClauseNumber: String,
        newClauseNumber: String,
        detectionMethod: String,
        summary: String,
      },
    ],
  },
  { timestamps: true },
);

regulationSchema.index({ organizationId: 1, source: 1, title: 1, version: 1 });
regulationSchema.index({ organizationId: 1, regulationKey: 1, version: 1 });

export default mongoose.model("Regulation", regulationSchema);
