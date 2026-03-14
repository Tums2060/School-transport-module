'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

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

type BusStudent = {
  admissionNumber: string;
  name: string;
};

type BusTrip = {
  tripNumber: number;
  time: string;
  routeId?: string;
  students?: BusStudent[];
};

type BusData = {
  id: string;
  name: string;
  status: string;
  trips: BusTrip[];
};

type RouteData = {
  id: string;
  routeName: string;
  places: string;
};

const APPROVALS_KEY = 'student_transport_approvals';
const BUSES_KEY = 'school_buses';
const ROUTES_KEY = 'school_routes';
const TRANSPORT_KEY = 'student_transport_assignments';
const ACTIVITY_KEY = 'system_recent_activity';

function logActivity(title: string, description: string, type: 'approval' | 'route' | 'transport' = 'approval') {
  try {
    const existing = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]') as Array<{
      id: string;
      title: string;
      description: string;
      type: 'approval' | 'route' | 'transport';
      createdAt: string;
    }>;

    const next = [
      {
        id: `act_${Date.now()}`,
        title,
        description,
        type,
        createdAt: new Date().toISOString(),
      },
      ...existing,
    ].slice(0, 60);

    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function parseHour(time: string): number {
  return parseInt(time.split(':')[0], 10);
}
function isMorning(time: string): boolean {
  const h = parseHour(time);
  return h >= 5 && h < 12;
}
function isEvening(time: string): boolean {
  const h = parseHour(time);
  return h >= 12 && h <= 18;
}
function busCoverageForRoute(bus: BusData, routeId: string) {
  const trips = (bus.trips || []).filter((trip) => trip.routeId === routeId);
  return {
    morning: trips.some((trip) => isMorning(trip.time)),
    evening: trips.some((trip) => isEvening(trip.time)),
  };
}
function eligibleBuses(buses: BusData[], routeId: string, tripType: ApprovalRecord['tripType'], direction: ApprovalRecord['direction']) {
  if (!routeId || !tripType) return [];
  return buses
    .map((bus) => ({ bus, coverage: busCoverageForRoute(bus, routeId) }))
    .filter(({ coverage }) => {
      if (tripType === 'two_way') return coverage.morning && coverage.evening;
      if (tripType === 'one_way' && direction === 'morning') return coverage.morning;
      if (tripType === 'one_way' && direction === 'evening') return coverage.evening;
      return false;
    });
}

function matchesApprovedTrip(trip: BusTrip, item: ApprovalRecord): boolean {
  if (item.routeId && trip.routeId !== item.routeId) {
    return false;
  }

  if (item.tripType === 'two_way') {
    return isMorning(trip.time) || isEvening(trip.time);
  }

  if (item.tripType === 'one_way' && item.direction === 'morning') {
    return isMorning(trip.time);
  }

  if (item.tripType === 'one_way' && item.direction === 'evening') {
    return isEvening(trip.time);
  }

  return false;
}

