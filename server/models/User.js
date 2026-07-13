import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  email: { type: String, required: true, unique: true, trim: true },
  fullName: { type: String, required: true },
  role: {
    type: String,
    enum: ['superior_Admin', 'Admin', 'Finance_Manager', 'Bus_Driver'],
    required: true
  },
  phone: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
