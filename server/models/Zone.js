import mongoose from 'mongoose';

const ZoneSchema = new mongoose.Schema({
  zoneName: { type: String, required: true, unique: true, trim: true },
  oneWayFare: { type: Number, required: true },
  twoWayFare: { type: Number, required: true },
  isCatchAll: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export default mongoose.model('Zone', ZoneSchema);
