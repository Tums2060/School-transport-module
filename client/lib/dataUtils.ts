/**
 * Production backend integration layer replacing mock JSON CRUD operations
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'superior_Admin' | 'Admin' | 'Bus_Driver' | 'Finance_Manager';
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
}

export interface Student {
  id: string;
  admissionNumber: string;
  fullName: string;
  grade: string;
  stream: string | null;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female';
  address: string;
  parentName: string;
  parentContact: string;
  busAssigned: string | null;
  routeAssigned: string | null;
  enrollmentDate?: string;
  isActive: boolean;
  oneWayFare?: number;
  twoWayFare?: number;
}

export interface Bus {
  id: string;
  busNumber: string;
  capacity: number;
  status: 'Active' | 'Maintenance' | 'Inactive' | 'Out of Service';
  notes?: string;
  driver?: {
    name: string;
    phone: string;
  };
  trips?: Array<{
    tripNumber: number;
    time: string;
    pickupPoints: string;
    pickupPointIds?: string[];
    notes: string;
  }>;
}

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
  oneWayFare?: number;
  twoWayFare?: number;
}

export interface Stop {
  stopNumber: number;
  stopName: string;
  location: string;
  time: string;
  studentsCount: number;
}

export async function getUsers(): Promise<User[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/users`, { cache: 'no-store' });
    const json = await res.json();
    if (!json.success) return [];
    return json.data.map((u: any) => ({
      id: u._id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      email: u.email || '',
      phone: u.phone || '',
      isActive: u.isActive,
      permissions: {
        manageUsers: u.role === 'superior_Admin',
        manageBuses: ['superior_Admin', 'Admin'].includes(u.role),
        manageStudents: ['superior_Admin', 'Admin'].includes(u.role),
        manageRoutes: ['superior_Admin', 'Admin'].includes(u.role),
        manageDrivers: ['superior_Admin', 'Admin'].includes(u.role),
        viewReports: true,
        systemSettings: u.role === 'superior_Admin',
        approveRequests: ['superior_Admin', 'Admin'].includes(u.role)
      }
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.username === username) || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.id === id) || null;
}

export async function getStudents(): Promise<Student[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/students`, { cache: 'no-store' });
    const json = await res.json();
    if (!json.success) return [];
    return json.data;
  } catch (error) {
    console.error('Error fetching students:', error);
    return [];
  }
}

export async function getStudentById(id: string): Promise<Student | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/students/${id}`, { cache: 'no-store' });
    const json = await res.json();
    if (!json.success) return null;
    return json.data;
  } catch (error) {
    console.error(`Error fetching student ${id}:`, error);
    return null;
  }
}

export async function getActiveStudentsCount(): Promise<number> {
  const students = await getStudents();
  return students.filter(s => s.isActive).length;
}

export async function updateStudent(id: string, patch: Partial<Student>): Promise<Student | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    const json = await res.json();
    if (!json.success) return null;
    return json.data;
  } catch (error) {
    console.error(`Error updating student ${id}:`, error);
    return null;
  }
}

export async function getBuses(): Promise<Bus[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/buses`, { cache: 'no-store' });
    const json = await res.json();
    if (!json.success) return [];
    return json.data;
  } catch (error) {
    console.error('Error fetching buses:', error);
    return [];
  }
}

export async function getBusById(id: string): Promise<Bus | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/buses/${id}`, { cache: 'no-store' });
    const json = await res.json();
    if (!json.success) return null;
    return json.data;
  } catch (error) {
    console.error(`Error fetching bus ${id}:`, error);
    return null;
  }
}

export async function getActiveBusesCount(): Promise<number> {
  const buses = await getBuses();
  return buses.filter(b => b.status === 'Active').length;
}

export async function getRoutes(): Promise<Route[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/zones`, { cache: 'no-store' });
    const json = await res.json();
    if (!json.success) return [];
    
    // Map backend Zones list to Route frontend models to maintain backward compatibility
    return json.data.map((z: any) => ({
      id: z.id,
      routeName: z.zoneName,
      routeCode: z.zoneName.substring(0, 3).toUpperCase(),
      busAssigned: null,
      driverAssigned: null,
      driverName: null,
      status: z.status,
      pickupTime: '07:00 AM',
      dropoffTime: '04:00 PM',
      distance: '0 km',
      estimatedDuration: '0 min',
      studentsAssigned: 0,
      stops: (z.places || []).map((p: any, idx: number) => ({
        stopNumber: idx + 1,
        stopName: p.placeName,
        location: '',
        time: '',
        studentsCount: 0
      })),
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      isActive: z.status === 'Active',
      oneWayFare: z.oneWayFare,
      twoWayFare: z.twoWayFare
    }));
  } catch (error) {
    console.error('Error fetching zones as routes:', error);
    return [];
  }
}

export async function getRouteById(id: string): Promise<Route | null> {
  const routes = await getRoutes();
  return routes.find(r => r.id === id) || null;
}

export async function getActiveRoutesCount(): Promise<number> {
  const routes = await getRoutes();
  return routes.filter(r => r.isActive).length;
}
