// components/Admin/HRLeaveApproval.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Infinity,
} from "lucide-react";
import api from "../../config/api.js";
import { useAuth } from "../../hooks/useAuth.js";

export default function HRLeaveApproval() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [remarks, setRemarks] = useState({});
  const [showRemarksFor, setShowRemarksFor] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadHRLeaves();
  }, []);

  const loadHRLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.get("/leaves/admin/pending-hr");
      if (response.data.success) {
        setLeaves(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading HR leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId) => {
    try {
      setProcessingId(leaveId);
      const comment = remarks[leaveId] || "Approved by Admin";
      
      const response = await api.post(`/leaves/${leaveId}/approve`, {
        comments: comment,
        remarks: comment
      });

      if (response.data.success) {
        // Remove from list
        setLeaves(leaves.filter(l => l._id !== leaveId));
        setRemarks(prev => {
          const newRemarks = { ...prev };
          delete newRemarks[leaveId];
          return newRemarks;
        });
        setShowRemarksFor(null);
      }
    } catch (error) {
      console.error("Error approving leave:", error);
      alert(error.response?.data?.message || "Failed to approve leave");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (leaveId) => {
    const comment = remarks[leaveId];
    if (!comment?.trim()) {
      alert("Please provide remarks for rejection");
      return;
    }

    try {
      setProcessingId(leaveId);
      const response = await api.post(`/leaves/${leaveId}/reject`, {
        comments: comment,
        remarks: comment
      });

      if (response.data.success) {
        // Remove from list
        setLeaves(leaves.filter(l => l._id !== leaveId));
        setRemarks(prev => {
          const newRemarks = { ...prev };
          delete newRemarks[leaveId];
          return newRemarks;
        });
        setShowRemarksFor(null);
      }
    } catch (error) {
      console.error("Error rejecting leave:", error);
      alert(error.response?.data?.message || "Failed to reject leave");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const filteredLeaves = leaves.filter(leave => {
    // Apply status filter
    if (filter !== "all" && leave.status?.toLowerCase() !== filter) {
      return false;
    }

    // Apply search filter
    if (searchTerm) {
      const trainerName = `${leave.trainerId?.profile?.firstName || ""} ${leave.trainerId?.profile?.lastName || ""}`.toLowerCase();
      return trainerName.includes(searchTerm.toLowerCase());
    }

    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading HR leave requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ChevronLeft size={18} />
              Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Briefcase size={28} className="text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">HR Leave Approvals</h1>
                <p className="text-gray-600 mt-1">
                  Manage and approve leave requests from HR employees
                </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg flex items-center gap-2">
            <Infinity size={18} />
            <span className="font-semibold">Unlimited Leaves</span>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Total Pending</p>
          <p className="text-3xl font-bold text-purple-600">{leaves.length}</p>
          <p className="text-xs text-gray-500 mt-2">Awaiting your approval</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">This Month</p>
          <p className="text-3xl font-bold text-blue-600">
            {leaves.filter(l => {
              const date = new Date(l.fromDate);
              const now = new Date();
              return date.getMonth() === now.getMonth() && 
                     date.getFullYear() === now.getFullYear();
            }).length}
          </p>
          <p className="text-xs text-gray-500 mt-2">HR leave requests</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-600 mb-1">Avg. Duration</p>
          <p className="text-3xl font-bold text-green-600">
            {leaves.length > 0 
              ? Math.round(leaves.reduce((sum, l) => sum + (l.numberOfDays || 0), 0) / leaves.length) 
              : 0}
          </p>
          <p className="text-xs text-gray-500 mt-2">Days per request</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by trainer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <button
            onClick={loadHRLeaves}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Loader2 size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Leave Requests List */}
      {filteredLeaves.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Briefcase size={32} className="text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending HR Leaves</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            All HR leave requests have been processed. Check back later for new applications.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeaves.map((leave) => (
            <div
              key={leave._id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left Section - Applicant Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={20} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {leave.trainerId?.profile?.firstName} {leave.trainerId?.profile?.lastName}
                          </h3>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                            HR
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <Infinity size={12} />
                            Unlimited
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {leave.trainerId?.profile?.employeeId || "No Employee ID"}
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Leave Type</p>
                            <p className="font-medium text-gray-900">{leave.leaveType}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Duration</p>
                            <p className="font-medium text-gray-900">{leave.numberOfDays} days</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Dates</p>
                            <p className="font-medium text-gray-900 text-sm">
                              {formatDate(leave.fromDate)} - {formatDate(leave.toDate)}
                            </p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Reason</p>
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                            {leave.reason}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            Applied: {formatDate(leave.appliedOn || leave.createdAt)}
                          </div>
                          {leave.emergencyContact && (
                            <div className="flex items-center gap-1">
                              <Clock size={14} />
                              Emergency: {leave.emergencyContact}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="lg:w-80">
                    {showRemarksFor === leave._id ? (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          Add Remarks (Required for rejection)
                        </h4>
                        <textarea
                          value={remarks[leave._id] || ""}
                          onChange={(e) => setRemarks({ ...remarks, [leave._id]: e.target.value })}
                          placeholder="Enter remarks for approval or rejection..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          rows="3"
                          disabled={processingId === leave._id}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setShowRemarksFor(null);
                              setRemarks(prev => {
                                const newRemarks = { ...prev };
                                delete newRemarks[leave._id];
                                return newRemarks;
                              });
                            }}
                            disabled={processingId === leave._id}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReject(leave._id)}
                            disabled={processingId === leave._id || !remarks[leave._id]?.trim()}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1"
                          >
                            {processingId === leave._id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <XCircle size={14} />
                            )}
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprove(leave._id)}
                            disabled={processingId === leave._id}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-1"
                          >
                            {processingId === leave._id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                            Approve
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleApprove(leave._id)}
                          disabled={processingId === leave._id}
                          className="w-full bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                          {processingId === leave._id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <CheckCircle size={16} />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => setShowRemarksFor(leave._id)}
                          disabled={processingId === leave._id}
                          className="w-full bg-white border border-red-300 text-red-600 px-4 py-2.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                          <XCircle size={16} />
                          Reject with Remarks
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}