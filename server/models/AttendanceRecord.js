import mongoose from 'mongoose';

const AttendanceRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  tripNumber: { type: Number, required: true },
  date: { type: Date, required: true }, // Normalized to midnight (YYYY-MM-DD)
  present: { type: Boolean, default: true },
  locked: { type: Boolean, default: false }
}, { timestamps: true });

// Compound unique index to prevent duplicate attendance marks for a student on a specific trip, bus, and date
AttendanceRecordSchema.index({ studentId: 1, tripNumber: 1, busId: 1, date: 1 }, { unique: true });

export default mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', AttendanceRecordSchema);
