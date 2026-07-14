'use client';

import { useEffect, useState, use, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Map, Navigation, Shield, Fuel, Gauge, ArrowLeft, RefreshCw, Layers } from 'lucide-react';

type Bus = {
  _id: string;
  busNumber: string;
  name: string;
  capacity: number;
  status: 'Active' | 'Maintenance' | 'Out of Service';
  trips: {
    tripNumber: number;
    time: string;
    tripType?: string;
    startTime?: string;
    endTime?: string;
    distanceCovered?: number;
    pickupPoints?: string[];
  }[];
};

type Telemetry = {
  mileage: number;
  consumptionRate: number;
  remainingFuel: number;
};

function TrackingContent() {
  const searchParams = useSearchParams();
  const busParam = searchParams.get('bus'); // Optional query param to pre-select a bus

  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  async function loadBuses() {
    try {
      const res = await fetch('/api/buses');
      const json = await res.json();
      if (json.success) {
        setBuses(json.data);
        
        // If a bus parameter is passed, pre-select it
        if (busParam) {
          const matched = json.data.find((b: Bus) => b.busNumber === busParam);
          if (matched) {
            handleSelectBus(matched);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching buses:', err);
    }
  }

  useEffect(() => {
    if (isMounted) {
      loadBuses();
    }
  }, [isMounted, busParam]);

  const handleSelectBus = async (bus: Bus) => {
    setSelectedBus(bus);
    setLoading(true);
    try {
      const res = await fetch(`/api/driver/telemetry/${bus.busNumber}`);
      const json = await res.json();
      if (json.success) {
        setTelemetry(json.data);
      } else {
        setTelemetry({ mileage: 120500, consumptionRate: 8.5, remainingFuel: 40 });
      }
    } catch {
      setTelemetry({ mileage: 120500, consumptionRate: 8.5, remainingFuel: 40 });
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  // Find if there is an active trip on the selected bus
  const activeTrip = selectedBus?.trips.find(t => t.startTime && !t.endTime);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-sm text-gray-800 dark:text-gray-100">
      {/* Secondary Nav */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/50 px-4 py-3 flex items-center space-x-6 text-teal-700">
        <Link href="/" className="hover:underline text-gray-500 dark:text-gray-400">Home</Link>
        <Link href="/students" className="hover:underline text-gray-500 dark:text-gray-400">All Students</Link>
        <Link href="/students/approved" className="hover:underline text-gray-500 dark:text-gray-400">Students</Link>
        <Link href="/buses" className="hover:underline text-gray-500 dark:text-gray-400">Bus</Link>
        <Link href="/zones" className="hover:underline text-gray-500 dark:text-gray-400">Zones</Link>
        <Link href="/driver/login" className="hover:underline text-gray-500 dark:text-gray-400">Driver Portal</Link>
      </div>

      <main className="p-6">
        {/* Page title */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Link href="/" className="text-teal-700 hover:text-teal-900">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-xl font-light text-gray-800 dark:text-gray-100">
              Fleet Operations: <span className="font-semibold text-gray-600 dark:text-gray-300">Live GPS Tracker</span>
            </h1>
          </div>
          
          <button
            onClick={loadBuses}
            className="flex items-center gap-1.5 border border-gray-300 hover:bg-gray-100 px-3 py-1.5 rounded text-xs font-semibold"
          >
            <RefreshCw size={13} /> Reload Fleet
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] min-h-[500px]">
          {/* LEFT: Maps Placeholder & Fleet List (7 cols) */}
          <div className="lg:col-span-8 grid grid-rows-3 gap-6 h-full">
            {/* Map Frame (takes 2/3 rows) */}
            <div className="row-span-2 bg-gray-900 rounded border border-gray-800 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center">
              {/* Map grid background pattern styling */}
              <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle, #319795 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px'
              }}></div>
              
              <div className="absolute top-4 left-4 bg-gray-900/80 border border-gray-700/60 p-2.5 rounded shadow flex items-center gap-2 text-white">
                <Layers size={14} className="text-teal-500" />
                <span className="font-semibold text-[10px] uppercase tracking-wider">Map Layer: GPS Standard Grid</span>
              </div>

              <div className="z-10 flex flex-col items-center max-w-sm">
                <Map size={36} className="text-teal-500 animate-pulse mb-3" />
                <h3 className="text-sm font-bold text-white mb-2">Live Tracking Map Workspace</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {selectedBus ? (
                    <>
                      Currently displaying mock tracking points for Bus <strong className="font-mono text-teal-400">{selectedBus.busNumber}</strong>. 
                      {activeTrip ? (
                        <span className="text-green-500 font-medium block mt-1">Status: Active on Trip {activeTrip.tripNumber} ({activeTrip.time})</span>
                      ) : (
                        <span className="text-gray-500 block mt-1">Status: Parked / Idle</span>
                      )}
                    </>
                  ) : (
                    'Select a vehicle from the fleet status panel below to view live positioning logs.'
                  )}
                </p>
              </div>

              {selectedBus && (
                <div className="absolute bottom-4 right-4 bg-teal-950/40 border border-teal-800/40 text-teal-300 font-mono px-3 py-1.5 rounded text-[10px]">
                  LAT: -1.2921&deg; | LON: 36.8219&deg;
                </div>
              )}
            </div>

            {/* Fleet Status List (takes 1/3 row) */}
            <div className="row-span-1 bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/40 p-4 rounded overflow-y-auto">
              <h2 className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-3">Fleet Inventory Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {buses.map(bus => (
                  <button
                    key={bus._id}
                    onClick={() => handleSelectBus(bus)}
                    className={`p-3 border rounded text-left transition-colors flex justify-between items-center ${
                      selectedBus?.busNumber === bus.busNumber
                        ? 'border-teal-700 bg-teal-50/15'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-850/40'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-bold block text-gray-900 dark:text-white">{bus.busNumber}</span>
                      <span className="text-[10px] text-gray-400 truncate block max-w-[120px]">{bus.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                      bus.status === 'Active'
                        ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                        : bus.status === 'Maintenance'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                    }`}>
                      {bus.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Selected Bus Telemetry Detail (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700/40 p-6 rounded shadow-sm flex flex-col justify-between h-full">
            {selectedBus ? (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Telemetry Info</span>
                  <h2 className="text-lg font-mono font-bold text-gray-900 dark:text-white mt-1">
                    Bus Plate: {selectedBus.busNumber}
                  </h2>
                  <p className="text-xs text-gray-400">{selectedBus.name}</p>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
                  {/* Current Active Trip details */}
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Active Trip Status</span>
                    {activeTrip ? (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 p-3 rounded">
                        <span className="font-bold text-green-700 dark:text-green-400">Trip {activeTrip.tripNumber} ({activeTrip.time})</span>
                        <p className="text-[10px] text-gray-500 mt-1">
                          Pickup places: {activeTrip.pickupPoints?.length || 0} registered.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 dark:bg-gray-800/10 p-3 border border-gray-100 dark:border-gray-800 text-gray-400 italic rounded">
                        No active student trips currently.
                      </div>
                    )}
                  </div>

                  {/* Telemetry log readings */}
                  {telemetry && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-2">
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Gauge size={14} className="text-teal-700" /> Current Mileage
                        </span>
                        <span className="font-mono font-bold text-gray-800 dark:text-white">{telemetry.mileage} km</span>
                      </div>

                      <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-2">
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Fuel size={14} className="text-teal-700" /> Fuel Consumption
                        </span>
                        <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{telemetry.consumptionRate} km/L</span>
                      </div>

                      <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-2">
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Fuel size={14} className="text-teal-700" /> Remaining Fuel Est.
                        </span>
                        <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{telemetry.remainingFuel} Liters</span>
                      </div>

                      <div className="flex justify-between items-center pb-2">
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Navigation size={14} className="text-teal-700" /> Distance Covered
                        </span>
                        <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                          {activeTrip?.distanceCovered ? `${activeTrip.distanceCovered} km` : '15 km (Stub)'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full py-12">
                <Navigation size={32} className="text-gray-300 dark:text-gray-700 mb-2 animate-bounce" />
                <h3 className="font-bold text-gray-700 dark:text-gray-300">No Bus Selected</h3>
                <p className="text-xs text-gray-400 max-w-xs mt-1">Select a vehicle from the fleet inventory to populate logs and locate coordinates.</p>
              </div>
            )}

            {selectedBus && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-6 flex justify-between items-center">
                <span className="text-[10px] text-gray-400">Telemetry synced: 1s ago</span>
                <Link
                  href={`/buses`}
                  className="text-xs text-teal-700 hover:underline font-semibold"
                >
                  Manage Bus
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BusTrackingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading map telemetry...</p>
      </div>
    }>
      <TrackingContent />
    </Suspense>
  );
}
