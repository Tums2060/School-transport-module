import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { connectDB } from './config/db.js';
import { seedDatabase } from './config/seed.js';
import User from './models/User.js';
import Zone from './models/Zone.js';
import Place from './models/Place.js';
import Bus from './models/Bus.js';
import Student from './models/Student.js';
import TransportApproval from './models/TransportApproval.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'school_transport_secret_2026';

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Helper function to manually parse cookie from headers
function getCookie(req, name) {
  if (!req.headers.cookie) return null;
  const value = `; ${req.headers.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Authentication Middleware
function auth(roles = []) {
  return (req, res, next) => {
    const token = getCookie(req, 'token');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No token provided.' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges.' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token.' });
    }
  };
}

// --- API ROUTES ---

// 1. Auth Endpoints
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Please enter all fields.' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Set cookie
    res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`);

    return res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Login server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/me', auth(), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    return res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching profile.' });
  }
});

app.get('/api/users', auth(), async (req, res) => {
  try {
    const users = await User.find({}).select('-passwordHash');
    return res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching users.' });
  }
});

// 2. Zones & Places Endpoints
app.get('/api/zones', async (req, res) => {
  try {
    const zones = await Zone.find({});
    // Fetch places grouped by zone
    const places = await Place.find({});
    
    // Format response to group places inside zones to keep UI integration seamless
    const zonesWithPlaces = zones.map(zone => {
      const zonePlaces = places.filter(p => p.zoneId.toString() === zone._id.toString());
      return {
        id: zone._id,
        zoneName: zone.zoneName,
        oneWayFare: zone.oneWayFare,
        twoWayFare: zone.twoWayFare,
        isCatchAll: zone.isCatchAll,
        status: zone.status,
        places: zonePlaces.map(zp => ({ id: zp._id, placeName: zp.placeName }))
      };
    });

    return res.json({ success: true, data: zonesWithPlaces });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching zones.' });
  }
});

