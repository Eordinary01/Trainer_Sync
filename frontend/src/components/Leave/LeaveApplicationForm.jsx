import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LeaveApplication() {
  const [leaveData, setLeaveData] = useState({
    type: 'Casual',
    fromDate: '',
    toDate: '',
    reason: '',
  });
  const navigate = useNavigate();
  // Mock Leave Balance for display (FR9.1)
  const balance = { sick: 5, casual: 7, paid: 10 }; 

  const handleChange = (e) => {
    setLeaveData({ ...leaveData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // 💡 Frontend Logic: We simulate the API call here.
    console.log("Leave Application Submitted:", leaveData);
    alert(`Application for ${leaveData.type} submitted! HR Notified (FR4.2).`);
    
    // Redirect back to the dashboard after submission
    navigate('/dashboard'); 
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      
      {/* Back Button */}
      <button 
        onClick={() => navigate('/dashboard')} 
        className="text-blue-600 hover:text-blue-800 mb-6 flex items-center font-medium"
      >
        ← Back to Dashboard
      </button>

      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Apply for Leave (FR4.1)</h2>

        {/* Leave Balance Widget (FR9.1) */}
        <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
          <h3 className="font-semibold text-orange-700 mb-2">Current Leave Balance:</h3>
          <p className="text-sm">Sick: <span className="font-bold">{balance.sick}</span> | 
             Casual: <span className="font-bold">{balance.casual}</span> | 
             Paid: <span className="font-bold">{balance.paid}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Leave Type Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select
              name="type"
              value={leaveData.type}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="Casual">Casual</option>
              <option value="Sick">Sick</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          {/* From Date Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              name="fromDate"
              value={leaveData.fromDate}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* To Date Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              name="toDate"
              value={leaveData.toDate}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Reason Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              name="reason"
              rows="4"
              value={leaveData.reason}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Briefly describe the reason for your leave."
              required
            ></textarea>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
}