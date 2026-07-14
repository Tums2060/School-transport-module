import mongoose from 'mongoose';

const NON_STUDENT_TRIP_REASONS = [
  'maintenance_service',
  'refueling_run',
  'repositioning_depot_transfer',
  'cleaning_washing',
  'driver_training_test_drive',
  'other'
];

const TripSchema = new mongoose.Schema({
  tripNumber: { type: Number, required: true },
  time: { type: String, required: true }, // e.g. "06:30"
  pickupPoints: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Place' }], // optional for non-student trips
  tripType: { type: String, enum: ['scheduled', 'non_student'], default: 'scheduled' },
  nonStudentReasons: [{ type: String, enum: NON_STUDENT_TRIP_REASONS }],
  otherReasonText: { type: String },
  driverSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverSession' },
  startTime: Date,
  endTime: Date,
  distanceCovered: Number, // stubbed/placeholder
  notes: String
});

const BusSchema = new mongoose.Schema({
  busNumber: { type: String, required: true, unique: true }, // Number Plate e.g. "KCA 123A"
  name: { type: String, required: true }, // e.g. "Scania - Kiserian"
  capacity: { type: Number, required: true },
  status: { type: String, enum: ['Active', 'Maintenance', 'Out of Service'], default: 'Active' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  passwordHash: { type: String, required: true, default: '$2a$10$S40SX2A1xqmUGfvoN75oROMvZnzht6l.gRRmvydsaWXIkuQAn4heW' }, // default bcrypt hash for "password"
  trips: [TripSchema]
}, { timestamps: true });

export default mongoose.models.Bus || mongoose.model('Bus', BusSchema);
export { NON_STUDENT_TRIP_REASONS };
