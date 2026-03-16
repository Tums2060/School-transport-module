'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Student = {
  id: string;
  admissionNumber: string;
  fullName: string;
  grade: string;
  stream: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  parentName: string;
  parentContact: string;
  address: string;
  busAssigned: string | null;
  routeAssigned: string | null;
  enrollmentDate: string;
  isActive: boolean;
};

type AppRoute = {
  id: string;
  routeName: string;
  places: string;
  status?: string;
};

type BusTrip = {
  tripNumber: number;
  time: string;
  routeId?: string;
};

type BusData = {
  id: string;
  name: string;
  status: string;
  trips: BusTrip[];
};

type TransportAssignment = {
  usingBus: boolean;
  routeId: string;
  tripType: '' | 'one_way' | 'two_way';
  direction: '' | 'morning' | 'evening';
  busId: string;
};

const TRANSPORT_KEY = 'student_transport_assignments';
const BUSES_KEY = 'school_buses';
const ROUTES_KEY = 'school_routes';
const APPROVALS_KEY = 'student_transport_approvals';

function normalizeRoute(item: Record<string, unknown>): AppRoute {
  return {
    id: String(item.id || item.routeCode || ''),
    routeName: String(item.routeName || item.routeCode || 'Unnamed Route'),
    places: String(item.places || (Array.isArray(item.stops) ? item.stops.join(', ') : '')),
    status: typeof item.status === 'string' ? item.status : undefined,
  };
}

function normalizeBus(item: Record<string, unknown>): BusData {
  const rawTrips = Array.isArray(item.trips) ? item.trips : [];
  const fallbackTimes = Array.isArray(item.departureTimes) ? item.departureTimes : [];

  const trips: BusTrip[] = (rawTrips.length > 0
    ? rawTrips.map((trip, index) => {
        const t = trip as Record<string, unknown>;
        return {
          tripNumber: typeof t.tripNumber === 'number' ? t.tripNumber : index + 1,
          time: String(t.time || ''),
          routeId: typeof t.routeId === 'string' ? t.routeId : undefined,
        };
      })
    : fallbackTimes.map((time, index) => ({
        tripNumber: index + 1,
        time: String(time || ''),
        routeId: undefined,
      }))) as BusTrip[];

  return {
    id: String(item.id || item.busNumber || ''),
    name: String(item.name || item.busNumber || 'Unnamed Bus'),
    status: String(item.status || 'Active'),
    trips: trips.filter((trip) => trip.time),
  };
}

function mergeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  items.forEach((item) => {
    if (item.id) map.set(item.id, item);
  });
  return Array.from(map.values());
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

function busRouteCoverage(bus: BusData, routeId: string) {
  const trips = (bus.trips || []).filter((t) => t.routeId === routeId);
  return {
    morning: trips.some((t) => isMorning(t.time)),
    evening: trips.some((t) => isEvening(t.time)),
  };
}

function coverageLabel(c: { morning: boolean; evening: boolean }) {
  if (c.morning && c.evening) return 'Morning & Evening';
  if (c.morning) return 'Morning only';
  if (c.evening) return 'Evening only';
  return '';
}

