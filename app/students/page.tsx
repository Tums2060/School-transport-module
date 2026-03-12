'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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
  const [showFilters, setShowFilters] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
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
      const term = quickSearch.trim().toLowerCase();
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
  }, [students, busMap, filters, quickSearch]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
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

  return (
    <div className="min-h-screen bg-[#f3f2f1] dark:bg-gray-900">
      <main className="max-w-screen-2xl mx-auto px-6 py-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Students Card</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">All student details and assigned buses</p>
          </div>
          <Link
            href="/"
            className="text-sm px-3 py-1.5 rounded bg-[#003875] hover:bg-[#004b9a] text-white transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className={`grid gap-4 ${showFilters ? 'grid-cols-1 xl:grid-cols-[280px_1fr]' : 'grid-cols-1'}`}>
          {showFilters && (
            <aside className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-4 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Views</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearFilters}
                  className="text-xs text-[#0078d4] hover:underline"
                >
                  Reset filters
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Admission Number</label>
                <input
                  value={filters.admissionNumber}
                  onChange={(e) => handleFilterChange('admissionNumber', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Student Name</label>
                <input
                  value={filters.studentName}
                  onChange={(e) => handleFilterChange('studentName', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Parent Name</label>
                <input
                  value={filters.parentName}
                  onChange={(e) => handleFilterChange('parentName', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Grade</label>
                <select
                  value={filters.grade}
                  onChange={(e) => handleFilterChange('grade', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All grades</option>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Stream</label>
                <select
                  value={filters.stream}
                  onChange={(e) => handleFilterChange('stream', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All streams</option>
                  {streamOptions.map((stream) => (
                    <option key={stream} value={stream}>
                      {stream}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Gender</label>
                <select
                  value={filters.gender}
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Assigned Bus</label>
                <select
                  value={filters.busId}
                  onChange={(e) => handleFilterChange('busId', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All buses</option>
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.busNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Student Status</label>
                <select
                  value={filters.activeStatus}
                  onChange={(e) => handleFilterChange('activeStatus', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            </aside>
          )}

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-semibold">{filteredStudents.length}</span> of <span className="font-semibold">{students.length}</span> students
                </p>
                <input
                  type="text"
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Search admission, student, grade, stream, parent, bus"
                  className="w-72 px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6L14 13.5V20a1 1 0 01-1.447.894l-2-1A1 1 0 0110 19v-5.5L3.2 4.6A1 1 0 013 4z" />
                  </svg>
                  {showFilters ? 'Hide Filters' : 'Filters'}
                </button>
                <div className="text-xs text-gray-500 dark:text-gray-400">List view</div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-sm text-gray-600 dark:text-gray-300">Loading students...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Admission No.</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Student Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Grade</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Stream</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Gender</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Parent Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Parent Contact</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Address</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Assigned Bus</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Bus Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Student Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredStudents.map((student) => {
                      const assignedBus = student.busAssigned ? busMap.get(student.busAssigned) : null;

                      return (
                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{student.admissionNumber}</td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{student.fullName}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{student.grade}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{student.stream || '-'}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{student.gender}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{student.parentName}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{student.parentContact}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{student.address}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {assignedBus ? assignedBus.busNumber : 'Unassigned'}
                          </td>
                          <td className="px-4 py-3">
                            {assignedBus ? (
                              <span
                                className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                  assignedBus.status === 'Active'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                                }`}
                              >
                                {assignedBus.status}
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                Not Assigned
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                student.isActive
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                              }`}
                            >
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
          </section>
        </div>
      </main>
    </div>
  );
}
