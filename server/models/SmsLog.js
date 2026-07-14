import mongoose from 'mongoose';

const SmsLogSchema = new mongoose.Schema({
  recipientType: { type: String, enum: ['Parent', 'Driver'], required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'recipientModel' },
  recipientModel: { type: String, required: true, enum: ['Student', 'User'] }, // 'Student' maps to parent contact, 'User' maps to driver
  targetCriteria: { type: String }, // e.g. "Bus: KCA 123A - Trip 1" or "Grade 5"
  message: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'failed'], default: 'sent' },
  sentAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.SmsLog || mongoose.model('SmsLog', SmsLogSchema);
