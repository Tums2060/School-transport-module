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

  const [buses, setBuses] = useState<Bus[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [apiBuses, setApiBuses] = useState<ApiBus[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setBuses(saved ? (JSON.parse(saved) as Bus[]) : []);
    } catch {
      setBuses([]);
    }
  }, []);

  useEffect(() => {
    async function loadProfiles() {
      try {
        const [studentsRes, busesRes] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/buses'),
        ]);

        const studentsData = await studentsRes.json();
        const busesData = await busesRes.json();

        if (studentsData.success) {
          setStudentProfiles(studentsData.data as StudentProfile[]);
        }

        if (busesData.success) {
          setApiBuses(busesData.data as ApiBus[]);
        }
      } catch {
        setStudentProfiles([]);
        setApiBuses([]);
      }
    }

    loadProfiles();
  }, []);

  const bus = useMemo(() => buses.find((b) => b.id === busId), [buses, busId]);
  const trip = useMemo(() => bus?.trips.find((t) => t.tripNumber === tripNumber), [bus, tripNumber]);
  const profileByAdmission = useMemo(() => {
    const map = new Map<string, StudentProfile>();
    studentProfiles.forEach((profile) => {
      map.set(profile.admissionNumber, profile);
    });
    return map;
  }, [studentProfiles]);

  const busNumberById = useMemo(() => {
    const map = new Map<string, string>();
    apiBuses.forEach((b) => {
      map.set(b.id, b.busNumber);
    });
    return map;
  }, [apiBuses]);

  const tripRows = useMemo(() => {
    if (!trip) return [];

    return trip.students.map((student) => {
      const profile = profileByAdmission.get(student.admissionNumber);
      return {
        admissionNumber: student.admissionNumber,
        fullName: profile?.fullName || student.name,
        grade: profile?.grade || '-',
        stream: profile?.stream || '-',
        gender: profile?.gender || '-',
        parentName: profile?.parentName || '-',
        parentContact: profile?.parentContact || '-',
        assignedBus: profile?.busAssigned ? busNumberById.get(profile.busAssigned) || profile.busAssigned : 'Unassigned',
        status: profile?.isActive ?? true,
      };
    });
  }, [trip, profileByAdmission, busNumberById]);

  const handlePrint = async () => {
    if (!bus || !trip || trip.students.length === 0) return;

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
    document.text(`Bus No: ${bus.id}`, 14, 32);
    document.text(`Trip Time: ${formatTimeLabel(trip.time)}`, 14, 38);
    document.text(`Route: ${routeSummary(trip.routeDetails) || 'Not specified'}`, 14, 44);

    autoTable(document, {
      startY: 50,
      head: [['Admission Number', 'Student Name']],
      body: trip.students.map((student) => [student.admissionNumber, student.name]),
    });

    document.save(`${bus.id}-trip${trip.tripNumber}-students.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm text-gray-800 dark:text-gray-100">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <Link href="/" className="hover:underline text-gray-500 dark:text-gray-400">Home</Link>
        <Link href="/students" className="hover:underline">All Students</Link>
        <Link href="/students/approved" className="hover:underline">Students</Link>
        <Link href="/buses" className="hover:underline">Bus</Link>
        <Link href="/zones" className="hover:underline">Zones</Link>
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Trip Students</span>
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
                disabled={trip.students.length === 0}
                className="px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white disabled:bg-gray-400 flex items-center gap-2"
              >
                <Download size={14} /> Print Details
              </button>
            </div>

            <div className="p-4 text-sm text-gray-600 border-b border-gray-100">
              <span className="font-medium text-gray-700">Pickup points:</span> {trip.routeDetails.pickupPoints || 'Not set'}
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
                        <td className="py-2 px-4 text-gray-900">{student.admissionNumber}</td>
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
      </main>
    </div>
  );
}
