'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut, Play, Square, CheckSquare, Square as UncheckedSquare,
  AlertTriangle, Gauge, Fuel, CheckCircle, RefreshCw, Loader2, Bus
} from 'lucide-react';

type Trip = {
  tripNumber: number;
  time: string;
  tripType?: 'scheduled' | 'non_student';
  startTime?: string;
  endTime?: string;
  distanceCovered?: number;
  pickupPoints: string[];
};

type Student = {
  _id: string;
  admissionNumber: string;
  fullName: string;
  grade: string;
};

type Telemetry = {
  mileage: number;
  consumptionRate: number;
  remainingFuel: number;
};

const NON_STUDENT_TRIP_REASONS = [
  { key: 'maintenance_service', label: 'Maintenance & Service' },
  { key: 'refueling_run', label: 'Refueling Run' },
  { key: 'repositioning_depot_transfer', label: 'Depot Transfer' },
  { key: 'cleaning_washing', label: 'Cleaning / Washing' },
  { key: 'driver_training_test_drive', label: 'Driver Training / Test Drive' },
  { key: 'other', label: 'Other Reason' }
];

export default function DriverDashboardPage() {
  const router = useRouter();
  const [driverName, setDriverName] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [session, setSession] = useState<any>(null);
  const [busDetails, setBusDetails] = useState<any>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  
  // Roster lists
  const [selectedTripNumber, setSelectedTripNumber] = useState<number | null>(null);
  const [rosterStudents, setRosterStudents] = useState<Student[]>([]);
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, boolean>>({});
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [isRosterLocked, setIsRosterLocked] = useState(false);

  // Telemetry
  const [telemetry, setTelemetry] = useState<Telemetry>({ mileage: 120500, consumptionRate: 8.5, remainingFuel: 40 });

  // Modals & Forms
  const [isNonStudentModalOpen, setIsNonStudentModalOpen] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [nonStudentTripNum, setNonStudentTripNum] = useState(99);

  const [isOdomModalOpen, setIsOdomModalOpen] = useState(false);
  const [odomReading, setOdomReading] = useState('');
  
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelOdom, setFuelOdom] = useState('');

  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorDesc, setErrorDesc] = useState('');
  const [errorRecordId, setErrorRecordId] = useState('');

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('driver_name');
    const savedSession = localStorage.getItem('driver_session');

    if (!savedName || !savedSession) {
      router.push('/driver/login');
      return;
    }

    try {
      const parsedSession = JSON.parse(savedSession);
      setDriverName(savedName);
      setSession(parsedSession);
      setBusNumber(parsedSession.busNumber);
    } catch {
      router.push('/driver/login');
      return;
    }
    setIsMounted(true);
  }, []);

  async function loadBusDetails() {
    if (!session?.busId) return;
    try {
      const res = await fetch(`/api/buses/${session.busId}`);
      const json = await res.json();
      if (json.success) {
        setBusDetails(json.data);
        // Find if there is an active trip on this bus
        const currentActive = json.data.trips.find((t: any) => t.startTime && !t.endTime);
        if (currentActive) {
          setActiveTrip(currentActive);
          setSelectedTripNumber(currentActive.tripNumber);
        } else {
          setActiveTrip(null);
        }
      }
    } catch (err) {
      console.error('Error fetching bus details:', err);
    }
  }

  async function loadTelemetry() {
    if (!busNumber) return;
    try {
      const res = await fetch(`/api/driver/telemetry/${busNumber}`);
      const json = await res.json();
      if (json.success) {
        setTelemetry(json.data);
      }
    } catch (err) {
      console.error('Error fetching telemetry:', err);
    }
  }

  useEffect(() => {
    if (isMounted) {
      loadBusDetails();
      loadTelemetry();
    }
  }, [isMounted]);

  // Load students roster for a selected trip
  async function loadTripRoster(tripNo: number) {
    if (!busDetails?._id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // Find students approved for this bus and trip
      const res = await fetch(`/api/students?busId=${busDetails._id}&tripNumber=${tripNo}`);
      const json = await res.json();

      // Check if attendance is already recorded for this trip today
      const todayStr = new Date().toISOString().split('T')[0];
      const attRes = await fetch(`/api/attendance?busNumber=${busNumber}&tripNumber=${tripNo}&date=${todayStr}`);
      const attJson = await attRes.json();

      if (json.success) {
        setRosterStudents(json.data);
        
        // Initialize attendance checkboxes (default checked / true)
        const marks: Record<string, boolean> = {};
        json.data.forEach((s: Student) => {
          marks[s._id] = true;
        });

        if (attJson.success && attJson.data.length > 0) {
          setAttendanceRecords(attJson.data);
          // Set checks based on database logs
          attJson.data.forEach((rec: any) => {
            marks[rec.studentId] = rec.present;
          });
          // Check if locked
          setIsRosterLocked(attJson.data[0].locked);
        } else {
          setAttendanceRecords([]);
          setIsRosterLocked(false);
        }

        setAttendanceMarks(marks);
        setSelectedTripNumber(tripNo);
      }
    } catch (err) {
      setErrorMsg('Failed to load roster students list.');
    } finally {
      setLoading(false);
    }
  }

  const handleStartTrip = async (tripNo: number, tripTime: string) => {
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/driver/trips/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripNumber: tripNo, time: tripTime, tripType: 'scheduled' })
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg(`Trip ${tripNo} started successfully.`);
        loadBusDetails();
        loadTripRoster(tripNo);
      } else {
        setErrorMsg(json.message);
      }
    } catch {
      setErrorMsg('Unable to start trip. Server connection lost.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNonStudentTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    if (selectedReasons.length === 0) {
      alert('Please select at least one reason for the non-student trip.');
      return;
    }
    if (selectedReasons.includes('other') && !otherText.trim()) {
      alert('Please specify the other reason.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/driver/trips/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripNumber: nonStudentTripNum,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tripType: 'non_student',
          nonStudentReasons: selectedReasons,
          otherReasonText: otherText.trim()
        })
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg('Non-student trip started successfully.');
        setIsNonStudentModalOpen(false);
        setSelectedReasons([]);
        setOtherText('');
        loadBusDetails();
        setSelectedTripNumber(null);
      } else {
        setErrorMsg(json.message);
      }
    } catch {
      setErrorMsg('Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    setErrorMsg(null);
    setStatusMsg(null);

    const dist = prompt('Enter distance covered during trip (in km):', '12');
    if (dist === null) return; // cancelled

    setLoading(true);
    try {
      const res = await fetch('/api/driver/trips/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripNumber: activeTrip.tripNumber,
          distance: Number(dist) || 12
        })
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg(`Trip ${activeTrip.tripNumber} completed. Telemetry and odometer updated.`);
        loadBusDetails();
        loadTelemetry();
        if (selectedTripNumber) {
          loadTripRoster(selectedTripNumber);
        }
      } else {
        setErrorMsg(json.message);
      }
    } catch {
      setErrorMsg('Connection error ending trip.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedTripNumber) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);

    const marksPayload = Object.keys(attendanceMarks).map(studId => ({
      studentId: studId,
      present: attendanceMarks[studId]
    }));

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentMarks: marksPayload,
          tripNumber: selectedTripNumber,
          date: new Date().toISOString().split('T')[0]
        })
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg('Attendance marks saved successfully.');
        loadTripRoster(selectedTripNumber);
      } else {
        setErrorMsg(json.message);
      }
    } catch {
      setErrorMsg('Connection issue saving attendance logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleOdometerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!odomReading || Number(odomReading) <= 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/driver/odometer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reading: Number(odomReading) })
      });
      const json = await res.json();
      if (json.success) {
        setIsOdomModalOpen(false);
        setOdomReading('');
        loadTelemetry();
        alert('Odometer logged successfully.');
      } else {
        alert(json.message);
      }
    } catch {
      alert('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelLiters || !fuelOdom) return;

    setLoading(true);
    try {
      const res = await fetch('/api/driver/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          litersFilled: Number(fuelLiters),
          cost: Number(fuelCost) || 0,
          odometerReading: Number(fuelOdom)
        })
      });
      const json = await res.json();
      if (json.success) {
        setIsFuelModalOpen(false);
        setFuelLiters('');
        setFuelCost('');
        setFuelOdom('');
        loadTelemetry();
        alert('Fuel fill-up logged successfully.');
      } else {
        alert(json.message);
      }
    } catch {
      alert('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleErrorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!errorDesc.trim() || !errorRecordId) return;

    setLoading(true);
    try {
      const res = await fetch('/api/attendance/error-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceRecordId: errorRecordId,
          description: errorDesc.trim(),
          username: busNumber
        })
      });
      const json = await res.json();
      if (json.success) {
        setIsErrorModalOpen(false);
        setErrorDesc('');
        alert('Attendance correction request submitted to Superior Admin.');
      } else {
        alert(json.message);
      }
    } catch {
      alert('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('driver_session');
    localStorage.removeItem('user');
    router.push('/driver/login');
  };

  // Helper check if a scheduled time window is close to current time (active window indicator)
  const isTripTimeActiveNow = (tripTime: string) => {
    try {
      const [hours, minutes] = tripTime.split(':').map(Number);
      const now = new Date();
      const tripDate = new Date();
      tripDate.setHours(hours, minutes, 0, 0);
      
      const diffMs = now.getTime() - tripDate.getTime();
      const diffMins = diffMs / 60000;
      
      // Active window: 30 minutes before up to 1 hour after scheduled time
      return diffMins >= -30 && diffMins <= 60;
    } catch {
      return false;
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-xs text-gray-800 dark:text-gray-100 pb-12">
      {/* Header bar */}
      <header className="bg-teal-700 text-white px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-white/10 p-1.5 rounded">
            <Bus size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Bus console: <span className="font-mono text-teal-200">{busNumber}</span></h1>
            <p className="text-[10px] text-teal-100">Driver: {driverName}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1 text-[10px] hover:bg-teal-800 text-teal-100 hover:text-white px-2 py-1 rounded transition-colors"
        >
          <LogOut size={12} /> Sign Out
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status messages */}
        {(statusMsg || errorMsg) && (
          <div className="md:col-span-3">
            {statusMsg && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400 p-3 rounded flex items-center gap-2">
                <CheckCircle size={14} />
                <span>{statusMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 p-3 rounded flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Telemetry Panel */}
        <section className="bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/40 p-4 rounded shadow-sm space-y-4">
          <h2 className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Bus Telemetry</h2>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800/30 p-3 rounded border border-gray-100 dark:border-gray-800 flex flex-col items-center">
              <Gauge size={18} className="text-teal-700 mb-1" />
              <span className="text-[10px] text-gray-400">Mileage</span>
              <span className="font-mono font-bold mt-1 text-gray-800 dark:text-white">{telemetry.mileage} km</span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/30 p-3 rounded border border-gray-100 dark:border-gray-800 flex flex-col items-center">
              <Fuel size={18} className="text-teal-700 mb-1" />
              <span className="text-[10px] text-gray-400">Rate</span>
              <span className="font-mono font-bold mt-1 text-gray-800 dark:text-white">{telemetry.consumptionRate} km/L</span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/30 p-3 rounded border border-gray-100 dark:border-gray-800 flex flex-col items-center">
              <Fuel size={18} className="text-teal-700 mb-1" />
              <span className="text-[10px] text-gray-400">Remaining</span>
              <span className="font-mono font-bold mt-1 text-gray-800 dark:text-white">{telemetry.remainingFuel} L</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => setIsOdomModalOpen(true)}
              className="border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 py-1.5 rounded font-semibold text-center"
            >
              Log Odometer
            </button>
            <button
              onClick={() => setIsFuelModalOpen(true)}
              className="border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 py-1.5 rounded font-semibold text-center"
            >
              Log Fuel Fill
            </button>
          </div>
        </section>

        {/* Trips Panel */}
        <section className="bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/40 p-4 rounded shadow-sm space-y-4 md:col-span-2">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Scheduled & Active Trips</h2>
            <button
              onClick={() => setIsNonStudentModalOpen(true)}
              className="text-teal-700 hover:underline font-semibold"
            >
              + Start Non-Student Trip
            </button>
          </div>

          {activeTrip ? (
            <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/40 p-4 rounded flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-700">Trip active now</span>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  Trip {activeTrip.tripNumber} ({activeTrip.time})
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">
                  Started at {new Date(activeTrip.startTime!).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={handleEndTrip}
                className="bg-red-700 hover:bg-red-800 text-white font-bold px-4 py-2 rounded flex items-center gap-1.5 text-xs shadow-sm transition-colors animate-pulse"
              >
                <Square size={13} fill="currentColor" /> End Active Trip
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800/10 border border-gray-100 dark:border-gray-800 p-4 rounded text-center text-gray-400 italic">
              No active trip session on this vehicle. Select a trip below to begin.
            </div>
          )}

          {/* Scheduled List */}
          <div className="space-y-2 mt-4">
            {busDetails?.trips?.filter((t: any) => t.tripType !== 'non_student').map((trip: Trip) => {
              const isCurrentWindow = isTripTimeActiveNow(trip.time);
              return (
                <div
                  key={trip.tripNumber}
                  className={`p-3 border rounded flex justify-between items-center transition-colors ${
                    isCurrentWindow
                      ? 'border-teal-300 bg-teal-50/20 dark:border-teal-800/40 dark:bg-teal-950/10'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800 dark:text-white">Trip {trip.tripNumber}</span>
                      <span className="text-gray-400">({trip.time})</span>
                      {isCurrentWindow && (
                        <span className="bg-teal-700 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">Active now</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {trip.pickupPoints?.length || 0} pickup locations registered.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => loadTripRoster(trip.tripNumber)}
                      className={`px-2.5 py-1 rounded border text-xs font-semibold ${
                        selectedTripNumber === trip.tripNumber
                          ? 'bg-teal-50 border-teal-300 text-teal-700'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      View Roster
                    </button>
                    {activeTrip && activeTrip.tripNumber === trip.tripNumber ? (
                      <button
                        onClick={handleEndTrip}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded flex items-center gap-1 text-xs font-semibold transition-colors animate-pulse"
                      >
                        <Square size={10} fill="currentColor" /> Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartTrip(trip.tripNumber, trip.time)}
                        disabled={!!activeTrip || loading}
                        className="bg-teal-700 hover:bg-teal-800 disabled:bg-gray-200 disabled:text-gray-400 text-white px-3 py-1 rounded flex items-center gap-1 text-xs font-semibold transition-colors"
                      >
                        <Play size={10} fill="currentColor" /> Start
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Student Roster / Attendance Section */}
        {selectedTripNumber && (
          <section className="bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/40 p-6 rounded shadow-sm md:col-span-3 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700/50 pb-3">
              <div>
                <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                  Attendance Roster: Scheduled Trip {selectedTripNumber}
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Check boxes to mark students present. Absentees will flag automatically.
                </p>
              </div>

              {isRosterLocked && (
                <div className="bg-red-50 text-red-700 border border-red-200 text-[10px] px-2.5 py-1 rounded font-bold">
                  🔒 Records Locked (Trip Ended)
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {rosterStudents.map(student => {
                // Find matching record ID for post-lock reports
                const dbRecord = attendanceRecords.find(r => r.studentId === student._id);
                const recordId = dbRecord?._id || '';

                return (
                  <div
                    key={student._id}
                    className={`p-3 border rounded flex justify-between items-center ${
                      attendanceMarks[student._id]
                        ? 'border-teal-100 bg-teal-50/10'
                        : 'border-red-100 bg-red-50/10'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{student.fullName}</span>
                      <span className="text-[10px] text-gray-400">Adm: {student.admissionNumber} | Grade: {student.grade}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isRosterLocked) return;
                          setAttendanceMarks(prev => ({
                            ...prev,
                            [student._id]: !prev[student._id]
                          }));
                        }}
                        disabled={isRosterLocked}
                        className={`p-1 text-teal-700 disabled:text-gray-300 transition-colors`}
                      >
                        {attendanceMarks[student._id] ? (
                          <CheckSquare size={18} />
                        ) : (
                          <UncheckedSquare size={18} className="text-red-600 dark:text-red-500" />
                        )}
                      </button>

                      {isRosterLocked && recordId && (
                        <button
                          type="button"
                          onClick={() => {
                            setErrorRecordId(recordId);
                            setIsErrorModalOpen(true);
                          }}
                          className="text-red-600 hover:underline text-[9px] font-semibold"
                        >
                          Report Error
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {rosterStudents.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400 italic">
                  No students assigned to Bus {busNumber} - Trip {selectedTripNumber}.
                </div>
              )}
            </div>

            {!isRosterLocked && rosterStudents.length > 0 && (
              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700/40">
                <button
                  onClick={handleSaveAttendance}
                  disabled={loading}
                  className="bg-teal-700 hover:bg-teal-800 disabled:bg-teal-700/50 text-white font-bold px-4 py-2 rounded text-xs transition-colors"
                >
                  {loading ? 'Saving logs...' : 'Save Attendance Marks'}
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Non-Student Trip Modal */}
      {isNonStudentModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-6 w-full max-w-md shadow-lg">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Start Non-Student Trip</h2>

            <form onSubmit={handleStartNonStudentTrip} className="space-y-4">
              <div>
                <label className="block text-gray-500 mb-1">Select Custom Trip Number</label>
                <input
                  type="number"
                  value={nonStudentTripNum}
                  onChange={(e) => setNonStudentTripNum(Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-2">Select Purpose / Reason(s)</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-100 dark:border-gray-700 p-2.5">
                  {NON_STUDENT_TRIP_REASONS.map(reason => (
                    <label key={reason.key} className="flex items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        checked={selectedReasons.includes(reason.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReasons(prev => [...prev, reason.key]);
                          } else {
                            setSelectedReasons(prev => prev.filter(k => k !== reason.key));
                          }
                        }}
                        className="rounded border-gray-300 text-teal-700 h-4 w-4"
                      />
                      <span>{reason.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedReasons.includes('other') && (
                <div>
                  <label className="block text-gray-500 mb-1">Specify Other Reason</label>
                  <textarea
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    placeholder="Enter reason here..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/40">
                <button
                  type="button"
                  onClick={() => {
                    setIsNonStudentModalOpen(false);
                    setSelectedReasons([]);
                    setOtherText('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded font-semibold"
                >
                  Start Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Odometer Modal */}
      {isOdomModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-6 w-full max-w-sm shadow-lg">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Log Weekly Odometer</h2>
            <p className="text-gray-400 mb-4">Please submit current dashboard reading. Limit once a week.</p>

            <form onSubmit={handleOdometerSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-500 mb-1">Odometer Reading (km)</label>
                <input
                  type="number"
                  value={odomReading}
                  onChange={(e) => setOdomReading(e.target.value)}
                  placeholder="e.g. 120550"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/40">
                <button
                  type="button"
                  onClick={() => setIsOdomModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded font-semibold"
                >
                  Log Reading
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fuel Log Modal */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-6 w-full max-w-sm shadow-lg">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Log Fuel Fill-Up</h2>

            <form onSubmit={handleFuelSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-500 mb-1">Liters Filled</label>
                <input
                  type="number"
                  step="0.01"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Total Cost (KES)</label>
                <input
                  type="number"
                  value={fuelCost}
                  onChange={(e) => setFuelCost(e.target.value)}
                  placeholder="e.g. 8500"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Odometer at Fill-Up (km)</label>
                <input
                  type="number"
                  value={fuelOdom}
                  onChange={(e) => setFuelOdom(e.target.value)}
                  placeholder="e.g. 120550"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/40">
                <button
                  type="button"
                  onClick={() => setIsFuelModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded font-semibold"
                >
                  Log Refueling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Report Modal */}
      {isErrorModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-6 w-full max-w-sm shadow-lg">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Report Roster Correction</h2>
            <p className="text-gray-400 mb-4">Request Superior Admin override for attendance marking error.</p>

            <form onSubmit={handleErrorSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-500 mb-1">Description / Reason for Error</label>
                <textarea
                  value={errorDesc}
                  onChange={(e) => setErrorDesc(e.target.value)}
                  placeholder="e.g. Student boarded late, marked absent incorrectly."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/40">
                <button
                  type="button"
                  onClick={() => setIsErrorModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded font-semibold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
