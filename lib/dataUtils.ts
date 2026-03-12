import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');

/**
 * Read JSON data from file
 */
export async function readData<T>(fileName: string): Promise<T> {
  try {
    const filePath = path.join(dataDir, fileName);
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent) as T;
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error);
    throw new Error(`Failed to read data from ${fileName}`);
  }
}

/**
 * Write JSON data to file
 */
export async function writeData<T>(fileName: string, data: T): Promise<void> {
  try {
    const filePath = path.join(dataDir, fileName);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${fileName}:`, error);
    throw new Error(`Failed to write data to ${fileName}`);
  }
}

/**
 * User types
 */
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'superior_Admin' | 'Admin' | 'Bus_Driver';
  fullName: string;
  email: string;
  phone: string;
  permissions: {
    manageUsers: boolean;
    manageBuses: boolean;
    manageStudents: boolean;
    manageRoutes: boolean;
    manageDrivers: boolean;
    viewReports: boolean;
    systemSettings: boolean;
    approveRequests: boolean;
  };
  createdAt: string;
  lastLogin: string | null;
  isActive: boolean;
  licenseNumber?: string;
  assignedBus?: string;
}

/**
 * Student types
 */
export interface Student {
  id: string;
  admissionNumber: string;
  fullName: string;
  grade: string;
  stream: string | null;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  address: string;
  parentName: string;
  parentContact: string;
  busAssigned: string | null;
  routeAssigned: string | null;
  enrollmentDate: string;
  isActive: boolean;
}

/**
 * Bus types
 */
export interface Bus {
  id: string;
  busNumber: string;
  registrationNumber: string;
  capacity: number;
  model: string;
  year: number;
  status: 'Active' | 'Maintenance' | 'Inactive';
  driverAssigned: string | null;
  driverName: string | null;
  routeAssigned: string | null;
  routeName: string | null;
  lastMaintenance: string;
  nextMaintenance: string;
  odometer: number;
  fuelType: string;
  hasGPS: boolean;
  hasAirConditioning: boolean;
  hasCCTV: boolean;
  insuranceExpiry: string;
  roadworthinessExpiry: string;
  notes: string;
  createdAt: string;
  lastUpdated: string;
}

/**
 * Route types
 */
export interface Route {
  id: string;
  routeName: string;
  routeCode: string;
  busAssigned: string | null;
  driverAssigned: string | null;
  driverName: string | null;
  status: 'Active' | 'Inactive';
  pickupTime: string;
  dropoffTime: string;
  distance: string;
  estimatedDuration: string;
  studentsAssigned: number;
  stops: Stop[];
  createdAt: string;
  lastUpdated: string;
  isActive: boolean;
  notes?: string;
}

export interface Stop {
  stopNumber: number;
  stopName: string;
  location: string;
  time: string;
  studentsCount: number;
}

/**
 * Get all users
 */
export async function getUsers(): Promise<User[]> {
  return readData<User[]>('users.json');
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.username === username) || null;
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.id === id) || null;
}

/**
 * Get all students
 */
export async function getStudents(): Promise<Student[]> {
  return readData<Student[]>('students.json');
}

/**
 * Get student by ID
 */
export async function getStudentById(id: string): Promise<Student | null> {
  const students = await getStudents();
  return students.find(s => s.id === id) || null;
}

/**
 * Get active students count
 */
export async function getActiveStudentsCount(): Promise<number> {
  const students = await getStudents();
  return students.filter(s => s.isActive === true).length;
}

/**
 * Get all buses
 */
export async function getBuses(): Promise<Bus[]> {
  return readData<Bus[]>('buses.json');
}

/**
 * Get bus by ID
 */
export async function getBusById(id: string): Promise<Bus | null> {
  const buses = await getBuses();
  return buses.find(b => b.id === id) || null;
}

/**
 * Get active buses count
 */
export async function getActiveBusesCount(): Promise<number> {
  const buses = await getBuses();
  return buses.filter(b => b.status === 'Active').length;
}

/**
 * Get all routes
 */
export async function getRoutes(): Promise<Route[]> {
  return readData<Route[]>('routes.json');
}

/**
 * Get route by ID
 */
export async function getRouteById(id: string): Promise<Route | null> {
  const routes = await getRoutes();
  return routes.find(r => r.id === id) || null;
}

/**
 * Get active routes count
 */
export async function getActiveRoutesCount(): Promise<number> {
  const routes = await getRoutes();
  return routes.filter(r => r.isActive).length;
}
