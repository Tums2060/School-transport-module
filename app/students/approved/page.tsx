'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Student = {
  id: string;
  admissionNumber: string;
  fullName: string;
  grade: string;
  stream: string | null;
  parentName: string;
  parentContact: string;
  busAssigned: string | null;
  routeAssigned: string | null;
  isActive: boolean;
};

type ApprovalRecord = {
  studentId: string;
  admissionNumber: string;
  fullName: string;
  grade: string;
  parentName: string;
  parentContact: string;
  routeId: string;
  busId: string;
  tripType: '' | 'one_way' | 'two_way';
  direction: '' | 'morning' | 'evening';
  usingBus: boolean;
  status: 'pending' | 'approved';
  updatedAt: string;
};

type RouteRecord = {
  id: string;
  routeName: string;
  oneWayFare?: number;
  twoWayFare?: number;
  status?: string;
};

type BusRecord = {
  id: string;
  name?: string;
  busNumber?: string;
  status?: string;
};

const APPROVALS_KEY = 'student_transport_approvals';
const ROUTES_KEY = 'school_routes';
const BUSES_KEY = 'school_buses';

function formatTripType(value: ApprovalRecord['tripType']): string {
  if (value === 'one_way') return 'One Way';
  if (value === 'two_way') return 'Two Way';
  return '-';
}

function formatDirection(value: ApprovalRecord['direction']): string {
  if (value === 'morning') return 'Morning';
  if (value === 'evening') return 'Evening';
  return '-';
}

export default function ApprovedStudentsPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [buses, setBuses] = useState<BusRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const canUsePage = useMemo(() => role === 'Admin' || role === 'superior_Admin', [role]);

  useEffect(() => {
    queueMicrotask(() => {
      const session = localStorage.getItem('user');
      if (session) {
        try {
          const user = JSON.parse(session);
          setRole(user.role || '');
        } catch {
          setRole('');
        }
      }

      Promise.all([fetch('/api/students').then((response) => response.json()).catch(() => ({ success: false }))])
        .then(([studentsJson]) => {
          if (studentsJson.success) {
            setStudents((studentsJson.data || []) as Student[]);
          }
        })
        .finally(() => {
          try {
            setApprovals((JSON.parse(localStorage.getItem(APPROVALS_KEY) || '[]') as ApprovalRecord[]).filter((item) => item.status === 'approved'));
          } catch {
            setApprovals([]);
          }

          try {
            setRoutes(JSON.parse(localStorage.getItem(ROUTES_KEY) || '[]') as RouteRecord[]);
          } catch {
            setRoutes([]);
          }

          try {
            setBuses(JSON.parse(localStorage.getItem(BUSES_KEY) || '[]') as BusRecord[]);
          } catch {
            setBuses([]);
          }

          setIsMounted(true);
        });
    });
  }, []);

  useEffect(() => {
    if (isMounted && role !== '' && !canUsePage) {
      router.replace('/');
    }
  }, [isMounted, role, canUsePage, router]);

  const studentMap = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const routeMap = useMemo(() => new Map(routes.map((route) => [route.id, route])), [routes]);
  const busMap = useMemo(() => new Map(buses.map((bus) => [bus.id, bus])), [buses]);

  const filteredApprovals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return approvals.filter((record) => {
      const student = studentMap.get(record.studentId);
      const route = routeMap.get(record.routeId);
      const bus = busMap.get(record.busId);
      const routeLabel = route?.routeName || '';
      const busLabel = bus?.name || bus?.busNumber || '';
      return (
        term === '' ||
        record.admissionNumber.toLowerCase().includes(term) ||
        record.fullName.toLowerCase().includes(term) ||
        (student?.grade || record.grade || '').toLowerCase().includes(term) ||
        routeLabel.toLowerCase().includes(term) ||
        busLabel.toLowerCase().includes(term)
      );
    });
  }, [approvals, studentMap, routeMap, busMap, searchTerm]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm flex items-center justify-center">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!canUsePage) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm text-gray-800 dark:text-gray-100">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <Link href="/" className="hover:underline text-gray-500 dark:text-gray-400">Home</Link>
        <Link href="/students" className="hover:underline">All Students</Link>
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Students</span>
        <Link href="/buses" className="hover:underline">Transport Module</Link>
        <Link href="/routes" className="hover:underline">Routes</Link>
      </div>

      <main className="p-6">
        <div className="bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Approved Students</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Students approved to use the bus system with their assigned bus and route.
              </p>
            </div>
            <div className="w-full md:w-96">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search admission, student, grade, route, or bus"
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {filteredApprovals.length === 0 ? (
            <div className="text-sm text-gray-500">No approved students found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Admission</th>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-left">Grade</th>
                    <th className="px-3 py-2 text-left">Route</th>
                    <th className="px-3 py-2 text-left">Bus</th>
                    <th className="px-3 py-2 text-left">Trip Type</th>
                    <th className="px-3 py-2 text-left">Direction</th>
                    <th className="px-3 py-2 text-left">Approved On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredApprovals.map((record) => {
                    const student = studentMap.get(record.studentId);
                    const route = routeMap.get(record.routeId);
                    const bus = busMap.get(record.busId);

                    return (
                      <tr key={record.studentId}>
                        <td className="px-3 py-2 font-medium text-teal-700">{record.admissionNumber}</td>
                        <td className="px-3 py-2">{student?.fullName || record.fullName}</td>
                        <td className="px-3 py-2">{student?.grade || record.grade || '-'}</td>
                        <td className="px-3 py-2">{route?.routeName || '-'}</td>
                        <td className="px-3 py-2">{bus?.name || bus?.busNumber || '-'}</td>
                        <td className="px-3 py-2">{formatTripType(record.tripType)}</td>
                        <td className="px-3 py-2">{formatDirection(record.direction)}</td>
                        <td className="px-3 py-2">{new Date(record.updatedAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
