import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
  admissionNumber: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  grade: String,
  stream: String,
  parentName: String,
  parentContact: String,
  address: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Student', StudentSchema);
