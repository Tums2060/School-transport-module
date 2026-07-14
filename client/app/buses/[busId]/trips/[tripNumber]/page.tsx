'use client';

import Link from 'next/link';
import { useMemo, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download } from 'lucide-react';

type Student = {
  admissionNumber: string;
  name: string;
};

type StudentProfile = {
  id: string;
  admissionNumber: string;
  fullName: string;
  grade: string;
  stream: string;
  gender: 'Male' | 'Female';
  parentName: string;
  parentContact: string;
  busAssigned: string | null;
  isActive: boolean;
};

type ApiBus = {
  id: string;
  busNumber: string;
};

type RouteDetails = {
  area: string;
  pickupPoints: string;
  majorStops: string;
  destination: string;
  notes: string;
};

type Trip = {
  tripNumber: number;
  time: string;
  students: Student[];
  routeDetails: RouteDetails;
};

type Bus = {
  id: string;
  name: string;
  trips: Trip[];
};

const STORAGE_KEY = 'school_buses';

function formatTimeLabel(time: string) {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

function routeSummary(routeDetails: RouteDetails) {
  return [routeDetails.pickupPoints, routeDetails.notes].map((v) => v.trim()).filter(Boolean).join(' - ');
}

export default function BusTripStudentsPage() {
  const params = useParams<{ busId: string; tripNumber: string }>();
  const busId = params?.busId || '';
  const tripNumber = Number(params?.tripNumber || '0');

  const [bus, setBus] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [absenteeismDetails, setAbsenteeismDetails] = useState<any | null>(null);

  const handleStudentClick = async (student: any) => {
    setSelectedStudent(student);
    setAbsenteeismDetails(null);
    try {
      const res = await fetch('/api/attendance/absenteeism-rates');
      const json = await res.json();
      if (json.success) {
        const rateRecord = json.data.find((item: any) => item.studentId === student.admissionNumber);
        if (rateRecord) {
          setAbsenteeismDetails(rateRecord);
        } else {
          setAbsenteeismDetails({
            absenteeismRate: 0,
            expectedTrips: 0,
            missedTrips: 0,
            isFlagged: false,
            threshold: 50
          });
        }
      }
    } catch (error) {
      console.error('Error fetching student absenteeism rate:', error);
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!busId) return;
      setLoading(true);
      try {
        const [busRes, studentsRes] = await Promise.all([
          fetch(`/api/buses/${busId}`),
          fetch(`/api/students?busId=${busId}&tripNumber=${tripNumber}`)
        ]);
        const busJson = await busRes.json();
        const studentsJson = await studentsRes.json();

        if (busJson.success) {
          setBus(busJson.data);
        }
        if (studentsJson.success) {
          setStudents(studentsJson.data);
        }
      } catch (error) {
        console.error('Error loading bus trip roster:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [busId, tripNumber]);

  const trip = useMemo(() => bus?.trips.find((t: any) => t.tripNumber === tripNumber), [bus, tripNumber]);

  const tripRows = useMemo(() => {
    return students.map((student) => ({
      admissionNumber: student.admissionNumber,
      fullName: student.fullName,
      grade: student.grade || '-',
      stream: student.stream || '-',
      gender: student.gender || '-',
      parentName: student.parentName || '-',
      parentContact: student.parentContact || '-',
      assignedBus: student.busAssigned || 'Unassigned',
      status: student.isActive ?? true,
    }));
  }, [students]);

  const handlePrint = async () => {
    if (!bus || !trip || students.length === 0) return;

    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const document = new jsPDF({ orientation: 'portrait' });

    document.setFillColor(13, 148, 136);
    document.rect(0, 0, 210, 24, 'F');
    document.setFontSize(16);
    document.setTextColor(255, 255, 255);
    document.text(`${bus.name} - Trip ${trip.tripNumber} Student Roster`, 14, 15);

    document.setFontSize(10);
    document.setTextColor(55, 65, 81);
    document.text(`Bus Plate: ${bus.id}`, 14, 32);
    document.text(`Trip Time: ${formatTimeLabel(trip.time)}`, 14, 38);
    document.text(`Route: ${trip.pickupPoints || 'Not specified'}`, 14, 44);

    autoTable(document, {
      startY: 50,
      head: [['Admission Number', 'Student Name']],
      body: students.map((s) => [s.admissionNumber, s.fullName]),
    });

    document.save(`${bus.id}-trip${trip.tripNumber}-students.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm text-gray-800 dark:text-gray-100">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <Link href="/" className="hover:underline text-gray-500 dark:text-gray-400">Home</Link>
        <Link href="/students" className="hover:underline text-gray-500 dark:text-gray-400">All Students</Link>
        <Link href="/students/approved" className="hover:underline text-gray-500 dark:text-gray-400">Students</Link>
        <Link href="/buses" className="hover:underline text-gray-500 dark:text-gray-400">Bus</Link>
        <Link href="/zones" className="hover:underline text-gray-500 dark:text-gray-400">Zones</Link>
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Trip Students</span>
        <Link href="/driver/login" className="hover:underline text-gray-500 dark:text-gray-400">Driver Portal</Link>
      </div>

      <main className="p-6">
        {!bus || !trip ? (
          <div className="bg-white border border-gray-200 p-6">
            <p className="text-gray-600">Bus or trip not found.</p>
            <Link href="/buses" className="text-teal-700 hover:underline mt-2 inline-block">Back to Buses</Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{bus.name} - Trip {trip.tripNumber}</h1>
                <p className="text-sm text-gray-600">Time: {formatTimeLabel(trip.time)}</p>
              </div>
              <button
                onClick={handlePrint}
                disabled={students.length === 0}
                className="px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white disabled:bg-gray-400 flex items-center gap-2"
              >
                <Download size={14} /> Print Details
              </button>
            </div>

            <div className="p-4 text-sm text-gray-600 border-b border-gray-100">
              <span className="font-medium text-gray-700">Pickup points:</span> {trip.pickupPoints || 'Not set'}
            </div>

            {tripRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-gray-500 border-b-2 border-gray-200 bg-gray-50">
                      <th className="font-normal py-2 px-4">Admission Number</th>
                      <th className="font-normal py-2 px-4">Student Name</th>
                      <th className="font-normal py-2 px-4">Grade</th>
                      <th className="font-normal py-2 px-4">Stream</th>
                      <th className="font-normal py-2 px-4">Gender</th>
                      <th className="font-normal py-2 px-4">Parent</th>
                      <th className="font-normal py-2 px-4">Contact</th>
                      <th className="font-normal py-2 px-4">Assigned Bus</th>
                      <th className="font-normal py-2 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tripRows.map((student, index) => (
                      <tr key={`${student.admissionNumber}-${index}`} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td 
                          onClick={() => handleStudentClick(student)}
                          className="py-2 px-4 text-teal-700 font-semibold cursor-pointer hover:underline"
                        >
                          {student.admissionNumber}
                        </td>
                        <td className="py-2 px-4 text-gray-900">{student.fullName}</td>
                        <td className="py-2 px-4 text-gray-700">{student.grade}</td>
                        <td className="py-2 px-4 text-gray-700">{student.stream}</td>
                        <td className="py-2 px-4 text-gray-700">{student.gender}</td>
                        <td className="py-2 px-4 text-gray-700">{student.parentName}</td>
                        <td className="py-2 px-4 text-gray-700">{student.parentContact}</td>
                        <td className="py-2 px-4 text-gray-700">{student.assignedBus}</td>
                        <td className="py-2 px-4">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${student.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {student.status ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-gray-400">No students in this trip yet.</div>
            )}
          </div>
        )}

        {selectedStudent && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full max-w-lg shadow-xl rounded-sm">
              <div className="bg-teal-700 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold">Student Profile Details</h2>
                  <p className="text-xs text-teal-100 font-mono">Admission: {selectedStudent.admissionNumber}</p>
                </div>
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="text-white hover:text-gray-200 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Profile Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-gray-400 font-medium uppercase tracking-wider text-[10px]">Full Name</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{selectedStudent.fullName}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-medium uppercase tracking-wider text-[10px]">Grade & Stream</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{selectedStudent.grade} - {selectedStudent.stream}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-medium uppercase tracking-wider text-[10px]">Parent Name</span>
                    <span className="text-gray-800 dark:text-gray-200">{selectedStudent.parentName}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-medium uppercase tracking-wider text-[10px]">Parent Contact</span>
                    <span className="text-gray-800 dark:text-gray-200">{selectedStudent.parentContact}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-medium uppercase tracking-wider text-[10px]">Assigned Bus</span>
                    <span className="text-gray-800 dark:text-gray-200">{selectedStudent.assignedBus}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-medium uppercase tracking-wider text-[10px]">Status</span>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${selectedStudent.status ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {selectedStudent.status ? 'Active Student' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <hr className="border-gray-100 dark:border-gray-700" />

                {/* Absenteeism & Attendance Section */}
                <div>
                  <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Academic Term Attendance (Live Computed)</h3>
                  {absenteeismDetails ? (
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border border-gray-200 dark:border-gray-800 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Absenteeism Rate:</span>
                        <span className={`font-bold text-sm ${absenteeismDetails.isFlagged ? 'text-red-600 dark:text-red-400' : 'text-teal-700 dark:text-teal-400'}`}>
                          {absenteeismDetails.absenteeismRate}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${absenteeismDetails.isFlagged ? 'bg-red-600' : 'bg-teal-600'}`}
                          style={{ width: `${Math.min(absenteeismDetails.absenteeismRate, 100)}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                        <div>
                          <span>Expected Trips: <strong>{absenteeismDetails.expectedTrips}</strong></span>
                        </div>
                        <div>
                          <span>Missed (Absent): <strong>{absenteeismDetails.missedTrips}</strong></span>
                        </div>
                      </div>
                      
                      {absenteeismDetails.isFlagged ? (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-2 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
                          <span className="font-bold">⚠️ Flagged:</span> Chronic absenteeism detected (exceeded threshold of {absenteeismDetails.threshold}%).
                        </div>
                      ) : (
                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-2 text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                          <span className="font-bold">✓ Standard:</span> Attendance meets standard thresholds.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-6 text-xs text-gray-500">
                      <span className="animate-spin mr-2">⚙</span> Computing term attendance analytics...
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-3 flex justify-end border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
