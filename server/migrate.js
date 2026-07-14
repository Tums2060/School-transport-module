import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import User from './models/User.js';
import Zone from './models/Zone.js';
import Place from './models/Place.js';
import Bus from './models/Bus.js';
import Student from './models/Student.js';
import TransportApproval from './models/TransportApproval.js';
import Term from './models/Term.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentDataDir = path.join(__dirname, '..', 'data');

async function runMigration() {
  console.log('Starting data migration...');
  await connectDB();

  // Clean existing tables to avoid duplicate key errors on unique constraints
  await User.deleteMany({});
  await Zone.deleteMany({});
  await Place.deleteMany({});
  await Bus.deleteMany({});
  await Student.deleteMany({});
  await TransportApproval.deleteMany({});
  await Term.deleteMany({});

  console.log('Database cleared of existing User, Zone, Place, Bus, Student, TransportApproval, and Term records.');

  // 1. Seed Catch-All Zone
  const catchAllZoneName = 'General Zone';
  const catchAllZone = await Zone.create({
    zoneName: catchAllZoneName,
    oneWayFare: 100,
    twoWayFare: 180,
    isCatchAll: true,
    status: 'Active'
  });
  console.log(`Catch-All Zone seeded: "${catchAllZone.zoneName}"`);

  // Helper function to read mock json
  const readMockFile = (filename) => {
    const filePath = path.join(parentDataDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  };

  // 2. Migrate Users
  const rawUsers = readMockFile('users.json');
  const userMap = new Map(); // id -> MongoDB document
  for (const rawUser of rawUsers) {
    const salt = await bcrypt.genSalt(10);
    // Normalize role string if needed, otherwise matches users.json
    const passwordHash = await bcrypt.hash(rawUser.password || 'password', salt);
    const userDoc = await User.create({
      username: rawUser.username,
      passwordHash,
      email: rawUser.email,
      fullName: rawUser.fullName,
      role: rawUser.role,
      phone: rawUser.phone,
      isActive: rawUser.isActive ?? true
    });
    userMap.set(rawUser.id, userDoc);
  }
  console.log(`Migrated ${userMap.size} users.`);

  // Find a super admin to use as default approver
  const superAdminUser = Array.from(userMap.values()).find(u => u.role === 'superior_Admin');

  // 3. Migrate Routes to Zones and Places
  const rawRoutes = readMockFile('routes.json');
  const zoneMap = new Map(); // route id -> MongoDB Zone document
  const placeMap = new Map(); // stopName/placeName -> MongoDB Place document
  const routePlacesMap = new Map(); // routeId -> array of MongoDB Place docs

  for (const rawRoute of rawRoutes) {
    // Each route becomes a Zone
    let zoneDoc = await Zone.findOne({ zoneName: rawRoute.routeName });
    if (!zoneDoc) {
      zoneDoc = await Zone.create({
        zoneName: rawRoute.routeName,
        oneWayFare: 200, // default fare
        twoWayFare: 350,
        status: rawRoute.status === 'Active' ? 'Active' : 'Inactive',
        isCatchAll: false
      });
    }
    zoneMap.set(rawRoute.id, zoneDoc);

    const placesForRoute = [];
    // Convert stops into Places
    if (Array.isArray(rawRoute.stops)) {
      for (const stop of rawRoute.stops) {
        let placeDoc = await Place.findOne({ placeName: stop.stopName });
        if (!placeDoc) {
          placeDoc = await Place.create({
            placeName: stop.stopName,
            zoneId: zoneDoc._id
          });
        } else {
          console.warn(`Warning: Duplicate stop name "${stop.stopName}" found. Sharing Place record.`);
        }
        placeMap.set(stop.stopName, placeDoc);
        placesForRoute.push(placeDoc);
      }
    }
    routePlacesMap.set(rawRoute.id, placesForRoute);
  }
  console.log(`Migrated ${zoneMap.size} Routes to Zones.`);
  console.log(`Migrated ${placeMap.size} unique places/stops.`);

  // 4. Migrate Buses
  const rawBuses = readMockFile('buses.json');
  const busMap = new Map(); // busId (both raw e.g. "bus_001" or "BS001") -> MongoDB doc
  for (const rawBus of rawBuses) {
    const driverDoc = userMap.get(rawBus.driverId);
    
    // Convert route assignment to pickup points on trips
    const assignedRouteId = rawBus.routeAssigned;
    const places = routePlacesMap.get(assignedRouteId) || [];
    
    // Create morning (07:00) and evening (16:00) trips if a route is assigned
    const trips = [];
    if (places.length > 0) {
      trips.push({
        tripNumber: 1,
        time: '07:00',
        pickupPoints: places.map(p => p._id),
        notes: 'Morning pick-up'
      });
      trips.push({
        tripNumber: 2,
        time: '16:00',
        pickupPoints: places.map(p => p._id),
        notes: 'Evening drop-off'
      });
    }

    const busDoc = await Bus.create({
      busNumber: rawBus.busNumber,
      name: `${rawBus.manufacturer || 'Bus'} - ${rawBus.model || rawBus.id}`,
      capacity: rawBus.capacity || 45,
      status: rawBus.status === 'Inactive' ? 'Out of Service' : rawBus.status, // map Active/Maintenance/Out of Service
      driverId: driverDoc ? driverDoc._id : null,
      trips
    });
    
    // Map both IDs to the bus doc for robust reference lookup
    busMap.set(rawBus.id, busDoc);
    // Extract BS number from registration/id
    const legacyNumber = rawBus.id.replace('bus_', 'BS'); // e.g. bus_001 -> BS001
    busMap.set(legacyNumber, busDoc);
    busMap.set(rawBus.busNumber, busDoc);
  }
  console.log(`Migrated ${rawBuses.length} buses.`);

  // 5. Migrate Students
  const rawStudents = readMockFile('students.json');
  let migratedStudentsCount = 0;
  let approvedApprovalsCount = 0;

  for (const rawStudent of rawStudents) {
    const studentDoc = await Student.create({
      admissionNumber: rawStudent.admissionNumber,
      fullName: rawStudent.fullName,
      grade: rawStudent.grade,
      stream: rawStudent.stream || '',
      parentName: rawStudent.parentName,
      parentContact: rawStudent.parentContact,
      address: rawStudent.address,
      isActive: rawStudent.isActive ?? true
    });
    migratedStudentsCount++;

    // 6. If student is assigned to transport, create approved/pending/rejected TransportApproval record
    if (rawStudent.busAssigned && rawStudent.routeAssigned) {
      const busDoc = busMap.get(rawStudent.busAssigned);
      const zoneDoc = zoneMap.get(rawStudent.routeAssigned) || zoneMap.get(rawStudent.routeAssigned.replace('RT', 'route_'));
      
      if (busDoc) {
        const places = routePlacesMap.get(rawStudent.routeAssigned) || routePlacesMap.get(rawStudent.routeAssigned.replace('RT', 'route_')) || [];
        const placeDoc = places[0] || catchAllZone;

        // Distribute statuses: divisible by 5 = pending, divisible by 7 = rejected, else = approved
        let status = 'approved';
        if (migratedStudentsCount % 5 === 0) {
          status = 'pending';
        } else if (migratedStudentsCount % 7 === 0) {
          status = 'rejected';
        }

        await TransportApproval.create({
          studentId: studentDoc._id,
          busId: busDoc._id,
          tripNumber: 1, // default to trip 1
          placeId: placeDoc._id,
          tripType: 'two_way',
          direction: 'both',
          status: status,
          approvedBy: status === 'approved' && superAdminUser ? superAdminUser._id : null,
          approvedAt: status === 'approved' ? new Date() : null
        });
        approvedApprovalsCount++;
      }
    }
  }

  // 7. Seed default active Term
  await Term.deleteMany({});
  const defaultTerm = await Term.create({
    name: 'Term 1 2026',
    startDate: new Date('2026-01-05'),
    endDate: new Date('2026-04-10'),
    isActive: true
  });
  console.log(`Seeded default active Term: "${defaultTerm.name}"`);

  console.log(`Migrated ${migratedStudentsCount} students.`);
  console.log(`Created ${approvedApprovalsCount} transport records (mix of approved/pending/rejected).`);
  console.log('Migration finished successfully!');
  await mongoose.connection.close();
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
