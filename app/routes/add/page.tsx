'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Trash2 } from 'lucide-react';

type Route = {
  id: string;
  routeName: string;
  places: string;
  fare: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
};

const ROUTES_KEY = 'school_routes';

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

export default function AddRoutePage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<string[]>([]);

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

  // Redirect non-superior_Admin after mount
  useEffect(() => {
    if (isMounted && role !== '' && role !== 'superior_Admin') {
      router.replace('/routes');
    }
  }, [isMounted, role, router]);

  const validate = () => {
    const next: string[] = [];
    if (!form.routeName.trim()) next.push('Route name is required.');
    const fare = Number(form.fare);
    if (form.fare !== '' && (Number.isNaN(fare) || fare < 0)) next.push('Fare must be a positive number.');
    setErrors(next);
    return next.length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    let routes: Route[] = [];
    try {
      const saved = localStorage.getItem(ROUTES_KEY);
      routes = saved ? (JSON.parse(saved) as Route[]) : [];
    } catch {
      routes = [];
    }

    const newRoute: Route = {
      id: nextRouteId(routes),
      routeName: form.routeName.trim(),
      places: form.places.trim(),
      fare: form.fare !== '' ? Number(form.fare) : 0,
      status: form.status,
      createdAt: new Date().toISOString(),
    };

    const updated = [...routes, newRoute];
    localStorage.setItem(ROUTES_KEY, JSON.stringify(updated));
    router.push('/routes');
  };

  const handleReset = () => {
    setForm(emptyForm);
    setErrors([]);
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm flex items-center justify-center">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (role !== 'superior_Admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm text-gray-800 dark:text-gray-100">
      {/* Secondary module nav */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <Link href="/" className="hover:underline text-gray-500 dark:text-gray-400">Home</Link>
        <Link href="/students" className="hover:underline">Students</Link>
        <Link href="/buses" className="hover:underline">Transport Module</Link>
        <Link href="/routes" className="hover:underline">Routes</Link>
      </div>

      <div className="max-w-2xl mx-auto mt-6 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-sm">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/routes" className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-light text-gray-800 dark:text-gray-100">New Route</h1>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-1 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/25 px-3 py-1 rounded font-medium"
            >
              <Check size={16} className="text-teal-700" />
              <span>Save</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center space-x-1 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1 rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {errors.length > 0 && (
            <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 px-4 py-3 text-red-700 dark:text-red-300 rounded">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}

          <div>
            <label className="block text-gray-500 dark:text-gray-400 mb-1 font-medium">
              Route Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.routeName}
              onChange={(e) => setForm((p) => ({ ...p, routeName: e.target.value }))}
              placeholder="e.g. Kiserian Route"
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-teal-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-gray-500 dark:text-gray-400 mb-1 font-medium">
              Places / Stops
            </label>
            <textarea
              value={form.places}
              onChange={(e) => setForm((p) => ({ ...p, places: e.target.value }))}
              placeholder="List all places and stops the route covers, e.g.&#10;Kiserian Stage, Corner Baridi, Rongai Town, Langata Road, Upper Hill Campus"
              rows={4}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-teal-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-500 dark:text-gray-400 mb-1 font-medium">
                Fare (KES)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={form.fare}
                onChange={(e) => setForm((p) => ({ ...p, fare: e.target.value }))}
                placeholder="e.g. 3500"
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-teal-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-gray-500 dark:text-gray-400 mb-1 font-medium">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as 'Active' | 'Inactive' }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-teal-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
