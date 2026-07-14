'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Download, ArrowDown, Pencil, Trash2, Check, X, Filter, Map } from 'lucide-react';

type Place = {
  id: string;
  placeName: string;
  zoneName: string;
};

type Trip = {
  tripNumber: number;
  time: string;
  pickupPoints: string;
  pickupPointIds: string[];
  notes: string;
};

type Bus = {
  id: string; // busNumber
  name: string;
  capacity: number;
  status: string;
  driver: {
    name: string;
    phone: string;
  };
  trips: Trip[];
};

type TripFormData = {
  time: string;
  pickupPointIds: string[];
  notes: string;
};

type BusFormData = {
  id: string;
  name: string;
  capacity: string;
  status: string;
  driver: {
    name: string;
    phone: string;
  };
  trips: TripFormData[];
};

type TabKey = 'general' | 'trips' | 'driver';

function formatTimeLabel(time: string) {
  if (!time) return '';
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

export default function BusesListPage() {
  const router = useRouter();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [driverFilter, setDriverFilter] = useState('');
  const [role, setRole] = useState('');
  
  // Edit Bus Modal State
  const [editingBusId, setEditingBusId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [editErrors, setEditErrors] = useState<string[]>([]);
  const [editFormData, setEditFormData] = useState<BusFormData | null>(null);
  
  // Delete Confirmation State
  const [deletingBusId, setDeletingBusId] = useState<string | null>(null);
  
  // Trip Overview Modal State
  const [showTripOverviewModal, setShowTripOverviewModal] = useState(false);
  const [selectedBusForTripsId, setSelectedBusForTripsId] = useState<string | null>(null);

  const canManage = role === 'superior_Admin' || role === 'Admin';
  const canDelete = role === 'superior_Admin';

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

  async function loadBuses() {
    try {
      const res = await fetch('/api/buses');
      const json = await res.json();
      if (json.success) {
        setBuses(json.data);
      }
    } catch (err) {
      console.error('Error fetching buses:', err);
    }
  }

  async function loadPlaces() {
    try {
      const res = await fetch('/api/places');
      const json = await res.json();
      if (json.success) {
        setPlaces(json.data);
      }
    } catch (err) {
      console.error('Error fetching places:', err);
    }
  }

  useEffect(() => {
    loadBuses();
    loadPlaces();
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
      document.text('School Bus Report', 14, 15);

      document.setFontSize(10);
      document.setTextColor(55, 65, 81);
      document.text(`Generated on ${new Date().toLocaleString()}`, 14, 34);

      autoTable(document, {
        startY: 40,
        head: [['Bus No.', 'Bus Name', 'Driver', 'Trips (Stops)', 'Capacity', 'Status']],
        body: buses.map((bus) => [
          bus.id,
          bus.name,
          bus.driver.name || 'Not assigned',
          bus.trips.map((trip) => `Trip ${trip.tripNumber} (${formatTimeLabel(trip.time)}): ${trip.pickupPoints}`).join('\n'),
          String(bus.capacity),
          bus.status,
        ]),
      });

      document.save('school-buses-report.pdf');
    } finally {
      setIsDownloading(false);
    }
  };

  // Edit Handlers
  const openEditModal = (bus: Bus) => {
    setEditingBusId(bus.id);
    setEditFormData({
      id: bus.id,
      name: bus.name,
      capacity: String(bus.capacity),
      status: bus.status,
      driver: {
        name: bus.driver.name,
        phone: bus.driver.phone
      },
      trips: bus.trips.map(t => ({
        time: t.time,
        pickupPointIds: t.pickupPointIds || [],
        notes: t.notes || ''
      }))
    });
    setEditErrors([]);
    setActiveTab('general');
  };

  const closeEditModal = () => {
    setEditingBusId(null);
    setEditFormData(null);
    setEditErrors([]);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(current => current ? { ...current, [name]: value } : null);
  };

  const handleDriverChange = (field: 'name' | 'phone', value: string) => {
    setEditFormData(current => current ? {
      ...current,
      driver: { ...current.driver, [field]: value }
    } : null);
  };

  const handleTripTimeChange = (index: number, value: string) => {
    setEditFormData(current => {
      if (!current) return null;
      const nextTrips = current.trips.map((t, idx) => idx === index ? { ...t, time: value } : t);
      return { ...current, trips: nextTrips };
    });
  };

  const handleTripNotesChange = (index: number, value: string) => {
    setEditFormData(current => {
      if (!current) return null;
      const nextTrips = current.trips.map((t, idx) => idx === index ? { ...t, notes: value } : t);
      return { ...current, trips: nextTrips };
    });
  };

  const addPickupPoint = (tripIndex: number, placeId: string) => {
    setEditFormData(current => {
      if (!current) return null;
      const nextTrips = current.trips.map((t, idx) => {
        if (idx !== tripIndex) return t;
        const currentIds = t.pickupPointIds || [];
        return { ...t, pickupPointIds: [...currentIds, placeId] };
      });
      return { ...current, trips: nextTrips };
    });
  };

  const removePickupPoint = (tripIndex: number, placeIdx: number) => {
    setEditFormData(current => {
      if (!current) return null;
      const nextTrips = current.trips.map((t, idx) => {
        if (idx !== tripIndex) return t;
        const currentIds = t.pickupPointIds || [];
        return { ...t, pickupPointIds: currentIds.filter((_, pIdx) => pIdx !== placeIdx) };
      });
      return { ...current, trips: nextTrips };
    });
  };

  const movePickupPoint = (tripIndex: number, placeIdx: number, direction: 'up' | 'down') => {
    setEditFormData(current => {
      if (!current) return null;
      const nextTrips = current.trips.map((t, idx) => {
        if (idx !== tripIndex) return t;
        const currentIds = [...(t.pickupPointIds || [])];
        const swapIdx = direction === 'up' ? placeIdx - 1 : placeIdx + 1;
        if (swapIdx < 0 || swapIdx >= currentIds.length) return t;
        const temp = currentIds[placeIdx];
        currentIds[placeIdx] = currentIds[swapIdx];
        currentIds[swapIdx] = temp;
        return { ...t, pickupPointIds: currentIds };
      });
      return { ...current, trips: nextTrips };
    });
  };

  const handleAddTripSlot = () => {
    setEditFormData(current => {
      if (!current) return null;
      return {
        ...current,
        trips: [...current.trips, { time: '07:00', pickupPointIds: [], notes: '' }]
      };
    });
  };

  const handleRemoveTripSlot = (index: number) => {
    setEditFormData(current => {
      if (!current) return null;
      const nextTrips = current.trips.filter((_, idx) => idx !== index);
      return { ...current, trips: nextTrips };
    });
  };

  const handleSaveEdit = async () => {
    if (!editFormData || !editingBusId) return;

    const errors = [];
    if (!editFormData.name.trim()) errors.push('Bus name is required.');
    if (Number(editFormData.capacity) <= 0) errors.push('Capacity must be greater than zero.');
    if (editFormData.trips.length === 0) errors.push('Add at least one trip.');
    
    editFormData.trips.forEach((t, idx) => {
      if (!t.time) errors.push(`Trip ${idx + 1}: time is required.`);
      if (t.pickupPointIds.length === 0) errors.push(`Trip ${idx + 1}: Add at least one pickup point.`);
    });

    if (errors.length > 0) {
      setEditErrors(errors);
      return;
    }

    try {
      const res = await fetch(`/api/buses/${editingBusId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name.trim(),
          capacity: Number(editFormData.capacity),
          status: editFormData.status,
          driver: editFormData.driver,
          trips: editFormData.trips
        })
      });
      const result = await res.json();
      if (!result.success) {
        setEditErrors([result.message || 'Update failed.']);
        return;
      }
      closeEditModal();
      loadBuses();
    } catch (err) {
      setEditErrors(['Failed to save changes.']);
    }
  };

  // Delete Handlers
  const handleDeleteBus = (busId: string) => {
    setDeletingBusId(busId);
  };

  const confirmDeleteBus = async () => {
    if (!deletingBusId) return;
    try {
      const res = await fetch(`/api/buses/${deletingBusId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) {
        alert(result.message);
        return;
      }
      setDeletingBusId(null);
      loadBuses();
    } catch (err) {
      alert('Delete failed.');
    }
  };

  // Trip Overview Modal
  const openTripOverviewModal = (bus: Bus) => {
    setSelectedBusForTripsId(bus.id);
    setShowTripOverviewModal(true);
  };

  const closeTripOverviewModal = () => {
    setSelectedBusForTripsId(null);
    setShowTripOverviewModal(false);
  };

  const selectedBusForTrips = useMemo(() => {
    return buses.find(b => b.id === selectedBusForTripsId);
  }, [buses, selectedBusForTripsId]);

  // Filters
  const filteredBuses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const driverTerm = driverFilter.trim().toLowerCase();

    return buses.filter((bus) => {
      const matchesSearch =
        term === '' ||
        bus.id.toLowerCase().includes(term) ||
        bus.name.toLowerCase().includes(term) ||
        bus.driver.name.toLowerCase().includes(term) ||
        bus.trips.some(t => t.pickupPoints.toLowerCase().includes(term));

      const matchesStatus = statusFilter === 'All' || bus.status === statusFilter;
      const matchesDriver = driverTerm === '' || bus.driver.name.toLowerCase().includes(driverTerm);

      return matchesSearch && matchesStatus && matchesDriver;
    });
  }, [buses, searchTerm, statusFilter, driverFilter]);

  const downloadLearnersPDF = async (bus: Bus, trip: any) => {
    try {
      // Fetch students for trip details
      const response = await fetch('/api/students');
      const resJson = await response.json();
      if (!resJson.success) return;

      const roster = resJson.data.filter((student: any) => student.busAssigned === bus.id);

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
      document.text(`Stops: ${trip.pickupPoints || 'Not specified'}`, 14, 44);
      document.text(`Generated on ${new Date().toLocaleString()}`, 14, 50);

      autoTable(document, {
        startY: 56,
        head: [['Admission Number', 'Student Name', 'Grade', 'Parent Contact']],
        body: roster.map((s: any) => [s.admissionNumber, s.fullName, s.grade, s.parentContact]),
      });

      document.save(`${bus.id}-trip${trip.tripNumber}-roster.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm text-gray-800 dark:text-gray-100">
      {/* Secondary Nav */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <Link href="/" className="hover:underline text-gray-500 dark:text-gray-400">Home</Link>
        <Link href="/students" className="hover:underline text-gray-500 dark:text-gray-400">All Students</Link>
        <Link href="/students/approved" className="hover:underline text-gray-500 dark:text-gray-400">Students</Link>
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Bus</span>
        <Link href="/zones" className="hover:underline text-gray-500 dark:text-gray-400">Zones</Link>
        <Link href="/driver/login" className="hover:underline text-gray-500 dark:text-gray-400">Driver Portal</Link>
      </div>

      <div className="p-6 m-4 bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-light text-gray-800 dark:text-gray-100">
              Transport: <span className="font-semibold text-gray-600 dark:text-gray-300">Buses List</span>
            </h1>
            <div ref={searchContainerRef}>
              {showSearchBar ? (
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search bus, driver, or pickup points..."
                  className="w-80 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs"
                />
              ) : (
                <button
                  onClick={() => setShowSearchBar(true)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-300 dark:border-gray-600 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/25"
                  title="Search"
                >
                  <Search size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-300 dark:border-gray-600 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/25"
              title="Filters"
            >
              <Filter size={14} />
            </button>
            <button
              onClick={handleDownloadReport}
              disabled={isDownloading || buses.length === 0}
              className="flex items-center space-x-1 border border-gray-300 dark:border-gray-600 text-teal-700 hover:bg-teal-50 px-3 py-1 rounded text-xs disabled:text-gray-400"
            >
              <span>{isDownloading ? 'Downloading...' : 'Report'}</span>
              <Download size={14} />
            </button>
            {canManage && (
              <Link
                href="/buses/add"
                className="flex items-center space-x-1 bg-teal-700 hover:bg-teal-800 text-white px-3 py-1 rounded text-xs font-semibold"
              >
                <Plus size={14} /> <span>Add Bus</span>
              </Link>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800/40">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-500 dark:text-gray-400 mb-1 text-xs">Driver Name</label>
                <input
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-gray-500 dark:text-gray-400 mb-1 text-xs">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Out of Service">Out of Service</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDriverFilter('');
                    setStatusFilter('All');
                    setSearchTerm('');
                  }}
                  className="text-teal-700 hover:underline text-xs"
                >
                  Reset filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                <th className="font-normal py-3 px-4 w-28">Number Plate</th>
                <th className="font-normal py-3 px-4">Description</th>
                <th className="font-normal py-3 px-4">Trip Pickup Points</th>
                <th className="font-normal py-3 px-4">Driver</th>
                <th className="font-normal py-3 px-4">Trips / Time</th>
                <th className="font-normal py-3 px-4 text-right">Capacity</th>
                <th className="font-normal py-3 px-4">Status</th>
                {canManage && <th className="font-normal py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredBuses.map((bus) => (
                <tr key={bus.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-colors">
                  <td 
                    onClick={() => openTripOverviewModal(bus)}
                    className="py-3 px-4 text-teal-700 font-semibold cursor-pointer hover:underline"
                  >
                    {bus.id}
                  </td>
                  <td className="py-3 px-4 font-medium">{bus.name}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300 max-w-sm">
                    {bus.trips && bus.trips.length > 0 ? (
                      <div className="space-y-1">
                        {bus.trips.map((t) => (
                          <div key={t.tripNumber}>
                            <span className="font-semibold">T{t.tripNumber}:</span> {t.pickupPoints || 'No places'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      'No trips assigned'
                    )}
                  </td>
                  <td className="py-3 px-4">{bus.driver.name || 'Not assigned'}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                    {bus.trips && bus.trips.map(t => (
                      <div key={t.tripNumber}>Trip {t.tripNumber}: {formatTimeLabel(t.time)}</div>
                    ))}
                  </td>
                  <td className="py-3 px-4 text-right">{bus.capacity}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      bus.status === 'Active' ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400'
                    }`}>
                      {bus.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="py-3 px-4 text-right space-x-2">
                      <Link href={`/tracking?bus=${bus.id}`} className="text-teal-700 hover:text-teal-950 inline-block mr-1" title="Track GPS">
                        <Map size={14} className="inline" />
                      </Link>
                      <button onClick={() => openEditModal(bus)} className="text-teal-700 hover:text-teal-900">
                        <Pencil size={14} className="inline" />
                      </button>
                      {canDelete && (
                        <button onClick={() => handleDeleteBus(bus.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 size={14} className="inline" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Bus Modal */}
      {editingBusId && editFormData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded w-full max-w-4xl max-h-[90vh] flex flex-col shadow-lg">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Update Bus Card: {editingBusId}</h2>
              <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>

            <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 flex space-x-6 text-gray-500 text-xs">
              <button onClick={() => setActiveTab('general')} className={activeTab === 'general' ? 'font-semibold text-teal-700 border-b-2 border-teal-700 pb-1' : 'hover:text-teal-700'}>General Info</button>
              <button onClick={() => setActiveTab('trips')} className={activeTab === 'trips' ? 'font-semibold text-teal-700 border-b-2 border-teal-700 pb-1' : 'hover:text-teal-700'}>Trip Sequence &amp; Places</button>
              <button onClick={() => setActiveTab('driver')} className={activeTab === 'driver' ? 'font-semibold text-teal-700 border-b-2 border-teal-700 pb-1' : 'hover:text-teal-700'}>Driver Info</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {editErrors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/40 p-3 rounded text-red-700 dark:text-red-400 text-xs">
                  {editErrors.map(err => <p key={err}>{err}</p>)}
                </div>
              )}

              {activeTab === 'general' && (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-500 mb-1">Bus Name</label>
                    <input name="name" value={editFormData.name} onChange={handleEditChange} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900" />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Capacity</label>
                    <input type="number" name="capacity" value={editFormData.capacity} onChange={handleEditChange} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900" />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Status</label>
                    <select name="status" value={editFormData.status} onChange={handleEditChange} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                      <option value="Active">Active</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Out of Service">Out of Service</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'driver' && (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-500 mb-1">Driver Name</label>
                    <input value={editFormData.driver.name} onChange={(e) => handleDriverChange('name', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900" />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Driver Phone</label>
                    <input value={editFormData.driver.phone} onChange={(e) => handleDriverChange('phone', e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900" />
                  </div>
                </div>
              )}

              {activeTab === 'trips' && (
                <div className="space-y-4">
                  {editFormData.trips.map((trip, idx) => (
                    <div key={idx} className="border border-gray-200 dark:border-gray-700 p-4 rounded-sm">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">Trip {idx + 1}</h4>
                        <button type="button" onClick={() => handleRemoveTripSlot(idx)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-xs">
                        <div>
                          <label className="block text-gray-500 mb-1">Time</label>
                          <input type="time" value={trip.time} onChange={(e) => handleTripTimeChange(idx, e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900" />
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">Notes</label>
                          <input value={trip.notes} onChange={(e) => handleTripNotesChange(idx, e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900" />
                        </div>
                      </div>

                      {/* Pickup Points Selector list */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400">Pickup Points Sequence</label>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto mb-3">
                          {trip.pickupPointIds.map((placeId, pIdx) => {
                            const place = places.find(p => p.id === placeId);
                            return (
                              <div key={`${placeId}-${pIdx}`} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2 border border-gray-200 dark:border-gray-700 rounded text-[11px]">
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  {pIdx + 1}. {place?.placeName || 'Unknown Place'} <span className="text-gray-400 text-[10px]">({place?.zoneName || ''})</span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={pIdx === 0}
                                    onClick={() => movePickupPoint(idx, pIdx, 'up')}
                                    className="px-1 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/25 disabled:text-gray-300 text-[10px]"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    disabled={pIdx === trip.pickupPointIds.length - 1}
                                    onClick={() => movePickupPoint(idx, pIdx, 'down')}
                                    className="px-1 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/25 disabled:text-gray-300 text-[10px]"
                                  >
                                    ▼
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removePickupPoint(idx, pIdx)}
                                    className="p-0.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/25 rounded"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {trip.pickupPointIds.length === 0 && (
                            <p className="text-xs text-gray-400 italic">No pickup points added yet.</p>
                          )}
                        </div>

                        <div className="flex gap-2 items-center">
                          <select
                            id={`modal-add-place-${idx}`}
                            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            defaultValue=""
                          >
                            <option value="">— Add place stop —</option>
                            {places.map(p => (
                              <option key={p.id} value={p.id}>{p.placeName} ({p.zoneName})</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const select = document.getElementById(`modal-add-place-${idx}`) as HTMLSelectElement;
                              if (select && select.value) {
                                addPickupPoint(idx, select.value);
                                select.value = "";
                              }
                            }}
                            className="bg-teal-700 hover:bg-teal-800 text-white px-2 py-1 rounded text-xs font-semibold"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button type="button" onClick={handleAddTripSlot} className="flex items-center gap-1 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/25 px-2 py-1 rounded">
                    <Plus size={14} /> <span>Add Trip</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
              <button onClick={closeEditModal} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 text-xs font-medium bg-white dark:bg-transparent">Cancel</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-medium">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBusId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Bus Vehicle</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">Are you sure you want to delete bus no. <span className="font-semibold">{deletingBusId}</span>? This action is permanent.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingBusId(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 text-xs font-medium">Cancel</button>
              <button onClick={confirmDeleteBus} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Overview Modal */}
      {showTripOverviewModal && selectedBusForTrips && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded w-full max-w-2xl shadow-lg">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bus {selectedBusForTrips.id}: Trips</h2>
              <button onClick={closeTripOverviewModal} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {selectedBusForTrips.trips && selectedBusForTrips.trips.map(trip => (
                <div key={trip.tripNumber} className="border border-gray-200 dark:border-gray-700 p-4 rounded flex items-center justify-between bg-gray-50 dark:bg-gray-950/20">
                  <div>
                    <h3 className="font-semibold text-teal-700 cursor-pointer hover:underline text-sm" onClick={() => router.push(`/buses/${selectedBusForTrips.id}/trips/${trip.tripNumber}`)}>
                      Trip {trip.tripNumber}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Time: {formatTimeLabel(trip.time)}</p>
                    <p className="text-[11px] text-gray-500">Stops: {trip.pickupPoints || 'None'}</p>
                  </div>
                  <button
                    onClick={() => downloadLearnersPDF(selectedBusForTrips, trip)}
                    className="flex items-center gap-1 border border-teal-700 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/20 px-3 py-1 rounded text-xs"
                  >
                    <Download size={12} /> Print Roster
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
