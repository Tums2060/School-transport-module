import mongoose from 'mongoose';

const OdometerLogSchema = new mongoose.Schema({
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  reading: { type: Number, required: true },
  loggedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.OdometerLog || mongoose.model('OdometerLog', OdometerLogSchema);
