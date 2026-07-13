'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FinanceHome() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState('Finance Manager');
  const [isMounted, setIsMounted] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          // Redirect non-Finance users away
          if (user.role && user.role !== 'Finance_Manager') {
            router.replace('/');
            return;
          }
          setUserName(user.fullName || user.username || 'Finance Manager');
        } catch {
          // ignore
        }
      }
      setIsMounted(true);
    });
  }, [router]);

  useEffect(() => {
    if (!isMounted) return;
    fetch('/api/students')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTotalStudents(data.data.length);
      })
      .catch(() => {});
  }, [isMounted]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm flex items-center justify-center">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm text-gray-800 dark:text-gray-100">
      {/* Finance module secondary nav */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Finance Home</span>
        <Link href="/finance" className="hover:underline">Students List</Link>
      </div>

      <main className="px-6 py-6">
        {/* Greeting */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {getGreeting()}, {userName}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Finance Manager — student fees and billing overview
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">Total Students</p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-white mb-1">{totalStudents}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Active enrollment</p>
              </div>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">Pending Fees</p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-white mb-1">—</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Coming soon</p>
              </div>
              <div className="p-2.5 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">Collected This Term</p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-white mb-1">—</p>
                <p className="text-xs text-green-600 dark:text-green-400">Coming soon</p>
              </div>
              <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/finance"
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-4 hover:border-[#0078d4] hover:shadow-md transition-all group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-[#0078d4]/10 dark:bg-[#0078d4]/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#0078d4] transition-colors">
                  <svg className="w-6 h-6 text-[#0078d4] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Students List</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">View all students</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Placeholder notice */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 rounded-sm p-4 text-sm text-yellow-800 dark:text-yellow-300">
          <strong>Temporary page:</strong> Full finance features (fee collection, billing, reports) will be built here.
        </div>
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
        <div className="px-6 py-4">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            © 2026 School Finance Management. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
