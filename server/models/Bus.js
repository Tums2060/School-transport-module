import mongoose from 'mongoose';

const TripSchema = new mongoose.Schema({
  tripNumber: { type: Number, required: true },
  time: { type: String, required: true }, // e.g. "06:30"
  pickupPoints: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true }], // ordered list of Places
  notes: String
});

const BusSchema = new mongoose.Schema({
  busNumber: { type: String, required: true, unique: true }, // e.g. "KCA 123A"
  name: { type: String, required: true }, // e.g. "Scania - Kiserian"
  capacity: { type: Number, required: true },
  status: { type: String, enum: ['Active', 'Maintenance', 'Out of Service'], default: 'Active' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  trips: [TripSchema]
}, { timestamps: true });

export default mongoose.model('Bus', BusSchema);
