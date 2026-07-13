import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Zone from '../models/Zone.js';
import Place from '../models/Place.js';
import Bus from '../models/Bus.js';
import Student from '../models/Student.js';
import TransportApproval from '../models/TransportApproval.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentDataDir = path.join(__dirname, '..', '..', 'data');

export async function seedDatabase() {
  try {
    const userCount = await User.countDocuments({});
    if (userCount > 0) {
      console.log('Database already has data. Seeding bypassed.');
      return;
    }

    console.log('Database is empty. Starting database seeding from mock data...');

    // Clear just in case there's any dangling record
    await User.deleteMany({});
    await Zone.deleteMany({});
    await Place.deleteMany({});
    await Bus.deleteMany({});
    await Student.deleteMany({});
    await TransportApproval.deleteMany({});

    // 1. Seed Catch-All Zone
    const catchAllZone = await Zone.create({
      zoneName: 'General Zone',
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
    const userMap = new Map();
    for (const rawUser of rawUsers) {
      const salt = await bcrypt.genSalt(10);
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
    console.log(`Seeded ${userMap.size} users.`);

    const superAdminUser = Array.from(userMap.values()).find(u => u.role === 'superior_Admin');

    // 3. Migrate Routes to Zones and Places
    const rawRoutes = readMockFile('routes.json');
    const zoneMap = new Map();
    const placeMap = new Map();
    const routePlacesMap = new Map();

    for (const rawRoute of rawRoutes) {
      let zoneDoc = await Zone.findOne({ zoneName: rawRoute.routeName });
      if (!zoneDoc) {
        zoneDoc = await Zone.create({
          zoneName: rawRoute.routeName,
          oneWayFare: 200,
          twoWayFare: 350,
          status: rawRoute.status === 'Active' ? 'Active' : 'Inactive',
          isCatchAll: false
        });
      }
      zoneMap.set(rawRoute.id, zoneDoc);

      const placesForRoute = [];
      if (Array.isArray(rawRoute.stops)) {
        for (const stop of rawRoute.stops) {
          let placeDoc = await Place.findOne({ placeName: stop.stopName });
          if (!placeDoc) {
            placeDoc = await Place.create({
              placeName: stop.stopName,
              zoneId: zoneDoc._id
            });
          }
          placeMap.set(stop.stopName, placeDoc);
          placesForRoute.push(placeDoc);
        }
      }
      routePlacesMap.set(rawRoute.id, placesForRoute);
    }
    console.log(`Seeded ${zoneMap.size} Zones.`);
    console.log(`Seeded ${placeMap.size} Places.`);

    // 4. Migrate Buses
    const rawBuses = readMockFile('buses.json');
    const busMap = new Map();
    for (const rawBus of rawBuses) {
      const driverDoc = userMap.get(rawBus.driverId);
      const assignedRouteId = rawBus.routeAssigned;
      const places = routePlacesMap.get(assignedRouteId) || [];
      
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
        status: rawBus.status === 'Inactive' ? 'Out of Service' : rawBus.status,
        driverId: driverDoc ? driverDoc._id : null,
        trips
      });
      
      busMap.set(rawBus.id, busDoc);
      const legacyNumber = rawBus.id.replace('bus_', 'BS');
      busMap.set(legacyNumber, busDoc);
      busMap.set(rawBus.busNumber, busDoc);
    }
    console.log(`Seeded ${rawBuses.length} Buses.`);

    // 5. Migrate Students
    const rawStudents = readMockFile('students.json');
    let studentCount = 0;
    let approvalCount = 0;

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
      studentCount++;

      if (rawStudent.busAssigned && rawStudent.routeAssigned) {
        const busDoc = busMap.get(rawStudent.busAssigned);
        const places = routePlacesMap.get(rawStudent.routeAssigned) || routePlacesMap.get(rawStudent.routeAssigned.replace('RT', 'route_')) || [];
        const placeDoc = places[0] || catchAllZone;

        if (busDoc) {
          await TransportApproval.create({
            studentId: studentDoc._id,
            busId: busDoc._id,
            tripNumber: 1,
            placeId: placeDoc._id,
            tripType: 'two_way',
            direction: 'both',
            status: 'approved',
            approvedBy: superAdminUser ? superAdminUser._id : null,
            approvedAt: new Date()
          });
          approvalCount++;
        }
      }
    }
    console.log(`Seeded ${studentCount} Students.`);
    console.log(`Seeded ${approvalCount} approved transport records.`);
    console.log('Database seeding finished successfully!');
  } catch (err) {
    console.error('Seeding failed:', err);
  }
}
