import mongoose from 'mongoose';

const DriverSessionSchema = new mongoose.Schema({
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  driverName: { type: String, required: true },
  deviceIdentifier: { type: String, required: true }, // Client-side generated device identifier
  loginAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.DriverSession || mongoose.model('DriverSession', DriverSessionSchema);
