'use client';

import { useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';

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

type TabKey = 'general' | 'route' | 'driver';

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

const emptyFormData = {
  name: '',
  route: '',
  capacity: '',
  trips: '',
  status: 'Active',
  departureTimes: ['08:00'],
  routeDetails: {
    area: '',
    pickupPoints: '',
    majorStops: '',
    destination: '',
    notes: '',
  },
  driver: {
    name: '',
    phone: '',
  },
};

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

function nextBusId(buses: Bus[]) {
  const highestNumericId = buses.reduce((highest, bus) => {
    const numericId = Number(bus.id.replace(/\D/g, ''));
    return Number.isNaN(numericId) ? highest : Math.max(highest, numericId);
  }, 0);

  return `BS${String(highestNumericId + 1).padStart(3, '0')}`;
}

export default function AddBusPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [errors, setErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState(emptyFormData);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleNestedChange = (
    section: 'routeDetails' | 'driver',
    field: keyof RouteDetails | keyof DriverDetails,
    value: string
  ) => {
    setFormData((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const handleTimeChange = (index: number, value: string) => {
    setFormData((current) => ({
      ...current,
      departureTimes: current.departureTimes.map((time, timeIndex) => (timeIndex === index ? value : time)),
    }));
  };

  const handleAddTimeSlot = () => {
    setFormData((current) => ({
      ...current,
      departureTimes: [...current.departureTimes, ''],
    }));
  };

  const handleRemoveTimeSlot = (index: number) => {
    setFormData((current) => ({
      ...current,
      departureTimes:
        current.departureTimes.length === 1
          ? ['']
          : current.departureTimes.filter((_, timeIndex) => timeIndex !== index),
    }));
  };

  const handleReset = () => {
    setFormData(emptyFormData);
    setErrors([]);
    setActiveTab('general');
  };

  const validateForm = () => {
    const nextErrors: string[] = [];
    const normalizedTimes = Array.from(new Set(formData.departureTimes.map(parseTimeValue).filter(Boolean)));

    if (!formData.name.trim()) {
      nextErrors.push('Bus name is required.');
    }

    if (!formData.route.trim() && !buildRouteSummary(formData.routeDetails)) {
      nextErrors.push('Add a main route or complete the route details section.');
    }

    if ((Number(formData.capacity) || 0) <= 0) {
      nextErrors.push('Capacity must be greater than zero.');
    }

    if ((Number(formData.trips) || 0) <= 0) {
      nextErrors.push('Daily trips must be greater than zero.');
    }

    if (normalizedTimes.length === 0) {
      nextErrors.push('Add at least one departure time.');
    }

    if (!formData.routeDetails.area.trim()) {
      nextErrors.push('Route area is required.');
    }

    if (!formData.routeDetails.pickupPoints.trim()) {
      nextErrors.push('Pickup points are required so learners can be traced accurately.');
    }

    if (!formData.routeDetails.destination.trim()) {
      nextErrors.push('Destination is required.');
    }

    if (!formData.driver.name.trim()) {
      nextErrors.push('Driver name is required.');
    }

    if (nextErrors.some((error) => error.includes('departure time') || error.includes('Capacity') || error.includes('trips') || error.includes('Bus name') || error.includes('main route'))) {
      setActiveTab('general');
    } else if (nextErrors.some((error) => error.includes('Route') || error.includes('Pickup') || error.includes('Destination'))) {
      setActiveTab('route');
    } else if (nextErrors.some((error) => error.includes('Driver'))) {
      setActiveTab('driver');
    }

    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    let buses: Bus[] = initialBuses;

    try {
      const existingData = localStorage.getItem(STORAGE_KEY);
      buses = existingData
        ? JSON.parse(existingData).map((bus: Partial<Bus> & { time?: string }) => normalizeBus(bus))
        : initialBuses;
    } catch {
      buses = initialBuses;
    }

    const departureTimes = Array.from(new Set(formData.departureTimes.map(parseTimeValue).filter(Boolean)));
    const routeSummary = formData.route.trim() || buildRouteSummary(formData.routeDetails);

    const newBus: Bus = {
      id: nextBusId(buses),
      name: formData.name.trim(),
      route: routeSummary,
      capacity: Number(formData.capacity) || 0,
      trips: Number(formData.trips) || 0,
      status: formData.status,
      departureTimes,
      routeDetails: {
        area: formData.routeDetails.area.trim(),
        pickupPoints: formData.routeDetails.pickupPoints.trim(),
        majorStops: formData.routeDetails.majorStops.trim(),
        destination: formData.routeDetails.destination.trim(),
        notes: formData.routeDetails.notes.trim(),
      },
      driver: {
        name: formData.driver.name.trim(),
        phone: formData.driver.phone.trim(),
      },
      students: [],
    };

    const updatedBuses = [...buses, newBus];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBuses));
    router.push('/buses');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-sm text-gray-800">
      <div className="bg-[#1F1F1F] text-white flex items-center px-4 py-2">
        <span className="font-semibold text-lg">Dynamics 365 Business Central</span>
      </div>

      <div className="max-w-5xl mx-auto mt-6 bg-white shadow-sm border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/buses" className="text-gray-500 hover:text-gray-800">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-light text-gray-800">New Bus Card</h1>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-1 text-teal-700 hover:bg-teal-50 px-3 py-1 rounded font-medium"
            >
              <Check size={16} className="text-teal-700" /> <span>Save</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center space-x-1 text-gray-500 hover:bg-gray-50 px-3 py-1 rounded"
            >
              <Trash2 size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-6 py-2 border-b border-gray-200 flex space-x-6 text-gray-600">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={activeTab === 'general' ? 'font-semibold text-teal-700 border-b-2 border-teal-700 pb-1' : 'hover:text-teal-700 cursor-pointer'}
          >
            General Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('route')}
            className={activeTab === 'route' ? 'font-semibold text-teal-700 border-b-2 border-teal-700 pb-1' : 'hover:text-teal-700 cursor-pointer'}
          >
            Route Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('driver')}
            className={activeTab === 'driver' ? 'font-semibold text-teal-700 border-b-2 border-teal-700 pb-1' : 'hover:text-teal-700 cursor-pointer'}
          >
            Driver Info
          </button>
        </div>

        <div className="p-6">
          {errors.length > 0 && (
            <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-red-700 rounded">
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}

          {activeTab === 'general' && (
            <>
              <h2 className="font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                Bus General Information
              </h2>

              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <label className="w-1/3 text-gray-500">Bus Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Scania - Kiserian"
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="w-1/3 text-gray-500">Main Route</label>
                    <input
                      type="text"
                      name="route"
                      value={formData.route}
                      onChange={handleChange}
                      placeholder="e.g. Kiserian - Rongai - Campus"
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-2">Departure Times</label>
                    <div className="space-y-2">
                      {formData.departureTimes.map((time, index) => (
                        <div key={`${index}-${time}`} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={time}
                            onChange={(event) => handleTimeChange(index, event.target.value)}
                            className="w-40 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveTimeSlot(index)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Trash2 size={16} className="text-gray-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddTimeSlot}
                      className="mt-3 flex items-center gap-1 text-teal-700 hover:bg-teal-50 px-2 py-1 rounded"
                    >
                      <Plus size={16} className="text-teal-700" />
                      <span>Add time slot</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <label className="w-1/3 text-gray-500">Capacity (Students)</label>
                    <input
                      type="number"
                      min="1"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="w-1/3 text-gray-500">Daily Trips</label>
                    <input
                      type="number"
                      min="1"
                      name="trips"
                      value={formData.trips}
                      onChange={handleChange}
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="w-1/3 text-gray-500">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500 bg-white"
                    >
                      <option value="Active">Active</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Out of Service">Out of Service</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'route' && (
            <>
              <h2 className="font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                Route Details
              </h2>

              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <label className="w-1/3 text-gray-500">Route Area</label>
                    <input
                      type="text"
                      value={formData.routeDetails.area}
                      onChange={(event) => handleNestedChange('routeDetails', 'area', event.target.value)}
                      placeholder="e.g. Kiserian and Rongai"
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex items-start">
                    <label className="w-1/3 text-gray-500 pt-1">Pickup Points</label>
                    <textarea
                      value={formData.routeDetails.pickupPoints}
                      onChange={(event) => handleNestedChange('routeDetails', 'pickupPoints', event.target.value)}
                      placeholder="List pickup points in order of collection"
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 min-h-24 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex items-start">
                    <label className="w-1/3 text-gray-500 pt-1">Major Stops</label>
                    <textarea
                      value={formData.routeDetails.majorStops}
                      onChange={(event) => handleNestedChange('routeDetails', 'majorStops', event.target.value)}
                      placeholder="Describe the roads or landmarks the bus follows"
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 min-h-24 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <label className="w-1/3 text-gray-500">Destination</label>
                    <input
                      type="text"
                      value={formData.routeDetails.destination}
                      onChange={(event) => handleNestedChange('routeDetails', 'destination', event.target.value)}
                      placeholder="e.g. Main Campus Gate"
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex items-start">
                    <label className="w-1/3 text-gray-500 pt-1">Route Notes</label>
                    <textarea
                      value={formData.routeDetails.notes}
                      onChange={(event) => handleNestedChange('routeDetails', 'notes', event.target.value)}
                      placeholder="Add safety notes, learner handover details, or route instructions"
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 min-h-28 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'driver' && (
            <>
              <h2 className="font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                Driver Information
              </h2>

              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <label className="w-1/3 text-gray-500">Driver Name</label>
                    <input
                      type="text"
                      value={formData.driver.name}
                      onChange={(event) => handleNestedChange('driver', 'name', event.target.value)}
                      placeholder="e.g. Samuel Njoroge"
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <label className="w-1/3 text-gray-500">Phone</label>
                    <input
                      type="tel"
                      value={formData.driver.phone}
                      onChange={(event) => handleNestedChange('driver', 'phone', event.target.value)}
                      placeholder="Optional contact number"
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}