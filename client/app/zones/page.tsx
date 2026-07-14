'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Check, X, Search, ShieldAlert, AlertTriangle } from 'lucide-react';

type Place = {
  id: string;
  placeName: string;
  zoneId: string;
  zoneName: string;
};

type Zone = {
  id: string;
  zoneName: string;
  oneWayFare: number;
  twoWayFare: number;
  isCatchAll: boolean;
  status: string;
  places: Array<{ id: string; placeName: string }>;
};

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [role, setRole] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Zone Form Modal State
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [zoneForm, setZoneForm] = useState({
    zoneName: '',
    oneWayFare: '',
    twoWayFare: '',
    status: 'Active'
  });
  const [zoneErrors, setZoneErrors] = useState<string[]>([]);

  // Place Form Modal State
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [placeForm, setPlaceForm] = useState({
    placeName: '',
    zoneId: ''
  });
  const [placeErrors, setPlaceErrors] = useState<string[]>([]);

  const canManage = role === 'superior_Admin' || role === 'Admin';
  const canDelete = role === 'superior_Admin';

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
      setIsMounted(true);
    });
  }, []);

  async function loadData() {
    try {
      const [zonesRes, placesRes] = await Promise.all([
        fetch('/api/zones'),
        fetch('/api/places')
      ]);
      const zonesJson = await zonesRes.json();
      const placesJson = await placesRes.json();

      if (zonesJson.success) setZones(zonesJson.data);
      if (placesJson.success) setPlaces(placesJson.data);
    } catch (err) {
      console.error('Error loading zones data:', err);
    }
  }

  useEffect(() => {
    if (isMounted) {
      loadData();
    }
  }, [isMounted]);

  // Filters
  const filteredZones = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return zones;

    return zones.filter(zone => {
      const matchZone = zone.zoneName.toLowerCase().includes(term);
      const matchPlaces = zone.places.some(p => p.placeName.toLowerCase().includes(term));
      return matchZone || matchPlaces;
    });
  }, [zones, searchTerm]);

  // Zone Handlers
  function openZoneCreate() {
    setEditingZone(null);
    setZoneForm({ zoneName: '', oneWayFare: '', twoWayFare: '', status: 'Active' });
    setZoneErrors([]);
    setIsZoneModalOpen(true);
  }

  function openZoneEdit(zone: Zone) {
    setEditingZone(zone);
    setZoneForm({
      zoneName: zone.zoneName,
      oneWayFare: String(zone.oneWayFare),
      twoWayFare: String(zone.twoWayFare),
      status: zone.status
    });
    setZoneErrors([]);
    setIsZoneModalOpen(true);
  }

  async function handleZoneSubmit() {
    const errors = [];
    if (!zoneForm.zoneName.trim()) {
      errors.push('Zone name is required.');
    }
    const oFare = Number(zoneForm.oneWayFare);
    const tFare = Number(zoneForm.twoWayFare);
    if (Number.isNaN(oFare) || oFare < 0) errors.push('One-way fare must be a valid number.');
    if (Number.isNaN(tFare) || tFare < 0) errors.push('Two-way fare must be a valid number.');

    if (errors.length > 0) {
      setZoneErrors(errors);
      return;
    }

    try {
      const url = editingZone ? `/api/zones/${editingZone.id}` : '/api/zones';
      const method = editingZone ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneName: zoneForm.zoneName,
          oneWayFare: oFare,
          twoWayFare: tFare,
          status: zoneForm.status
        })
      });
      const result = await res.json();
      if (!result.success) {
        setZoneErrors([result.message || 'Operation failed.']);
        return;
      }
      setIsZoneModalOpen(false);
      loadData();
    } catch (err) {
      setZoneErrors(['Network error. Please try again.']);
    }
  }

  async function handleZoneDelete(zone: Zone) {
    if (zone.isCatchAll) {
      alert('The Catch-All Zone cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete zone "${zone.zoneName}"? Any places in this zone will be re-assigned to the Catch-All zone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/zones/${zone.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) {
        alert(result.message);
        return;
      }
      loadData();
    } catch (err) {
      alert('Failed to delete zone.');
    }
  }

  // Place Handlers
  function openPlaceCreate() {
    setEditingPlace(null);
    // Find catch-all zone to select by default
    const catchAll = zones.find(z => z.isCatchAll);
    setPlaceForm({
      placeName: '',
      zoneId: catchAll ? catchAll.id : (zones[0]?.id || '')
    });
    setPlaceErrors([]);
    setIsPlaceModalOpen(true);
  }

  function openPlaceEdit(p: Place) {
    setEditingPlace(p);
    setPlaceForm({
      placeName: p.placeName,
      zoneId: p.zoneId
    });
    setPlaceErrors([]);
    setIsPlaceModalOpen(true);
  }

  async function handlePlaceSubmit() {
    const errors = [];
    if (!placeForm.placeName.trim()) {
      errors.push('Place name is required.');
    }
    if (!placeForm.zoneId) {
      errors.push('Please select a Zone.');
    }

    // Client-side unique check (excluding current place if editing)
    const isDuplicate = places.some(p => 
      p.placeName.toLowerCase() === placeForm.placeName.trim().toLowerCase() && 
      (!editingPlace || p.id !== editingPlace.id)
    );

    if (isDuplicate) {
      errors.push('Place name already exists. Place names must be globally unique.');
    }

    if (errors.length > 0) {
      setPlaceErrors(errors);
      return;
    }

    try {
      const url = editingPlace ? `/api/places/${editingPlace.id}` : '/api/places';
      const method = editingPlace ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeName: placeForm.placeName.trim(),
          zoneId: placeForm.zoneId
        })
      });
      const result = await res.json();
      if (!result.success) {
        setPlaceErrors([result.message || 'Operation failed.']);
        return;
      }
      setIsPlaceModalOpen(false);
      loadData();
    } catch (err) {
      setPlaceErrors(['Network error. Please try again.']);
    }
  }

  async function handlePlaceDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete place "${name}"?`)) return;

    try {
      const res = await fetch(`/api/places/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) {
        alert(result.message);
        return;
      }
      loadData();
    } catch (err) {
      alert('Failed to delete place.');
    }
  }

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm flex items-center justify-center">
        <span className="text-gray-500">Loading...</span>
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
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Zones</span>
        <Link href="/driver/login" className="hover:underline text-gray-500 dark:text-gray-400">Driver Portal</Link>
      </div>

      <div className="p-6 m-4 bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-light text-gray-800 dark:text-gray-100">
              Transport: <span className="font-semibold text-gray-600 dark:text-gray-300">Zones &amp; Places</span>
            </h1>
            <div className="relative">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search zones or places..."
                className="w-60 border border-gray-300 dark:border-gray-600 rounded-sm px-3 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 pl-8 text-xs"
              />
              <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
            </div>
          </div>

          {canManage && (
            <div className="flex gap-2">
              <button
                onClick={openZoneCreate}
                className="flex items-center gap-1 bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 rounded text-xs font-medium"
              >
                <Plus size={14} /> New Zone
              </button>
              <button
                onClick={openPlaceCreate}
                className="flex items-center gap-1 border border-teal-700 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 px-3 py-1.5 rounded text-xs font-medium"
              >
                <Plus size={14} /> New Place
              </button>
            </div>
          )}
        </div>

        {/* Zones Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredZones.map((zone) => (
            <div 
              key={zone.id} 
              className={`border rounded-sm shadow-xs p-5 flex flex-col justify-between ${
                zone.isCatchAll 
                  ? 'border-yellow-200 dark:border-yellow-900/30 bg-yellow-50/20 dark:bg-yellow-950/5' 
                  : 'border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/40'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{zone.zoneName}</h2>
                      {zone.isCatchAll && (
                        <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 px-1.5 py-0.5 rounded font-medium">Catch-All</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Fares: <span className="font-semibold text-teal-700 dark:text-teal-400">1W: KES {zone.oneWayFare}</span> | <span className="font-semibold text-teal-700 dark:text-teal-400">2W: KES {zone.twoWayFare}</span>
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    zone.status === 'Active' 
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  }`}>
                    {zone.status}
                  </span>
                </div>

                <div className="mt-4 border-t border-gray-100 dark:border-gray-700/30 pt-3">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Places / Stops ({zone.places.length})</h3>
                  {zone.places.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No places in this zone.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {zone.places.map((place) => (
                        <div 
                          key={place.id} 
                          className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded text-xs border border-gray-200/50 dark:border-gray-700/50 group hover:border-teal-500/50 transition-colors"
                        >
                          <span>{place.placeName}</span>
                          {canManage && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => openPlaceEdit({ id: place.id, placeName: place.placeName, zoneId: zone.id, zoneName: zone.zoneName })}
                                className="text-teal-700 hover:text-teal-800"
                                title="Edit Place"
                              >
                                <Pencil size={10} />
                              </button>
                              <button 
                                onClick={() => handlePlaceDelete(place.id, place.placeName)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete Place"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex justify-end gap-2 mt-5 border-t border-gray-100 dark:border-gray-700/30 pt-3">
                  <button
                    onClick={() => openZoneEdit(zone)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-teal-700"
                    title="Edit Zone"
                  >
                    <Pencil size={14} />
                  </button>
                  {!zone.isCatchAll && canDelete && (
                    <button
                      onClick={() => handleZoneDelete(zone)}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded text-red-600"
                      title="Delete Zone"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Zone Edit/Create Modal */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingZone ? 'Update Zone' : 'Create New Zone'}
            </h2>

            {zoneErrors.length > 0 && (
              <div className="mb-4 bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/40 p-3 rounded text-red-700 dark:text-red-400 text-xs">
                {zoneErrors.map(err => <p key={err}>{err}</p>)}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Zone Name</label>
                <input
                  value={zoneForm.zoneName}
                  onChange={(e) => setZoneForm(prev => ({ ...prev, zoneName: e.target.value }))}
                  disabled={editingZone?.isCatchAll}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800"
                />
                {editingZone?.isCatchAll && (
                  <p className="text-[10px] text-yellow-600 mt-1 flex items-center gap-1">
                    <ShieldAlert size={10} /> Reserved Catch-all zone name cannot be changed.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">One-Way Fare (KES)</label>
                  <input
                    type="number"
                    value={zoneForm.oneWayFare}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, oneWayFare: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Two-Way Fare (KES)</label>
                  <input
                    type="number"
                    value={zoneForm.twoWayFare}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, twoWayFare: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {!editingZone?.isCatchAll && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  <select
                    value={zoneForm.status}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-gray-100 dark:border-gray-700/30 pt-4">
              <button
                onClick={() => setIsZoneModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleZoneSubmit}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-medium"
              >
                Save Zone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Place Edit/Create Modal */}
      {isPlaceModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingPlace ? 'Update Place / Stop' : 'Create New Place / Stop'}
            </h2>

            {placeErrors.length > 0 && (
              <div className="mb-4 bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/40 p-3 rounded text-red-700 dark:text-red-400 text-xs">
                {placeErrors.map(err => <p key={err}>{err}</p>)}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Place Name</label>
                <input
                  value={placeForm.placeName}
                  onChange={(e) => setPlaceForm(prev => ({ ...prev, placeName: e.target.value }))}
                  placeholder="e.g. Ruaka Shopping Center"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Assign to Zone</label>
                <select
                  value={placeForm.zoneId}
                  onChange={(e) => setPlaceForm(prev => ({ ...prev, zoneId: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>
                      {z.zoneName} {z.isCatchAll ? '(Catch-All)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-gray-100 dark:border-gray-700/30 pt-4">
              <button
                onClick={() => setIsPlaceModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePlaceSubmit}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-medium"
              >
                Save Place
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