app.post('/api/zones', auth(['superior_Admin', 'Admin']), async (req, res) => {
  const { zoneName, oneWayFare, twoWayFare, status } = req.body;
  if (!zoneName) {
    return res.status(400).json({ success: false, message: 'Zone name is required.' });
  }
  try {
    const existing = await Zone.findOne({ zoneName: { $regex: new RegExp(`^${zoneName.trim()}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Zone name already exists.' });
    }
    const zone = await Zone.create({
      zoneName: zoneName.trim(),
      oneWayFare: Number(oneWayFare) || 0,
      twoWayFare: Number(twoWayFare) || 0,
      status: status || 'Active',
      isCatchAll: false
    });
    return res.json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/zones/:id', auth(['superior_Admin', 'Admin']), async (req, res) => {
  const { zoneName, oneWayFare, twoWayFare, status } = req.body;
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });

    if (zoneName && zoneName.trim() !== zone.zoneName) {
      const existing = await Zone.findOne({ zoneName: { $regex: new RegExp(`^${zoneName.trim()}$`, 'i') } });
      if (existing) return res.status(400).json({ success: false, message: 'Zone name already exists.' });
      if (!zone.isCatchAll) zone.zoneName = zoneName.trim();
    }

    zone.oneWayFare = Number(oneWayFare) ?? zone.oneWayFare;
    zone.twoWayFare = Number(twoWayFare) ?? zone.twoWayFare;
    
    if (!zone.isCatchAll && status) {
      zone.status = status;
    }

    await zone.save();
    return res.json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/zones/:id', auth(['superior_Admin']), async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });
    if (zone.isCatchAll) {
      return res.status(400).json({ success: false, message: 'Reserved Catch-All Zone cannot be deleted.' });
    }

    // Find catch-all zone
    const catchAll = await Zone.findOne({ isCatchAll: true });
    if (catchAll) {
      // Re-assign all Places in this zone to catch-all zone
      await Place.updateMany({ zoneId: zone._id }, { zoneId: catchAll._id });
    }

    await Zone.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Zone deleted successfully and places re-assigned.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Places Endpoints
app.get('/api/places', async (req, res) => {
  try {
    const places = await Place.find({}).populate('zoneId');
    const formatted = places.map(p => ({
      id: p._id,
      placeName: p.placeName,
      zoneId: p.zoneId?._id || null,
      zoneName: p.zoneId?.zoneName || 'General Zone',
      oneWayFare: p.zoneId?.oneWayFare || 0,
      twoWayFare: p.zoneId?.twoWayFare || 0
    }));
    return res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching places.' });
  }
});

app.post('/api/places', auth(['superior_Admin', 'Admin']), async (req, res) => {
  const { placeName, zoneId } = req.body;
  if (!placeName) {
    return res.status(400).json({ success: false, message: 'Place name is required.' });
  }

  try {
    const existing = await Place.findOne({ placeName: { $regex: new RegExp(`^${placeName.trim()}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Place name must be globally unique.' });
    }

    let assignedZoneId = zoneId;
    if (!assignedZoneId) {
      const catchAll = await Zone.findOne({ isCatchAll: true });
      assignedZoneId = catchAll ? catchAll._id : null;
    }

    if (!assignedZoneId) {
      return res.status(500).json({ success: false, message: 'Catch-all zone is not seeded.' });
    }

    const place = await Place.create({
      placeName: placeName.trim(),
      zoneId: assignedZoneId
    });

    return res.json({ success: true, data: place });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/places/:id', auth(['superior_Admin', 'Admin']), async (req, res) => {
  const { placeName, zoneId } = req.body;
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ success: false, message: 'Place not found' });

    if (placeName && placeName.trim() !== place.placeName) {
      const existing = await Place.findOne({ placeName: { $regex: new RegExp(`^${placeName.trim()}$`, 'i') } });
      if (existing) return res.status(400).json({ success: false, message: 'Place name already exists.' });
      place.placeName = placeName.trim();
    }

    if (zoneId) {
      place.zoneId = zoneId;
    }

    await place.save();
    return res.json({ success: true, data: place });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/places/:id', auth(['superior_Admin', 'Admin']), async (req, res) => {
  try {
    await Place.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Place deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Buses & Trips Endpoints
app.get('/api/buses', async (req, res) => {
  try {
    const buses = await Bus.find({}).populate('driverId').populate('trips.pickupPoints');
    
    // Format to match old React type definitions
    const formatted = buses.map(bus => {
      return {
        id: bus.busNumber, // legacy uses busNumber for identification in frontend
        name: bus.name,
        capacity: bus.capacity,
        status: bus.status,
        driver: {
          name: bus.driverId?.fullName || '',
          phone: bus.driverId?.phone || ''
        },
        trips: (bus.trips || []).map(trip => ({
          tripNumber: trip.tripNumber,
          time: trip.time,
          pickupPoints: (trip.pickupPoints || []).map(pp => pp.placeName).join(', '),
          pickupPointIds: (trip.pickupPoints || []).map(pp => pp._id),
          notes: trip.notes || ''
        }))
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching buses.' });
  }
});

app.get('/api/buses/:id', async (req, res) => {
  try {
    // Match by busNumber or id
    const bus = await Bus.findOne({
      $or: [{ busNumber: req.params.id }, { _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : new mongoose.Types.ObjectId() }]
    }).populate('driverId').populate('trips.pickupPoints');

    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });

    return res.json({
      success: true,
      data: {
        id: bus.busNumber,
        name: bus.name,
        capacity: bus.capacity,
        status: bus.status,
        driver: {
          name: bus.driverId?.fullName || '',
          phone: bus.driverId?.phone || ''
        },
        trips: (bus.trips || []).map(trip => ({
          tripNumber: trip.tripNumber,
          time: trip.time,
          pickupPoints: (trip.pickupPoints || []).map(pp => pp.placeName).join(', '),
          pickupPointIds: (trip.pickupPoints || []).map(pp => pp._id),
          notes: trip.notes || ''
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching bus.' });
  }
});

app.post('/api/buses', auth(['superior_Admin', 'Admin']), async (req, res) => {
  const { id, name, capacity, status, driver, trips } = req.body;
  if (!id || !name || !capacity) {
    return res.status(400).json({ success: false, message: 'Id (Bus number), Name, and Capacity are required.' });
  }

  try {
    const existing = await Bus.findOne({ busNumber: id });
    if (existing) return res.status(400).json({ success: false, message: 'Bus Number already exists.' });

    // Try to resolve driver from name or phone if provided
    let driverId = null;
    if (driver?.name) {
      const user = await User.findOne({ fullName: driver.name, role: 'Bus_Driver' });
      if (user) driverId = user._id;
    }

    const formattedTrips = (trips || []).map((t, idx) => ({
      tripNumber: idx + 1,
      time: t.time || '07:00',
      pickupPoints: t.pickupPointIds || [],
      notes: t.routeDetails?.notes || t.notes || ''
    }));

    const bus = await Bus.create({
      busNumber: id,
      name,
      capacity: Number(capacity),
      status: status || 'Active',
      driverId,
      trips: formattedTrips
    });

    return res.json({ success: true, data: bus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/buses/:id', auth(['superior_Admin', 'Admin']), async (req, res) => {
  const { name, capacity, status, driver, trips } = req.body;
  try {
    const bus = await Bus.findOne({ busNumber: req.params.id });
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found.' });

    bus.name = name || bus.name;
    bus.capacity = capacity !== undefined ? Number(capacity) : bus.capacity;
    bus.status = status || bus.status;

    if (driver) {
      const user = await User.findOne({ fullName: driver.name, role: 'Bus_Driver' });
      if (user) bus.driverId = user._id;
    }

    if (trips) {
      bus.trips = trips.map((t, idx) => ({
        tripNumber: idx + 1,
        time: t.time,
        pickupPoints: t.pickupPointIds || [],
        notes: t.notes || ''
      }));
    }

    await bus.save();
    return res.json({ success: true, data: bus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/buses/:id', auth(['superior_Admin']), async (req, res) => {
  try {
    await Bus.findOneAndDelete({ busNumber: req.params.id });
    return res.json({ success: true, message: 'Bus deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Students Endpoints
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find({});
    // Find active transport approvals to inject assignedBus & route/zone information dynamically
    const approvals = await TransportApproval.find({ status: 'approved' }).populate('placeId').populate('busId');
    
    const formatted = students.map(student => {
      const studentApproval = approvals.find(a => a.studentId.toString() === student._id.toString());
      return {
        id: student.admissionNumber, // legacy mappings
        admissionNumber: student.admissionNumber,
        fullName: student.fullName,
        grade: student.grade,
        stream: student.stream,
        parentName: student.parentName,
        parentContact: student.parentContact,
        address: student.address,
        isActive: student.isActive,
        busAssigned: studentApproval?.busId?.busNumber || null,
        routeAssigned: studentApproval?.placeId?.placeName || null, // fallback placeName
        oneWayFare: studentApproval?.placeId?.zoneId?.oneWayFare || 0,
        twoWayFare: studentApproval?.placeId?.zoneId?.twoWayFare || 0
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching students.' });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findOne({ admissionNumber: req.params.id });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const studentApproval = await TransportApproval.findOne({ studentId: student._id, status: 'approved' })
      .populate('placeId')
      .populate('busId');

    return res.json({
      success: true,
      data: {
        id: student.admissionNumber,
        admissionNumber: student.admissionNumber,
        fullName: student.fullName,
        grade: student.grade,
        stream: student.stream,
        parentName: student.parentName,
        parentContact: student.parentContact,
        address: student.address,
        isActive: student.isActive,
        busAssigned: studentApproval?.busId?.busNumber || null,
        routeAssigned: studentApproval?.placeId?.placeName || null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching student.' });
  }
});

app.post('/api/students', auth(['superior_Admin', 'Admin']), async (req, res) => {
  const { admissionNumber, fullName, grade, stream, parentName, parentContact, address } = req.body;
  if (!admissionNumber || !fullName) {
    return res.status(400).json({ success: false, message: 'Admission number and Name are required.' });
  }

  try {
    const existing = await Student.findOne({ admissionNumber });
    if (existing) return res.status(400).json({ success: false, message: 'Admission number already exists.' });

    const student = await Student.create({
      admissionNumber,
      fullName,
      grade,
      stream,
      parentName,
      parentContact,
      address,
      isActive: true
    });

    return res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/students/:id', auth(['superior_Admin', 'Admin']), async (req, res) => {
  const patch = req.body;
  try {
    const student = await Student.findOne({ admissionNumber: req.params.id });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    Object.keys(patch).forEach(key => {
      if (patch[key] !== undefined) {
        student[key] = patch[key];
      }
    });

    await student.save();
    return res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Approvals & Assignments Endpoints (incorporating the capacity audit constraint)
app.get('/api/approvals', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : { status: 'pending' };
    const approvals = await TransportApproval.find(filter)
      .populate('studentId')
      .populate('busId')
      .populate('placeId');

    const formatted = approvals.map(appr => ({
      id: appr._id,
      studentId: appr.studentId?.admissionNumber || '',
      fullName: appr.studentId?.fullName || '',
      busId: appr.busId?.busNumber || '',
      tripNumber: appr.tripNumber,
      placeId: appr.placeId?._id || '',
      placeName: appr.placeId?.placeName || '',
      tripType: appr.tripType,
      direction: appr.direction,
      status: appr.status,
      updatedAt: appr.updatedAt || appr.createdAt
    }));

    return res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching approvals.' });
  }
});

app.post('/api/approvals', auth(['superior_Admin', 'Admin']), async (req, res) => {
  const { studentAdmission, busNumber, tripNumber, placeId, tripType, direction } = req.body;
  if (!studentAdmission || !busNumber || !placeId) {
    return res.status(400).json({ success: false, message: 'Missing required assignment fields.' });
  }

  try {
    const student = await Student.findOne({ admissionNumber: studentAdmission });
    const bus = await Bus.findOne({ busNumber });
    const place = await Place.findById(placeId);

    if (!student || !bus || !place) {
      return res.status(404).json({ success: false, message: 'Student, Bus or Place not found.' });
    }

    // Create a new pending assignment request
    const approval = await TransportApproval.create({
      studentId: student._id,
      busId: bus._id,
      tripNumber: Number(tripNumber) || 1,
      placeId: place._id,
      tripType: tripType || 'two_way',
      direction: direction || 'both',
      status: 'pending'
    });

    return res.json({ success: true, data: approval });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/approvals/:id', auth(['superior_Admin']), async (req, res) => {
  const { status } = req.body; // 'approved' or 'rejected'
  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status update. Must be approved or rejected.' });
  }

  try {
    const approval = await TransportApproval.findById(req.params.id).populate('busId');
    if (!approval) return res.status(404).json({ success: false, message: 'Approval record not found.' });

    if (status === 'approved') {
      // 4. CAPACITY GUARD AUDIT: check passengers dynamically using atomic queries
      const bus = approval.busId;
      const alreadyApprovedCount = await TransportApproval.countDocuments({
        busId: bus._id,
        tripNumber: approval.tripNumber,
        status: 'approved'
      });

      if (alreadyApprovedCount >= bus.capacity) {
        return res.status(400).json({
          success: false,
          message: `Approval failed. Bus "${bus.name}" (Capacity: ${bus.capacity}) is already fully booked for Trip ${approval.tripNumber}.`
        });
      }

      approval.status = 'approved';
      approval.approvedBy = req.user.id;
      approval.approvedAt = new Date();
      await approval.save();

      // De-assign student from any other active bus approvals (ensure a student belongs to only one active bus trip)
      await TransportApproval.updateMany(
        { studentId: approval.studentId, _id: { $ne: approval._id }, status: 'approved' },
        { status: 'rejected' }
      );
    } else {
      approval.status = 'rejected';
      await approval.save();
    }

    return res.json({ success: true, data: approval });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Stats Endpoint (live counts resolved from MongoDB)
app.get('/api/stats', async (req, res) => {
  try {
    const students = await Student.countDocuments({ isActive: true });
    const buses = await Bus.countDocuments({ status: 'Active' });
    const zones = await Zone.countDocuments({ status: 'Active' });
    const pendingApprovals = await TransportApproval.countDocuments({ status: 'pending' });

    // Calculate simulated totals for dashboard stats compatibility
    return res.json({
      success: true,
      data: {
        students,
        buses,
        routes: zones, // zones mapping
        pendingApprovals,
        collectedFees: 752400, // mock financial totals
        outstandingFees: 120500
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching stats.' });
  }
});

// Run server
app.listen(PORT, async () => {
  console.log(`Express Backend Server running on port ${PORT}`);
  await connectDB();
  await seedDatabase();
});
