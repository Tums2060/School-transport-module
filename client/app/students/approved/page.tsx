'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type ApprovalRecord = {
  id: string;
  studentId: string;
  admissionNumber: string;
  fullName: string;
  grade: string;
  parentName: string;
  parentContact: string;
  routeId: string;
  busId: string;
  tripType: 'one_way' | 'two_way';
  direction: 'morning' | 'evening' | 'both';
  status: string;
  updatedAt: string;
  placeName?: string;
};

type Student = {
  id: string;
  admissionNumber: string;
  fullName: string;
  grade: string;
};

type RouteRecord = {
  id: string;
  routeName: string;
};

type BusRecord = {
  id: string;
  name: string;
};

function formatTripType(type: string) {
  if (type === 'one_way') return 'One Way';
  if (type === 'two_way') return 'Two Way';
  return type || '-';
}

function formatDirection(dir: string) {
  if (dir === 'morning') return 'Morning';
  if (dir === 'evening') return 'Evening';
  if (dir === 'both') return 'Both';
  return dir || '-';
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
    const session = localStorage.getItem('user');
    if (session) {
      try {
        const user = JSON.parse(session);
        setRole(user.role || '');
      } catch {
        setRole('');
      }
    }
  }, []);

  async function loadData() {
    try {
      const [studentsRes, approvalsRes, routesRes, busesRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/approvals?status=approved'),
        fetch('/api/zones'),
        fetch('/api/buses')
      ]);

      const [studentsJson, approvalsJson, routesJson, busesJson] = await Promise.all([
        studentsRes.json(),
        approvalsRes.json(),
        routesRes.json(),
        busesRes.json()
      ]);

      if (studentsJson.success) setStudents(studentsJson.data);
      if (approvalsJson.success) setApprovals(approvalsJson.data);
      
      if (routesJson.success) {
        setRoutes(routesJson.data.map((z: any) => ({ id: z.id, routeName: z.zoneName })));
      }
      
      if (busesJson.success) {
        setBuses(busesJson.data);
      }
      setIsMounted(true);
    } catch (err) {
      console.error('Error fetching approved students page data:', err);
      setIsMounted(true);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isMounted && role !== '' && !canUsePage) {
      router.replace('/');
    }
  }, [isMounted, role, canUsePage, router]);

  const studentMap = useMemo(() => new Map(students.map((student) => [student.admissionNumber, student])), [students]);
  const routeMap = useMemo(() => new Map(routes.map((route) => [route.id, route])), [routes]);
  const busMap = useMemo(() => new Map(buses.map((bus) => [bus.id, bus])), [buses]);

  const filteredApprovals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return approvals.filter((record) => {
      const student = studentMap.get(record.studentId);
      const route = routeMap.get(record.routeId);
      const bus = busMap.get(record.busId);
      const routeLabel = route?.routeName || record.placeName || '';
      const busLabel = bus?.name || record.busId || '';
      
      return (
        term === '' ||
        record.studentId.toLowerCase().includes(term) ||
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
        <Link href="/buses" className="hover:underline">Bus</Link>
        <Link href="/zones" className="hover:underline">Zones</Link>
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
                    <th className="px-3 py-2 text-left">Route (Stop)</th>
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
                      <tr key={record.id}>
                        <td className="px-3 py-2 font-medium text-teal-700">{record.studentId}</td>
                        <td className="px-3 py-2">{record.fullName || student?.fullName}</td>
                        <td className="px-3 py-2">{record.grade || student?.grade || '-'}</td>
                        <td className="px-3 py-2">{route?.routeName || record.placeName || '-'}</td>
                        <td className="px-3 py-2">{bus?.name || record.busId || '-'}</td>
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
