'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Search, Settings, Plus, Download, ArrowDown, Pencil, Trash2, Check, X } from 'lucide-react';

type RouteDetails = {
  area: string;
  pickupPoints: string;
  majorStops: string;
  destination: string;
  notes: string;
};

type DriverDetails = {
  name: string;
  phone: string;
};

type Student = {
  admissionNumber: string;
  name: string;
};

type Trip = {
  tripNumber: number;
  time: string;
  students: Student[];
  routeDetails: RouteDetails;
};

type Bus = {
  id: string;
  name: string;
  capacity: number;
  status: string;
  driver: DriverDetails;
  trips: Trip[];
};

type TripFormData = {
  time: string;
  routeDetails: RouteDetails;
};

type BusFormData = {
  id: string;
  name: string;
  capacity: string;
  status: string;
  driver: DriverDetails;
  trips: TripFormData[];
};

type TabKey = 'general' | 'trips' | 'driver';

const STORAGE_KEY = 'school_buses';

const emptyRouteDetails: RouteDetails = {
  area: '',
  pickupPoints: '',
  majorStops: '',
  destination: '',
  notes: '',
};

const initialBuses: Bus[] = [
  {
    id: 'BS001',
    name: 'Scania - Kiserian',
    capacity: 45,
    status: 'Active',
    driver: { name: 'Samuel Njoroge', phone: '0712 345 678' },
    trips: [
      {
        tripNumber: 1,
        time: '06:30',
        students: [],
        routeDetails: {
          area: 'Kiserian',
          pickupPoints: 'Kiserian Stage, Corner Baridi, Rongai SGR',
          majorStops: 'Magadi Road, Rongai Town, Langata Road',
          destination: 'Upper Hill Campus',
          notes: 'Morning pickup run',
        },
      },
      {
        tripNumber: 2,
        time: '15:45',
        students: [],
        routeDetails: {
          area: 'Evening Return',
          pickupPoints: 'Upper Hill Campus Gate, Rongai, Kiserian',
          majorStops: 'Langata Road, Rongai Town, Magadi Road',
          destination: 'Kiserian Stage',
          notes: 'Evening drop-off run',
        },
      },
    ],
  },
  {
    id: 'BS002',
    name: 'Isuzu - Thika Road',
    capacity: 33,
    status: 'Active',
    driver: { name: 'Mercy Wanjiku', phone: '0722 456 789' },
    trips: [
      {
        tripNumber: 1,
        time: '07:00',
        students: [],
        routeDetails: {
          area: 'Thika Road Corridor',
          pickupPoints: 'Garden City, Roasters, Muthaiga Roundabout',
          majorStops: 'Thika Superhighway, Forest Road',
          destination: 'Main Campus',
          notes: 'Morning school run',
        },
      },
      {
        tripNumber: 2,
        time: '16:00',
        students: [],
        routeDetails: {
          area: 'Thika Road Return',
          pickupPoints: 'Main Campus Gate, Forest Road, Muthaiga',
          majorStops: 'Thika Superhighway',
          destination: 'Garden City',
          notes: 'Afternoon return run',
        },
      },
    ],
  },
];

