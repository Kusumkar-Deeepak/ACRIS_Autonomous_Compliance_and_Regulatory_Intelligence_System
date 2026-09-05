import mongoose from "mongoose";

const documentChunkSchema = new mongoose.Schema(
  {
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

export default mongoose.model("DocumentChunk", documentChunkSchema);
