'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState('USER');
  const [userRole, setUserRole] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBuses: 0,
    activeBuses: 0,
    pendingApprovals: 0,
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
          setUserRole(user.role);
        } catch (err) {
          console.error('Error parsing user data:', err);
        }
      }
      
      // Initialize theme
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
      
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      }
      
      // Mark as mounted to enable client-only components
      setIsMounted(true);
    });
  }, []);

  // Fetch stats from API
  useEffect(() => {
    async function fetchStats() {
      try {
        console.log('Fetching stats from API...');
        const response = await fetch('/api/stats');
        console.log('API Response status:', response.status);
        const result = await response.json();
        console.log('API Result:', result);
        
        if (result.success) {
          console.log('Setting stats:', {
            totalStudents: result.data.students,
            totalBuses: result.data.buses,
            activeBuses: result.data.buses,
          });
          setStats({
            totalStudents: result.data.students,
            totalBuses: result.data.buses,
            activeBuses: result.data.buses, // Counting only active buses
            pendingApprovals: 0,
          });
        } else {
          console.error('API returned success: false', result);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }

    if (isMounted) {
      console.log('Component mounted, fetching stats...');
      fetchStats();
    }
  }, [isMounted]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                COMPANY
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                School Transport Management System
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
              
              {/* User Info and Logout */}
              {isMounted && (
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{userName}</p>
                    {userRole && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {userRole.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/login"
                    onClick={() => localStorage.removeItem('user')}
                    className="p-2 rounded-lg bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                    title="Logout"
                  >
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </Link>
                </div>
              )}
              
              {/* Dark Mode Toggle - Only render on client to avoid hydration mismatch */}
              {isMounted && (
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Toggle dark mode"
                >
                  {isDarkMode ? (
                    // Sun icon for light mode
                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    // Moon icon for dark mode
                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Greeting Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-light text-gray-700 dark:text-gray-200">
            {getGreeting()}, <span className="font-semibold">{userName}</span>!
          </h2>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Total Students Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Total Students
                </p>
                <h3 className="text-4xl font-bold text-gray-900 dark:text-white">
                  {stats.totalStudents}
                </h3>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Buses Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Total Buses
                </p>
                <h3 className="text-4xl font-bold text-gray-900 dark:text-white">
                  {stats.totalBuses}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.activeBuses} active
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <svg className="w-8 h-8 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Add New Bus */}
            <Link
              href="/buses/new"
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              <div className="flex flex-col items-center text-center">
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <h4 className="font-semibold text-lg mb-1">Add New Bus</h4>
                <p className="text-sm opacity-90">Register a new bus</p>
              </div>
            </Link>

            {/* View Students List */}
            <Link
              href="/students"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              <div className="flex flex-col items-center text-center">
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h4 className="font-semibold text-lg mb-1">View Students</h4>
                <p className="text-sm opacity-90">Manage student records</p>
              </div>
            </Link>

            {/* View Buses */}
            <Link
              href="/buses"
              className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              <div className="flex flex-col items-center text-center">
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h4 className="font-semibold text-lg mb-1">View Buses</h4>
                <p className="text-sm opacity-90">Fleet management</p>
              </div>
            </Link>

            {/* View Routes */}
            <Link
              href="/routes"
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              <div className="flex flex-col items-center text-center">
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 className="font-semibold text-lg mb-1">View Routes</h4>
                <p className="text-sm opacity-90">Download/Print routes</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Approvals Section - Inspired by D365 */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Approvals
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
              Pending Approvals
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Requests Sent for Approval */}
              <div className="bg-teal-600 hover:bg-teal-700 rounded-lg p-6 text-white cursor-pointer transition-colors">
                <h4 className="text-sm font-medium mb-2">Requests Sent for Approval</h4>
                <p className="text-5xl font-bold mb-4">{stats.pendingApprovals}</p>
                <div className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Requests to Approve */}
              <div className="bg-teal-600 hover:bg-teal-700 rounded-lg p-6 text-white cursor-pointer transition-colors">
                <h4 className="text-sm font-medium mb-2">Requests to Approve</h4>
                <p className="text-5xl font-bold mb-4">{stats.pendingApprovals}</p>
                <div className="flex items-center text-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Recent Activity
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    New student registered
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    GLORIA WAMBUI NJAMBI added to the system
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Bus maintenance completed
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Bus #7 routine maintenance completed successfully
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">5 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Route updated
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Route #3 schedule modified for optimal efficiency
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">1 day ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © {currentTime.getFullYear()} COMPANY - School Transport Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
