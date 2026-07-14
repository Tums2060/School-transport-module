import mongoose from 'mongoose';

const FuelLogSchema = new mongoose.Schema({
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  litersFilled: { type: Number, required: true },
  cost: { type: Number },
  odometerReading: { type: Number, required: true }, // Odometer reading at fill-up
  loggedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.FuelLog || mongoose.model('FuelLog', FuelLogSchema);
