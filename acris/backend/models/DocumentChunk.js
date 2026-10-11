import mongoose from "mongoose";

const documentChunkSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDocument",
      required: true,
      index: true,
    },
    documentVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDocumentVersion",
      required: true,
      index: true,
    },
    chunkIndex: { type: Number, required: true },
    section: { type: String, default: "" },
    page: { type: Number, default: null },
    text: { type: String, default: "" },
    embeddingId: { type: String, default: "" },
    embeddingModel: { type: String, default: "" },
    embeddingVersion: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

documentChunkSchema.index(
  { documentVersionId: 1, chunkIndex: 1 },
  { unique: true },
);
documentChunkSchema.index({ organizationId: 1, documentId: 1 });

export default mongoose.model("DocumentChunk", documentChunkSchema);
