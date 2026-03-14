'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Filter, Pencil, X } from 'lucide-react';

type Route = {
  id: string;
  routeName: string;
  places: string;
  fare: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
};

type BusTrip = {
  tripNumber: number;
  time: string;
  routeId?: string;
};

type Bus = {
  id: string;
  name: string;
  status: string;
  trips: BusTrip[];
};

const ROUTES_KEY = 'school_routes';
const BUSES_KEY = 'school_buses';

function nextRouteId(routes: Route[]) {
  const highest = routes.reduce((max, r) => {
    const num = Number(r.id.replace(/\D/g, ''));
    return Number.isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `RT${String(highest + 1).padStart(3, '0')}`;
}

const emptyForm = {
  routeName: '',
  places: '',
  fare: '',
  status: 'Active' as 'Active' | 'Inactive',
};

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [role, setRole] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const canManage = role === 'superior_Admin';

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

    try {
      const savedRoutes = localStorage.getItem(ROUTES_KEY);
      setRoutes(savedRoutes ? (JSON.parse(savedRoutes) as Route[]) : []);
    } catch {
      setRoutes([]);
    }

    try {
      const savedBuses = localStorage.getItem(BUSES_KEY);
      setBuses(savedBuses ? (JSON.parse(savedBuses) as Bus[]) : []);
    } catch {
      setBuses([]);
    }
  }, []);

  const routeBusesMap = useMemo(() => {
    const map = new Map<string, Bus[]>();
    buses.forEach((bus) => {
      const tripRouteIds = (bus.trips || []).map((t) => t.routeId).filter(Boolean) as string[];
      const seen = new Set<string>();
      tripRouteIds.forEach((rid) => {
        if (!seen.has(rid)) {
          seen.add(rid);
          const existing = map.get(rid) || [];
          map.set(rid, [...existing, bus]);
        }
      });
    });
    return map;
  }, [buses]);

  const filteredRoutes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return routes.filter((route) => {
      const matchesSearch =
        term === '' ||
        route.routeName.toLowerCase().includes(term) ||
        route.places.toLowerCase().includes(term) ||
        String(route.fare).includes(term);
      const matchesStatus = statusFilter === 'All' || route.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [routes, searchTerm, statusFilter]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!showSearchBar || !searchContainerRef.current) return;
      if (!searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchBar(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSearchBar]);

  const openCreate = () => {
    setEditingRouteId(null);
    setForm(emptyForm);
    setIsEditorOpen(true);
  };

  const openEdit = (route: Route) => {
    setEditingRouteId(route.id);
    setForm({ routeName: route.routeName, places: route.places, fare: String(route.fare), status: route.status });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingRouteId(null);
    setForm(emptyForm);
  };

  const saveRoute = () => {
    if (!canManage) return;
    if (!form.routeName.trim()) { alert('Route name is required.'); return; }
    const fareValue = Number(form.fare);
    if (Number.isNaN(fareValue) || fareValue < 0) { alert('Please enter a valid fare amount.'); return; }

    let updated: Route[];
    if (editingRouteId) {
      updated = routes.map((r) =>
        r.id === editingRouteId
          ? { ...r, routeName: form.routeName.trim(), places: form.places.trim(), fare: fareValue, status: form.status }
          : r
      );
    } else {
      const newRoute: Route = {
        id: nextRouteId(routes),
        routeName: form.routeName.trim(),
        places: form.places.trim(),
        fare: fareValue,
        status: form.status,
        createdAt: new Date().toISOString(),
      };
      updated = [...routes, newRoute];
    }

    setRoutes(updated);
    localStorage.setItem(ROUTES_KEY, JSON.stringify(updated));
    closeEditor();
  };

  const deleteRoute = (routeId: string) => {
    if (!canManage) return;
    if (!confirm('Delete this route? Buses using it will lose the route link.')) return;
    const updated = routes.filter((r) => r.id !== routeId);
    setRoutes(updated);
    localStorage.setItem(ROUTES_KEY, JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm text-gray-800 dark:text-gray-100">
      {/* Secondary module nav */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <Link href="/" className="hover:underline text-gray-500 dark:text-gray-400">Home</Link>
        <Link href="/students" className="hover:underline">Students</Link>
        <Link href="/buses" className="hover:underline">Transport Module</Link>
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Routes</span>
      </div>

      <div className="p-6 bg-white dark:bg-transparent m-4 shadow-sm border border-gray-200 dark:border-gray-700/40">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-light text-gray-800 dark:text-gray-100">
              Transport: <span className="font-semibold text-gray-600 dark:text-gray-300">Routes List</span>
            </h1>
            <div ref={searchContainerRef}>
              {showSearchBar ? (
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search route name or places"
                  className="w-80 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSearchBar(true)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-300 dark:border-gray-600 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/25"
                  title="Search"
                >
                  <Search size={16} className="text-teal-700" />
                </button>
              )}
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setShowFilters((p) => !p)}
              className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-300 dark:border-gray-600 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/25"
              title="Filters"
            >
              <Filter size={16} className="text-teal-700" />
            </button>
            {canManage && (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center space-x-1 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/25 px-3 py-1 rounded"
              >
                <Plus size={16} className="text-teal-700" /> <span>New Route</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-transparent">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-500 dark:text-gray-400 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="All">All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between mb-3 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredRoutes.length}</span> of{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{routes.length}</span> routes
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700/30 rounded-sm">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 uppercase text-xs tracking-wide">Route Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 uppercase text-xs tracking-wide">Places / Stops</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 uppercase text-xs tracking-wide">Fare (KES)</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 uppercase text-xs tracking-wide">Buses</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 uppercase text-xs tracking-wide">Status</th>
                {canManage && (
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 uppercase text-xs tracking-wide">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
              {filteredRoutes.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {routes.length === 0 ? 'No routes created yet.' : 'No routes match your search.'}
                  </td>
                </tr>
              ) : (
                filteredRoutes.map((route, idx) => {
                  const routeBuses = routeBusesMap.get(route.id) || [];
                  return (
                    <tr
                      key={route.id}
                      className={`transition-colors dark:hover:bg-teal-900/25 hover:bg-teal-50/60 ${idx % 2 === 1 ? 'bg-gray-50/60 dark:bg-white/2' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-teal-700 dark:text-teal-400">{route.routeName}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs">
                        <span className="line-clamp-2">{route.places || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {route.fare > 0 ? route.fare.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {routeBuses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {routeBuses.map((bus) => (
                              <span key={bus.id} className="inline-flex px-2 py-0.5 rounded text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300">
                                {bus.name || bus.id}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">No buses yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            route.status === 'Active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {route.status}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(route)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/30 border border-teal-200 dark:border-teal-800"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              onClick={() => deleteRoute(route.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/40"
                            >
                              <X size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      {isEditorOpen && canManage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {editingRouteId ? 'Edit Route' : 'Create Route'}
              </h2>
              <button onClick={closeEditor} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Route Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.routeName}
                  onChange={(e) => setForm((p) => ({ ...p, routeName: e.target.value }))}
                  placeholder="e.g. Kiserian Route"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Places / Stops</label>
                <textarea
                  value={form.places}
                  onChange={(e) => setForm((p) => ({ ...p, places: e.target.value }))}
                  placeholder="e.g. Kiserian Stage, Corner Baridi, Rongai Town, Langata Road, Upper Hill"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fare (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={form.fare}
                    onChange={(e) => setForm((p) => ({ ...p, fare: e.target.value }))}
                    placeholder="e.g. 3500"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as 'Active' | 'Inactive' }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={closeEditor}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveRoute}
                className="px-3 py-1.5 text-sm rounded bg-teal-700 hover:bg-teal-800 text-white"
              >
                {editingRouteId ? 'Save Changes' : 'Create Route'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
