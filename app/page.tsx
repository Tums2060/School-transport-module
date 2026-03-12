'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState('USER');
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBuses: 0,
    activeBuses: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Client-side initialization - runs after component mounts
  useEffect(() => {
    // Use queueMicrotask to avoid synchronous setState warning
    queueMicrotask(() => {
      // Load user data from localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setUserName(user.fullName || user.username);
        } catch (err) {
          console.error('Error parsing user data:', err);
        }
      }
      
      // Mark as mounted to enable client-only components
      setIsMounted(true);
    });
  }, []);

  // Fetch stats from API
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats');
        const result = await response.json();
        
        if (result.success) {
          setStats({
            totalStudents: result.data.students,
            totalBuses: result.data.buses,
            activeBuses: result.data.buses, // Counting only active buses
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }

    if (isMounted) {
      fetchStats();
    }
  }, [isMounted]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-gray-900">
      {/* Main Content Area */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {getGreeting()}, {userName}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Here is what is happening with your transport system today
          </p>
        </div>

        {/* Key Metrics - D365 Style Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Total Students */}
          <div className="bg-white dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Total Students
                </p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-white mb-1">
                  {stats.totalStudents}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                  Active enrollment
                </p>
              </div>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Buses */}
          <div className="bg-white dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Active Buses
                </p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-white mb-1">
                  {stats.activeBuses}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  of {stats.totalBuses} total fleet
                </p>
              </div>
              <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Routes */}
          <div className="bg-white dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Active Routes
                </p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-white mb-1">
                  3
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  All on schedule
                </p>
              </div>
              <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
            </div>
          </div>

        </div>

        {/* Quick Actions Grid - D365 Style */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link
                href="/buses/new"
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-4 hover:border-[#0078d4] hover:shadow-md transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-[#0078d4]/10 dark:bg-[#0078d4]/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#0078d4] transition-colors">
                    <svg className="w-6 h-6 text-[#0078d4] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Add Bus</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Register new</p>
                </div>
              </Link>

              <Link
                href="/students"
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-4 hover:border-[#0078d4] hover:shadow-md transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-[#0078d4]/10 dark:bg-[#0078d4]/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#0078d4] transition-colors">
                    <svg className="w-6 h-6 text-[#0078d4] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Students</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">View all</p>
                </div>
              </Link>

              <Link
                href="/buses"
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-4 hover:border-[#0078d4] hover:shadow-md transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-[#0078d4]/10 dark:bg-[#0078d4]/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#0078d4] transition-colors">
                    <svg className="w-6 h-6 text-[#0078d4] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Buses</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fleet mgmt</p>
                </div>
              </Link>

              <Link
                href="/routes"
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm p-4 hover:border-[#0078d4] hover:shadow-md transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-[#0078d4]/10 dark:bg-[#0078d4]/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#0078d4] transition-colors">
                    <svg className="w-6 h-6 text-[#0078d4] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Routes</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">View all</p>
                </div>
              </Link>
          </div>
        </div>

        {/* Recent Activity - D365 Timeline Style */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Recent Activity
          </h3>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      New student registered
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      Amani Wanjiku added to Foundation Red stream
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">2 hours ago</p>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Bus maintenance completed
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      Bus KCD (B-004) servicing completed and ready for operation
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">5 hours ago</p>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Route schedule updated
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      North Route (NR-001) pickup time adjusted to 06:30 AM
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">1 day ago</p>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="p-3 text-center border-t border-gray-200 dark:border-gray-700">
                <button className="text-sm text-[#0078d4] dark:text-blue-400 hover:underline font-medium">
                  View all activities
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            © 2026 School Transport Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
