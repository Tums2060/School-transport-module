'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Filter, Search } from 'lucide-react';

type Student = {
  id: string;
  admissionNumber: string;
  fullName: string;
  grade: string;
  stream: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  parentName: string;
  parentContact: string;
  address: string;
  busAssigned: string | null;
  routeAssigned: string | null;
  enrollmentDate: string;
  isActive: boolean;
};

type Bus = {
  id: string;
  busNumber: string;
  status: string;
  driverName?: string;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const [filters, setFilters] = useState({
    admissionNumber: '',
    studentName: '',
    grade: '',
    stream: '',
    gender: '',
    parentName: '',
    busId: '',
    activeStatus: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [studentsRes, busesRes] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/buses'),
        ]);

        const studentsData = await studentsRes.json();
        const busesData = await busesRes.json();

        if (studentsData.success) {
          setStudents(studentsData.data);
        }

        if (busesData.success) {
          setBuses(busesData.data);
        }
      } catch (error) {
        console.error('Failed to load students page data:', error);
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

  const gradeOptions = useMemo(() => {
    return Array.from(new Set(students.map((student) => student.grade))).sort();
  }, [students]);

  const streamOptions = useMemo(() => {
    return Array.from(
      new Set(
        students
          .map((student) => (student.stream || '').trim())
          .filter((stream) => stream.length > 0),
      ),
    ).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const assignedBus = student.busAssigned ? busMap.get(student.busAssigned) : null;
      const term = searchTerm.trim().toLowerCase();
      const matchesQuickSearch =
        term === '' ||
        student.admissionNumber.toLowerCase().includes(term) ||
        student.fullName.toLowerCase().includes(term) ||
        student.grade.toLowerCase().includes(term) ||
        (student.stream || '').toLowerCase().includes(term) ||
        student.parentName.toLowerCase().includes(term) ||
        (assignedBus?.busNumber || '').toLowerCase().includes(term);

      return (
        matchesQuickSearch &&
        student.admissionNumber.toLowerCase().includes(filters.admissionNumber.trim().toLowerCase()) &&
        student.fullName.toLowerCase().includes(filters.studentName.trim().toLowerCase()) &&
        student.parentName.toLowerCase().includes(filters.parentName.trim().toLowerCase()) &&
        (filters.grade === '' || student.grade === filters.grade) &&
        (filters.stream === '' || (student.stream || '') === filters.stream) &&
        (filters.gender === '' || student.gender === filters.gender) &&
        (filters.busId === '' || student.busAssigned === filters.busId) &&
        (filters.activeStatus === '' || String(student.isActive) === filters.activeStatus) &&
        (filters.busId === '' || Boolean(assignedBus))
      );
    });
  }, [students, busMap, filters, searchTerm]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      admissionNumber: '',
      studentName: '',
      grade: '',
      stream: '',
      gender: '',
      parentName: '',
      busId: '',
      activeStatus: '',
    });
  };

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!showSearchBar || !searchContainerRef.current) {
        return;
      }

      const target = event.target as Node;
      if (!searchContainerRef.current.contains(target)) {
        setShowSearchBar(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [showSearchBar]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-sm text-gray-800">
      {/* Secondary module nav */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <Link href="/" className="hover:underline text-gray-500 dark:text-gray-400">Home</Link>
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Students</span>
        <Link href="/buses" className="hover:underline">Transport Module</Link>
        <Link href="/routes" className="hover:underline">Routes</Link>
      </div>
      <div className="flex">
        {showFilters && (
        <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/50 p-4 shrink-0">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Filter list by...</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-gray-500 dark:text-gray-400 mb-1">Admission Number</label>
              <input
                value={filters.admissionNumber}
                onChange={(e) => handleFilterChange('admissionNumber', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-gray-500 dark:text-gray-400 mb-1">Student Name</label>
              <input
                value={filters.studentName}
                onChange={(e) => handleFilterChange('studentName', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-gray-500 dark:text-gray-400 mb-1">Parent Name</label>
              <input
                value={filters.parentName}
                onChange={(e) => handleFilterChange('parentName', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-gray-500 dark:text-gray-400 mb-1">Grade</label>
              <select
                value={filters.grade}
                onChange={(e) => handleFilterChange('grade', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="">All grades</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-500 dark:text-gray-400 mb-1">Stream</label>
              <select
                value={filters.stream}
                onChange={(e) => handleFilterChange('stream', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="">All streams</option>
                {streamOptions.map((stream) => (
                  <option key={stream} value={stream}>{stream}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-500 dark:text-gray-400 mb-1">Gender</label>
              <select
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="">All genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-500 dark:text-gray-400 mb-1">Assigned Bus</label>
              <select
                value={filters.busId}
                onChange={(e) => handleFilterChange('busId', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="">All buses</option>
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>{bus.busNumber}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-500 dark:text-gray-400 mb-1">Student Status</label>
              <select
                value={filters.activeStatus}
                onChange={(e) => handleFilterChange('activeStatus', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="">All statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <button onClick={clearFilters} className="mt-4 text-teal-700 hover:underline text-left">
            Reset filters
          </button>
        </aside>
        )}

        <main className="flex-1 p-6">
          <div className="bg-white dark:bg-transparent shadow-sm border border-gray-200 dark:border-gray-700/40">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-700 dark:text-gray-200">Students List</span>
                <div ref={searchContainerRef}>
                  {showSearchBar ? (
                    <input
                      autoFocus
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search admission, student, grade, stream, parent, bus"
                      className="w-80 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                  ) : (
                    <button
                      onClick={() => setShowSearchBar(true)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-300 dark:border-gray-600 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/25"
                      title="Search"
                    >
                      <Search size={15} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Results ({filteredStudents.length})</span>
                <button
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-300 dark:border-gray-600 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/25"
                  title="Filters"
                >
                  <Filter size={15} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-sm text-gray-600 dark:text-gray-300">Loading students...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="font-normal py-2 px-4">Admission</th>
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
                    {filteredStudents.map((student, index) => {
                      const assignedBus = student.busAssigned ? busMap.get(student.busAssigned) : null;
                      return (
                        <tr key={student.id} className={`border-b border-gray-100 dark:border-gray-700/30 hover:bg-teal-50 dark:hover:bg-teal-900/25 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-white/2'}`}>
                          <td className="py-2 px-4 text-gray-900 dark:text-gray-100">{student.admissionNumber}</td>
                          <td className="py-2 px-4 text-gray-900 dark:text-gray-100">{student.fullName}</td>
                          <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{student.grade}</td>
                          <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{student.stream || '-'}</td>
                          <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{student.gender}</td>
                          <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{student.parentName}</td>
                          <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{student.parentContact}</td>
                          <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{assignedBus ? assignedBus.busNumber : 'Unassigned'}</td>
                          <td className="py-2 px-4">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${student.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>
                              {student.isActive ? 'Active' : 'Inactive'}
                            </span>
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
      </div>
    </div>
  );
}
