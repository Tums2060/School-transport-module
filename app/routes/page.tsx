'use client';

import { useEffect, useMemo, useState } from 'react';

type AppRoute = {
  id: string;
  routeName: string;
  routeCode: string;
  busAssigned: string | null;
  driverAssigned: string | null;
  driverName: string | null;
  status: 'Active' | 'Inactive';
  pickupTime: string;
  dropoffTime: string;
  distance: string;
  estimatedDuration: string;
  studentsAssigned: number;
  stops: Array<{
    stopNumber: number;
    stopName: string;
    location: string;
    time: string;
    studentsCount: number;
  }>;
  createdAt: string;
  lastUpdated: string;
  isActive: boolean;
  notes?: string;
};

type Bus = {
  id: string;
  busNumber: string;
  driverName?: string;
};

type SessionUser = {
  role?: string;
  fullName?: string;
  username?: string;
};

const emptyForm = {
  routeName: '',
  routeCode: '',
  busAssigned: '',
  status: 'Active' as 'Active' | 'Inactive',
  pickupTime: '',
  dropoffTime: '',
  distance: '',
  estimatedDuration: '',
  notes: '',
};

export default function RoutesPage() {
  const [routes, setRoutes] = useState<AppRoute[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const canManageRoutes = role === 'superior_Admin';
  const canExportRoutes = role === 'superior_Admin' || role === 'Admin';

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (session) {
      try {
        const user: SessionUser = JSON.parse(session);
        setRole(user.role || '');
      } catch {
        setRole('');
      }
    }

    async function loadData() {
      try {
        const [routesRes, busesRes] = await Promise.all([
          fetch('/api/routes'),
          fetch('/api/buses'),
        ]);

        const routesResult = await routesRes.json();
        const busesResult = await busesRes.json();

        if (routesResult.success) {
          setRoutes(routesResult.data);
        }

        if (busesResult.success) {
          setBuses(busesResult.data);
        }
      } catch (error) {
        console.error('Failed to load routes page data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const busMap = useMemo(() => {
    const map = new Map<string, Bus>();
    buses.forEach((bus) => map.set(bus.id, bus));
    return map;
  }, [buses]);

  const filteredRoutes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return routes;
    }

    return routes.filter((route) => {
      const bus = route.busAssigned ? busMap.get(route.busAssigned) : null;
      return (
        route.routeName.toLowerCase().includes(term) ||
        route.routeCode.toLowerCase().includes(term) ||
        route.status.toLowerCase().includes(term) ||
        (route.driverName || '').toLowerCase().includes(term) ||
        (bus?.busNumber || '').toLowerCase().includes(term)
      );
    });
  }, [routes, search, busMap]);

  const openCreate = () => {
    setEditingRouteId(null);
    setForm(emptyForm);
    setIsEditorOpen(true);
  };

  const openEdit = (route: AppRoute) => {
    setEditingRouteId(route.id);
    setForm({
      routeName: route.routeName,
      routeCode: route.routeCode,
      busAssigned: route.busAssigned || '',
      status: route.status,
      pickupTime: route.pickupTime,
      dropoffTime: route.dropoffTime,
      distance: route.distance,
      estimatedDuration: route.estimatedDuration,
      notes: route.notes || '',
    });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingRouteId(null);
    setForm(emptyForm);
  };

  const saveRoute = async () => {
    if (!canManageRoutes) {
      return;
    }

    const bus = form.busAssigned ? busMap.get(form.busAssigned) : null;

    const payload = {
      actorRole: role,
      route: {
        routeName: form.routeName,
        routeCode: form.routeCode,
        busAssigned: form.busAssigned || null,
        driverAssigned: null,
        driverName: bus?.driverName || null,
        status: form.status,
        pickupTime: form.pickupTime,
        dropoffTime: form.dropoffTime,
        distance: form.distance,
        estimatedDuration: form.estimatedDuration,
        notes: form.notes,
      },
    };

    const url = editingRouteId ? `/api/routes/${editingRouteId}` : '/api/routes';
    const method = editingRouteId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!result.success) {
      alert(result.message || 'Failed to save route');
      return;
    }

    const refreshed = await fetch('/api/routes');
    const refreshedResult = await refreshed.json();
    if (refreshedResult.success) {
      setRoutes(refreshedResult.data);
    }

    closeEditor();
  };

  const exportAsExcel = () => {
    const header = ['Route Code', 'Route Name', 'Bus', 'Driver', 'Pickup', 'Dropoff', 'Status', 'Distance'];
    const rows = filteredRoutes.map((route) => {
      const bus = route.busAssigned ? busMap.get(route.busAssigned)?.busNumber || '' : '';
      return [
        route.routeCode,
        route.routeName,
        bus,
        route.driverName || '',
        route.pickupTime,
        route.dropoffTime,
        route.status,
        route.distance,
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'routes-export.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportAsWord = () => {
    const tableRows = filteredRoutes
      .map((route) => {
        const bus = route.busAssigned ? busMap.get(route.busAssigned)?.busNumber || '-' : '-';
        return `<tr>
          <td>${route.routeCode}</td>
          <td>${route.routeName}</td>
          <td>${bus}</td>
          <td>${route.driverName || '-'}</td>
          <td>${route.pickupTime}</td>
          <td>${route.dropoffTime}</td>
          <td>${route.status}</td>
          <td>${route.distance}</td>
        </tr>`;
      })
      .join('');

    const html = `
      <html>
      <head><meta charset="utf-8"><title>Routes Export</title></head>
      <body>
        <h2>Routes Export</h2>
        <table border="1" cellspacing="0" cellpadding="6">
          <thead>
            <tr>
              <th>Route Code</th>
              <th>Route Name</th>
              <th>Bus</th>
              <th>Driver</th>
              <th>Pickup</th>
              <th>Dropoff</th>
              <th>Status</th>
              <th>Distance</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'routes-export.doc';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportAsPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return;
    }

    const rows = filteredRoutes
      .map((route) => {
        const bus = route.busAssigned ? busMap.get(route.busAssigned)?.busNumber || '-' : '-';
        return `<tr>
          <td>${route.routeCode}</td>
          <td>${route.routeName}</td>
          <td>${bus}</td>
          <td>${route.driverName || '-'}</td>
          <td>${route.pickupTime}</td>
          <td>${route.dropoffTime}</td>
          <td>${route.status}</td>
          <td>${route.distance}</td>
        </tr>`;
      })
      .join('');

    printWindow.document.write(`
      <html>
      <head>
        <title>Routes PDF Export</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #999; padding: 8px; font-size: 12px; text-align: left; }
          h2 { margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <h2>Routes Export</h2>
        <table>
          <thead>
            <tr>
              <th>Route Code</th>
              <th>Route Name</th>
              <th>Bus</th>
              <th>Driver</th>
              <th>Pickup</th>
              <th>Dropoff</th>
              <th>Status</th>
              <th>Distance</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-[#f3f2f1] dark:bg-gray-900">
      <main className="max-w-screen-2xl mx-auto px-6 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Routes</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Create, set, edit, and export route schedules</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManageRoutes && (
              <button
                onClick={openCreate}
                className="px-3 py-1.5 text-sm rounded bg-[#0078d4] hover:bg-[#106ebe] text-white"
              >
                New Route
              </button>
            )}
            {canExportRoutes && (
              <>
                <button onClick={exportAsPdf} className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">PDF</button>
                <button onClick={exportAsWord} className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">Word</button>
                <button onClick={exportAsExcel} className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">Excel</button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-semibold">{filteredRoutes.length}</span> of <span className="font-semibold">{routes.length}</span> routes
            </p>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search route code, name, status, bus, driver"
              className="w-full max-w-md px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          {loading ? (
            <div className="p-8 text-sm text-gray-600 dark:text-gray-300">Loading routes...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Code</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Route Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Bus</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Driver</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Pickup</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Dropoff</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Distance</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRoutes.map((route) => {
                    const bus = route.busAssigned ? busMap.get(route.busAssigned) : null;
                    return (
                      <tr key={route.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{route.routeCode}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{route.routeName}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{bus?.busNumber || '-'}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{route.driverName || '-'}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{route.pickupTime}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{route.dropoffTime}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{route.distance}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${route.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
                            {route.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {canManageRoutes ? (
                            <button
                              onClick={() => openEdit(route)}
                              className="px-2.5 py-1 text-xs rounded bg-[#0078d4] hover:bg-[#106ebe] text-white"
                            >
                              Edit
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">Read-only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {isEditorOpen && canManageRoutes && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {editingRouteId ? 'Edit Route' : 'Create Route'}
              </h2>
              <button onClick={closeEditor} className="text-sm text-gray-600 dark:text-gray-300">Close</button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Route Name</label>
                <input value={form.routeName} onChange={(e) => setForm((p) => ({ ...p, routeName: e.target.value }))} className="w-full px-2.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Route Code</label>
                <input value={form.routeCode} onChange={(e) => setForm((p) => ({ ...p, routeCode: e.target.value }))} className="w-full px-2.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Assigned Bus</label>
                <select value={form.busAssigned} onChange={(e) => setForm((p) => ({ ...p, busAssigned: e.target.value }))} className="w-full px-2.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                  <option value="">None</option>
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>{bus.busNumber}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as 'Active' | 'Inactive' }))} className="w-full px-2.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pickup Time</label>
                <input value={form.pickupTime} onChange={(e) => setForm((p) => ({ ...p, pickupTime: e.target.value }))} className="w-full px-2.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dropoff Time</label>
                <input value={form.dropoffTime} onChange={(e) => setForm((p) => ({ ...p, dropoffTime: e.target.value }))} className="w-full px-2.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Distance</label>
                <input value={form.distance} onChange={(e) => setForm((p) => ({ ...p, distance: e.target.value }))} className="w-full px-2.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Estimated Duration</label>
                <input value={form.estimatedDuration} onChange={(e) => setForm((p) => ({ ...p, estimatedDuration: e.target.value }))} className="w-full px-2.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className="w-full px-2.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button onClick={closeEditor} className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">Cancel</button>
              <button onClick={saveRoute} className="px-3 py-1.5 text-sm rounded bg-[#0078d4] hover:bg-[#106ebe] text-white">Save Route</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
