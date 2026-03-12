'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// We define a type for our bus to keep TypeScript happy
type Bus = {
  id: string;
  name: string;
  route: string;
  capacity: number;
  trips: number;
  status: string;
  time?: string; // Adding optional time property for the demo
};

export default function SearchBusesPage() {
  const [allBuses, setAllBuses] = useState<Bus[]>([]);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('All');

  // Load data from localStorage on mount
  useEffect(() => {
    const savedBuses = localStorage.getItem('school_buses');
    if (savedBuses) {
      // For the sake of the demo, let's randomly assign Morning/Evening to existing buses 
      // if they don't have a time set, so the filter actually works when you test it.
      const parsedBuses = JSON.parse(savedBuses).map((bus: Bus, index: number) => ({
        ...bus,
        time: bus.time || (index % 2 === 0 ? 'Morning' : 'Evening') 
      }));
      setAllBuses(parsedBuses);
    }
  }, []);

  // DERIVED STATE: This automatically filters the list whenever a user types or changes a dropdown
  const filteredBuses = allBuses.filter((bus) => {
    const matchesSearch = 
      bus.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      bus.route.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || bus.status === statusFilter;
    const matchesTime = timeFilter === 'All' || bus.time === timeFilter;

    return matchesSearch && matchesStatus && matchesTime;
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-sm text-gray-800 flex flex-col">
      
      {/* TOP NAVIGATION BAR */}
      <div className="bg-[#1F1F1F] text-white flex items-center px-4 py-2 shrink-0">
        <span className="font-semibold text-lg">Dynamics 365 Business Central</span>
      </div>

      {/* SECONDARY NAVIGATION */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-6 text-teal-700 shrink-0">
        <span className="font-bold text-gray-800">SCHOOL SYSTEM</span>
        <Link href="/buses" className="hover:underline">Buses List</Link>
        <span className="font-bold border-b-2 border-teal-700 pb-1 cursor-default">Search & Filter</span>
      </div>

      {/* MAIN LAYOUT: Filter Pane (Left) + Results (Right) */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANE: Filters */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col space-y-6 shrink-0 overflow-y-auto">
          <div>
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center justify-between">
              <span>Filter list by...</span>
              <span className="text-gray-400 cursor-pointer hover:text-gray-800">⚙️</span>
            </h2>

            {/* Text Search Filter */}
            <div className="mb-4">
              <label className="block text-gray-500 mb-1">Search Name/Route</label>
              <input 
                type="text" 
                placeholder="e.g. Kiserian..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Time of Travel Filter */}
            <div className="mb-4">
              <label className="block text-gray-500 mb-1">Time of Travel</label>
              <select 
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-teal-500 bg-white"
              >
                <option value="All">All Times</option>
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="mb-4">
              <label className="block text-gray-500 mb-1">Bus Status</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-teal-500 bg-white"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Out of Service">Out of Service</option>
              </select>
            </div>
          </div>

          <button 
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('All');
              setTimeFilter('All');
            }}
            className="text-teal-700 hover:underline text-left"
          >
            Reset filters
          </button>
        </div>

        {/* RIGHT PANE: Results Table */}
        <div className="flex-1 p-6 bg-gray-50 overflow-y-auto">
          <div className="bg-white shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex justify-between items-center">
              <span className="font-semibold text-gray-700">
                Results ({filteredBuses.length})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-500 border-b-2 border-gray-200 bg-gray-50/50">
                    <th className="font-normal py-2 px-4 w-24">No.</th>
                    <th className="font-normal py-2 px-4">Bus Name</th>
                    <th className="font-normal py-2 px-4">Route</th>
                    <th className="font-normal py-2 px-4">Time</th>
                    <th className="font-normal py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuses.length > 0 ? (
                    filteredBuses.map((bus, index) => (
                      <tr 
                        key={bus.id} 
                        className={`border-b border-gray-100 hover:bg-teal-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <td className="py-2 px-4 text-teal-700 font-medium">{bus.id}</td>
                        <td className="py-2 px-4">{bus.name}</td>
                        <td className="py-2 px-4">{bus.route}</td>
                        <td className="py-2 px-4 text-gray-600">{bus.time}</td>
                        <td className="py-2 px-4">{bus.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-400">
                        No buses match your current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}