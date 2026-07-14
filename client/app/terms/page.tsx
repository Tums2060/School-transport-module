'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Check, Calendar, ArrowLeft, ToggleLeft, ToggleRight } from 'lucide-react';

type Term = {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export default function TermsManagementPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [role, setRole] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  
  // Modal / Form state
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

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
    setIsMounted(true);
  }, []);

  async function loadTerms() {
    try {
      const res = await fetch('/api/terms');
      const json = await res.json();
      if (json.success) {
        setTerms(json.data);
      }
    } catch (err) {
      console.error('Error fetching terms:', err);
    }
  }

  useEffect(() => {
    if (isMounted) {
      loadTerms();
    }
  }, [isMounted]);

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const err = [];
    if (!name.trim()) err.push('Term name is required.');
    if (!startDate) err.push('Start Date is required.');
    if (!endDate) err.push('End Date is required.');
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      err.push('Start Date cannot be after End Date.');
    }

    if (err.length > 0) {
      setErrors(err);
      return;
    }

    try {
      const res = await fetch('/api/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), startDate, endDate, isActive })
      });
      const result = await res.json();
      if (!result.success) {
        setErrors([result.message || 'Failed to create term.']);
        return;
      }
      setIsOpen(false);
      setName('');
      setStartDate('');
      setEndDate('');
      setIsActive(false);
      loadTerms();
    } catch {
      setErrors(['Network connection error.']);
    }
  };

  const toggleTermActive = async (termId: string, currentActive: boolean) => {
    if (currentActive) {
      alert('You must set another term active to deactivate this one.');
      return;
    }
    if (!confirm('Are you sure you want to set this term as active? All other terms will be deactivated.')) {
      return;
    }

    try {
      const res = await fetch(`/api/terms/${termId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });
      const json = await res.json();
      if (json.success) {
        loadTerms();
      } else {
        alert(json.message);
      }
    } catch {
      alert('Failed to update term.');
    }
  };

  if (!isMounted) return null;

  if (role !== 'superior_Admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 max-w-md">Only Superior Admins have permission to manage academic term boundaries.</p>
        <Link href="/" className="mt-4 text-teal-700 hover:underline">Go to Dashboard</Link>
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
        <Link href="/driver/login" className="hover:underline text-gray-500 dark:text-gray-400">Driver Portal</Link>
      </div>

      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Link href="/" className="text-teal-700 hover:text-teal-900">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-xl font-light text-gray-800 dark:text-gray-100">
              System Settings: <span className="font-semibold text-gray-600 dark:text-gray-300">Manage Terms</span>
            </h1>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1 bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 rounded text-xs font-semibold"
          >
            <Plus size={14} /> Create Term
          </button>
        </div>

        <div className="bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40 p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="font-normal py-3 px-4">Term Name</th>
                  <th className="font-normal py-3 px-4">Start Date</th>
                  <th className="font-normal py-3 px-4">End Date</th>
                  <th className="font-normal py-3 px-4">Status</th>
                  <th className="font-normal py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((term) => (
                  <tr key={term._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-teal-50/20 transition-colors">
                    <td className="py-3 px-4 font-semibold">{term.name}</td>
                    <td className="py-3 px-4">{new Date(term.startDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{new Date(term.endDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        term.isActive
                          ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400'
                      }`}>
                        {term.isActive ? 'Active Term' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => toggleTermActive(term._id, term.isActive)}
                        className={`text-xs font-medium px-2 py-1 rounded border ${
                          term.isActive
                            ? 'border-gray-300 text-gray-400 cursor-default'
                            : 'border-teal-700 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/20'
                        }`}
                        disabled={term.isActive}
                      >
                        Set Active
                      </button>
                    </td>
                  </tr>
                ))}
                {terms.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400 italic">No academic terms defined yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Term creation modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-6 w-full max-w-md shadow-lg text-xs">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Create Academic Term</h2>

            {errors.length > 0 && (
              <div className="mb-4 bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/40 p-3 rounded text-red-700 dark:text-red-400">
                {errors.map(err => <p key={err}>{err}</p>)}
              </div>
            )}

            <form onSubmit={handleCreateTerm} className="space-y-4">
              <div>
                <label className="block text-gray-500 mb-1">Term Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Term 1 2026"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-teal-700 focus:ring-teal-500 h-4 w-4"
                />
                <label htmlFor="isActive" className="text-gray-700 dark:text-gray-300 select-none">Set as active term immediately</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/40">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded font-medium"
                >
                  Save Term
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
