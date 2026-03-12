'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddBusPage() {
  const router = useRouter();

  // State to hold our form inputs
  const [formData, setFormData] = useState({
    name: '',
    route: '',
    capacity: '',
    trips: '',
    status: 'Active',
  });

  // Handle typing in the inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle saving to localStorage
  const handleSave = () => {
    // 1. Get existing buses from localStorage (or an empty array if none exist)
    const existingData = localStorage.getItem('school_buses');
    const buses = existingData ? JSON.parse(existingData) : [];

    // 2. Create a generic ID for the new bus (e.g., BS004)
    const newId = `BS00${buses.length + 1}`;

    // 3. Format the new bus object
    const newBus = {
      id: newId,
      name: formData.name,
      route: formData.route,
      // Convert text inputs to numbers for capacity and trips
      capacity: parseInt(formData.capacity) || 0, 
      trips: parseInt(formData.trips) || 0,
      status: formData.status,
    };

    // 4. Add to array and save back to localStorage
    buses.push(newBus);
    localStorage.setItem('school_buses', JSON.stringify(buses));

    // 5. Redirect back to the main buses list
    router.push('/buses');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-sm text-gray-800">
      
      {/* TOP NAVIGATION BAR (Mimicking Dynamics 365) */}
      <div className="bg-[#1F1F1F] text-white flex items-center px-4 py-2">
        <span className="font-semibold text-lg">Dynamics 365 Business Central</span>
      </div>

      {/* FORM CARD CONTAINER */}
      <div className="max-w-5xl mx-auto mt-6 bg-white shadow-sm border border-gray-200">
        
        {/* Card Header & Actions */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/buses" className="text-gray-500 hover:text-gray-800 text-lg">
              ←
            </Link>
            <h1 className="text-2xl font-light text-gray-800">New Bus Card</h1>
          </div>
          
          <div className="flex space-x-4">
            <button 
              onClick={handleSave}
              className="flex items-center space-x-1 text-teal-700 hover:bg-teal-50 px-3 py-1 rounded font-medium"
            >
              <span>✔️</span> <span>Save</span>
            </button>
            <button className="flex items-center space-x-1 text-gray-500 hover:bg-gray-50 px-3 py-1 rounded">
              <span>🗑️</span>
            </button>
          </div>
        </div>

        {/* Tab Links (Visual only for the demo) */}
        <div className="px-6 py-2 border-b border-gray-200 flex space-x-6 text-gray-600">
          <span className="font-semibold text-teal-700 border-b-2 border-teal-700 pb-1">General Info</span>
          <span className="hover:text-teal-700 cursor-pointer">Route Details</span>
          <span className="hover:text-teal-700 cursor-pointer">Driver Info</span>
        </div>

        {/* FORM FIELDS */}
        <div className="p-6">
          <h2 className="font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
            Bus General Information
          </h2>

          {/* Two-Column Grid layout mimicking the screenshot */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            
            {/* Left Column */}
            <div className="space-y-4">
              <div className="flex items-center">
                <label className="w-1/3 text-gray-500">Bus Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Scania - Kiserian"
                  className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center">
                <label className="w-1/3 text-gray-500">Main Route</label>
                <input 
                  type="text" 
                  name="route"
                  value={formData.route}
                  onChange={handleChange}
                  placeholder="e.g. Kiserian - Rongai"
                  className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="flex items-center">
                <label className="w-1/3 text-gray-500">Capacity (Students)</label>
                <input 
                  type="number" 
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center">
                <label className="w-1/3 text-gray-500">Daily Trips</label>
                <input 
                  type="number" 
                  name="trips"
                  value={formData.trips}
                  onChange={handleChange}
                  className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center">
                <label className="w-1/3 text-gray-500">Status</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-teal-500 bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Out of Service">Out of Service</option>
                </select>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}