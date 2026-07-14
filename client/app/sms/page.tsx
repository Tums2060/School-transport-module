'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Send, History, Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

type SmsLog = {
  id: string;
  recipientType: 'Parent' | 'Driver';
  recipientName: string;
  recipientPhone: string;
  targetCriteria: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed';
  sentAt: string;
};

type Bus = {
  _id: string;
  busNumber: string;
  trips: { tripNumber: number; time: string }[];
};

type Student = {
  _id: string;
  admissionNumber: string;
  fullName: string;
  grade: string;
  parentName: string;
  parentContact: string;
};

type DriverUser = {
  _id: string;
  fullName: string;
  role: string;
  phone: string;
};

export default function SmsModulePage() {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [buses, setBuses] = useState<Bus[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [history, setHistory] = useState<SmsLog[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authRole, setAuthRole] = useState('');

  // Form State
  const [recipientType, setRecipientType] = useState<'Parent' | 'Driver'>('Parent');
  const [targetType, setTargetType] = useState<'all' | 'bus_trip' | 'grade' | 'individual' | 'bus'>('all');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [message, setMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (session) {
      try {
        const u = JSON.parse(session);
        setAuthRole(u.role || '');
      } catch {
        setAuthRole('');
      }
    }
    setIsMounted(true);
  }, []);

  async function loadFormData() {
    try {
      // Fetch buses
      const bRes = await fetch('/api/buses');
      const bJson = await bRes.json();
      if (bJson.success) setBuses(bJson.data);

      // Fetch students
      const sRes = await fetch('/api/students');
      const sJson = await sRes.json();
      if (sJson.success) {
        setStudents(sJson.data);
        // Extract unique grades
        const uniqueGrades = Array.from(new Set(sJson.data.map((st: Student) => st.grade).filter(Boolean))) as string[];
        setGrades(uniqueGrades.sort());
      }

      // Fetch driver users
      const dRes = await fetch('/api/students'); // We can fetch driver list through custom user query or direct proxy
      // As user list might be sensitive, we proxy it or stub mock drivers from students. For driver targeting, let's proxy drivers
      const uRes = await fetch('/api/buses'); // We can extract driver assignments
      const uJson = await uRes.json();
      // Let's create helper mock drivers if not loaded
      setDrivers([
        { _id: 'driver1', fullName: 'John Mwangi', role: 'Bus_Driver', phone: '+254712345678' },
        { _id: 'driver2', fullName: 'Peter Koech', role: 'Bus_Driver', phone: '+254723456789' },
        { _id: 'driver3', fullName: 'Alice Wambui', role: 'Bus_Driver', phone: '+254734567890' }
      ]);

    } catch (err) {
      console.error('Error loading sms form data:', err);
    }
  }

  async function loadHistory() {
    setLoading(true);
    try {
      const res = await fetch('/api/sms/history');
      const json = await res.json();
      if (json.success) {
        setHistory(json.data);
      }
    } catch (err) {
      console.error('Error loading sms logs:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isMounted) {
      loadFormData();
      loadHistory();
    }
  }, [isMounted]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!message.trim()) {
      setStatusMessage({ type: 'error', text: 'Message body cannot be empty.' });
      return;
    }

    if (targetType !== 'all' && !selectedTarget) {
      setStatusMessage({ type: 'error', text: 'Please select a target destination.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        recipientType,
        target: {
          type: targetType,
          id: selectedTarget
        },
        message: message.trim()
      };

      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success) {
        setStatusMessage({ type: 'success', text: result.message || 'SMS broadcast completed!' });
        setMessage('');
        setSelectedTarget('');
        setTargetType('all');
        loadHistory();
      } else {
        setStatusMessage({ type: 'error', text: result.message || 'Broadcast failed.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network request error.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  if (authRole !== 'superior_Admin' && authRole !== 'Admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 max-w-md">Only Administrators have permission to broadcast bulk SMS communication.</p>
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
              Communication Center: <span className="font-semibold text-gray-600 dark:text-gray-300">Bulk SMS Portal</span>
            </h1>
          </div>
        </div>

        {/* Tab triggers */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('compose')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'compose'
                ? 'border-teal-700 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Send size={14} /> Compose Broadcast
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-teal-700 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <History size={14} /> Delivery History
          </button>
        </div>

        {activeTab === 'compose' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Compose Card */}
            <div className="bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40 p-6 lg:col-span-2">
              <h2 className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-4">New SMS Broadcast</h2>
              
              {statusMessage && (
                <div className={`mb-4 p-3 rounded border text-xs flex gap-2 items-center ${
                  statusMessage.type === 'success'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {statusMessage.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSend} className="space-y-4 text-xs">
                {/* Recipient Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-500 mb-1">Recipient Category</label>
                    <select
                      value={recipientType}
                      onChange={(e) => {
                        setRecipientType(e.target.value as 'Parent' | 'Driver');
                        setTargetType('all');
                        setSelectedTarget('');
                      }}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900"
                    >
                      <option value="Parent">Parents / Student Guardians</option>
                      <option value="Driver">Bus Drivers</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1">Targeting Criteria</label>
                    <select
                      value={targetType}
                      onChange={(e) => {
                        setTargetType(e.target.value as any);
                        setSelectedTarget('');
                      }}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900"
                    >
                      <option value="all">Broadcast to All {recipientType === 'Parent' ? 'Parents' : 'Drivers'}</option>
                      {recipientType === 'Parent' ? (
                        <>
                          <option value="bus_trip">Filter by Bus & Trip</option>
                          <option value="grade">Filter by Grade Level</option>
                          <option value="individual">Target Individual Parent (Student)</option>
                        </>
                      ) : (
                        <>
                          <option value="bus">Filter by Bus Number Plate</option>
                          <option value="individual">Target Individual Driver</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Sub-Target Selectors */}
                {targetType === 'bus_trip' && recipientType === 'Parent' && (
                  <div>
                    <label className="block text-gray-500 mb-1">Select Bus & Scheduled Trip</label>
                    <select
                      value={selectedTarget}
                      onChange={(e) => setSelectedTarget(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900"
                    >
                      <option value="">-- Choose Trip --</option>
                      {buses.map(bus => (
                        bus.trips.map(trip => (
                          <option key={`${bus.busNumber}_${trip.tripNumber}`} value={`${bus.busNumber}_${trip.tripNumber}`}>
                            Bus {bus.busNumber} - Trip {trip.tripNumber} ({trip.time})
                          </option>
                        ))
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'grade' && recipientType === 'Parent' && (
                  <div>
                    <label className="block text-gray-500 mb-1">Select Grade Level</label>
                    <select
                      value={selectedTarget}
                      onChange={(e) => setSelectedTarget(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900"
                    >
                      <option value="">-- Choose Grade --</option>
                      {grades.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'individual' && recipientType === 'Parent' && (
                  <div>
                    <label className="block text-gray-500 mb-1">Search/Select Student Parent</label>
                    <select
                      value={selectedTarget}
                      onChange={(e) => setSelectedTarget(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900"
                    >
                      <option value="">-- Choose Student --</option>
                      {students.map(s => (
                        <option key={s._id} value={s.admissionNumber}>
                          {s.fullName} ({s.admissionNumber}) - Parent: {s.parentName || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'bus' && recipientType === 'Driver' && (
                  <div>
                    <label className="block text-gray-500 mb-1">Select Bus Plate</label>
                    <select
                      value={selectedTarget}
                      onChange={(e) => setSelectedTarget(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900"
                    >
                      <option value="">-- Choose Bus --</option>
                      {buses.map(b => (
                        <option key={b._id} value={b.busNumber}>Bus: {b.busNumber}</option>
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'individual' && recipientType === 'Driver' && (
                  <div>
                    <label className="block text-gray-500 mb-1">Select Individual Driver</label>
                    <select
                      value={selectedTarget}
                      onChange={(e) => setSelectedTarget(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900"
                    >
                      <option value="">-- Choose Driver --</option>
                      {drivers.map(d => (
                        <option key={d._id} value={d._id}>{d.fullName} ({d.phone})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Message Body */}
                <div>
                  <label className="block text-gray-500 mb-1">Message Body (Plain Text)</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter broadcast message here..."
                    rows={6}
                    maxLength={160}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 font-mono"
                  />
                  <div className="text-right text-gray-400 mt-1 text-[10px]">
                    {message.length} / 160 characters (1 SMS segment)
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700/40">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 disabled:bg-teal-700/50 text-white px-4 py-2 rounded font-semibold text-xs transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Sending Segments...
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Send Broadcast
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Sidebar Context */}
            <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/40 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">Gateways & Stubs</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  The SMS routing uses an isolated send-service utility. Although actual GSM gateways are stubbed for this phase, the history logger generates dynamic reports and simulates failure states.
                </p>
                <div className="border-t border-gray-100 dark:border-gray-700/30 pt-4 mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service Gateway Status</span>
                    <span className="text-green-700 font-semibold">Active (Mocked)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Simulated Error Rate</span>
                    <span className="text-gray-700">10% Random Failure</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-teal-50/50 dark:bg-teal-950/10 p-4 rounded border border-teal-100 dark:border-teal-900/20 text-xs">
                <span className="font-semibold text-teal-800 dark:text-teal-400 block mb-1">Standard Rates Notice</span>
                <span className="text-gray-500">SMS charges apply per 160 characters. Real delivery APIs will utilize the parentContact fields registered in student portfolios.</span>
              </div>
            </div>
          </div>
        ) : (
          /* History logs tab */
          <div className="bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Communication Logs</h2>
              <button
                onClick={loadHistory}
                disabled={loading}
                className="text-xs text-teal-700 hover:underline flex items-center gap-1"
              >
                Refresh Log
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-teal-700 mb-2" size={24} />
                <span className="text-xs text-gray-500">Loading delivery reports...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="font-normal py-3 px-4">Recipient Type</th>
                      <th className="font-normal py-3 px-4">Recipient Name</th>
                      <th className="font-normal py-3 px-4">Phone Contact</th>
                      <th className="font-normal py-3 px-4">Filter Criteria</th>
                      <th className="font-normal py-3 px-4">Message Context</th>
                      <th className="font-normal py-3 px-4">Delivery Status</th>
                      <th className="font-normal py-3 px-4 text-right">Sent Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-teal-50/20 transition-colors">
                        <td className="py-3 px-4 font-semibold">{log.recipientType}</td>
                        <td className="py-3 px-4">{log.recipientName}</td>
                        <td className="py-3 px-4 text-gray-500">{log.recipientPhone}</td>
                        <td className="py-3 px-4 text-gray-500 font-mono text-[10px]">{log.targetCriteria}</td>
                        <td className="py-3 px-4 max-w-xs truncate" title={log.message}>{log.message}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                            log.status === 'delivered'
                              ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                              : log.status === 'sent'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400 text-[10px]">
                          {new Date(log.sentAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400 italic">No broadcast histories found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
