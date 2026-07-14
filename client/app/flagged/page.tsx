'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Flag, ShieldAlert, Settings, Printer, Download, Loader2, Bus } from 'lucide-react';

type FlaggedStudent = {
  studentId: string;
  fullName: string;
  grade: string;
  busNumber: string;
  tripNumber: number;
  absenteeismRate: number;
  expectedTrips: number;
  missedTrips: number;
  isFlagged: boolean;
};

type BusItem = {
  _id: string;
  busNumber: string;
};

export default function FlaggedStudentsDashboard() {
  const [students, setStudents] = useState<FlaggedStudent[]>([]);
  const [buses, setBuses] = useState<BusItem[]>([]);
  const [role, setRole] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Settings & Threshold
  const [threshold, setThreshold] = useState<number>(50);
  const [newThreshold, setNewThreshold] = useState<string>('50');
  const [showSettings, setShowSettings] = useState(false);

  // Bus-scoped Report state
  const [selectedBusNumber, setSelectedBusNumber] = useState<string>('');
  const [busReportStudents, setBusReportStudents] = useState<FlaggedStudent[]>([]);

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (session) {
      try {
        const u = JSON.parse(session);
        setRole(u.role || '');
      } catch {
        setRole('');
      }
    }
    setIsMounted(true);
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Get threshold setting
      const tRes = await fetch('/api/settings/absenteeism-threshold');
      const tJson = await tRes.json();
      if (tJson.success) {
        setThreshold(tJson.threshold);
        setNewThreshold(tJson.threshold.toString());
      }

      // Get absenteeism rates
      const aRes = await fetch('/api/attendance/absenteeism-rates');
      const aJson = await aRes.json();
      if (aJson.success) {
        setStudents(aJson.data);
      }

      // Get buses for reports
      const bRes = await fetch('/api/buses');
      const bJson = await bRes.json();
      if (bJson.success) {
        setBuses(bJson.data);
      }

    } catch (err) {
      console.error('Error loading flagged data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isMounted) {
      loadData();
    }
  }, [isMounted]);

  // Update threshold setting (Superior Admin only)
  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newThreshold);
    if (isNaN(val) || val < 0 || val > 100) {
      alert('Threshold must be a percentage between 0 and 100.');
      return;
    }

    try {
      const res = await fetch('/api/settings/absenteeism-threshold', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: val })
      });
      const json = await res.json();
      if (json.success) {
        setThreshold(json.threshold);
        setShowSettings(false);
        // Refresh absenteeism list with new threshold calculations
        loadData();
        alert(`Default absenteeism flag threshold updated to ${json.threshold}%!`);
      } else {
        alert(json.message);
      }
    } catch {
      alert('Failed to update threshold setting.');
    }
  };

  // Filter students dynamically for the selected bus
  useEffect(() => {
    if (selectedBusNumber) {
      const filtered = students.filter(s => s.busNumber === selectedBusNumber);
      setBusReportStudents(filtered);
    } else {
      setBusReportStudents([]);
    }
  }, [selectedBusNumber, students]);

  // Print bus report
  const handlePrint = () => {
    if (!selectedBusNumber) return;
    window.print();
  };

  if (!isMounted) return null;

  const flaggedList = students.filter(s => s.isFlagged);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm text-gray-800 dark:text-gray-100 print:bg-white print:text-black">
      {/* Secondary Nav (hidden on print) */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700 print:hidden">
        <Link href="/" className="hover:underline text-gray-500 dark:text-gray-400">Home</Link>
        <Link href="/students" className="hover:underline text-gray-500 dark:text-gray-400">All Students</Link>
        <Link href="/students/approved" className="hover:underline text-gray-500 dark:text-gray-400">Students</Link>
        <Link href="/buses" className="hover:underline text-gray-500 dark:text-gray-400">Bus</Link>
        <Link href="/zones" className="hover:underline text-gray-500 dark:text-gray-400">Zones</Link>
        <Link href="/driver/login" className="hover:underline text-gray-500 dark:text-gray-400">Driver Portal</Link>
      </div>

      <main className="p-6 print:p-0">
        {/* Title area */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div className="flex items-center space-x-2">
            <Link href="/" className="text-teal-700 hover:text-teal-900">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-xl font-light text-gray-800 dark:text-gray-100">
              Roster Flags: <span className="font-semibold text-gray-600 dark:text-gray-300">Flagged Students Dashboard</span>
            </h1>
          </div>

          <div className="flex gap-2">
            {role === 'superior_Admin' && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1 border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded text-xs font-semibold"
              >
                <Settings size={14} /> Threshold: {threshold}%
              </button>
            )}
          </div>
        </div>

        {/* Admin settings modal/card */}
        {showSettings && role === 'superior_Admin' && (
          <div className="bg-white dark:bg-gray-800 border border-teal-600/30 p-4 mb-6 rounded shadow-sm max-w-sm text-xs print:hidden">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
              <Settings size={13} className="text-teal-700" /> Configure Absenteeism Threshold
            </h3>
            <form onSubmit={handleUpdateThreshold} className="space-y-3">
              <div>
                <label className="block text-gray-500 mb-1">Alert Trigger Threshold (%)</label>
                <input
                  type="number"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 font-mono"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1.5 bg-teal-700 text-white rounded font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 print:hidden">
            <Loader2 className="animate-spin text-teal-700 mb-2" size={24} />
            <span className="text-xs text-gray-500">Calculating attendance rates...</span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Section 1: Chronic Absenteeism */}
            <div className="bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40 p-6 print:hidden">
              <h2 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Flag size={14} className="animate-bounce" /> Section 1: Absenteeism Alert list (Threshold: &ge;{threshold}%)
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="font-normal py-3 px-4">Student ID</th>
                      <th className="font-normal py-3 px-4">Full Name</th>
                      <th className="font-normal py-3 px-4">Grade</th>
                      <th className="font-normal py-3 px-4">Assigned Bus</th>
                      <th className="font-normal py-3 px-4">Trip Number</th>
                      <th className="font-normal py-3 px-4">Total Missed</th>
                      <th className="font-normal py-3 px-4">Absenteeism %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flaggedList.map((student) => (
                      <tr key={student.studentId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-red-50/15">
                        <td className="py-3 px-4 font-mono font-semibold">{student.studentId}</td>
                        <td className="py-3 px-4">{student.fullName}</td>
                        <td className="py-3 px-4">{student.grade}</td>
                        <td className="py-3 px-4 font-semibold">{student.busNumber}</td>
                        <td className="py-3 px-4">Trip {student.tripNumber}</td>
                        <td className="py-3 px-4 text-red-600 dark:text-red-400">
                          {student.missedTrips} / {student.expectedTrips} trips
                        </td>
                        <td className="py-3 px-4 font-bold text-red-700 dark:text-red-400">{student.absenteeismRate}%</td>
                      </tr>
                    ))}
                    {flaggedList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400 italic">No students are currently flagged for absenteeism. Good job!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Future Flag categories placeholder */}
            <div className="bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40 p-6 opacity-60 print:hidden">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldAlert size={14} /> Section 2: Fee Defaults (Placeholder)
              </h2>
              <p className="text-xs text-gray-400 italic">Future expansion to audit fee defaulters automatically based on payment portal links.</p>
            </div>

            {/* Scoped Printable Report Generator */}
            <div className="bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40 p-6 print:border-none print:shadow-none print:p-0">
              <div className="flex justify-between items-center mb-6 print:hidden">
                <div>
                  <h2 className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Bus Absenteeism Report</h2>
                  <p className="text-xs text-gray-400">Generate on-demand bus-scoped lists exportable to PDF.</p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={selectedBusNumber}
                    onChange={(e) => setSelectedBusNumber(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900"
                  >
                    <option value="">-- Select Bus --</option>
                    {buses.map(b => (
                      <option key={b._id} value={b.busNumber}>Bus: {b.busNumber}</option>
                    ))}
                  </select>

                  {selectedBusNumber && (
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-1 bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 rounded font-semibold text-xs transition-colors"
                    >
                      <Printer size={13} /> Print/PDF Report
                    </button>
                  )}
                </div>
              </div>

              {/* Printable Layout Container */}
              {selectedBusNumber ? (
                <div className="border border-gray-100 dark:border-gray-800 p-6 print:border-none">
                  {/* Print Head */}
                  <div className="hidden print:block mb-8 text-center">
                    <h1 className="text-lg font-bold text-gray-900 uppercase">School Transport Management System</h1>
                    <h2 className="text-sm font-semibold text-gray-600">Bus Attendance & Absenteeism Log</h2>
                    <p className="text-xs text-gray-400 mt-2">
                      Vehicle Plate: <strong>{selectedBusNumber}</strong> | Date Generated: {new Date().toLocaleDateString()}
                    </p>
                    <div className="border-t border-gray-200 mt-4"></div>
                  </div>

                  <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 print:block hidden">
                    Roster Details: Bus {selectedBusNumber}
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b-2 border-gray-200 text-gray-500">
                          <th className="py-2">Student ID</th>
                          <th className="py-2">Student Name</th>
                          <th className="py-2">Grade</th>
                          <th className="py-2">Trip Number</th>
                          <th className="py-2">Missed Trips</th>
                          <th className="py-2">Attendance Rate</th>
                          <th className="py-2 text-right">Flagged Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {busReportStudents.map((s) => (
                          <tr key={s.studentId} className="border-b border-gray-100 py-2">
                            <td className="py-2 font-mono font-semibold">{s.studentId}</td>
                            <td className="py-2">{s.fullName}</td>
                            <td className="py-2">{s.grade}</td>
                            <td className="py-2">Trip {s.tripNumber}</td>
                            <td className="py-2">{s.missedTrips} / {s.expectedTrips}</td>
                            <td className="py-2 font-semibold">{(100 - s.absenteeismRate).toFixed(1)}%</td>
                            <td className="py-2 text-right">
                              {s.isFlagged ? (
                                <span className="text-red-600 font-bold">⚠️ Flagged</span>
                              ) : (
                                <span className="text-green-600 font-semibold">Clear</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {busReportStudents.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-gray-400 italic">No assigned students found for Bus {selectedBusNumber}.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Print footer signature lines */}
                  <div className="hidden print:block mt-20 grid grid-cols-2 gap-12 text-xs">
                    <div className="text-center">
                      <div className="border-b border-gray-300 w-48 mx-auto mb-2"></div>
                      <span>Vehicle Driver Signature</span>
                    </div>
                    <div className="text-center">
                      <div className="border-b border-gray-300 w-48 mx-auto mb-2"></div>
                      <span>Transport Administrator Signature</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 italic print:hidden">
                  Select a vehicle plate in the dropdown above to display and print bus-scoped logs.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
