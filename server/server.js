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
import Term from './models/Term.js';
import SmsLog from './models/SmsLog.js';
import DriverSession from './models/DriverSession.js';
import OdometerLog from './models/OdometerLog.js';
import FuelLog from './models/FuelLog.js';
import AttendanceRecord from './models/AttendanceRecord.js';
import AttendanceErrorReport from './models/AttendanceErrorReport.js';

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
        _id: bus._id,
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
        _id: bus._id,
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

app.get('/api/students', async (req, res) => {
  const { busId, tripNumber } = req.query;
  try {
    let approvalsFilter = { status: 'approved' };
    if (busId) {
      const busDoc = await Bus.findOne({
        $or: [
          { busNumber: busId },
          { _id: mongoose.isValidObjectId(busId) ? busId : new mongoose.Types.ObjectId() }
        ]
      });
      if (busDoc) {
        approvalsFilter.busId = busDoc._id;
      } else {
        approvalsFilter.busId = new mongoose.Types.ObjectId();
      }
    }
    if (tripNumber) {
      approvalsFilter.tripNumber = Number(tripNumber);
    }

    const approvals = await TransportApproval.find(approvalsFilter).populate('placeId').populate('busId').populate('studentId');
    
    if (busId) {
      // Return ONLY students assigned to this bus and optional tripNumber
      const formatted = approvals
        .filter(a => a.studentId) // ensure student exists
        .map(a => {
          const student = a.studentId;
          return {
            _id: student._id,
            id: student.admissionNumber,
            admissionNumber: student.admissionNumber,
            fullName: student.fullName,
            grade: student.grade,
            stream: student.stream,
            parentName: student.parentName,
            parentContact: student.parentContact,
            address: student.address,
            isActive: student.isActive,
            busAssigned: a.busId?.busNumber || null,
            routeAssigned: a.placeId?.placeName || null,
            oneWayFare: a.placeId?.zoneId?.oneWayFare || 0,
            twoWayFare: a.placeId?.zoneId?.twoWayFare || 0
          };
        });
      return res.json({ success: true, data: formatted });
    }

    const students = await Student.find({});
    const allApprovals = await TransportApproval.find({ status: 'approved' }).populate('placeId').populate('busId');
    
    const formatted = students.map(student => {
      const studentApproval = allApprovals.find(a => a.studentId.toString() === student._id.toString());
      return {
        _id: student._id,
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
        routeAssigned: studentApproval?.placeId?.placeName || null,
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

// --- TERM MODULE ENDPOINTS ---
app.get('/api/terms', async (req, res) => {
  try {
    const terms = await Term.find({}).sort({ startDate: -1 });
    return res.json({ success: true, data: terms });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/terms', auth(['superior_Admin']), async (req, res) => {
  const { name, startDate, endDate, isActive } = req.body;
  if (!name || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Name, startDate, and endDate are required.' });
  }
  try {
    if (isActive) {
      await Term.updateMany({}, { isActive: false });
    }
    const term = await Term.create({ name, startDate, endDate, isActive: !!isActive });
    return res.json({ success: true, data: term });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/terms/:id', auth(['superior_Admin']), async (req, res) => {
  const { name, startDate, endDate, isActive } = req.body;
  try {
    const term = await Term.findById(req.params.id);
    if (!term) return res.status(404).json({ success: false, message: 'Term not found.' });

    term.name = name || term.name;
    term.startDate = startDate || term.startDate;
    term.endDate = endDate || term.endDate;

    if (isActive !== undefined) {
      if (isActive) {
        await Term.updateMany({ _id: { $ne: term._id } }, { isActive: false });
      }
      term.isActive = isActive;
    }

    await term.save();
    return res.json({ success: true, data: term });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --- BULK SMS ENDPOINTS ---
app.get('/api/sms/history', async (req, res) => {
  try {
    const logs = await SmsLog.find({}).sort({ sentAt: -1 }).populate('recipientId');
    const formatted = logs.map(log => {
      let recipientName = 'Unknown';
      let recipientPhone = 'N/A';
      
      if (log.recipientId) {
        if (log.recipientModel === 'Student') {
          recipientName = log.recipientId.fullName || 'Parent';
          recipientPhone = log.recipientId.parentContact || 'N/A';
        } else if (log.recipientModel === 'User') {
          recipientName = log.recipientId.fullName || 'Driver';
          recipientPhone = log.recipientId.phone || 'N/A';
        }
      }
      return {
        id: log._id,
        recipientType: log.recipientType,
        recipientName,
        recipientPhone,
        targetCriteria: log.targetCriteria || 'Direct Send',
        message: log.message,
        status: log.status,
        sentAt: log.sentAt
      };
    });
    return res.json({ success: true, data: formatted });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/sms/send', auth(['superior_Admin', 'Admin']), async (req, res) => {
  const { recipientType, target, message } = req.body;
  if (!recipientType || !message) {
    return res.status(400).json({ success: false, message: 'recipientType and message are required.' });
  }
  try {
    let targets = [];
    let criteria = '';

    if (recipientType === 'Driver') {
      if (target?.type === 'bus') {
        const bus = await Bus.findOne({ busNumber: target.id }).populate('driverId');
        if (bus && bus.driverId) {
          targets.push({ id: bus.driverId._id, model: 'User' });
          criteria = `Bus Driver: ${bus.busNumber}`;
        }
      } else if (target?.type === 'individual') {
        const user = await User.findById(target.id);
        if (user) {
          targets.push({ id: user._id, model: 'User' });
          criteria = `Driver: ${user.fullName}`;
        }
      } else {
        const users = await User.find({ role: 'Bus_Driver' });
        targets = users.map(u => ({ id: u._id, model: 'User' }));
        criteria = 'All Drivers';
      }
    } else {
      if (target?.type === 'bus_trip') {
        const [busNo, tripNo] = target.id.split('_');
        const bus = await Bus.findOne({ busNumber: busNo });
        if (bus) {
          const approvals = await TransportApproval.find({ busId: bus._id, tripNumber: Number(tripNo), status: 'approved' }).populate('studentId');
          targets = approvals.filter(a => a.studentId).map(a => ({ id: a.studentId._id, model: 'Student' }));
          criteria = `Bus: ${busNo} - Trip ${tripNo}`;
        }
      } else if (target?.type === 'grade') {
        const students = await Student.find({ grade: target.id });
        targets = students.map(s => ({ id: s._id, model: 'Student' }));
        criteria = `Grade: ${target.id}`;
      } else if (target?.type === 'individual') {
        const student = await Student.findOne({ admissionNumber: target.id });
        if (student) {
          targets.push({ id: student._id, model: 'Student' });
          criteria = `Parent of: ${student.fullName}`;
        }
      } else {
        const students = await Student.find({ isActive: true });
        targets = students.map(s => ({ id: s._id, model: 'Student' }));
        criteria = 'All Parents';
      }
    }

    if (targets.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients found for selection criteria.' });
    }

    const createdLogs = [];
    for (const tgt of targets) {
      const isFailed = Math.random() < 0.10;
      const status = isFailed ? 'failed' : 'delivered';
      const log = await SmsLog.create({
        recipientType,
        recipientId: tgt.id,
        recipientModel: tgt.model,
        targetCriteria: criteria,
        message,
        status,
        sentAt: new Date()
      });
      createdLogs.push(log);
    }
    return res.json({ success: true, message: `Mocked SMS queued/sent to ${createdLogs.length} recipients.`, data: createdLogs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --- DRIVER & FUEL & ODOMETER ENDPOINTS ---
app.post('/api/driver/login', async (req, res) => {
  const { busNumber, password, driverName, deviceIdentifier } = req.body;
  if (!busNumber || !password || !driverName || !deviceIdentifier) {
    return res.status(400).json({ success: false, message: 'busNumber, password, driverName, and deviceIdentifier are required.' });
  }
  try {
    const bus = await Bus.findOne({ busNumber });
    if (!bus || bus.status === 'Out of Service') {
      return res.status(401).json({ success: false, message: 'Bus not found or out of service.' });
    }
    const isMatch = await bcrypt.compare(password, bus.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid plate number or password.' });
    }
    const session = await DriverSession.create({
      busId: bus._id,
      driverName,
      deviceIdentifier
    });
    const token = jwt.sign(
      { id: session._id, busId: bus._id, role: 'Bus_Driver', fullName: driverName, busNumber },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`);
    return res.json({
      success: true,
      session: {
        id: session._id,
        busId: bus._id,
        busNumber: bus.busNumber,
        driverName,
        deviceIdentifier
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/driver/trips/start', auth(['Bus_Driver']), async (req, res) => {
  const { tripNumber, time, tripType, nonStudentReasons, otherReasonText } = req.body;
  if (!tripNumber || !time) {
    return res.status(400).json({ success: false, message: 'tripNumber and time are required.' });
  }
  try {
    const driverSession = await DriverSession.findById(req.user.id);
    if (!driverSession) return res.status(401).json({ success: false, message: 'Driver session expired.' });

    const bus = await Bus.findById(req.user.busId);
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found.' });

    const activeTrip = bus.trips.find(t => t.startTime && !t.endTime);
    if (activeTrip) {
      return res.status(400).json({ success: false, message: `Cannot start trip. Trip ${activeTrip.tripNumber} is currently active on this bus.` });
    }

    let trip = bus.trips.find(t => t.tripNumber === Number(tripNumber));
    if (!trip) {
      bus.trips.push({
        tripNumber: Number(tripNumber),
        time,
        tripType: tripType || 'scheduled',
        nonStudentReasons: nonStudentReasons || [],
        otherReasonText: otherReasonText || '',
        driverSessionId: driverSession._id,
        startTime: new Date(),
        endTime: null,
        distanceCovered: null
      });
      trip = bus.trips[bus.trips.length - 1];
    } else {
      trip.tripType = tripType || 'scheduled';
      trip.nonStudentReasons = nonStudentReasons || [];
      trip.otherReasonText = otherReasonText || '';
      trip.driverSessionId = driverSession._id;
      trip.startTime = new Date();
      trip.endTime = null;
      trip.distanceCovered = null;
    }
    await bus.save();
    return res.json({ success: true, message: `Trip ${tripNumber} started successfully.`, data: trip });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/driver/trips/end', auth(['Bus_Driver']), async (req, res) => {
  const { tripNumber, distance } = req.body;
  if (!tripNumber) {
    return res.status(400).json({ success: false, message: 'tripNumber is required.' });
  }
  try {
    const bus = await Bus.findById(req.user.busId);
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found.' });

    const trip = bus.trips.find(t => t.tripNumber === Number(tripNumber) && t.startTime && !t.endTime);
    if (!trip) {
      return res.status(400).json({ success: false, message: 'Active trip session not found or already ended.' });
    }
    trip.endTime = new Date();
    trip.distanceCovered = Number(distance) || 15;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await AttendanceRecord.updateMany(
      { busId: bus._id, tripNumber: trip.tripNumber, date: today },
      { locked: true }
    );

    await bus.save();
    return res.json({ success: true, message: `Trip ${tripNumber} ended.`, data: trip });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/driver/odometer', auth(['Bus_Driver']), async (req, res) => {
  const { reading } = req.body;
  if (!reading || Number(reading) <= 0) {
    return res.status(400).json({ success: false, message: 'A valid positive odometer reading is required.' });
  }
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentLog = await OdometerLog.findOne({
      busId: req.user.busId,
      loggedAt: { $gte: oneWeekAgo }
    });
    if (recentLog) {
      return res.status(400).json({ success: false, message: `Odometer was already logged recently on ${new Date(recentLog.loggedAt).toLocaleDateString()}. Odometer logs are capped at once a week.` });
    }
    const log = await OdometerLog.create({
      busId: req.user.busId,
      reading: Number(reading)
    });
    return res.json({ success: true, data: log });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/driver/fuel', auth(['Bus_Driver']), async (req, res) => {
  const { litersFilled, cost, odometerReading } = req.body;
  if (!litersFilled || !odometerReading) {
    return res.status(400).json({ success: false, message: 'litersFilled and odometerReading are required.' });
  }
  try {
    const log = await FuelLog.create({
      busId: req.user.busId,
      litersFilled: Number(litersFilled),
      cost: Number(cost) || 0,
      odometerReading: Number(odometerReading)
    });
    return res.json({ success: true, data: log });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/driver/telemetry/:busNumber', async (req, res) => {
  try {
    const bus = await Bus.findOne({ busNumber: req.params.busNumber });
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found.' });

    const fuelLogs = await FuelLog.find({ busId: bus._id }).sort({ loggedAt: 1 });
    const latestOdom = await OdometerLog.findOne({ busId: bus._id }).sort({ loggedAt: -1 });

    let consumptionRate = 8.5;
    let remainingFuel = 40;

    if (fuelLogs.length >= 2) {
      let totalDistance = 0;
      let totalLiters = 0;
      for (let i = 1; i < fuelLogs.length; i++) {
        const dist = fuelLogs[i].odometerReading - fuelLogs[i - 1].odometerReading;
        if (dist > 0) {
          totalDistance += dist;
          totalLiters += fuelLogs[i].litersFilled;
        }
      }
      if (totalLiters > 0) {
        consumptionRate = totalDistance / totalLiters;
      }
    }

    if (fuelLogs.length > 0) {
      const lastFill = fuelLogs[fuelLogs.length - 1];
      const currentOdom = latestOdom ? Math.max(latestOdom.reading, lastFill.odometerReading) : lastFill.odometerReading;
      const distSinceFill = currentOdom - lastFill.odometerReading;
      remainingFuel = Math.max(0, lastFill.litersFilled - (distSinceFill / consumptionRate));
    }

    return res.json({
      success: true,
      data: {
        mileage: latestOdom ? latestOdom.reading : (fuelLogs.length > 0 ? fuelLogs[fuelLogs.length - 1].odometerReading : 120500),
        consumptionRate: Number(consumptionRate.toFixed(2)),
        remainingFuel: Number(remainingFuel.toFixed(1))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --- ATTENDANCE & ABSENTEEISM ENDPOINTS ---
app.get('/api/attendance', async (req, res) => {
  const { busNumber, tripNumber, date } = req.query;
  if (!busNumber || !tripNumber || !date) {
    return res.status(400).json({ success: false, message: 'busNumber, tripNumber, and date are required.' });
  }
  try {
    const bus = await Bus.findOne({ busNumber });
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found.' });

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    const records = await AttendanceRecord.find({
      busId: bus._id,
      tripNumber: Number(tripNumber),
      date: queryDate
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/attendance', auth(['Bus_Driver']), async (req, res) => {
  const { studentMarks, tripNumber, date } = req.body;
  if (!studentMarks || !tripNumber || !date) {
    return res.status(400).json({ success: false, message: 'studentMarks, tripNumber, and date are required.' });
  }
  try {
    const busId = req.user.busId;
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    const isLocked = await AttendanceRecord.findOne({ busId, tripNumber: Number(tripNumber), date: queryDate, locked: true });
    if (isLocked) {
      return res.status(400).json({ success: false, message: 'Attendance for this trip and date is already locked after trip completion.' });
    }

    const savedRecords = [];
    for (const mark of studentMarks) {
      const record = await AttendanceRecord.findOneAndUpdate(
        { studentId: mark.studentId, busId, tripNumber: Number(tripNumber), date: queryDate },
        { present: mark.present, locked: false },
        { upsert: true, new: true }
      );
      savedRecords.push(record);
    }
    return res.json({ success: true, message: 'Attendance recorded successfully.', data: savedRecords });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/attendance/error-reports', async (req, res) => {
  const { attendanceRecordId, description, username } = req.body;
  if (!attendanceRecordId || !description) {
    return res.status(400).json({ success: false, message: 'attendanceRecordId and description are required.' });
  }
  try {
    const user = await User.findOne({ username });
    const report = await AttendanceErrorReport.create({
      attendanceRecordId,
      reportedBy: user ? user._id : null,
      description,
      status: 'open'
    });
    return res.json({ success: true, message: 'Attendance correction report submitted successfully.', data: report });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/attendance/error-reports', auth(['superior_Admin']), async (req, res) => {
  try {
    const reports = await AttendanceErrorReport.find({ status: 'open' })
      .populate({
        path: 'attendanceRecordId',
        populate: [
          { path: 'studentId', select: 'fullName admissionNumber' },
          { path: 'busId', select: 'busNumber' }
        ]
      })
      .populate('reportedBy', 'fullName');
    return res.json({ success: true, data: reports });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/attendance/error-reports/:id', auth(['superior_Admin']), async (req, res) => {
  const { action } = req.body;
  try {
    const report = await AttendanceErrorReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    if (action === 'approve') {
      const record = await AttendanceRecord.findById(report.attendanceRecordId);
      if (record) {
        record.present = !record.present;
        record.locked = true;
        await record.save();
      }
    }
    report.status = 'resolved';
    await report.save();
    return res.json({ success: true, message: `Report processed: ${action}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Settings & Threshold Endpoints
let absenteeismThresholdSetting = 50;

app.get('/api/settings/absenteeism-threshold', async (req, res) => {
  return res.json({ success: true, threshold: absenteeismThresholdSetting });
});

app.put('/api/settings/absenteeism-threshold', auth(['superior_Admin']), async (req, res) => {
  const { threshold } = req.body;
  if (threshold === undefined || Number(threshold) < 0 || Number(threshold) > 100) {
    return res.status(400).json({ success: false, message: 'Threshold must be a valid percentage (0-100).' });
  }
  absenteeismThresholdSetting = Number(threshold);
  return res.json({ success: true, message: `Threshold updated to ${absenteeismThresholdSetting}%.`, threshold: absenteeismThresholdSetting });
});

app.get('/api/attendance/absenteeism-rates', async (req, res) => {
  try {
    const activeTerm = await Term.findOne({ isActive: true });
    if (!activeTerm) {
      return res.json({ success: true, data: [] });
    }
    const students = await Student.find({ isActive: true });
    const approvals = await TransportApproval.find({ status: 'approved' }).populate('busId');

    const expectedDays = [];
    let curDate = new Date(activeTerm.startDate);
    const endDate = new Date(activeTerm.endDate);
    curDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    while (curDate <= endDate) {
      const day = curDate.getDay();
      if (day !== 0 && day !== 6) {
        expectedDays.push(new Date(curDate));
      }
      curDate.setDate(curDate.getDate() + 1);
    }

    const result = [];
    for (const student of students) {
      const studentApproval = approvals.find(a => a.studentId.toString() === student._id.toString());
      if (!studentApproval) continue;
      const bus = studentApproval.busId;
      const tripNum = studentApproval.tripNumber;
      const expectedTrips = expectedDays.length;

      const absentCount = await AttendanceRecord.countDocuments({
        studentId: student._id,
        busId: bus._id,
        tripNumber: tripNum,
        date: { $gte: activeTerm.startDate, $lte: activeTerm.endDate },
        present: false
      });

      const rate = expectedTrips > 0 ? (absentCount / expectedTrips) * 100 : 0;
      const isFlagged = rate >= absenteeismThresholdSetting;

      result.push({
        studentId: student.admissionNumber,
        fullName: student.fullName,
        grade: student.grade,
        busNumber: bus.busNumber,
        tripNumber: tripNum,
        absenteeismRate: Number(rate.toFixed(1)),
        expectedTrips,
        missedTrips: absentCount,
        isFlagged,
        threshold: absenteeismThresholdSetting
      });
    }
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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
