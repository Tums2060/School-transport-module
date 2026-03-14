'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';

type AppRoute = {
  id: string;
  routeName: string;
  places: string;
  status?: string;
};

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
  routeId?: string;
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
  routeId: string;
};

type FormData = {
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

const ROUTES_KEY = 'school_routes';

const emptyFormData: FormData = {
  name: '',
  capacity: '',
  status: 'Active',
  driver: {
    name: '',
    phone: '',
  },
  trips: [
    {
      time: '08:00',
      routeDetails: { ...emptyRouteDetails },
      routeId: '',
    },
  ],
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

function normalizeBus(rawBus: Record<string, unknown>): Bus {
  const legacyRouteDetails = (rawBus.routeDetails || {}) as Partial<RouteDetails>;
  const fallbackRouteDetails: RouteDetails = {
    area: legacyRouteDetails.area || '',
    pickupPoints: legacyRouteDetails.pickupPoints || '',
    majorStops: legacyRouteDetails.majorStops || (typeof rawBus.route === 'string' ? rawBus.route : ''),
    destination: legacyRouteDetails.destination || '',
    notes: legacyRouteDetails.notes || '',
  };

  const rawTrips = Array.isArray(rawBus.trips) ? rawBus.trips : [];

  const trips: Trip[] =
    rawTrips.length > 0 && typeof rawTrips[0] === 'object'
      ? rawTrips
          .map((rawTrip, index) => {
            const trip = rawTrip as Record<string, unknown>;
            const rawStudents = Array.isArray(trip.students) ? trip.students : [];

            return {
              tripNumber: typeof trip.tripNumber === 'number' ? trip.tripNumber : index + 1,
              time: typeof trip.time === 'string' ? parseTimeValue(trip.time) : '',
              students: rawStudents.filter(
                (student): student is Student =>
                  typeof student === 'object' &&
                  student !== null &&
                  typeof (student as Student).admissionNumber === 'string' &&
                  typeof (student as Student).name === 'string'
              ),
              routeDetails: {
                area: ((trip.routeDetails as RouteDetails | undefined)?.area || fallbackRouteDetails.area).trim(),
                pickupPoints: ((trip.routeDetails as RouteDetails | undefined)?.pickupPoints || fallbackRouteDetails.pickupPoints).trim(),
                majorStops: ((trip.routeDetails as RouteDetails | undefined)?.majorStops || fallbackRouteDetails.majorStops).trim(),
                destination: ((trip.routeDetails as RouteDetails | undefined)?.destination || fallbackRouteDetails.destination).trim(),
                notes: ((trip.routeDetails as RouteDetails | undefined)?.notes || fallbackRouteDetails.notes).trim(),
              },
            };
          })
          .filter((trip) => trip.time)
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((trip, index) => ({ ...trip, tripNumber: index + 1 }))
      : [];

  return {
    id: typeof rawBus.id === 'string' ? rawBus.id : 'BS000',
    name: typeof rawBus.name === 'string' ? rawBus.name : 'Unnamed Bus',
    capacity: Number(rawBus.capacity) || 0,
    status: typeof rawBus.status === 'string' ? rawBus.status : 'Active',
    driver: {
      name: typeof (rawBus.driver as DriverDetails | undefined)?.name === 'string' ? (rawBus.driver as DriverDetails).name : '',
      phone: typeof (rawBus.driver as DriverDetails | undefined)?.phone === 'string' ? (rawBus.driver as DriverDetails).phone : '',
    },
    trips,
  };
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
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [appRoutes, setAppRoutes] = useState<AppRoute[]>([]);
  const [role, setRole] = useState('');
  const [isMounted, setIsMounted] = useState(false);

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
        const savedRoutes = localStorage.getItem(ROUTES_KEY);
        setAppRoutes(savedRoutes ? (JSON.parse(savedRoutes) as AppRoute[]) : []);
      } catch {
        setAppRoutes([]);
      }
      setIsMounted(true);
    });
  }, []);

  // Redirect non-superior_Admin after mount
  useEffect(() => {
    if (isMounted && role !== '' && role !== 'superior_Admin') {
      router.replace('/buses');
    }
  }, [isMounted, role, router]);

  const handleTripRouteIdChange = (index: number, value: string) => {
    const selectedRoute = appRoutes.find((route) => route.id === value);
    const pickupPoints = selectedRoute?.places || '';

    setFormData((current) => ({
      ...current,
      trips: current.trips.map((trip, tripIndex) =>
        tripIndex === index
          ? {
              ...trip,
              routeId: value,
              routeDetails: {
                ...trip.routeDetails,
                pickupPoints,
                area: '',
                majorStops: '',
                destination: '',
              },
            }
          : trip
      ),
    }));
  };

  const handleChange = (name: 'name' | 'capacity' | 'status', value: string) => {
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleDriverChange = (field: keyof DriverDetails, value: string) => {
    setFormData((current) => ({
      ...current,
      driver: {
        ...current.driver,
        [field]: value,
      },
    }));
  };

  const handleTripTimeChange = (index: number, value: string) => {
    setFormData((current) => ({
      ...current,
      trips: current.trips.map((trip, tripIndex) => (tripIndex === index ? { ...trip, time: value } : trip)),
    }));
  };

  const handleTripRouteChange = (index: number, field: keyof RouteDetails, value: string) => {
    setFormData((current) => ({
      ...current,
      trips: current.trips.map((trip, tripIndex) =>
        tripIndex === index
          ? {
              ...trip,
              routeDetails: {
                ...trip.routeDetails,
                [field]: value,
              },
            }
          : trip
      ),
    }));
  };

  const handleAddTripSlot = () => {
    setFormData((current) => ({
      ...current,
      trips: [...current.trips, { time: '', routeDetails: { ...emptyRouteDetails }, routeId: '' }],
    }));
  };

  const handleRemoveTripSlot = (index: number) => {
    setFormData((current) => ({
      ...current,
      trips:
        current.trips.length === 1
          ? [{ time: '', routeDetails: { ...emptyRouteDetails }, routeId: '' }]
          : current.trips.filter((_, tripIndex) => tripIndex !== index),
    }));
  };

  const handleReset = () => {
    setFormData(emptyFormData);
    setErrors([]);
    setActiveTab('general');
  };

  const validateForm = () => {
    const nextErrors: string[] = [];

    if (!formData.name.trim()) {
      nextErrors.push('Bus name is required.');
    }

    if ((Number(formData.capacity) || 0) <= 0) {
      nextErrors.push('Capacity must be greater than zero.');
    }

    const normalizedTimes = formData.trips.map((trip) => parseTimeValue(trip.time)).filter(Boolean);

    if (normalizedTimes.length === 0) {
      nextErrors.push('Add at least one trip time.');
    }

    if (new Set(normalizedTimes).size !== normalizedTimes.length) {
      nextErrors.push('Trip times must be unique.');
    }

    formData.trips.forEach((trip, index) => {
      const tripLabel = `Trip ${index + 1}`;

      if (!parseTimeValue(trip.time)) {
        nextErrors.push(`${tripLabel}: time is required.`);
      }

      if (!trip.routeId) {
        nextErrors.push(`${tripLabel}: route is required.`);
      }

      if (!trip.routeDetails.pickupPoints.trim()) {
        nextErrors.push(`${tripLabel}: pickup points are required.`);
      }
    });

    if (!formData.driver.name.trim()) {
      nextErrors.push('Driver name is required.');
    }

    if (nextErrors.some((error) => error.includes('Trip'))) {
      setActiveTab('trips');
    } else if (nextErrors.some((error) => error.includes('Driver'))) {
      setActiveTab('driver');
    } else {
      setActiveTab('general');
    }

    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    let buses: Bus[] = [];

    try {
      const existingData = localStorage.getItem(STORAGE_KEY);
      buses = existingData ? (JSON.parse(existingData) as Record<string, unknown>[]).map((bus) => normalizeBus(bus)) : [];
    } catch {
      buses = [];
    }

    const normalizedTrips = formData.trips
      .map((trip) => ({
        time: parseTimeValue(trip.time),
        routeId: trip.routeId || undefined,
        routeDetails: {
          area: '',
          pickupPoints: trip.routeDetails.pickupPoints.trim(),
          majorStops: '',
          destination: '',
          notes: trip.routeDetails.notes.trim(),
        },
      }))
      .filter((trip) => trip.time)
      .sort((a, b) => a.time.localeCompare(b.time));

    const trips: Trip[] = normalizedTrips.map((trip, index) => ({
      tripNumber: index + 1,
      time: trip.time,
      students: [],
      routeDetails: trip.routeDetails,
      routeId: trip.routeId,
    }));

    const newBus: Bus = {
      id: nextBusId(buses),
      name: formData.name.trim(),
      capacity: Number(formData.capacity) || 0,
      status: formData.status,
      driver: {
        name: formData.driver.name.trim(),
        phone: formData.driver.phone.trim(),
      },
      trips,
    };

    const updatedBuses = [...buses, newBus];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBuses));
    router.push('/buses');
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans text-sm flex items-center justify-center">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (role !== 'superior_Admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-sm text-gray-800">
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
            onClick={() => setActiveTab('trips')}
            className={activeTab === 'trips' ? 'font-semibold text-teal-700 border-b-2 border-teal-700 pb-1' : 'hover:text-teal-700 cursor-pointer'}
          >
            Trip Routes
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
                      value={formData.name}
                      onChange={(event) => handleChange('name', event.target.value)}
                      placeholder="e.g. Scania - Kiserian"
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="w-1/3 text-gray-500">Capacity (Students)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(event) => handleChange('capacity', event.target.value)}
                      className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <label className="w-1/3 text-gray-500">Status</label>
                    <select
                      value={formData.status}
                      onChange={(event) => handleChange('status', event.target.value)}
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

          {activeTab === 'trips' && (
            <>
              <h2 className="font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                Trip Time and Route Details
              </h2>

              <div className="space-y-4">
                {formData.trips.map((trip, index) => (
                  <div key={`trip-${index}`} className="border border-gray-200 rounded p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800">Trip {index + 1}</h3>
                      <button type="button" onClick={() => handleRemoveTripSlot(index)} className="text-gray-500 hover:text-red-600">
                        <Trash2 size={16} className="text-gray-500" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      <div className="flex items-center">
                        <label className="w-1/3 text-gray-500">Time</label>
                        <input
                          type="time"
                          value={trip.time}
                          onChange={(event) => handleTripTimeChange(index, event.target.value)}
                          className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="flex items-center">
                        <label className="w-1/3 text-gray-500">Route</label>
                        <select
                          value={trip.routeId}
                          onChange={(event) => handleTripRouteIdChange(index, event.target.value)}
                          className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500 bg-white"
                        >
                          <option value="">— Select route —</option>
                          {appRoutes.map((r) => (
                            <option key={r.id} value={r.id}>{r.routeName}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 flex items-start">
                        <label className="w-1/6 text-gray-500 pt-1">Pickup Points</label>
                        <textarea
                          value={trip.routeDetails.pickupPoints}
                          readOnly
                          className="w-5/6 border border-gray-200 rounded px-2 py-1 min-h-20 bg-gray-50 text-gray-600"
                        />
                      </div>

                      <div className="col-span-2 flex items-start">
                        <label className="w-1/6 text-gray-500 pt-1">Route Notes</label>
                        <textarea
                          value={trip.routeDetails.notes}
                          onChange={(event) => handleTripRouteChange(index, 'notes', event.target.value)}
                          className="w-5/6 border border-gray-300 rounded px-2 py-1 min-h-20 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddTripSlot}
                  className="mt-3 flex items-center gap-1 text-teal-700 hover:bg-teal-50 px-2 py-1 rounded"
                >
                  <Plus size={16} className="text-teal-700" />
                  <span>Add trip</span>
                </button>
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
                      onChange={(event) => handleDriverChange('name', event.target.value)}
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
                      onChange={(event) => handleDriverChange('phone', event.target.value)}
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
