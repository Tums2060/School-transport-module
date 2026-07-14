import mongoose from 'mongoose';

const TermSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Term 1 2026"
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: false } // only one active at a time
}, { timestamps: true });

export default mongoose.models.Term || mongoose.model('Term', TermSchema);
