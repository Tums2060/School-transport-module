'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldAlert, Bus, User, Loader2 } from 'lucide-react';

export default function DriverLoginPage() {
  const router = useRouter();
  const [busNumber, setBusNumber] = useState('');
  const [password, setPassword] = useState('');
  const [driverName, setDriverName] = useState('');
  const [deviceIdentifier, setDeviceIdentifier] = useState('');
  
  const [needDriverNamePrompt, setNeedDriverNamePrompt] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Check local storage for persistent driver configurations
    let devId = localStorage.getItem('driver_device_identifier');
    if (!devId) {
      devId = 'driver_device_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('driver_device_identifier', devId);
    }
    setDeviceIdentifier(devId);

    const savedName = localStorage.getItem('driver_name');
    if (savedName) {
      setDriverName(savedName);
      setNeedDriverNamePrompt(false); // We already have driver name persisted on this device
    }
    setIsMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!busNumber.trim()) {
      setError('Please enter the Bus Number Plate.');
      return;
    }
    if (!password) {
      setError('Please enter the password.');
      return;
    }
    if (needDriverNamePrompt && !driverName.trim()) {
      setError('Please enter your full name as the active driver.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/driver/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busNumber: busNumber.trim().toUpperCase(),
          password,
          driverName: driverName.trim(),
          deviceIdentifier
        })
      });
      const result = await res.json();

      if (result.success) {
        // Persist session details locally
        localStorage.setItem('driver_name', driverName.trim());
        localStorage.setItem('driver_session', JSON.stringify(result.session));
        // Set user role for main layout compatibility
        localStorage.setItem('user', JSON.stringify({
          username: busNumber.trim().toUpperCase(),
          fullName: driverName.trim(),
          role: 'Bus_Driver'
        }));
        
        router.push('/driver/dashboard');
      } else {
        setError(result.message || 'Authentication failed. Please verify credentials.');
      }
    } catch {
      setError('Connection failure. Unable to reach backend.');
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 font-sans text-xs">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded p-6 w-full max-w-sm shadow-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="h-10 w-10 bg-teal-50 dark:bg-teal-950/20 rounded-full flex items-center justify-center text-teal-700 mb-2">
            <Bus size={20} />
          </div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Driver Portal</h1>
          <p className="text-gray-400 mt-1">Authenticate vehicle and session to begin trips</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-3 rounded text-red-700 dark:text-red-400 flex items-start gap-2">
            <ShieldAlert size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-500 mb-1">Bus Number Plate</label>
            <div className="relative">
              <input
                value={busNumber}
                onChange={(e) => setBusNumber(e.target.value)}
                placeholder="e.g. KCA 123A"
                className="w-full border border-gray-300 dark:border-gray-600 rounded pl-3 pr-3 py-2 bg-white dark:bg-gray-900 uppercase font-semibold text-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-500 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Prompt for driver name on first device setup or if cleared */}
          {needDriverNamePrompt ? (
            <div>
              <label className="block text-gray-500 mb-1">Driver's Full Name</label>
              <div className="relative">
                <input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">This registers your device session for trip and attendance rosters.</p>
            </div>
          ) : (
            <div className="bg-teal-50/40 dark:bg-teal-950/10 border border-teal-100 dark:border-teal-900/30 p-2.5 rounded flex items-center justify-between text-teal-800 dark:text-teal-400">
              <div className="flex items-center gap-1.5">
                <User size={13} />
                <span>Driver: <strong>{driverName}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setNeedDriverNamePrompt(true)}
                className="text-[10px] hover:underline"
              >
                Change
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-1 bg-teal-700 hover:bg-teal-800 disabled:bg-teal-700/50 text-white py-2 rounded font-semibold transition-colors mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={13} /> Initializing session...
              </>
            ) : (
              <>
                <KeyRound size={13} /> Sign In to Bus
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
