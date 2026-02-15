// components/HR/HRLeaveSection.jsx - HR Leave Management
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, Infinity, AlertCircle } from 'lucide-react';
import api from '../../config/api';
import { useAuth } from '../../hooks/useAuth';
import LeaveApplicationForm from '../Leave/LeaveApplicationForm.jsx';

export default function HRLeaveSection() {
  const { user } = useAuth();
  const [myLeaves, setMyLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState({
    sick: "Unlimited",
    casual: "Unlimited", 
    paid: "Unlimited"
  });

  useEffect(() => {
    loadHRLeaveData();
  }, []);

  const loadHRLeaveData = async () => {
  try {
    setLoading(true);
    const [historyRes, balanceRes] = await Promise.all([
      api.get('/leaves/hr/history'),
      api.get('/leaves/hr/balance')
    ]);
    
    // Most likely your API response is wrapped in axios
    // Try both common patterns
    const leavesData = historyRes.data?.data || historyRes.data || [];
    setMyLeaves(Array.isArray(leavesData) ? leavesData : []);
    
    // Handle balance data
    if (balanceRes.data?.data) {
      const balanceData = balanceRes.data.data;
      setLeaveBalance({
        sick: typeof balanceData.sick === 'object' ? balanceData.sick.available || "Unlimited" : balanceData.sick || "Unlimited",
        casual: typeof balanceData.casual === 'object' ? balanceData.casual.available || "Unlimited" : balanceData.casual || "Unlimited",
        paid: typeof balanceData.paid === 'object' ? balanceData.paid.available || "Unlimited" : balanceData.paid || "Unlimited"
      });
    }
    
  } catch (error) {
    console.error('Error loading HR leave data:', error);
    setMyLeaves([]);
  } finally {
    setLoading(false);
  }
};

  const handleApplyLeave = async (formData) => {
    try {
      await api.post('/leaves/apply', formData);
      setShowApplyForm(false);
      loadHRLeaveData();
    } catch (error) {
      console.error('Error applying leave:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const leavesArray = Array.isArray(myLeaves) ? myLeaves : [];
  const hasLeaves = leavesArray.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">My Leave Requests</h2>
          <p className="text-sm text-gray-600 mt-1">
            As an HR employee, you have unlimited leaves (Admin approval required)
          </p>
        </div>
        <button
          onClick={() => setShowApplyForm(!showApplyForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Calendar size={18} />
          {showApplyForm ? 'Cancel' : 'Apply for Leave'}
        </button>
      </div>

      {/* Leave Balance Card */}
      <div className="mb-6 p-5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
        <div className="flex items-center gap-2 mb-3">
          <Infinity className="text-purple-600" size={20} />
          <h3 className="font-semibold text-purple-800">Your Leave Balance</h3>
          <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
            Unlimited
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-2">
            <p className="text-sm text-gray-600 mb-1">Sick Leave</p>
            <p className="text-2xl font-bold text-purple-600">
              {leaveBalance.sick}
            </p>
          </div>
          <div className="text-center p-2">
            <p className="text-sm text-gray-600 mb-1">Casual Leave</p>
            <p className="text-2xl font-bold text-purple-600">
              {leaveBalance.casual}
            </p>
          </div>
          <div className="text-center p-2">
            <p className="text-sm text-gray-600 mb-1">Paid Leave</p>
            <p className="text-2xl font-bold text-purple-600">
              {leaveBalance.paid}
            </p>
          </div>
        </div>
      </div>

      {/* Apply Leave Form */}
      {showApplyForm && (
        <div className="mb-6 border rounded-xl p-4 bg-gray-50">
          <LeaveApplicationForm
            onSubmit={handleApplyLeave}
            onCancel={() => setShowApplyForm(false)}
            userRole="HR"
          />
        </div>
      )}

      {/* Leave History */}
      <div>
        <h3 className="font-medium text-gray-800 mb-4">Recent Leave Requests</h3>
        {!hasLeaves ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Calendar className="mx-auto text-gray-400 mb-3" size={32} />
            <p className="text-gray-500">No leave requests found</p>
            <button
              onClick={() => setShowApplyForm(true)}
              className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Apply for your first leave
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {leavesArray.slice(0, 5).map(leave => (
              <div key={leave._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        leave.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        leave.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {leave.status}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {leave.leaveType} Leave
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(leave.fromDate).toLocaleDateString()} - {new Date(leave.toDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{leave.reason}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-gray-800">{leave.numberOfDays || leave.totalDays}d</p>
                    {leave.approvedBy && (
                      <p className="text-xs text-gray-500 mt-1">
                        Approved by: {leave.approvedBy?.profile?.firstName || 'Admin'}
                      </p>
                    )}
                    {leave.rejectedBy && (
                      <p className="text-xs text-gray-500 mt-1">
                        Rejected by: {leave.rejectedBy?.profile?.firstName || 'Admin'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {leavesArray.length > 5 && (
              <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2">
                View all {leavesArray.length} leaves →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}