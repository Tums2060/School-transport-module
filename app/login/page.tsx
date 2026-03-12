'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Store user data in localStorage (in production, use secure session/JWT)
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Redirect to dashboard
        router.push('/');
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Demo credentials to show users
  const demoCredentials = [
    { role: 'Superior Admin', username: 'superadmin', password: 'super@2026' },
    { role: 'Admin', username: 'admin1', password: 'admin@2026' },
    { role: 'Bus Driver', username: 'driver1', password: 'driver@2026' },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f3f2f1] dark:bg-gray-900 px-6 py-8">
      <div className="max-w-6xl mx-auto border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-2 bg-[#002050] text-white p-8 flex flex-col justify-between">
            <div>
              <h1 className="text-3xl font-semibold leading-tight">School Transport Management</h1>
              <p className="text-sm text-blue-100 mt-4">
                Securely access routes, buses, and student transport records.
              </p>
            </div>

            <div className="mt-10">
              <p className="text-xs uppercase text-blue-200 mb-3">Demo Credentials</p>
              <div className="space-y-2">
                {demoCredentials.map((cred, idx) => (
                  <div key={idx} className="bg-[#003875] border border-[#004b9a] px-3 py-2 text-sm">
                    <p className="font-semibold">{cred.role}</p>
                    <p className="text-blue-100 text-xs mt-1">{cred.username} / {cred.password}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 p-8 lg:p-10">
            <div className="max-w-md">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Sign in</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Use your account to continue</p>

              {error && (
                <div className="mt-5 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
                    placeholder="Enter your username"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white font-medium py-2.5 px-4 rounded transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">© 2026 School Transport Management System</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
