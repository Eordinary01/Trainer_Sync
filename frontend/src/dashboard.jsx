import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [trainerName, setTrainerName] = useState("Jane Doe"); 
  const [clockedIn, setClockedIn] = useState(false); 
  const [clockInTime, setClockInTime] = useState("09:00 AM");
  const navigate = useNavigate(); // For navigation to the Leave page

  const handleClockAction = () => {
    if (clockedIn) {
      alert("Clock Out successful! Calculating total hours...");
    } else {
      alert("Fetching location... Clock In recorded!");
    }
    setClockedIn(!clockedIn);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      
      {/* 1. Header (Navbar) - White background and shadow */}
      <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-blue-600">TrainerSync</h1>
        <div className="flex items-center space-x-4">
          <span className="text-gray-500 hover:text-blue-600 cursor-pointer text-xl">
            🔔 
          </span>
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            JD 
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 md:p-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Welcome, {trainerName}</h2>

        {/* Grid Container for Cards (Responsive layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 2. Clock-In/Out Card (Action Feature) */}
          <div className="bg-white p-6 rounded-xl shadow-lg col-span-1 border-t-4 border-blue-600">
            <h3 className="text-lg font-medium mb-4 text-gray-700">Daily Check-In (FR3.1)</h3>
            
            <p className={`text-xl font-bold mb-6 ${clockedIn ? 'text-green-600' : 'text-red-600'}`}>
              {clockedIn 
                ? `Status: Clocked In at ${clockInTime}` 
                : "Status: Not Clocked In"}
            </p>

            <button
              onClick={handleClockAction}
              className={`w-full py-4 rounded-lg font-bold text-lg text-white transition-colors 
                ${clockedIn 
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
                }`}
            >
              {clockedIn ? "CLOCK OUT" : "CLOCK IN"}
            </button>
            
            <p className="text-sm text-gray-500 mt-3 text-center">
              *Location tracking active only during Clocked In state (FR3.3)
            </p>
          </div>

          {/* 3. Weekly Working Hours Card (Visualization Placeholder) */}
          <div className="bg-white p-6 rounded-xl shadow-lg col-span-1">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Weekly Working Hours</h3>
            
            <div className="h-40 flex justify-around items-end p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-1/6 h-2/3 bg-blue-400 rounded-t-sm" title="Mon: 8h"></div>
              <div className="w-1/6 h-3/4 bg-blue-500 rounded-t-sm" title="Tue: 9h"></div>
              <div className="w-1/6 h-1/2 bg-blue-400 rounded-t-sm" title="Wed: 6h"></div>
              <div className="w-1/6 h-full bg-blue-600 rounded-t-sm" title="Thu: 10h"></div>
              <div className="w-1/6 h-1/4 bg-blue-300 rounded-t-sm" title="Fri: 4h"></div>
            </div>
            
            <p className="text-sm text-center text-gray-500 mt-2">Mon - Fri (Hours)</p>
          </div>

          {/* 4. Leave Summary Card (FR9.1) */}
          <div className="bg-white p-6 rounded-xl shadow-lg col-span-1 border-l-4 border-yellow-500">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Leave Status</h3>
            
            <div className="space-y-3">
              <p className="flex justify-between">
                <span className="text-gray-600">Total Balance:</span>
                <span className="font-semibold text-blue-600">12 Days</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-600">Used This Year:</span>
                <span className="font-semibold text-gray-800">4 Days</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-600">Pending Requests:</span>
                <span className="font-bold text-orange-500">2 Requests</span>
              </p>
            </div>
            
            <button
              className="w-full mt-4 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              // Redirect to the new /leave route
              onClick={() => navigate('/leave')} 
            >
              Apply for Leave →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}