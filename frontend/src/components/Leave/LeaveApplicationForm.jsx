import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api.js';

export default function LeaveApplication() {
  const [leaveData, setLeaveData] = useState({
    leaveType: 'CASUAL', // Keep as leaveType
    fromDate: '', // Change back to fromDate
    toDate: '', // Change back to toDate
    reason: '',
  });

  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const navigate = useNavigate();

  // 📌 Fetch Leave Balance (GET /leaves/balance)
  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await api.get('/leaves/balance');
        setBalance(res.data.data);
      } catch (err) {
        console.error(err);
        setBalance({ sick: 0, casual: 0, paid: 0 });
      } finally {
        setBalanceLoading(false);
      }
    }

    fetchBalance();
  }, []);

  const handleChange = (e) => {
    setLeaveData({ ...leaveData, [e.target.name]: e.target.value });
  };

  // 📌 Submit Leave (POST /leaves)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Simple client-side validation
    if (new Date(leaveData.toDate) < new Date(leaveData.fromDate)) {
      alert("To Date cannot be earlier than From Date.");
      return;
    }

    setLoading(true);

    try {
      // DEBUG: Log what we're sending
      console.log('Submitting leave data:', leaveData);

      const res = await api.post('/leaves', leaveData);

      alert('Leave Application Submitted Successfully! HR notified.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error details:', error.response?.data);
      alert(error?.response?.data?.message || "Something went wrong!");
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-3xl font-bold mb-6 text-gray-800">
          Apply for Leave
        </h2>

        {/* Leave Balance Widget */}
        <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
          <h3 className="font-semibold text-orange-700 mb-2">Current Leave Balance:</h3>

          {balanceLoading ? (
            <p className="text-sm text-gray-500">Loading leave balance...</p>
          ) : (
            <p className="text-sm">
              Sick: <span className="font-bold">{balance?.sick}</span> | 
              Casual: <span className="font-bold">{balance?.casual}</span> | 
              Paid: <span className="font-bold">{balance?.paid}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select
              name="leaveType"
              value={leaveData.leaveType}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="CASUAL">Casual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="PAID">Paid Leave</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              name="fromDate"
              value={leaveData.fromDate}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              name="toDate"
              value={leaveData.toDate}
              onChange={handleChange}
              min={leaveData.fromDate || new Date().toISOString().split('T')[0]}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Reason */}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}