function formatTimeLabel(time: string) {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return time;
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

function parseTimeValue(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  if (/^\d{2}:\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  const lowerValue = trimmedValue.toLowerCase();
  const namedTimes: Record<string, string> = {
    morning: '08:00',
    noon: '12:00',
    afternoon: '12:00',
    evening: '16:00',
  };

  if (namedTimes[lowerValue]) {
    return namedTimes[lowerValue];
  }

  const timeMatch = lowerValue.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!timeMatch) {
    return trimmedValue;
  }

  const baseHour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] || '00');
  const meridiem = timeMatch[3];

  let hour = baseHour % 12;
  if (meridiem === 'pm') {
    hour += 12;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function routeSummary(routeDetails: RouteDetails) {
  return [routeDetails.area, routeDetails.majorStops, routeDetails.destination].map((v) => v.trim()).filter(Boolean).join(' - ');
}

function normalizeStudents(rawStudents: unknown): Student[] {
  if (!Array.isArray(rawStudents)) {
    return [];
  }

  return rawStudents.filter(
    (student): student is Student =>
      typeof student === 'object' &&
      student !== null &&
      typeof (student as Student).admissionNumber === 'string' &&
      typeof (student as Student).name === 'string'
  );
}

function normalizeRouteDetails(rawRouteDetails: unknown, fallbackRoute = ''): RouteDetails {
  const rd = (rawRouteDetails || {}) as Partial<RouteDetails>;
  return {
    area: rd.area?.trim() || fallbackRoute.split(' - ')[0] || '',
    pickupPoints: rd.pickupPoints?.trim() || '',
    majorStops: rd.majorStops?.trim() || fallbackRoute || '',
    destination: rd.destination?.trim() || '',
    notes: rd.notes?.trim() || '',
  };
}

function normalizeBus(rawBus: Record<string, unknown>): Bus {
  const legacyRoute = typeof rawBus.route === 'string' ? rawBus.route : '';
  const legacyRouteDetails = normalizeRouteDetails(rawBus.routeDetails, legacyRoute);

  const rawTrips = Array.isArray(rawBus.trips) ? rawBus.trips : [];
  let trips: Trip[] = [];

  if (rawTrips.length > 0 && typeof rawTrips[0] === 'object' && rawTrips[0] !== null) {
    trips = rawTrips.map((rawTrip, index) => {
      const t = rawTrip as Record<string, unknown>;
      return {
        tripNumber: typeof t.tripNumber === 'number' ? t.tripNumber : index + 1,
        time: typeof t.time === 'string' ? parseTimeValue(t.time) : '',
        students: normalizeStudents(t.students),
        routeDetails: normalizeRouteDetails(t.routeDetails, legacyRoute),
      };
    });
  } else {
    const legacyTimes = Array.isArray(rawBus.departureTimes)
      ? rawBus.departureTimes.map((t) => parseTimeValue(String(t))).filter(Boolean)
      : [];

    const sortedTimes = Array.from(new Set(legacyTimes)).sort();
    const legacyStudents = normalizeStudents(rawBus.students);

    trips = sortedTimes.map((time, index) => ({
      tripNumber: index + 1,
      time,
      students: index === 0 ? legacyStudents : [],
      routeDetails: legacyRouteDetails,
    }));
  }

  trips = trips
    .filter((trip) => trip.time)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((trip, index) => ({ ...trip, tripNumber: index + 1 }));

  return {
    id: typeof rawBus.id === 'string' ? rawBus.id : 'BS000',
    name: typeof rawBus.name === 'string' ? rawBus.name.trim() || 'Unnamed Bus' : 'Unnamed Bus',
    capacity: Number(rawBus.capacity) || 0,
    status: typeof rawBus.status === 'string' ? rawBus.status : 'Active',
    driver: {
      name: typeof (rawBus.driver as DriverDetails | undefined)?.name === 'string' ? (rawBus.driver as DriverDetails).name : '',
      phone: typeof (rawBus.driver as DriverDetails | undefined)?.phone === 'string' ? (rawBus.driver as DriverDetails).phone : '',
    },
    trips,
  };
}

function createFormData(bus: Bus): BusFormData {
  return {
    id: bus.id,
    name: bus.name,
    capacity: String(bus.capacity),
    status: bus.status,
    driver: { ...bus.driver },
    trips:
      bus.trips.length > 0
        ? bus.trips.map((trip) => ({
            time: trip.time,
            routeDetails: { ...trip.routeDetails },
          }))
        : [{ time: '', routeDetails: { ...emptyRouteDetails } }],
  };
}

function validateBusForm(formData: BusFormData) {
  const errors: string[] = [];

  if (!formData.name.trim()) {
    errors.push('Bus name is required.');
  }

  if ((Number(formData.capacity) || 0) <= 0) {
    errors.push('Capacity must be greater than zero.');
  }

  const normalizedTimes = formData.trips.map((trip) => parseTimeValue(trip.time)).filter(Boolean);
  if (normalizedTimes.length === 0) {
    errors.push('Add at least one trip time.');
  }

  if (new Set(normalizedTimes).size !== normalizedTimes.length) {
    errors.push('Trip times must be unique.');
  }

  formData.trips.forEach((trip, index) => {
    const label = `Trip ${index + 1}`;

    if (!parseTimeValue(trip.time)) {
      errors.push(`${label}: time is required.`);
    }

    if (!trip.routeDetails.area.trim()) {
      errors.push(`${label}: route area is required.`);
    }

    if (!trip.routeDetails.pickupPoints.trim()) {
      errors.push(`${label}: pickup points are required.`);
    }

    if (!trip.routeDetails.majorStops.trim()) {
      errors.push(`${label}: major stops are required.`);
    }

    if (!trip.routeDetails.destination.trim()) {
      errors.push(`${label}: destination is required.`);
    }

    if (!trip.routeDetails.notes.trim()) {
      errors.push(`${label}: route notes are required.`);
    }
  });

  if (!formData.driver.name.trim()) {
    errors.push('Driver name is required.');
  }

  return errors;
}

export default function BusesListPage() {
  const [buses, setBuses] = useState<Bus[]>(initialBuses);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingBusId, setEditingBusId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [editErrors, setEditErrors] = useState<string[]>([]);
  const [editFormData, setEditFormData] = useState<BusFormData | null>(null);
  const [showLearnersModal, setShowLearnersModal] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedTripNumber, setSelectedTripNumber] = useState<number | null>(null);
  const [newStudentAdmission, setNewStudentAdmission] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [deletingBusId, setDeletingBusId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? (JSON.parse(saved) as Record<string, unknown>[]) : initialBuses;
      const normalized = parsed.map((bus) => normalizeBus(bus));
      setBuses(normalized);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      setBuses(initialBuses);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialBuses));
    }
  }, []);

  const handleDownloadReport = async () => {
    if (buses.length === 0 || isDownloading) {
      return;
    }

    setIsDownloading(true);

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const document = new jsPDF({ orientation: 'landscape' });

      document.setFillColor(13, 148, 136);
      document.rect(0, 0, 297, 24, 'F');
      document.setFontSize(18);
      document.setTextColor(255, 255, 255);
      document.text('School Transport Module Report', 14, 15);

      document.setFontSize(10);
      document.setTextColor(55, 65, 81);
      document.text(`Generated on ${new Date().toLocaleString()}`, 14, 34);

      autoTable(document, {
        startY: 40,
        head: [['Bus No.', 'Bus Name', 'Driver', 'Trips', 'Capacity', 'Status']],
        body: buses.map((bus) => [
          bus.id,
          bus.name,
          bus.driver.name || 'Not assigned',
          bus.trips.map((trip) => `Trip ${trip.tripNumber} ${formatTimeLabel(trip.time)}`).join(', '),
          String(bus.capacity),
          bus.status,
        ]),
      });

      document.save('school-transport-report.pdf');
    } finally {
      setIsDownloading(false);
    }
  };

  const openEditModal = (bus: Bus) => {
    setEditingBusId(bus.id);
    setEditFormData(createFormData(bus));
    setEditErrors([]);
    setActiveTab('general');
  };

  const closeEditModal = () => {
    setEditingBusId(null);
    setEditFormData(null);
    setEditErrors([]);
    setActiveTab('general');
  };

  const handleEditChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setEditFormData((current) => (current ? { ...current, [name]: value } : current));
  };

  const handleDriverChange = (field: keyof DriverDetails, value: string) => {
    setEditFormData((current) => (current ? { ...current, driver: { ...current.driver, [field]: value } } : current));
  };

  const handleTripTimeChange = (index: number, value: string) => {
    setEditFormData((current) => {
      if (!current) return current;
      const nextTrips = current.trips.map((trip, tripIndex) => (tripIndex === index ? { ...trip, time: value } : trip));
      return { ...current, trips: nextTrips };
    });
  };

  const handleTripRouteChange = (index: number, field: keyof RouteDetails, value: string) => {
    setEditFormData((current) => {
      if (!current) return current;
      const nextTrips = current.trips.map((trip, tripIndex) =>
        tripIndex === index ? { ...trip, routeDetails: { ...trip.routeDetails, [field]: value } } : trip
      );
      return { ...current, trips: nextTrips };
    });
  };

  const handleAddTripSlot = () => {
    setEditFormData((current) =>
      current
        ? {
            ...current,
            trips: [...current.trips, { time: '', routeDetails: { ...emptyRouteDetails } }],
          }
        : current
    );
  };

  const handleRemoveTripSlot = (index: number) => {
    setEditFormData((current) => {
      if (!current) return current;
      if (current.trips.length === 1) {
        return { ...current, trips: [{ time: '', routeDetails: { ...emptyRouteDetails } }] };
      }
      return { ...current, trips: current.trips.filter((_, tripIndex) => tripIndex !== index) };
    });
  };

  const handleSaveEdit = () => {
    if (!editFormData || !editingBusId) {
      return;
    }

    const nextErrors = validateBusForm(editFormData);
    if (nextErrors.length > 0) {
      setEditErrors(nextErrors);
      setActiveTab(nextErrors.some((e) => e.includes('Trip')) ? 'trips' : nextErrors.some((e) => e.includes('Driver')) ? 'driver' : 'general');
      return;
    }

    const sourceBus = buses.find((bus) => bus.id === editingBusId);

    const normalizedTrips = editFormData.trips
      .map((trip) => ({
        time: parseTimeValue(trip.time),
        routeDetails: {
          area: trip.routeDetails.area.trim(),
          pickupPoints: trip.routeDetails.pickupPoints.trim(),
          majorStops: trip.routeDetails.majorStops.trim(),
          destination: trip.routeDetails.destination.trim(),
          notes: trip.routeDetails.notes.trim(),
        },
      }))
      .filter((trip) => trip.time)
      .sort((a, b) => a.time.localeCompare(b.time));

    const trips: Trip[] = normalizedTrips.map((trip, index) => {
      const oldTrip = sourceBus?.trips.find((existingTrip) => existingTrip.time === trip.time);
      return {
        tripNumber: index + 1,
        time: trip.time,
        students: oldTrip?.students || [],
        routeDetails: trip.routeDetails,
      };
    });

    const updatedBus: Bus = {
      id: editFormData.id,
      name: editFormData.name.trim(),
      capacity: Number(editFormData.capacity) || 0,
      status: editFormData.status,
      driver: {
        name: editFormData.driver.name.trim(),
        phone: editFormData.driver.phone.trim(),
      },
      trips,
    };

    const updatedBuses = buses.map((bus) => (bus.id === editingBusId ? updatedBus : bus));
    setBuses(updatedBuses);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBuses));
    closeEditModal();
  };

  const openLearnersModal = (bus: Bus) => {
    setSelectedBusId(bus.id);
    setSelectedTripNumber(bus.trips[0]?.tripNumber ?? null);
    setShowLearnersModal(true);
  };

  const closeLearnersModal = () => {
    setShowLearnersModal(false);
    setSelectedBusId(null);
    setSelectedTripNumber(null);
    setNewStudentAdmission('');
    setNewStudentName('');
  };

  const addStudent = () => {
    if (!selectedBusId || selectedTripNumber === null || !newStudentAdmission.trim() || !newStudentName.trim()) {
      return;
    }

    const updatedBuses = buses.map((bus) => {
      if (bus.id !== selectedBusId) {
        return bus;
      }

      return {
        ...bus,
        trips: bus.trips.map((trip) =>
          trip.tripNumber === selectedTripNumber
            ? {
                ...trip,
                students: [...trip.students, { admissionNumber: newStudentAdmission.trim(), name: newStudentName.trim() }],
              }
            : trip
        ),
      };
    });

    setBuses(updatedBuses);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBuses));
    setNewStudentAdmission('');
    setNewStudentName('');
  };

  const removeStudent = (admissionNumber: string) => {
    if (!selectedBusId || selectedTripNumber === null) {
      return;
    }

    const updatedBuses = buses.map((bus) => {
      if (bus.id !== selectedBusId) {
        return bus;
      }

      return {
        ...bus,
        trips: bus.trips.map((trip) =>
          trip.tripNumber === selectedTripNumber
            ? {
                ...trip,
                students: trip.students.filter((student) => student.admissionNumber !== admissionNumber),
              }
            : trip
        ),
      };
    });

    setBuses(updatedBuses);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBuses));
  };

  const downloadLearnersPDF = async (bus: Bus, trip: Trip) => {
    if (trip.students.length === 0) {
      alert('No students in this trip. Cannot generate report.');
      return;
    }

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const document = new jsPDF({ orientation: 'portrait' });

      document.setFillColor(13, 148, 136);
      document.rect(0, 0, 210, 24, 'F');
      document.setFontSize(16);
      document.setTextColor(255, 255, 255);
      document.text(`${bus.name} - Trip ${trip.tripNumber} Student Roster`, 14, 15);

      document.setFontSize(10);
      document.setTextColor(55, 65, 81);
      document.text(`Bus No: ${bus.id}`, 14, 32);
      document.text(`Trip Time: ${formatTimeLabel(trip.time)}`, 14, 38);
      document.text(`Route: ${routeSummary(trip.routeDetails) || 'Not specified'}`, 14, 44);
      document.text(`Generated on ${new Date().toLocaleString()}`, 14, 50);

      autoTable(document, {
        startY: 56,
        head: [['Admission Number', 'Student Name']],
        body: trip.students.map((student) => [student.admissionNumber, student.name]),
      });

      document.save(`${bus.id}-trip${trip.tripNumber}-students.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleDeleteBus = (busId: string) => {
    setDeletingBusId(busId);
  };

  const confirmDeleteBus = () => {
    if (!deletingBusId) return;

    const updatedBuses = buses.filter((bus) => bus.id !== deletingBusId);
    setBuses(updatedBuses);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBuses));
    setDeletingBusId(null);
  };

  const cancelDeleteBus = () => {
    setDeletingBusId(null);
  };

  const selectedBus = useMemo(() => buses.find((bus) => bus.id === selectedBusId), [buses, selectedBusId]);
  const selectedTrip = useMemo(
    () => selectedBus?.trips.find((trip) => trip.tripNumber === selectedTripNumber),
    [selectedBus, selectedTripNumber]
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-sm text-gray-800">
      <div className="bg-[#1F1F1F] text-white flex items-center justify-between px-4 py-2">
        <div />
        <div className="flex items-center space-x-4">
          <button type="button" className="hover:text-gray-300">
            <Search size={18} />
          </button>
          <button type="button" className="hover:text-gray-300">
            <Settings size={18} />
          </button>
          <div className="bg-pink-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">TM</div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <span className="font-bold text-gray-800">SCHOOL SYSTEM</span>
        <button type="button" className="hover:underline">Admissions</button>
        <button type="button" className="hover:underline">Learners Management</button>
        <button type="button" className="hover:underline font-bold border-b-2 border-teal-700 pb-1">Transport Module</button>
        <button type="button" className="hover:underline">Setups</button>
      </div>

      <div className="p-6 bg-white m-4 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-light text-gray-800">Transport: <span className="font-semibold text-gray-600">Buses List</span></h1>

          <div className="flex space-x-4">
            <Link href="/buses/search" className="flex items-center space-x-1 text-teal-700 hover:bg-teal-50 px-3 py-1 rounded">
              <Search size={16} className="text-teal-700" /> <span>Search</span>
            </Link>
            <Link href="/buses/add" className="flex items-center space-x-1 text-teal-700 hover:bg-teal-50 px-3 py-1 rounded">
              <Plus size={16} className="text-teal-700" /> <span>New</span>
            </Link>
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={isDownloading || buses.length === 0}
              className="flex items-center space-x-1 text-teal-700 hover:bg-teal-50 px-3 py-1 rounded disabled:text-gray-400 disabled:hover:bg-transparent"
            >
              <span>{isDownloading ? 'Preparing Report' : 'Report'}</span>
              <Download size={16} className={isDownloading || buses.length === 0 ? 'text-gray-400' : 'text-teal-700'} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 border-b-2 border-gray-200">
                <th className="font-normal py-2 px-4 w-24">
                  <div className="flex items-center gap-1">
                    <span>No.</span>
                    <ArrowDown size={12} className="text-gray-500" />
                  </div>
                </th>
                <th className="font-normal py-2 px-4">Bus Name</th>
                <th className="font-normal py-2 px-4">Routes By Trip</th>
                <th className="font-normal py-2 px-4">Driver</th>
                <th className="font-normal py-2 px-4">Trips</th>
                <th className="font-normal py-2 px-4 text-right">Capacity</th>
                <th className="font-normal py-2 px-4">Status</th>
                <th className="font-normal py-2 px-4 text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {buses.map((bus, index) => (
                <tr key={bus.id} className={`border-b border-gray-100 hover:bg-teal-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="py-2 px-4 text-teal-700 font-medium">{bus.id}</td>
                  <td className="py-2 px-4">{bus.name}</td>
                  <td className="py-2 px-4 text-xs text-gray-600">
                    {bus.trips.length > 0
                      ? bus.trips.map((trip) => (
                          <div key={trip.tripNumber}>Trip {trip.tripNumber}: {routeSummary(trip.routeDetails) || 'Not set'}</div>
                        ))
                      : 'No routes'}
                  </td>
                  <td className="py-2 px-4">{bus.driver.name || 'Not assigned'}</td>
                  <td className="py-2 px-4 text-gray-600 text-sm">
                    {bus.trips.length > 0
                      ? bus.trips.map((trip) => (
                          <div key={trip.tripNumber}>Trip {trip.tripNumber}: {formatTimeLabel(trip.time)} ({trip.students.length})</div>
                        ))
                      : 'No trips'}
                  </td>
                  <td className="py-2 px-4 text-right">{bus.capacity}</td>
                  <td className="py-2 px-4">{bus.status}</td>
                  <td className="py-2 px-4 text-right space-x-1 flex justify-end">
                    <button type="button" onClick={() => openEditModal(bus)} className="inline-flex items-center justify-center text-teal-700 hover:bg-teal-50 rounded p-2">
                      <Pencil size={16} className="text-teal-700" />
                    </button>
                    <button type="button" onClick={() => openLearnersModal(bus)} className="inline-flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded p-2">
                      <Plus size={16} className="text-blue-600" />
                    </button>
                    <button type="button" onClick={() => handleDeleteBus(bus.id)} className="inline-flex items-center justify-center text-red-600 hover:bg-red-50 rounded p-2">
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editFormData && editingBusId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white shadow-sm border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center space-x-4">
                <button type="button" onClick={closeEditModal} className="text-gray-500 hover:text-gray-800"><X size={20} /></button>
                <h2 className="text-2xl font-light text-gray-800">Update Bus Card</h2>
              </div>

              <div className="flex space-x-4">
                <button type="button" onClick={handleSaveEdit} className="flex items-center space-x-1 text-teal-700 hover:bg-teal-50 px-3 py-1 rounded font-medium">
                  <Check size={16} className="text-teal-700" /> <span>Save</span>
                </button>
                <button type="button" onClick={closeEditModal} className="flex items-center space-x-1 text-gray-500 hover:bg-gray-50 px-3 py-1 rounded">
                  <X size={16} className="text-gray-500" /> <span>Cancel</span>
                </button>
              </div>
            </div>

            <div className="px-6 py-2 border-b border-gray-200 flex space-x-6 text-gray-600">
              <button type="button" onClick={() => setActiveTab('general')} className={activeTab === 'general' ? 'font-semibold text-teal-700 border-b-2 border-teal-700 pb-1' : 'hover:text-teal-700'}>General Info</button>
              <button type="button" onClick={() => setActiveTab('trips')} className={activeTab === 'trips' ? 'font-semibold text-teal-700 border-b-2 border-teal-700 pb-1' : 'hover:text-teal-700'}>Trip Routes</button>
              <button type="button" onClick={() => setActiveTab('driver')} className={activeTab === 'driver' ? 'font-semibold text-teal-700 border-b-2 border-teal-700 pb-1' : 'hover:text-teal-700'}>Driver Info</button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {editErrors.length > 0 && (
                <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-red-700 rounded">
                  {editErrors.map((error) => <p key={error}>{error}</p>)}
                </div>
              )}

              {activeTab === 'general' && (
                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <label className="w-1/3 text-gray-500">Bus No.</label>
                      <input type="text" value={editFormData.id} disabled className="w-2/3 border border-gray-200 rounded px-2 py-1 bg-gray-50 text-gray-500" />
                    </div>
                    <div className="flex items-center">
                      <label className="w-1/3 text-gray-500">Bus Name</label>
                      <input type="text" name="name" value={editFormData.name} onChange={handleEditChange} className="w-2/3 border border-gray-300 rounded px-2 py-1" />
                    </div>
                    <div className="flex items-center">
                      <label className="w-1/3 text-gray-500">Capacity</label>
                      <input type="number" min="1" name="capacity" value={editFormData.capacity} onChange={handleEditChange} className="w-2/3 border border-gray-300 rounded px-2 py-1" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <label className="w-1/3 text-gray-500">Status</label>
                      <select name="status" value={editFormData.status} onChange={handleEditChange} className="w-2/3 border border-gray-300 rounded px-2 py-1 bg-white">
                        <option value="Active">Active</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Out of Service">Out of Service</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'trips' && (
                <div className="space-y-4">
                  {editFormData.trips.map((trip, index) => (
                    <div key={`trip-${index}`} className="border border-gray-200 rounded p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">Trip {index + 1}</h3>
                        <button type="button" onClick={() => handleRemoveTripSlot(index)} className="text-gray-500 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <label className="w-1/3 text-gray-500">Time</label>
                          <input type="time" value={trip.time} onChange={(event) => handleTripTimeChange(index, event.target.value)} className="w-2/3 border border-gray-300 rounded px-2 py-1" />
                        </div>
                        <div className="flex items-center">
                          <label className="w-1/3 text-gray-500">Area</label>
                          <input type="text" value={trip.routeDetails.area} onChange={(event) => handleTripRouteChange(index, 'area', event.target.value)} className="w-2/3 border border-gray-300 rounded px-2 py-1" />
                        </div>
                        <div className="col-span-2 flex items-start">
                          <label className="w-1/6 text-gray-500 pt-1">Pickup Points</label>
                          <textarea value={trip.routeDetails.pickupPoints} onChange={(event) => handleTripRouteChange(index, 'pickupPoints', event.target.value)} className="w-5/6 border border-gray-300 rounded px-2 py-1 min-h-20" />
                        </div>
                        <div className="col-span-2 flex items-start">
                          <label className="w-1/6 text-gray-500 pt-1">Major Stops</label>
                          <textarea value={trip.routeDetails.majorStops} onChange={(event) => handleTripRouteChange(index, 'majorStops', event.target.value)} className="w-5/6 border border-gray-300 rounded px-2 py-1 min-h-20" />
                        </div>
                        <div className="flex items-center">
                          <label className="w-1/3 text-gray-500">Destination</label>
                          <input type="text" value={trip.routeDetails.destination} onChange={(event) => handleTripRouteChange(index, 'destination', event.target.value)} className="w-2/3 border border-gray-300 rounded px-2 py-1" />
                        </div>
                        <div className="flex items-start">
                          <label className="w-1/3 text-gray-500 pt-1">Notes</label>
                          <textarea value={trip.routeDetails.notes} onChange={(event) => handleTripRouteChange(index, 'notes', event.target.value)} className="w-2/3 border border-gray-300 rounded px-2 py-1 min-h-20" />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button type="button" onClick={handleAddTripSlot} className="flex items-center gap-1 text-teal-700 hover:bg-teal-50 px-2 py-1 rounded">
                    <Plus size={16} /> <span>Add trip</span>
                  </button>
                </div>
              )}

              {activeTab === 'driver' && (
                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <label className="w-1/3 text-gray-500">Driver Name</label>
                      <input type="text" value={editFormData.driver.name} onChange={(event) => handleDriverChange('name', event.target.value)} className="w-2/3 border border-gray-300 rounded px-2 py-1" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <label className="w-1/3 text-gray-500">Phone</label>
                      <input type="tel" value={editFormData.driver.phone} onChange={(event) => handleDriverChange('phone', event.target.value)} className="w-2/3 border border-gray-300 rounded px-2 py-1" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showLearnersModal && selectedBus && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white shadow-sm border border-gray-200 rounded">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-2xl font-light text-gray-800">Manage Trips: {selectedBus.name}</h2>
              <button type="button" onClick={closeLearnersModal} className="text-gray-500 hover:text-gray-800"><X size={20} /></button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-4">Select a Trip</h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedBus.trips.map((trip) => (
                    <button
                      key={trip.tripNumber}
                      type="button"
                      onClick={() => setSelectedTripNumber(trip.tripNumber)}
                      className={`p-3 rounded border-2 text-left ${selectedTripNumber === trip.tripNumber ? 'border-teal-700 bg-teal-50' : 'border-gray-200 hover:border-teal-700'}`}
                    >
                      <div className="font-semibold text-gray-800">Trip {trip.tripNumber}</div>
                      <div className="text-sm text-gray-600">{formatTimeLabel(trip.time)}</div>
                      <div className="text-xs text-gray-500 mt-1">{trip.students.length} students</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedTrip ? (
                <div>
                  <div className="mb-3 text-sm text-gray-700">
                    <span className="font-semibold">Route:</span> {routeSummary(selectedTrip.routeDetails) || 'Not set'}
                  </div>

                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-4">Trip {selectedTrip.tripNumber} - {formatTimeLabel(selectedTrip.time)}</h3>
                    <div className="flex gap-3">
                      <input type="text" placeholder="Admission Number" value={newStudentAdmission} onChange={(event) => setNewStudentAdmission(event.target.value)} className="flex-1 border border-gray-300 rounded px-3 py-2" />
                      <input type="text" placeholder="Student Name" value={newStudentName} onChange={(event) => setNewStudentName(event.target.value)} className="flex-1 border border-gray-300 rounded px-3 py-2" />
                      <button type="button" onClick={addStudent} className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded font-medium flex items-center gap-2">
                        <Plus size={16} /> Add
                      </button>
                    </div>
                  </div>

                  {selectedTrip.students.length > selectedBus.capacity && (
                    <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                      <h4 className="font-semibold text-red-800">Warning</h4>
                      <p className="text-sm text-red-700 mt-1">
                        This trip has {selectedTrip.students.length} students but the bus capacity is {selectedBus.capacity}.
                      </p>
                    </div>
                  )}

                  {selectedTrip.students.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="text-gray-500 border-b-2 border-gray-200 bg-gray-50">
                            <th className="font-normal py-2 px-3">Admission Number</th>
                            <th className="font-normal py-2 px-3">Student Name</th>
                            <th className="font-normal py-2 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTrip.students.map((student, index) => (
                            <tr key={`${student.admissionNumber}-${index}`} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                              <td className="py-2 px-3 font-mono text-teal-700">{student.admissionNumber}</td>
                              <td className="py-2 px-3">{student.name}</td>
                              <td className="py-2 px-3 text-right">
                                <button type="button" onClick={() => removeStudent(student.admissionNumber)} className="inline-flex items-center justify-center text-red-600 hover:bg-red-50 rounded p-1">
                                  <Trash2 size={14} className="text-red-600" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">No students added to this trip.</div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">Select a trip to manage students.</div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                type="button"
                onClick={() => selectedTrip && downloadLearnersPDF(selectedBus, selectedTrip)}
                disabled={!selectedTrip || selectedTrip.students.length === 0}
                className="bg-teal-700 hover:bg-teal-800 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium flex items-center gap-2"
              >
                <Download size={16} /> Download Trip Roster PDF
              </button>
              <button type="button" onClick={closeLearnersModal} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {deletingBusId && (() => {
        const bus = buses.find((candidate) => candidate.id === deletingBusId);
        if (!bus) return null;

        const totalStudents = bus.trips.reduce((sum, trip) => sum + trip.students.length, 0);

        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white shadow-sm border border-gray-200 rounded">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Delete Bus</h2>
              </div>

              <div className="px-6 py-4">
                <p className="text-gray-700 mb-2">Are you sure you want to delete <span className="font-semibold">{bus.name}</span> (Bus No. {bus.id})?</p>
                <p className="text-sm text-gray-600">This action cannot be undone. All associated data including {totalStudents} student(s) will be removed.</p>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button type="button" onClick={cancelDeleteBus} className="text-gray-700 hover:bg-gray-50 px-4 py-2 rounded border border-gray-300">Cancel</button>
                <button type="button" onClick={confirmDeleteBus} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium">Delete Bus</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
