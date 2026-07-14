import mongoose from 'mongoose';

const AttendanceErrorReportSchema = new mongoose.Schema({
  attendanceRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceRecord', required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Or session-associated reporter
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' }
}, { timestamps: true });

export default mongoose.models.AttendanceErrorReport || mongoose.model('AttendanceErrorReport', AttendanceErrorReportSchema);