function applyApprovedStudentToBusTrips(currentBuses: BusData[], item: ApprovalRecord): BusData[] {
  const cleaned = currentBuses.map((bus) => ({
    ...bus,
    trips: (bus.trips || []).map((trip) => ({
      ...trip,
      students: (trip.students || []).filter((student) => student.admissionNumber !== item.admissionNumber),
    })),
  }));

  if (!item.usingBus || !item.busId) {
    return cleaned;
  }

  return cleaned.map((bus) => {
    if (bus.id !== item.busId) {
      return bus;
    }

    let targetTripNumbers = (bus.trips || []).filter((trip) => matchesApprovedTrip(trip, item)).map((trip) => trip.tripNumber);

    if (targetTripNumbers.length === 0 && item.routeId) {
      targetTripNumbers = (bus.trips || []).filter((trip) => trip.routeId === item.routeId).map((trip) => trip.tripNumber);
    }

    if (targetTripNumbers.length === 0 && (bus.trips || []).length > 0) {
      targetTripNumbers = [bus.trips[0].tripNumber];
    }

    const targetSet = new Set(targetTripNumbers);
    const studentEntry: BusStudent = { admissionNumber: item.admissionNumber, name: item.fullName };

    return {
      ...bus,
      trips: (bus.trips || []).map((trip) => {
        if (!targetSet.has(trip.tripNumber)) {
          return trip;
        }

        const students = trip.students || [];
        if (students.some((student) => student.admissionNumber === item.admissionNumber)) {
          return trip;
        }

        return { ...trip, students: [...students, studentEntry] };
      }),
    };
  });
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [buses, setBuses] = useState<BusData[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

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

      try {
        setApprovals(JSON.parse(localStorage.getItem(APPROVALS_KEY) || '[]'));
      } catch {
        setApprovals([]);
      }

      try {
        setBuses(JSON.parse(localStorage.getItem(BUSES_KEY) || '[]'));
      } catch {
        setBuses([]);
      }

      try {
        setRoutes(JSON.parse(localStorage.getItem(ROUTES_KEY) || '[]'));
      } catch {
        setRoutes([]);
      }

      setIsMounted(true);
    });
  }, []);

  useEffect(() => {
    if (isMounted && role !== '' && role !== 'superior_Admin') {
      router.replace('/');
    }
  }, [isMounted, role, router]);

  const pendingApprovals = useMemo(
    () => approvals.filter((item) => item.status === 'pending'),
    [approvals],
  );

  function updateApproval(studentId: string, patch: Partial<ApprovalRecord>) {
    setApprovals((prev) => {
      const next = prev.map((item) =>
        item.studentId === studentId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
      );
      localStorage.setItem(APPROVALS_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function approveOne(item: ApprovalRecord) {
    setSavingId(item.studentId);
    try {
      const res = await fetch(`/api/students/${item.studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busAssigned: item.usingBus ? item.busId || null : null,
          routeAssigned: item.usingBus ? item.routeId || null : null,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error('Failed to approve');

      updateApproval(item.studentId, { status: 'approved' });

      try {
        const allTransport = JSON.parse(localStorage.getItem(TRANSPORT_KEY) || '{}') as Record<string, unknown>;
        allTransport[item.studentId] = {
          usingBus: item.usingBus,
          routeId: item.routeId,
          busId: item.busId,
          tripType: item.tripType,
          direction: item.direction,
        };
        localStorage.setItem(TRANSPORT_KEY, JSON.stringify(allTransport));
      } catch {
        // ignore
      }

      setBuses((current) => {
        const updated = applyApprovedStudentToBusTrips(current, item);
        localStorage.setItem(BUSES_KEY, JSON.stringify(updated));
        return updated;
      });

      logActivity(
        'Student approved',
        `${item.fullName} (${item.admissionNumber}) approved for ${item.busId || 'no bus'}${item.routeId ? ` on route ${item.routeId}` : ''}.`,
        'approval'
      );
    } finally {
      setSavingId(null);
    }
  }

  async function approveAllPending() {
    for (const item of pendingApprovals) {
      // sequential to keep updates deterministic
      await approveOne(item);
    }
  }

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm flex items-center justify-center">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (role !== 'superior_Admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm text-gray-800">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <Link href="/" className="hover:underline text-gray-500 dark:text-gray-400">Home</Link>
        <Link href="/students" className="hover:underline">Students</Link>
        <Link href="/buses" className="hover:underline">Transport Module</Link>
        <Link href="/routes" className="hover:underline">Routes</Link>
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Approvals</span>
      </div>

      <main className="p-6">
        <div className="bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Student Transport Approvals</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Review edited student transport assignments and approve final boarding buses.
              </p>
            </div>
            <button
              onClick={approveAllPending}
              disabled={pendingApprovals.length === 0 || savingId !== null}
              className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-50"
            >
              Approve All Pending
            </button>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="text-sm text-gray-500">No pending approvals.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Admission</th>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-left">Route</th>
                    <th className="px-3 py-2 text-left">Trip Type</th>
                    <th className="px-3 py-2 text-left">Direction</th>
                    <th className="px-3 py-2 text-left">Bus</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pendingApprovals.map((item) => {
                    const busesForRow = eligibleBuses(buses, item.routeId, item.tripType, item.direction);
                    const routeName = routes.find((r) => r.id === item.routeId)?.routeName || 'Not selected';

                    return (
                      <tr key={item.studentId}>
                        <td className="px-3 py-2 font-medium text-teal-700">{item.admissionNumber}</td>
                        <td className="px-3 py-2">{item.fullName}</td>
                        <td className="px-3 py-2">
                          <select
                            value={item.routeId}
                            onChange={(e) => updateApproval(item.studentId, { routeId: e.target.value, busId: '' })}
                            className="border border-gray-300 rounded px-2 py-1 bg-white"
                          >
                            <option value="">Select route</option>
                            {routes.map((r) => (
                              <option key={r.id} value={r.id}>{r.routeName}</option>
                            ))}
                          </select>
                          <div className="text-xs text-gray-500 mt-1">{routeName}</div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.tripType}
                            onChange={(e) => updateApproval(item.studentId, { tripType: e.target.value as ApprovalRecord['tripType'], busId: '' })}
                            className="border border-gray-300 rounded px-2 py-1 bg-white"
                          >
                            <option value="">Select</option>
                            <option value="one_way">One Way</option>
                            <option value="two_way">Two Way</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          {item.tripType === 'one_way' ? (
                            <select
                              value={item.direction}
                              onChange={(e) => updateApproval(item.studentId, { direction: e.target.value as ApprovalRecord['direction'], busId: '' })}
                              className="border border-gray-300 rounded px-2 py-1 bg-white"
                            >
                              <option value="">Select</option>
                              <option value="morning">Morning</option>
                              <option value="evening">Evening</option>
                            </select>
                          ) : item.tripType === 'two_way' ? (
                            <span className="text-xs text-gray-600">Morning + Evening</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.busId}
                            onChange={(e) => updateApproval(item.studentId, { busId: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 bg-white"
                          >
                            <option value="">Select bus</option>
                            {busesForRow.map(({ bus, coverage }) => (
                              <option key={bus.id} value={bus.id}>{bus.name} ({coverage.morning && coverage.evening ? 'Both' : coverage.morning ? 'Morning' : 'Evening'})</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => approveOne(item)}
                            disabled={savingId !== null || (item.usingBus && (!item.routeId || !item.busId))}
                            className="px-3 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-50"
                          >
                            {savingId === item.studentId ? 'Saving...' : 'Approve'}
                          </button>
                        </td>
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
