'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Plus, Trash2, X } from 'lucide-react';

type Place = {
  id: string;
  placeName: string;
  zoneName: string;
};

type TripFormData = {
  time: string;
  pickupPointIds: string[];
  notes: string;
};

type FormData = {
  id: string; // Bus Number
  name: string;
  capacity: string;
  status: string;
  driver: {
    name: string;
    phone: string;
  };
  trips: TripFormData[];
};

const emptyFormData: FormData = {
  id: '',
  name: '',
  capacity: '45',
  status: 'Active',
  driver: {
    name: '',
    phone: '',
  },
  trips: [
    {
      time: '07:00',
      pickupPointIds: [],
      notes: 'Morning pick-up',
    },
  ],
};

type TabKey = 'general' | 'trips' | 'driver';

export default function AddBusPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [places, setPlaces] = useState<Place[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (session) {
      try {
        const user = JSON.parse(session);
        const userRole = user.role || '';
        setRole(userRole);
        if (userRole !== 'superior_Admin' && userRole !== 'Admin') {
          router.replace('/');
        }
      } catch {
        router.replace('/');
      }
    } else {
      router.replace('/');
    }
    setIsMounted(true);
  }, [router]);

  useEffect(() => {
    fetch('/api/places')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPlaces(d.data);
      });
  }, []);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDriverChange = (field: 'name' | 'phone', value: string) => {
    setFormData((prev) => ({
      ...prev,
      driver: { ...prev.driver, [field]: value },
    }));
  };

  const handleTripTimeChange = (index: number, value: string) => {
    setFormData((prev) => {
      const nextTrips = prev.trips.map((t, idx) =>
        idx === index ? { ...t, time: value } : t
      );
      return { ...prev, trips: nextTrips };
    });
  };

  const handleTripNotesChange = (index: number, value: string) => {
    setFormData((prev) => {
      const nextTrips = prev.trips.map((t, idx) =>
        idx === index ? { ...t, notes: value } : t
      );
      return { ...prev, trips: nextTrips };
    });
  };

  const addPickupPoint = (tripIndex: number, placeId: string) => {
    setFormData((prev) => {
      const nextTrips = prev.trips.map((t, idx) => {
        if (idx !== tripIndex) return t;
        const currentIds = t.pickupPointIds || [];
        return { ...t, pickupPointIds: [...currentIds, placeId] };
      });
      return { ...prev, trips: nextTrips };
    });
  };

  const removePickupPoint = (tripIndex: number, placeIdx: number) => {
    setFormData((prev) => {
      const nextTrips = prev.trips.map((t, idx) => {
        if (idx !== tripIndex) return t;
        const currentIds = t.pickupPointIds || [];
        return { ...t, pickupPointIds: currentIds.filter((_, pIdx) => pIdx !== placeIdx) };
      });
      return { ...prev, trips: nextTrips };
    });
  };

  const movePickupPoint = (tripIndex: number, placeIdx: number, direction: 'up' | 'down') => {
    setFormData((prev) => {
      const nextTrips = prev.trips.map((t, idx) => {
        if (idx !== tripIndex) return t;
        const currentIds = [...(t.pickupPointIds || [])];
        const swapIdx = direction === 'up' ? placeIdx - 1 : placeIdx + 1;
        if (swapIdx < 0 || swapIdx >= currentIds.length) return t;
        const temp = currentIds[placeIdx];
        currentIds[placeIdx] = currentIds[swapIdx];
        currentIds[swapIdx] = temp;
        return { ...t, pickupPointIds: currentIds };
      });
      return { ...prev, trips: nextTrips };
    });
  };

  const handleAddTripSlot = () => {
    setFormData((prev) => ({
      ...prev,
      trips: [
        ...prev.trips,
        { time: '07:00', pickupPointIds: [], notes: '' },
      ],
    }));
  };

  const handleRemoveTripSlot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      trips: prev.trips.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors([]);

    const validationErrors: string[] = [];
    if (!formData.id.trim()) validationErrors.push('Bus number is required.');
    if (!formData.name.trim()) validationErrors.push('Bus name is required.');
    if (!formData.capacity.trim() || Number(formData.capacity) <= 0) {
      validationErrors.push('Bus capacity must be a valid positive number.');
    }
    if (formData.trips.length === 0) {
      validationErrors.push('At least one trip details is required.');
    }

    formData.trips.forEach((trip, idx) => {
      if (!trip.time) validationErrors.push(`Trip ${idx + 1}: time is required.`);
      if (trip.pickupPointIds.length === 0) {
        validationErrors.push(`Trip ${idx + 1}: select at least one pickup place.`);
      }
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/buses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!result.success) {
        setErrors([result.message || 'Failed to create bus.']);
        setIsSubmitting(false);
        return;
      }
      router.push('/buses');
    } catch {
      setErrors(['Network connection error.']);
      setIsSubmitting(false);
    }
  };

  if (!isMounted || role === '') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 text-sm">Validating role permissions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm text-gray-800 dark:text-gray-100">
      {/* Secondary Nav */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <Link href="/" className="hover:underline text-gray-500 dark:text-gray-400">Home</Link>
        <Link href="/students" className="hover:underline text-gray-500 dark:text-gray-400">All Students</Link>
        <Link href="/students/approved" className="hover:underline text-gray-500 dark:text-gray-400">Students</Link>
        <Link href="/buses" className="hover:underline text-gray-500 dark:text-gray-400">Bus</Link>
        <Link href="/zones" className="hover:underline text-gray-500 dark:text-gray-400">Zones</Link>
      </div>

      <main className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Link href="/buses" className="text-teal-700 hover:text-teal-900">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-light text-gray-800 dark:text-gray-100">
            Register: <span className="font-semibold text-gray-600 dark:text-gray-300">New Bus Card</span>
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 shadow-sm rounded-sm">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 text-xs px-6 py-3 bg-gray-50/50 dark:bg-gray-900/30 gap-6">
            <button
              onClick={() => setActiveTab('general')}
              className={
                activeTab === 'general'
                  ? 'font-semibold text-teal-700 border-b-2 border-teal-700 pb-1'
                  : 'text-gray-500 hover:text-teal-700'
              }
            >
              General Information
            </button>
            <button
              onClick={() => setActiveTab('trips')}
              className={
                activeTab === 'trips'
                  ? 'font-semibold text-teal-700 border-b-2 border-teal-700 pb-1'
                  : 'text-gray-500 hover:text-teal-700'
              }
            >
              Trips Sequence &amp; Places
            </button>
            <button
              onClick={() => setActiveTab('driver')}
              className={
                activeTab === 'driver'
                  ? 'font-semibold text-teal-700 border-b-2 border-teal-700 pb-1'
                  : 'text-gray-500 hover:text-teal-700'
              }
            >
              Driver Information
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/40 p-3 rounded text-red-700 dark:text-red-400 text-xs">
                {errors.map((err) => (
                  <p key={err}>{err}</p>
                ))}
              </div>
            )}

            {activeTab === 'general' && (
              <div className="space-y-4 max-w-xl text-xs">
                <div>
                  <label className="block text-gray-500 mb-1">Bus Number (Registration No.)</label>
                  <input
                    value={formData.id}
                    onChange={(e) => handleChange('id', e.target.value)}
                    placeholder="e.g. KCA 123A"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded px-3 py-1.5 focus:outline-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Bus Name</label>
                  <input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g. Scania - Kiserian"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded px-3 py-1.5 focus:outline-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Capacity (Students)</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => handleChange('capacity', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded px-3 py-1.5 focus:outline-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded px-3 py-1.5 focus:outline-teal-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Out of Service">Out of Service</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'driver' && (
              <div className="space-y-4 max-w-xl text-xs">
                <div>
                  <label className="block text-gray-500 mb-1">Driver Full Name</label>
                  <input
                    value={formData.driver.name}
                    onChange={(e) => handleDriverChange('name', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded px-3 py-1.5 focus:outline-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Driver Phone Contact</label>
                  <input
                    value={formData.driver.phone}
                    onChange={(e) => handleDriverChange('phone', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded px-3 py-1.5 focus:outline-teal-500"
                  />
                </div>
              </div>
            )}

            {activeTab === 'trips' && (
              <div className="space-y-6">
                {formData.trips.map((trip, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 p-4 rounded bg-gray-50/30 dark:bg-transparent">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">Trip {idx + 1}</h4>
                      {formData.trips.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTripSlot(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs">
                      <div>
                        <label className="block text-gray-500 mb-1">Time</label>
                        <input
                          type="time"
                          value={trip.time}
                          onChange={(e) => handleTripTimeChange(idx, e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded px-3 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-500 mb-1">Notes</label>
                        <input
                          value={trip.notes}
                          onChange={(e) => handleTripNotesChange(idx, e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded px-3 py-1.5"
                        />
                      </div>
                    </div>

                    {/* Pickup points list */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">Pickup Points Sequence</label>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto mb-3">
                        {trip.pickupPointIds.map((placeId, pIdx) => {
                          const place = places.find((p) => p.id === placeId);
                          return (
                            <div
                              key={`${placeId}-${pIdx}`}
                              className="flex items-center justify-between bg-gray-100 dark:bg-gray-900 p-2 border border-gray-200 dark:border-gray-700 rounded text-xs"
                            >
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {pIdx + 1}. {place?.placeName || 'Unknown Place'}{' '}
                                <span className="text-gray-400 text-[10px]">
                                  ({place?.zoneName || ''})
                                </span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={pIdx === 0}
                                  onClick={() => movePickupPoint(idx, pIdx, 'up')}
                                  className="px-1 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/25 disabled:text-gray-300 text-[11px]"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={pIdx === trip.pickupPointIds.length - 1}
                                  onClick={() => movePickupPoint(idx, pIdx, 'down')}
                                  className="px-1 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/25 disabled:text-gray-300 text-[11px]"
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
                          id={`add-place-add-page-${idx}`}
                          className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                          defaultValue=""
                        >
                          <option value="">— Select a place to add —</option>
                          {places.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.placeName} ({p.zoneName})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const select = document.getElementById(
                              `add-place-add-page-${idx}`
                            ) as HTMLSelectElement;
                            if (select && select.value) {
                              addPickupPoint(idx, select.value);
                              select.value = '';
                            }
                          }}
                          className="bg-teal-700 hover:bg-teal-800 text-white px-3 py-1 rounded text-xs font-semibold"
                        >
                          Add Point
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddTripSlot}
                  className="flex items-center gap-1 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/25 px-2 py-1 rounded font-medium"
                >
                  <Plus size={16} /> <span>Add Trip</span>
                </button>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-6">
              <Link
                href="/buses"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 text-xs font-semibold bg-white dark:bg-transparent"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-semibold disabled:opacity-50"
              >
                {isSubmitting ? 'Registering...' : 'Register Bus'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
