'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';

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

type Bus = {
  id: string;
  name: string;
  route: string;
  capacity: number;
  trips: number;
  status: string;
  departureTimes: string[];
  routeDetails: RouteDetails;
  driver: DriverDetails;
  students: Student[];
};

const STORAGE_KEY = 'school_buses';

const initialBuses: Bus[] = [
  {
    id: 'BS001',
    name: 'Scania - Kiserian',
    route: 'Kiserian - Rongai - Upper Hill Campus',
    capacity: 45,
    trips: 2,
    status: 'Active',
    departureTimes: ['06:30', '15:45'],
    routeDetails: {
      area: 'Kiserian',
      pickupPoints: 'Kiserian Stage, Corner Baridi, Rongai SGR',
      majorStops: 'Magadi Road, Rongai Town, Langata Road',
      destination: 'Upper Hill Campus',
      notes: 'Morning pickup starts at Kiserian Stage and drops learners at the main gate.',
    },
    driver: {
      name: 'Samuel Njoroge',
      phone: '0712 345 678',
    },
    students: [],
  },
  {
    id: 'BS002',
    name: 'Isuzu - Thika Road',
    route: 'Thika Road - Muthaiga - Main Campus',
    capacity: 33,
    trips: 1,
    status: 'Active',
    departureTimes: ['07:00', '16:00'],
    routeDetails: {
      area: 'Thika Road Corridor',
      pickupPoints: 'Garden City, Roasters, Muthaiga Roundabout',
      majorStops: 'Thika Superhighway, Forest Road',
      destination: 'Main Campus',
      notes: 'Designed for learners joining from the Thika Road corridor.',
    },
    driver: {
      name: 'Mercy Wanjiku',
      phone: '0722 456 789',
    },
    students: [],
  },
  {
    id: 'BS003',
    name: 'Nissan - Syokimau',
    route: 'Syokimau - Mombasa Road - Junior School',
    capacity: 25,
    trips: 2,
    status: 'Maintenance',
    departureTimes: ['06:45', '12:00', '16:15'],
    routeDetails: {
      area: 'Syokimau',
      pickupPoints: 'Syokimau Station, Gateway Mall, Mlolongo',
      majorStops: 'Mombasa Road, JKIA Interchange',
      destination: 'Junior School',
      notes: 'Currently under scheduled maintenance before returning to service.',
    },
    driver: {
      name: 'David Mutua',
      phone: '0733 567 890',
    },
    students: [],
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

function buildRouteSummary(routeDetails: RouteDetails) {
  const parts = [routeDetails.area, routeDetails.majorStops, routeDetails.destination]
    .map((value) => value.trim())
    .filter(Boolean);

  return parts.join(' - ');
}

function normalizeBus(rawBus: Partial<Bus> & { time?: string }) {
  const routeDetails: RouteDetails = {
    area: rawBus.routeDetails?.area?.trim() || rawBus.route?.split(' - ')[0] || '',
    pickupPoints: rawBus.routeDetails?.pickupPoints?.trim() || '',
    majorStops: rawBus.routeDetails?.majorStops?.trim() || rawBus.route || '',
    destination: rawBus.routeDetails?.destination?.trim() || 'School Campus',
    notes: rawBus.routeDetails?.notes?.trim() || '',
  };

  const departureTimes = Array.from(
    new Set(
      (Array.isArray(rawBus.departureTimes) ? rawBus.departureTimes : rawBus.time ? [rawBus.time] : [])
        .map((time) => parseTimeValue(String(time)))
        .filter(Boolean)
    )
  );

  const students = Array.isArray(rawBus.students)
    ? rawBus.students.filter(
        (student): student is Student =>
          typeof student === 'object' &&
          student !== null &&
          typeof student.admissionNumber === 'string' &&
          typeof student.name === 'string'
      )
    : [];

  return {
    id: rawBus.id || 'BS000',
    name: rawBus.name?.trim() || 'Unnamed Bus',
    route: rawBus.route?.trim() || buildRouteSummary(routeDetails) || 'Route pending',
    capacity: Number(rawBus.capacity) || 0,
    trips: Number(rawBus.trips) || 0,
    status: rawBus.status?.trim() || 'Active',
    departureTimes,
    routeDetails,
    driver: {
      name: rawBus.driver?.name?.trim() || '',
      phone: rawBus.driver?.phone?.trim() || '',
    },
    students,
  } satisfies Bus;
}

export default function SearchBusesPage() {
  const [allBuses, setAllBuses] = useState<Bus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('All');

  useEffect(() => {
    let frameId = 0;

    try {
      const savedBuses = localStorage.getItem(STORAGE_KEY);
      const nextBuses = savedBuses ? JSON.parse(savedBuses) : initialBuses;
      const normalizedBuses = nextBuses.map((bus: Partial<Bus> & { time?: string }) => normalizeBus(bus));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedBuses));
      frameId = window.requestAnimationFrame(() => {
        setAllBuses(normalizedBuses);
      });
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialBuses));
      frameId = window.requestAnimationFrame(() => {
        setAllBuses(initialBuses);
      });
    }

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const availableTimes = Array.from(
    new Set(allBuses.flatMap((bus) => bus.departureTimes).filter(Boolean))
  ).sort();

  const filteredBuses = allBuses.filter((bus) => {
    const searchValue = searchTerm.trim().toLowerCase();
    const driverValue = driverFilter.trim().toLowerCase();
    const searchableRouteText = [
      bus.route,
      bus.routeDetails.area,
      bus.routeDetails.pickupPoints,
      bus.routeDetails.majorStops,
      bus.routeDetails.destination,
      bus.routeDetails.notes,
      bus.driver.name,
      bus.departureTimes.join(' '),
      bus.departureTimes.map(formatTimeLabel).join(' '),
    ]
      .join(' ')
      .toLowerCase();

    const matchesSearch = !searchValue || bus.name.toLowerCase().includes(searchValue) || searchableRouteText.includes(searchValue);
    const matchesDriver = !driverValue || bus.driver.name.toLowerCase().includes(driverValue);
    const matchesStatus = statusFilter === 'All' || bus.status === statusFilter;
    const matchesTime = timeFilter === 'All' || bus.departureTimes.includes(timeFilter);

    return matchesSearch && matchesDriver && matchesStatus && matchesTime;
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-sm text-gray-800 flex flex-col">
      {/* Breadcrumb nav within buses section */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-6 text-teal-700 shrink-0">
        <Link href="/" className="hover:underline text-gray-500">Home</Link>
        <Link href="/buses" className="hover:underline">Buses List</Link>
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Search &amp; Filter</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col space-y-6 shrink-0 overflow-y-auto">
          <div>
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center justify-between">
              <span>Filter list by...</span>
              <Settings size={16} className="text-gray-400 cursor-pointer hover:text-gray-800" />
            </h2>

            <div className="mb-4">
              <label className="block text-gray-500 mb-1">Search Name/Route/Time</label>
              <input
                type="text"
                placeholder="e.g. Kiserian or 8:00 AM"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-500 mb-1">Driver Name</label>
              <input
                type="text"
                placeholder="e.g. Samuel"
                value={driverFilter}
                onChange={(event) => setDriverFilter(event.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-500 mb-1">Time of Travel</label>
              <select
                value={timeFilter}
                onChange={(event) => setTimeFilter(event.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-teal-500 bg-white"
              >
                <option value="All">All Times</option>
                {availableTimes.map((time) => (
                  <option key={time} value={time}>{formatTimeLabel(time)}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-500 mb-1">Bus Status</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-teal-500 bg-white"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Out of Service">Out of Service</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setDriverFilter('');
              setStatusFilter('All');
              setTimeFilter('All');
            }}
            className="text-teal-700 hover:underline text-left"
          >
            Reset filters
          </button>
        </div>

        <div className="flex-1 p-6 bg-gray-50 overflow-y-auto">
          <div className="bg-white shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex justify-between items-center">
              <span className="font-semibold text-gray-700">
                Results ({filteredBuses.length})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-500 border-b-2 border-gray-200 bg-gray-50/50">
                    <th className="font-normal py-2 px-4 w-24">No.</th>
                    <th className="font-normal py-2 px-4">Bus Name</th>
                    <th className="font-normal py-2 px-4">Route</th>
                    <th className="font-normal py-2 px-4">Driver</th>
                    <th className="font-normal py-2 px-4">Time</th>
                    <th className="font-normal py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuses.length > 0 ? (
                    filteredBuses.map((bus, index) => (
                      <tr
                        key={bus.id}
                        className={`border-b border-gray-100 hover:bg-teal-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <td className="py-2 px-4 text-teal-700 font-medium">{bus.id}</td>
                        <td className="py-2 px-4">{bus.name}</td>
                        <td className="py-2 px-4">
                          <div>{bus.route}</div>
                          {bus.routeDetails.pickupPoints && (
                            <div className="text-xs text-gray-500 mt-1">Pickup: {bus.routeDetails.pickupPoints}</div>
                          )}
                        </td>
                        <td className="py-2 px-4">{bus.driver.name || 'Not assigned'}</td>
                        <td className="py-2 px-4 text-gray-600">
                          {bus.departureTimes.length > 0 ? bus.departureTimes.map(formatTimeLabel).join(', ') : 'Not set'}
                        </td>
                        <td className="py-2 px-4">{bus.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400">
                        No buses match your current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
