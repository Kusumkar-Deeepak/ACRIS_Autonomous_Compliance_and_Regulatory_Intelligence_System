import mongoose from 'mongoose';

const regulationSchema = new mongoose.Schema({
  source: { type: String, enum: ['RBI', 'SEBI', 'MCA'] },
  title: String,
  published_date: { type: Date, default: Date.now },
  pdf_url: String,
  extracted_text: String,
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['pending_parse', 'pending_diff', 'pending_map', 'pending_draft', 'done'] },
  changes: [{
    clause: String,
    old_text: String,
    new_text: String,
    change_type: String
  }]
});

export default mongoose.model('Regulation', regulationSchema);
