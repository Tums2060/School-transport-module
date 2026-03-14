'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type SessionUser = {
  username?: string;
  fullName?: string;
  role?: string;
};

export default function TopNav() {
  const [now, setNow] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userName, setUserName] = useState('USER');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

      document.documentElement.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light');
      setIsDarkMode(shouldBeDark);

      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user: SessionUser = JSON.parse(userData);
          setUserName(user.fullName || user.username || 'USER');
          setUserRole(user.role || '');
        } catch {
          setUserName('USER');
          setUserRole('');
        }
      }

      setIsMounted(true);
    });
  }, []);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };

  return (
    <header className="bg-[#002050] dark:bg-gray-950 text-white shadow-lg">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-semibold tracking-tight hover:text-blue-200">
              ZANABUNI
            </Link>
            <span className="text-sm text-gray-300">Transport Management</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-300">
              {isMounted
                ? now.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : ''}
            </span>

            {isMounted && (
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 hover:bg-[#003875] rounded transition-colors"
                  aria-label="Toggle theme"
                >
                  {isDarkMode ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </button>

                <div className="border-l border-[#003875] h-6"></div>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#0078d4] rounded-full flex items-center justify-center text-sm font-semibold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    {userRole && (
                      <p className="text-xs text-gray-300 leading-none mt-0.5">
                        {userRole.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/login"
                    onClick={() => localStorage.removeItem('user')}
                    className="ml-2 p-1.5 hover:bg-[#003875] rounded transition-colors"
                    title="Sign out"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
