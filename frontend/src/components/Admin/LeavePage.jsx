import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { Calendar, Clock, User, CheckCircle, XCircle, Download } from 'lucide-react';
import api from '../../config/api.js';

// Common component for both roles
function LeaveStatusBadge({ status }) {
  const statusConfig = {
    PENDING: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    APPROVED: { color: 'bg-green-100 text-green-800', label: 'Approved' },
    REJECTED: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
    CANCELLED: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' }
  };

  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

// Admin/HR Components
export function PendingLeaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [processingLeaveId, setProcessingLeaveId] = useState(null);
  const [processingAction, setProcessingAction] = useState(null); // 'approve' or 'reject'

  useEffect(() => {
    loadPendingLeaves();
  }, []);

  const loadPendingLeaves = async () => {
    try {
      const response = await api.get('/leaves/pending');
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error('Error loading pending leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId) => {
    setProcessingLeaveId(leaveId);
    setProcessingAction('approve');
    
    try {
      await api.put(`/leaves/${leaveId}/approve`, { 
        comments: remarks,
        remarks: remarks
      });
      setSelectedLeave(null);
      setRemarks('');
      await loadPendingLeaves();
      alert('Leave approved successfully!');
    } catch (error) {
      alert('Failed to approve leave: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingLeaveId(null);
      setProcessingAction(null);
    }
  };

  const handleReject = async (leaveId) => {
    if (!remarks.trim()) {
      alert('Please provide remarks for rejection');
      return;
    }

    setProcessingLeaveId(leaveId);
    setProcessingAction('reject');
    
    try {
      await api.put(`/leaves/${leaveId}/reject`, { 
        comments: remarks,
        remarks: remarks
      });
      setSelectedLeave(null);
      setRemarks('');
      await loadPendingLeaves();
      alert('Leave rejected successfully!');
    } catch (error) {
      alert('Failed to reject leave: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingLeaveId(null);
      setProcessingAction(null);
    }
  };

  const handleQuickAction = async (leaveId, action) => {
    if (action === 'reject') {
      setSelectedLeave(leaves.find(l => l._id === leaveId));
      return;
    }
    
    setProcessingLeaveId(leaveId);
    setProcessingAction(action);
    
    try {
      await api.put(`/leaves/${leaveId}/${action}`, {});
      await loadPendingLeaves();
      alert(`Leave ${action}d successfully!`);
    } catch (error) {
      alert(`Failed to ${action} leave: ` + (error.response?.data?.message || error.message));
    } finally {
      setProcessingLeaveId(null);
      setProcessingAction(null);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const isProcessing = (leaveId, action = null) => {
    if (!processingLeaveId) return false;
    if (processingLeaveId !== leaveId) return false;
    if (action && processingAction !== action) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pending leaves...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Pending Leave Requests</h1>
        <p className="text-gray-600">Review and manage pending leave applications</p>
      </div>

      {leaves.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Pending Leaves</h3>
          <p className="text-gray-500">There are no pending leave requests at the moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {leaves.map((leave) => (
            <div key={leave._id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 relative">
              {/* Processing overlay */}
              {isProcessing(leave._id) && (
                <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">
                      {processingAction === 'approve' ? 'Approving...' : 'Rejecting...'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="text-gray-400" size={20} />
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {leave.trainerId?.profile?.firstName} {leave.trainerId?.profile?.lastName}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Leave Type</p>
                      <p className="font-medium capitalize">{leave.leaveType.toLowerCase()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-medium">
                        {leave.numberOfDays} days
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Dates</p>
                      <p className="font-medium">
                        {formatDate(leave.fromDate)} - {formatDate(leave.toDate)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Reason</p>
                    <p className="text-gray-800">{leave.reason}</p>
                  </div>

                  {leave.emergencyContact && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Emergency Contact</p>
                      <p className="text-gray-800">{leave.emergencyContact}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={14} />
                    <span>Applied on {formatDate(leave.createdAt)}</span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleQuickAction(leave._id, 'approve')}
                    disabled={isProcessing(leave._id)}
                    className={`bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 min-w-[100px] justify-center
                      ${isProcessing(leave._id, 'approve') 
                        ? 'opacity-75 cursor-not-allowed' 
                        : 'hover:bg-green-700'
                      }`}
                  >
                    {isProcessing(leave._id, 'approve') ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Approving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        <span>Approve</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setSelectedLeave(leave)}
                    disabled={isProcessing(leave._id)}
                    className={`bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 min-w-[100px] justify-center
                      ${isProcessing(leave._id) 
                        ? 'opacity-75 cursor-not-allowed' 
                        : 'hover:bg-red-700'
                      }`}
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              </div>

              {selectedLeave?._id === leave._id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-2">Add Remarks</h4>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                    placeholder="Enter remarks for approval or rejection..."
                    disabled={isProcessing(leave._id)}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedLeave(null);
                        setRemarks('');
                      }}
                      disabled={isProcessing(leave._id)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={() => handleReject(leave._id)}
                      disabled={isProcessing(leave._id)}
                      className={`bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2
                        ${isProcessing(leave._id) 
                          ? 'opacity-75 cursor-not-allowed' 
                          : 'hover:bg-red-700'
                        }`}
                    >
                      {isProcessing(leave._id, 'reject') ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Rejecting...</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} />
                          <span>Reject with Remarks</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleApprove(leave._id)}
                      disabled={isProcessing(leave._id)}
                      className={`bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2
                        ${isProcessing(leave._id) 
                          ? 'opacity-75 cursor-not-allowed' 
                          : 'hover:bg-green-700'
                        }`}
                    >
                      {isProcessing(leave._id, 'approve') ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Approving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          <span>Approve</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ApprovedLeaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    loadApprovedLeaves();
  }, []);

  const loadApprovedLeaves = async () => {
    try {
      // For demo, we'll use the history endpoint and filter approved leaves
      const response = await api.get('/leaves/history');
      const allLeaves = response.data.data || [];
      const approvedLeaves = allLeaves.filter(leave => leave.status === 'APPROVED');
      setLeaves(approvedLeaves);
    } catch (error) {
      console.error('Error loading approved leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredLeaves = leaves.filter(leave => {
    if (filter === 'ALL') return true;
    return leave.leaveType === filter;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Approved Leaves</h1>
        <p className="text-gray-600">View all approved leave requests</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter by Type:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Types</option>
            <option value="CASUAL">Casual Leave</option>
            <option value="SICK">Sick Leave</option>
            <option value="PAID">Paid Leave</option>
            <option value="EMERGENCY">Emergency Leave</option>
          </select>
        </div>
      </div>

      {filteredLeaves.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <CheckCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Approved Leaves</h3>
          <p className="text-gray-500">No approved leave requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeaves.map((leave) => (
            <div key={leave._id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="text-gray-400" size={20} />
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {leave.user?.profile?.firstName} {leave.user?.profile?.lastName}
                    </h3>
                    <span className="text-sm text-gray-500">
                      ({leave.user?.profile?.employeeId})
                    </span>
                    <LeaveStatusBadge status={leave.status} />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Leave Type</p>
                      <p className="font-medium capitalize">{leave.leaveType.toLowerCase()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Dates</p>
                      <p className="font-medium">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Approved By</p>
                      <p className="font-medium">Admin</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Approved On</p>
                      <p className="font-medium">{formatDate(leave.updatedAt)}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Reason</p>
                    <p className="text-gray-800">{leave.reason}</p>
                  </div>

                  {leave.adminRemarks && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Admin Remarks</p>
                      <p className="text-gray-800">{leave.adminRemarks}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LeaveReports() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      const response = await api.get('/leaves/history');
      
      let leavesData = [];
      
      if (response.data?.success && response.data?.data) {
        if (Array.isArray(response.data.data.leaves)) {
          leavesData = response.data.data.leaves;
        } else if (Array.isArray(response.data.data)) {
          leavesData = response.data.data;
        }
      } else if (Array.isArray(response.data)) {
        leavesData = response.data;
      }
      
      console.log('Leaves data loaded:', leavesData);
      setLeaves(leavesData);
    } catch (error) {
      console.error('Error loading leaves:', error);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeColor = (type) => {
    switch (type) {
      case 'CASUAL': return 'text-blue-600 bg-blue-50';
      case 'SICK': return 'text-orange-600 bg-orange-50';
      case 'PAID': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {user?.role === 'ADMIN' || user?.role === 'HR' ? 'All Leave Records' : 'My Leave History'}
        </h1>
        <p className="text-gray-600">
          {leaves.length} leave record{leaves.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {leaves.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Leave Records</h3>
          <p className="text-gray-500">No leave applications found in the system.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gray-50 border-b">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{leaves.length}</p>
              <p className="text-sm text-gray-600">Total Leaves</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {leaves.filter(l => l.status === 'APPROVED').length}
              </p>
              <p className="text-sm text-gray-600">Approved</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {leaves.filter(l => l.status === 'PENDING').length}
              </p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {leaves.filter(l => l.status === 'REJECTED').length}
              </p>
              <p className="text-sm text-gray-600">Rejected</p>
            </div>
          </div>

          {/* Leaves Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.map((leave, index) => {
                  const trainer = leave.trainerId || leave.user;
                  const employeeName = trainer?.profile ? 
                    `${trainer.profile.firstName || ''} ${trainer.profile.lastName || ''}`.trim() 
                    : 'Unknown';
                  const employeeId = trainer?.profile?.employeeId || '';

                  return (
                    <tr key={leave._id || index} className="hover:bg-gray-50">
                      {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{employeeName}</div>
                            {employeeId && (
                              <div className="text-sm text-gray-500">ID: {employeeId}</div>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLeaveTypeColor(leave.leaveType)}`}>
                          {leave.leaveType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {leave.numberOfDays || 'N/A'} day{leave.numberOfDays !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{formatDate(leave.fromDate)}</div>
                        <div className="text-gray-500">to</div>
                        <div>{formatDate(leave.toDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                          {leave.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(leave.appliedOn || leave.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate" title={leave.reason}>
                          {leave.reason || 'No reason provided'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Summary */}
          <div className="bg-gray-50 px-6 py-3 border-t">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Showing {leaves.length} record{leaves.length !== 1 ? 's' : ''}</span>
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                  Approved: {leaves.filter(l => l.status === 'APPROVED').length}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                  Pending: {leaves.filter(l => l.status === 'PENDING').length}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                  Rejected: {leaves.filter(l => l.status === 'REJECTED').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main export - only Admin/HR components remain
export default function LeavePage() {
  // This component is now only for Admin/HR, so we don't need role-based rendering here
  return null;
}