function getEligibleBuses(
  buses: BusData[],
  routeId: string,
  tripType: TransportAssignment['tripType'],
  direction: TransportAssignment['direction'],
): Array<{ bus: BusData; coverage: { morning: boolean; evening: boolean } }> {
  if (!routeId || !tripType) return [];

  const routeSpecific = buses
    .map((bus) => ({ bus, coverage: busRouteCoverage(bus, routeId) }))
    .filter(({ coverage }) => {
      if (tripType === 'two_way') return coverage.morning && coverage.evening;
      if (tripType === 'one_way' && direction === 'morning') return coverage.morning;
      if (tripType === 'one_way' && direction === 'evening') return coverage.evening;
      return false;
    });

  if (routeSpecific.length > 0) {
    return routeSpecific;
  }

  // Fallback for legacy buses whose trips do not have routeId configured.
  const fallback = buses
    .map((bus) => {
      const trips = bus.trips || [];
      return {
        bus,
        coverage: {
          morning: trips.some((trip) => isMorning(trip.time)),
          evening: trips.some((trip) => isEvening(trip.time)),
        },
      };
    })
    .filter(({ coverage }) => {
      if (tripType === 'two_way') return coverage.morning && coverage.evening;
      if (tripType === 'one_way' && direction === 'morning') return coverage.morning;
      if (tripType === 'one_way' && direction === 'evening') return coverage.evening;
      return false;
    });

  return fallback;
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-teal-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

type ModalProps = {
  student: Student;
  routes: AppRoute[];
  buses: BusData[];
  onClose: () => void;
  onSaved: (updated: Student) => void;
};

function StudentDetailModal({ student, routes, buses, onClose, onSaved }: ModalProps) {
  const [form, setForm] = useState({
    fullName: student.fullName,
    parentName: student.parentName,
    parentContact: student.parentContact,
    address: student.address,
  });

  const [transport, setTransport] = useState<TransportAssignment>({
    usingBus: false,
    routeId: '',
    tripType: '',
    direction: '',
    busId: '',
  });

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  function setTransportField<K extends keyof TransportAssignment>(
    key: K,
    value: TransportAssignment[K],
  ) {
    setTransport((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'routeId') {
        next.tripType = '';
        next.direction = '';
        next.busId = '';
      }
      if (key === 'tripType') {
        next.direction = '';
        next.busId = '';
      }
      if (key === 'direction') {
        next.busId = '';
      }
      if (key === 'usingBus' && !value) {
        next.routeId = '';
        next.tripType = '';
        next.direction = '';
        next.busId = '';
      }

      return next;
    });
  }

  const eligibleBuses = useMemo(
    () => getEligibleBuses(buses, transport.routeId, transport.tripType, transport.direction),
    [buses, transport.routeId, transport.tripType, transport.direction],
  );

  async function handleSave() {
    setSaving(true);
    setSaveMsg('');

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          parentName: form.parentName.trim(),
          parentContact: form.parentContact.trim(),
          address: form.address.trim(),
          busAssigned: transport.usingBus ? transport.busId || null : null,
          routeAssigned: transport.usingBus ? transport.routeId || null : null,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.message || 'Save failed');
      }

      let allTransport: Record<string, TransportAssignment> = {};
      try {
        allTransport = JSON.parse(localStorage.getItem(TRANSPORT_KEY) || '{}');
      } catch {
        allTransport = {};
      }
      allTransport[student.id] = transport;
      localStorage.setItem(TRANSPORT_KEY, JSON.stringify(allTransport));

      // Sync edited/transport data to superior admin approvals queue
      type ApprovalRecord = {
        studentId: string;
        admissionNumber: string;
        fullName: string;
        grade: string;
        parentName: string;
        parentContact: string;
        routeId: string;
        busId: string;
        tripType: TransportAssignment['tripType'];
        direction: TransportAssignment['direction'];
        usingBus: boolean;
        status: 'pending' | 'approved';
        updatedAt: string;
      };

      let approvals: ApprovalRecord[] = [];
      try {
        approvals = JSON.parse(localStorage.getItem(APPROVALS_KEY) || '[]') as ApprovalRecord[];
      } catch {
        approvals = [];
      }

      const nextRecord: ApprovalRecord = {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        fullName: form.fullName.trim(),
        grade: student.grade,
        parentName: form.parentName.trim(),
        parentContact: form.parentContact.trim(),
        routeId: transport.usingBus ? transport.routeId : '',
        busId: transport.usingBus ? transport.busId : '',
        tripType: transport.usingBus ? transport.tripType : '',
        direction: transport.usingBus ? transport.direction : '',
        usingBus: transport.usingBus,
        status: 'pending',
        updatedAt: new Date().toISOString(),
      };

      const withoutExisting = approvals.filter((item) => item.studentId !== student.id);
      localStorage.setItem(APPROVALS_KEY, JSON.stringify([nextRecord, ...withoutExisting]));

      setSaveMsg('Saved successfully.');
      onSaved(result.data as Student);
      setTimeout(() => setSaveMsg(''), 2500);
    } catch {
      setSaveMsg('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    'w-full border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500';
  const readCls =
    'w-full border border-gray-200 dark:border-gray-700 rounded px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
  const labelCls = 'block text-xs text-gray-500 dark:text-gray-400 mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Student Details</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{student.admissionNumber} - {student.fullName}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">x</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Student Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Admission Number</label>
                <div className={readCls}>{student.admissionNumber}</div>
              </div>
              <div>
                <label className={labelCls}>Full Name</label>
                <input className={inputCls} value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Grade</label>
                <div className={readCls}>{student.grade}</div>
              </div>
              <div>
                <label className={labelCls}>Stream</label>
                <div className={readCls}>{student.stream || '-'} </div>
              </div>
              <div>
                <label className={labelCls}>Parent Name</label>
                <input className={inputCls} value={form.parentName} onChange={(e) => setForm((p) => ({ ...p, parentName: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Parent Contact</label>
                <input className={inputCls} value={form.parentContact} onChange={(e) => setForm((p) => ({ ...p, parentContact: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Address</label>
                <input className={inputCls} value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Transport Assignment</h3>

            <div className="flex items-center gap-3 mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900/40">
              <Switch checked={transport.usingBus} onChange={(v) => setTransportField('usingBus', v)} />
              <span className="text-gray-700 dark:text-gray-200 font-medium">
                {transport.usingBus ? 'Using school bus transport' : 'Not using school bus transport'}
              </span>
            </div>

            {transport.usingBus && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Route</label>
                  <select className={inputCls} value={transport.routeId} onChange={(e) => setTransportField('routeId', e.target.value)}>
                    <option value="">- Select a route -</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>{r.routeName}</option>
                    ))}
                  </select>
                </div>

                {transport.routeId && (
                  <div>
                    <label className={labelCls}>Trip Type</label>
                    <select className={inputCls} value={transport.tripType} onChange={(e) => setTransportField('tripType', e.target.value as TransportAssignment['tripType'])}>
                      <option value="">- Select trip type -</option>
                      <option value="one_way">One Way</option>
                      <option value="two_way">Two Way</option>
                    </select>
                  </div>
                )}

                {transport.tripType === 'one_way' && (
                  <div>
                    <label className={labelCls}>Direction</label>
                    <select className={inputCls} value={transport.direction} onChange={(e) => setTransportField('direction', e.target.value as TransportAssignment['direction'])}>
                      <option value="">- Select direction -</option>
                      <option value="morning">Morning (05:00 - 11:59)</option>
                      <option value="evening">Evening (12:00 - 18:00)</option>
                    </select>
                  </div>
                )}

                {transport.tripType === 'two_way' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Morning</label>
                      <div className={readCls}>Auto-filled</div>
                    </div>
                    <div>
                      <label className={labelCls}>Evening</label>
                      <div className={readCls}>Auto-filled</div>
                    </div>
                  </div>
                )}

                {transport.routeId && transport.tripType && (transport.tripType === 'two_way' || transport.direction) && (
                  <div>
                    <label className={labelCls}>Bus No.</label>
                    {eligibleBuses.length === 0 ? (
                      <p className="text-xs text-red-500">No buses found for this route/trip selection.</p>
                    ) : (
                      <select className={inputCls} value={transport.busId} onChange={(e) => setTransportField('busId', e.target.value)}>
                        <option value="">- Select a bus -</option>
                        {eligibleBuses.map(({ bus, coverage }) => (
                          <option key={bus.id} value={bus.id}>{bus.name} ({coverageLabel(coverage)})</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/30">
          <span className={`text-xs ${saveMsg.startsWith('Failed') ? 'text-red-500' : 'text-teal-600 dark:text-teal-400'}`}>{saveMsg}</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [routes, setRoutes] = useState<AppRoute[]>([]);
  const [buses, setBuses] = useState<BusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetch('/api/students')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStudents(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    async function loadTransportData() {
      let localRoutes: AppRoute[] = [];
      let localBuses: BusData[] = [];

      try {
        const parsed = JSON.parse(localStorage.getItem(ROUTES_KEY) || '[]') as Array<Record<string, unknown>>;
        localRoutes = parsed.map(normalizeRoute);
      } catch {
        localRoutes = [];
      }

      try {
        const parsed = JSON.parse(localStorage.getItem(BUSES_KEY) || '[]') as Array<Record<string, unknown>>;
        localBuses = parsed.map(normalizeBus);
      } catch {
        localBuses = [];
      }

      let apiBuses: BusData[] = [];

      try {
        const busesRes = await fetch('/api/buses');
        const busesData = await busesRes.json();
        if (busesData.success && Array.isArray(busesData.data)) {
          apiBuses = (busesData.data as Array<Record<string, unknown>>).map(normalizeBus);
        }
      } catch {
        // ignore API failures and use local data only
      }

      // Show only routes managed from the Routes module storage.
      setRoutes(mergeById(localRoutes));
      setBuses(mergeById([...apiBuses, ...localBuses]));
    }

    loadTransportData();

    function onStorage(event: StorageEvent) {
      if (event.key === ROUTES_KEY || event.key === BUSES_KEY) {
        loadTransportData();
      }
    }

    window.addEventListener('storage', onStorage);
    const interval = setInterval(loadTransportData, 5000);

    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, []);

  const gradeOptions = useMemo(() => Array.from(new Set(students.map((s) => s.grade))).sort(), [students]);

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        term === '' ||
        s.admissionNumber.toLowerCase().includes(term) ||
        s.fullName.toLowerCase().includes(term) ||
        s.parentName.toLowerCase().includes(term);
      const matchesGrade = gradeFilter === '' || s.grade === gradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [students, searchTerm, gradeFilter]);

  function handleSaved(updated: Student) {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedStudent(updated);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm text-gray-800">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <Link href="/finance/home" className="hover:underline text-gray-500 dark:text-gray-400">Finance Home</Link>
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Students List</span>
      </div>

      <div className="flex">
        <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/50 p-4 shrink-0">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Filter list by...</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-gray-500 dark:text-gray-400 mb-1">Search Student</label>
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Admission / Name / Parent" className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-gray-500 dark:text-gray-400 mb-1">Grade</label>
              <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                <option value="">All grades</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={() => { setSearchTerm(''); setGradeFilter(''); }} className="mt-4 text-teal-700 hover:underline text-left">Reset filters</button>
        </aside>

        <main className="flex-1 p-6">
          <div className="bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent flex justify-between items-center">
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-200">Finance Manager</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Students financial view</p>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Results ({filteredStudents.length})</span>
            </div>

            {loading ? (
              <div className="p-8 text-sm text-gray-600 dark:text-gray-300">Loading students...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="font-normal py-2 px-4">Admission</th>
                      <th className="font-normal py-2 px-4">Student Name</th>
                      <th className="font-normal py-2 px-4">Grade</th>
                      <th className="font-normal py-2 px-4">Stream</th>
                      <th className="font-normal py-2 px-4">Parent</th>
                      <th className="font-normal py-2 px-4">Parent Contact</th>
                      <th className="font-normal py-2 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => (
                      <tr key={student.id} className={`border-b border-gray-100 dark:border-gray-700/30 hover:bg-teal-50 dark:hover:bg-teal-900/25 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-white/2'}`}>
                        <td className="py-2 px-4 text-teal-700 font-medium">
                          <button className="hover:underline" onClick={() => setSelectedStudent(student)}>
                            {student.admissionNumber}
                          </button>
                        </td>
                        <td className="py-2 px-4 text-gray-900 dark:text-gray-100">{student.fullName}</td>
                        <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{student.grade}</td>
                        <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{student.stream || '-'}</td>
                        <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{student.parentName}</td>
                        <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{student.parentContact}</td>
                        <td className="py-2 px-4">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${student.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>
                            {student.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedStudent && (
        <StudentDetailModal student={selectedStudent} routes={routes} buses={buses} onClose={() => setSelectedStudent(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
