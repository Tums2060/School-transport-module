'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// 1. Initial Mock Data
const initialBuses = [
  { id: 'BS001', name: 'Scania - Kiserian', route: 'Kiserian - Rongai - Langata', capacity: 45, trips: 2, status: 'Active' },
  { id: 'BS002', name: 'Isuzu - Thika Rd', route: 'Thika Rd - Muthaiga - CBD', capacity: 33, trips: 1, status: 'Active' },
  { id: 'BS003', name: 'Nissan - Syokimau', route: 'Syokimau - Mombasa Rd', capacity: 25, trips: 2, status: 'Maintenance' },
];

export default function BusesListPage() {
  const [buses, setBuses] = useState(initialBuses);

  // Load from localStorage if available (useful once we build the "Add Bus" page)
  useEffect(() => {
    const savedBuses = localStorage.getItem('school_buses');
    if (savedBuses) {
      setBuses(JSON.parse(savedBuses));
    } else {
      localStorage.setItem('school_buses', JSON.stringify(initialBuses));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-sm text-gray-800">
      
      {/* TOP NAVIGATION BAR (Mimicking the dark Dynamics 365 bar) */}
      <div className="bg-[#1F1F1F] text-white flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-lg">Dynamics 365 Business Central</span>
        </div>
        <div className="flex items-center space-x-4">
          <button className="hover:text-gray-300">🔍</button>
          <button className="hover:text-gray-300">⚙️</button>
          <div className="bg-pink-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
            TM
          </div>
        </div>
      </div>

      {/* SECONDARY NAVIGATION (White background, Teal text) */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <span className="font-bold text-gray-800">SCHOOL SYSTEM</span>
        <button className="hover:underline">Admissions</button>
        <button className="hover:underline">Learners Management</button>
        <button className="hover:underline font-bold border-b-2 border-teal-700 pb-1">Transport Module</button>
        <button className="hover:underline">Setups</button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="p-6 bg-white m-4 shadow-sm border border-gray-100">
        
        {/* Page Title & Actions */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-light text-gray-800">Transport: <span className="font-semibold text-gray-600">Buses List</span></h1>
          
          <div className="flex space-x-4">
            <button className="flex items-center space-x-1 text-teal-700 hover:bg-teal-50 px-3 py-1 rounded">
              <span>🔍</span> <span>Search</span>
            </button>
            {/* This will eventually link to the Add Bus page */}
            <Link href="/buses/add" className="flex items-center space-x-1 text-teal-700 hover:bg-teal-50 px-3 py-1 rounded">
              <span>➕</span> <span>New</span>
            </Link>
            <button className="flex items-center space-x-1 text-teal-700 hover:bg-teal-50 px-3 py-1 rounded">
              <span>Report ⬇️</span>
            </button>
          </div>
        </div>

        {/* DATA TABLE (Mimicking the screenshot exactly) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 border-b-2 border-gray-200">
                <th className="font-normal py-2 px-4 w-24">No. ↓</th>
                <th className="font-normal py-2 px-4">Bus Name</th>
                <th className="font-normal py-2 px-4">Route</th>
                <th className="font-normal py-2 px-4 text-right">Capacity</th>
                <th className="font-normal py-2 px-4 text-right">Trips</th>
                <th className="font-normal py-2 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {buses.map((bus, index) => (
                <tr 
                  key={bus.id} 
                  // Alternating row colors and hover effect
                  className={`border-b border-gray-100 hover:bg-teal-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className="py-2 px-4 text-teal-700 font-medium">{bus.id}</td>
                  <td className="py-2 px-4">{bus.name}</td>
                  <td className="py-2 px-4">{bus.route}</td>
                  <td className="py-2 px-4 text-right">{bus.capacity}</td>
                  <td className="py-2 px-4 text-right">{bus.trips}</td>
                  <td className="py-2 px-4">{bus.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State fallback */}
        {buses.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            No buses found. Click "+ New" to add one.
          </div>
        )}

      </div>
    </div>
  );
}