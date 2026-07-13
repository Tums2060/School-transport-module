'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, ShieldAlert, AlertCircle } from 'lucide-react';

type ApprovalRecord = {
  id: string;
  studentId: string;
  fullName: string;
  busId: string;
  tripNumber: number;
  placeId: string;
  placeName: string;
  tripType: 'one_way' | 'two_way';
  direction: 'morning' | 'evening' | 'both';
  status: string;
};

export default function ApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [role, setRole] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (session) {
      try {
        const user = JSON.parse(session);
        const userRole = user.role || '';
        setRole(userRole);
        if (userRole !== 'superior_Admin') {
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

  async function loadApprovals() {
    try {
      const res = await fetch('/api/approvals');
      const json = await res.json();
      if (json.success) {
        setApprovals(json.data);
      }
    } catch (err) {
      console.error('Error fetching approvals:', err);
    }
  }

  useEffect(() => {
    if (isMounted && role === 'superior_Admin') {
      loadApprovals();
    }
  }, [isMounted, role]);

  const handleApprove = async (item: ApprovalRecord) => {
    setSavingId(item.id);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/approvals/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      const result = await res.json();
      if (!result.success) {
        setErrorMessage(result.message || 'Approval failed.');
        setSavingId(null);
        return;
      }
      loadApprovals();
      setSavingId(null);
    } catch (err) {
      setErrorMessage('Network connection error.');
      setSavingId(null);
    }
  };

  const handleReject = async (item: ApprovalRecord) => {
    setSavingId(item.id);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/approvals/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });
      const result = await res.json();
      if (!result.success) {
        setErrorMessage(result.message || 'Rejection failed.');
        setSavingId(null);
        return;
      }
      loadApprovals();
      setSavingId(null);
    } catch (err) {
      setErrorMessage('Network connection error.');
      setSavingId(null);
    }
  };

  if (!isMounted || role !== 'superior_Admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm flex items-center justify-center">
        <span className="text-gray-500">Authorizing Superior Admin access...</span>
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
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Approvals</span>
      </div>

      <main className="p-6">
        <h1 className="text-xl font-light text-gray-800 dark:text-gray-100 mb-6">
          Superior Admin: <span className="font-semibold text-gray-600 dark:text-gray-300">Pending Transport Requests</span>
        </h1>

        {errorMessage && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/40 p-4 rounded text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40 p-6">
          {approvals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 italic">No pending approvals remaining.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="font-normal py-3 px-4">Student Admission</th>
                    <th className="font-normal py-3 px-4">Student Name</th>
                    <th className="font-normal py-3 px-4">Assigned Bus</th>
                    <th className="font-normal py-3 px-4">Trip Number</th>
                    <th className="font-normal py-3 px-4">Assigned Place / Stop</th>
                    <th className="font-normal py-3 px-4">Trip Details</th>
                    <th className="font-normal py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-colors">
                      <td className="py-3 px-4 font-semibold">{item.studentId}</td>
                      <td className="py-3 px-4 font-medium">{item.fullName}</td>
                      <td className="py-3 px-4 text-teal-700 dark:text-teal-400">{item.busId}</td>
                      <td className="py-3 px-4">Trip {item.tripNumber}</td>
                      <td className="py-3 px-4 font-medium">{item.placeName}</td>
                      <td className="py-3 px-4 text-gray-500">
                        {item.tripType === 'two_way' ? 'Two Way' : `One Way - ${item.direction}`}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleApprove(item)}
                          disabled={savingId !== null}
                          className="bg-teal-700 hover:bg-teal-800 text-white px-2.5 py-1 rounded text-[11px] font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(item)}
                          disabled={savingId !== null}
                          className="border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5 py-1 rounded text-[11px] font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <X size={12} /> Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
