import mongoose from "mongoose";

const companyDocSchema = new mongoose.Schema({
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
});

export default mongoose.model("CompanyDoc", companyDocSchema);
