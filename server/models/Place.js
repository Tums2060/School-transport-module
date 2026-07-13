import mongoose from 'mongoose';

const PlaceSchema = new mongoose.Schema({
  placeName: { type: String, required: true, unique: true, trim: true },
  zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', required: true }
}, { timestamps: true });

export default mongoose.model('Place', PlaceSchema);
