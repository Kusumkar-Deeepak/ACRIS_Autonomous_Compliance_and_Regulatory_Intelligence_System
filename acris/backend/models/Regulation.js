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
        old_text: String,
        new_text: String,
        change_type: String,
      },
    ],
  },
  { timestamps: true },
);

regulationSchema.index({ organizationId: 1, source: 1, title: 1, version: 1 });

export default mongoose.model("Regulation", regulationSchema);
