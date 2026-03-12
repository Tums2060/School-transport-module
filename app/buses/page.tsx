'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
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
};

type BusFormData = {
  id: string;
  name: string;
  route: string;
  capacity: string;
  trips: string;
  status: string;
  departureTimes: string[];
  routeDetails: RouteDetails;
  driver: DriverDetails;
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
  } satisfies Bus;
}

function createFormData(bus: Bus): BusFormData {
  return {
    id: bus.id,
    name: bus.name,
    route: bus.route,
    capacity: String(bus.capacity),
    trips: String(bus.trips),
    status: bus.status,
    departureTimes: bus.departureTimes.length > 0 ? [...bus.departureTimes] : [''],
    routeDetails: { ...bus.routeDetails },
    driver: { ...bus.driver },
  };
}

function validateBusForm(formData: BusFormData) {
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

  return nextErrors;
}

export default function BusesListPage() {
  const [buses, setBuses] = useState<Bus[]>(initialBuses);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingBusId, setEditingBusId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [editErrors, setEditErrors] = useState<string[]>([]);
  const [editFormData, setEditFormData] = useState<BusFormData | null>(null);

  useEffect(() => {
    try {
      const savedBuses = localStorage.getItem(STORAGE_KEY);
      const nextBuses = savedBuses ? JSON.parse(savedBuses) : initialBuses;
      const normalizedBuses = nextBuses.map((bus: Partial<Bus> & { time?: string }) => normalizeBus(bus));

      setBuses(normalizedBuses);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedBuses));
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
        head: [['Bus No.', 'Bus Name', 'Route', 'Driver', 'Departure Times', 'Capacity', 'Trips', 'Status']],
        body: buses.map((bus) => [
          bus.id,
          bus.name,
          bus.route,
          bus.driver.name || 'Not assigned',
          bus.departureTimes.length > 0 ? bus.departureTimes.map(formatTimeLabel).join(', ') : 'Not set',
          String(bus.capacity),
          String(bus.trips),
          bus.status,
        ]),
        headStyles: {
          fillColor: [13, 148, 136],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        bodyStyles: {
          textColor: [31, 41, 55],
          lineColor: [229, 231, 235],
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        styles: {
          fontSize: 9,
          cellPadding: 2.5,
          valign: 'middle',
        },
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

  const handleEditNestedChange = (
    section: 'routeDetails' | 'driver',
    field: keyof RouteDetails | keyof DriverDetails,
    value: string
  ) => {
    setEditFormData((current) => (
      current
        ? {
            ...current,
            [section]: {
              ...current[section],
              [field]: value,
            },
          }
        : current
    ));
  };

  const handleEditTimeChange = (index: number, value: string) => {
    setEditFormData((current) => (
      current
        ? {
            ...current,
            departureTimes: current.departureTimes.map((time, timeIndex) => (timeIndex === index ? value : time)),
          }
        : current
    ));
  };

  const handleAddTimeSlot = () => {
    setEditFormData((current) => (
      current
        ? {
            ...current,
            departureTimes: [...current.departureTimes, ''],
          }
        : current
    ));
  };

  const handleRemoveTimeSlot = (index: number) => {
    setEditFormData((current) => (
      current
        ? {
            ...current,
            departureTimes:
              current.departureTimes.length === 1
                ? ['']
                : current.departureTimes.filter((_, timeIndex) => timeIndex !== index),
          }
        : current
    ));
  };

  const handleSaveEdit = () => {
    if (!editFormData || !editingBusId) {
      return;
    }

    const nextErrors = validateBusForm(editFormData);

    if (nextErrors.length > 0) {
      if (nextErrors.some((error) => error.includes('Route') || error.includes('Pickup') || error.includes('Destination'))) {
        setActiveTab('route');
      } else if (nextErrors.some((error) => error.includes('Driver'))) {
        setActiveTab('driver');
      } else {
        setActiveTab('general');
      }

      setEditErrors(nextErrors);
      return;
    }

    const departureTimes = Array.from(new Set(editFormData.departureTimes.map(parseTimeValue).filter(Boolean)));
    const updatedBus: Bus = {
      id: editFormData.id,
      name: editFormData.name.trim(),
      route: editFormData.route.trim() || buildRouteSummary(editFormData.routeDetails),
      capacity: Number(editFormData.capacity) || 0,
      trips: Number(editFormData.trips) || 0,
      status: editFormData.status,
      departureTimes,
      routeDetails: {
        area: editFormData.routeDetails.area.trim(),
        pickupPoints: editFormData.routeDetails.pickupPoints.trim(),
        majorStops: editFormData.routeDetails.majorStops.trim(),
        destination: editFormData.routeDetails.destination.trim(),
        notes: editFormData.routeDetails.notes.trim(),
      },
      driver: {
        name: editFormData.driver.name.trim(),
        phone: editFormData.driver.phone.trim(),
      },
    };

    const updatedBuses = buses.map((bus) => (bus.id === editingBusId ? updatedBus : bus));
    setBuses(updatedBuses);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBuses));
    closeEditModal();
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-sm text-gray-800">
      <div className="bg-[#1F1F1F] text-white flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-lg">Dynamics 365 Business Central</span>
        </div>
        <div className="flex items-center space-x-4">
          <button type="button" className="hover:text-gray-300">
            <Search size={18} />
          </button>
          <button type="button" className="hover:text-gray-300">
            <Settings size={18} />
          </button>
          <div className="bg-pink-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
            TM
          </div>
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
                <th className="font-normal py-2 px-4">Route</th>
                <th className="font-normal py-2 px-4">Driver</th>
                <th className="font-normal py-2 px-4">Departure Times</th>
                <th className="font-normal py-2 px-4 text-right">Capacity</th>
                <th className="font-normal py-2 px-4 text-right">Trips</th>
                <th className="font-normal py-2 px-4">Status</th>
                <th className="font-normal py-2 px-4 text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {buses.map((bus, index) => (
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
                  <td className="py-2 px-4 text-right">{bus.capacity}</td>
                  <td className="py-2 px-4 text-right">{bus.trips}</td>
                  <td className="py-2 px-4">{bus.status}</td>
                  <td className="py-2 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEditModal(bus)}
                      className="inline-flex items-center justify-center text-teal-700 hover:bg-teal-50 rounded p-2"
                      aria-label={`Edit ${bus.name}`}
                    >
                      <Pencil size={16} className="text-teal-700" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {buses.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            No buses found. Click &quot;+ New&quot; to add one.
          </div>
        )}
      </div>

      {editFormData && editingBusId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white shadow-sm border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center space-x-4">
                <button type="button" onClick={closeEditModal} className="text-gray-500 hover:text-gray-800">
                  <X size={20} />
                </button>
                <h2 className="text-2xl font-light text-gray-800">Update Bus Card</h2>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex items-center space-x-1 text-teal-700 hover:bg-teal-50 px-3 py-1 rounded font-medium"
                >
                  <Check size={16} className="text-teal-700" /> <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex items-center space-x-1 text-gray-500 hover:bg-gray-50 px-3 py-1 rounded"
                >
                  <X size={16} className="text-gray-500" /> <span>Cancel</span>
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

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {editErrors.length > 0 && (
                <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-red-700 rounded">
                  {editErrors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              )}

              {activeTab === 'general' && (
                <>
                  <h3 className="font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                    Bus General Information
                  </h3>

                  <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <label className="w-1/3 text-gray-500">Bus No.</label>
                        <input
                          type="text"
                          value={editFormData.id}
                          disabled
                          className="w-2/3 border border-gray-200 rounded px-2 py-1 bg-gray-50 text-gray-500"
                        />
                      </div>

                      <div className="flex items-center">
                        <label className="w-1/3 text-gray-500">Bus Name</label>
                        <input
                          type="text"
                          name="name"
                          value={editFormData.name}
                          onChange={handleEditChange}
                          className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="flex items-center">
                        <label className="w-1/3 text-gray-500">Main Route</label>
                        <input
                          type="text"
                          name="route"
                          value={editFormData.route}
                          onChange={handleEditChange}
                          className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-500 mb-2">Departure Times</label>
                        <div className="space-y-2">
                          {editFormData.departureTimes.map((time, index) => (
                            <div key={`${index}-${time}`} className="flex items-center gap-2">
                              <input
                                type="time"
                                value={time}
                                onChange={(event) => handleEditTimeChange(index, event.target.value)}
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
                          value={editFormData.capacity}
                          onChange={handleEditChange}
                          className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="flex items-center">
                        <label className="w-1/3 text-gray-500">Daily Trips</label>
                        <input
                          type="number"
                          min="1"
                          name="trips"
                          value={editFormData.trips}
                          onChange={handleEditChange}
                          className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="flex items-center">
                        <label className="w-1/3 text-gray-500">Status</label>
                        <select
                          name="status"
                          value={editFormData.status}
                          onChange={handleEditChange}
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
                  <h3 className="font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                    Route Details
                  </h3>

                  <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <label className="w-1/3 text-gray-500">Route Area</label>
                        <input
                          type="text"
                          value={editFormData.routeDetails.area}
                          onChange={(event) => handleEditNestedChange('routeDetails', 'area', event.target.value)}
                          className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="flex items-start">
                        <label className="w-1/3 text-gray-500 pt-1">Pickup Points</label>
                        <textarea
                          value={editFormData.routeDetails.pickupPoints}
                          onChange={(event) => handleEditNestedChange('routeDetails', 'pickupPoints', event.target.value)}
                          className="w-2/3 border border-gray-300 rounded px-2 py-1 min-h-24 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="flex items-start">
                        <label className="w-1/3 text-gray-500 pt-1">Major Stops</label>
                        <textarea
                          value={editFormData.routeDetails.majorStops}
                          onChange={(event) => handleEditNestedChange('routeDetails', 'majorStops', event.target.value)}
                          className="w-2/3 border border-gray-300 rounded px-2 py-1 min-h-24 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center">
                        <label className="w-1/3 text-gray-500">Destination</label>
                        <input
                          type="text"
                          value={editFormData.routeDetails.destination}
                          onChange={(event) => handleEditNestedChange('routeDetails', 'destination', event.target.value)}
                          className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="flex items-start">
                        <label className="w-1/3 text-gray-500 pt-1">Route Notes</label>
                        <textarea
                          value={editFormData.routeDetails.notes}
                          onChange={(event) => handleEditNestedChange('routeDetails', 'notes', event.target.value)}
                          className="w-2/3 border border-gray-300 rounded px-2 py-1 min-h-28 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'driver' && (
                <>
                  <h3 className="font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                    Driver Information
                  </h3>

                  <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <label className="w-1/3 text-gray-500">Driver Name</label>
                        <input
                          type="text"
                          value={editFormData.driver.name}
                          onChange={(event) => handleEditNestedChange('driver', 'name', event.target.value)}
                          className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center">
                        <label className="w-1/3 text-gray-500">Phone</label>
                        <input
                          type="tel"
                          value={editFormData.driver.phone}
                          onChange={(event) => handleEditNestedChange('driver', 'phone', event.target.value)}
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
      )}
    </div>
  );
}