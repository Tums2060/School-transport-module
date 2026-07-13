import mongoose from 'mongoose';

const TransportApprovalSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  tripNumber: { type: Number, required: true },
  placeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true }, // resolves zone/fare live
  tripType: { type: String, enum: ['one_way', 'two_way'], required: true },
  direction: { type: String, enum: ['morning', 'evening', 'both'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date
}, { timestamps: true });

// Compound index for fast student roster queries on a bus with specific approval status
TransportApprovalSchema.index({ busId: 1, status: 1 });

export default mongoose.model('TransportApproval', TransportApprovalSchema);
