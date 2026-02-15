import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Download,
  MoreVertical,
  ChevronDown,
  
} from "lucide-react";
import api from "../../config/api.js";

// Common component for both roles
function LeaveStatusBadge({ status }) {
  const statusConfig = {
    PENDING: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
    APPROVED: { color: "bg-green-100 text-green-800", label: "Approved" },
    REJECTED: { color: "bg-red-100 text-red-800", label: "Rejected" },
    CANCELLED: { color: "bg-gray-100 text-gray-800", label: "Cancelled" },
  };

  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}

// Admin/HR Components
export function PendingLeaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openActionMenuId, setOpenActionMenuId] = useState(null); // Track which leave's action menu is open
  const [remarks, setRemarks] = useState("");
  const [processingLeaveId, setProcessingLeaveId] = useState(null);
  const [processingAction, setProcessingAction] = useState(null); // 'approve' or 'reject'

  useEffect(() => {
    loadPendingLeaves();
  }, []);

  const loadPendingLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.get("/leaves/pending");
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error("Error loading pending leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId) => {
    setProcessingLeaveId(leaveId);
    setProcessingAction("approve");

    try {
      await api.post(`/leaves/${leaveId}/approve`, {
        comments: remarks,
        remarks: remarks,
      });
      // Close action menu and reset remarks
      setOpenActionMenuId(null);
      setRemarks("");
      await loadPendingLeaves();
      alert("Leave approved successfully!");
    } catch (error) {
      alert(
        "Failed to approve leave: " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      setProcessingLeaveId(null);
      setProcessingAction(null);
    }
  };

  const handleReject = async (leaveId) => {
    if (!remarks.trim()) {
      alert("Please provide remarks for rejection");
      return;
    }

    setProcessingLeaveId(leaveId);
    setProcessingAction("reject");

    try {
      await api.post(`/leaves/${leaveId}/reject`, {
        comments: remarks,
        remarks: remarks,
      });
      // Close action menu and reset remarks
      setOpenActionMenuId(null);
      setRemarks("");
      await loadPendingLeaves();
      alert("Leave rejected successfully!");
    } catch (error) {
      alert(
        "Failed to reject leave: " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      setProcessingLeaveId(null);
      setProcessingAction(null);
    }
  };

  const handleQuickApprove = async (leaveId) => {
    setProcessingLeaveId(leaveId);
    setProcessingAction("approve");

    try {
      await api.post(`/leaves/${leaveId}/approve`, {
        comments: "Leave approved without remarks",
        remarks: "Leave approved without remarks",
      });
      setOpenActionMenuId(null);
      await loadPendingLeaves();
      alert("Leave approved successfully!");
    } catch (error) {
      alert(
        `Failed to approve leave: ` +
          (error.response?.data?.message || error.message),
      );
    } finally {
      setProcessingLeaveId(null);
      setProcessingAction(null);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const toggleActionMenu = (leaveId) => {
    if (openActionMenuId === leaveId) {
      setOpenActionMenuId(null);
      setRemarks("");
    } else {
      setOpenActionMenuId(leaveId);
      setRemarks("");
    }
  };

  const isProcessing = (leaveId, action = null) => {
    if (!processingLeaveId) return false;
    if (processingLeaveId !== leaveId) return false;
    if (action && processingAction !== action) return false;
    return true;
  };

  const getLeaveStatusColor = (status) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Pending Leave Requests
        </h1>
        <p className="text-gray-600">
          Review and manage pending leave applications
        </p>
        <div className="mt-2 text-sm text-gray-500">
          Total: {leaves.length} pending request{leaves.length !== 1 ? "s" : ""}
        </div>
      </div>

      {leaves.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Pending Leaves
          </h3>
          <p className="text-gray-500">
            There are no pending leave requests at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {leaves.map((leave) => (
            <div
              key={leave._id}
              className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 relative"
            >
              {/* Processing overlay */}
              {isProcessing(leave._id) && (
                <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">
                      {processingAction === "approve"
                        ? "Approving..."
                        : "Rejecting..."}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">
                          {leave.trainerId?.profile?.firstName}{" "}
                          {leave.trainerId?.profile?.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {leave.trainerId?.profile?.employeeId || "No Employee ID"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLeaveStatusColor(leave.status)}`}>
                        {leave.status}
                      </span>
                      
                      {/* Actions Button */}
                      <div className="relative">
                        <button
                          onClick={() => toggleActionMenu(leave._id)}
                          disabled={isProcessing(leave._id)}
                          className={`flex items-center gap-1 px-3 py-2 rounded-lg border transition-colors ${
                            openActionMenuId === leave._id
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <MoreVertical size={16} />
                          <span>Actions</span>
                          <ChevronDown 
                            size={14} 
                            className={`transition-transform ${
                              openActionMenuId === leave._id ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {/* Action Menu Dropdown */}
                        {openActionMenuId === leave._id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                            <div className="py-1">
                              <button
                                onClick={() => handleQuickApprove(leave._id)}
                                disabled={isProcessing(leave._id, "approve")}
                                className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2 disabled:opacity-50"
                              >
                                <CheckCircle size={14} />
                                <span>Approve without remarks</span>
                              </button>
                              <div className="border-t border-gray-100"></div>
                              <button
                                onClick={() => {
                                  // Keep menu open for remarks input
                                }}
                                disabled={isProcessing(leave._id)}
                                className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                              >
                                <XCircle size={14} />
                                <span>Reject with remarks</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Leave Type</p>
                      <p className="font-medium capitalize text-gray-800">
                        {leave.leaveType.toLowerCase()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Duration</p>
                      <p className="font-medium text-gray-800">
                        {leave.numberOfDays} day{leave.numberOfDays !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Dates</p>
                      <p className="font-medium text-gray-800">
                        {formatDate(leave.fromDate)} - {formatDate(leave.toDate)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Reason</p>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">
                      {leave.reason}
                    </p>
                  </div>

                  {leave.emergencyContact && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">
                        Emergency Contact
                      </p>
                      <p className="text-gray-800">{leave.emergencyContact}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={14} />
                    <span>Applied on {formatDate(leave.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Remarks Section - Only shown when this leave's action menu is open */}
              {openActionMenuId === leave._id && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Add Remarks (Optional for approval, Required for rejection)
                  </h4>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    placeholder="Enter remarks for approval or rejection..."
                    disabled={isProcessing(leave._id)}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setOpenActionMenuId(null);
                        setRemarks("");
                      }}
                      disabled={isProcessing(leave._id)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => handleReject(leave._id)}
                      disabled={isProcessing(leave._id) || !remarks.trim()}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        remarks.trim()
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      } disabled:opacity-50`}
                    >
                      {isProcessing(leave._id, "reject") ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Rejecting...</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} />
                          <span>Reject</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleApprove(leave._id)}
                      disabled={isProcessing(leave._id)}
                      className={`bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 hover:bg-green-700 disabled:opacity-50`}
                    >
                      {isProcessing(leave._id, "approve") ? (
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
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    loadApprovedLeaves();
  }, []);

  const loadApprovedLeaves = async () => {
    try {
      // For demo, we'll use the history endpoint and filter approved leaves
      const response = await api.get("/leaves/history");
      const allLeaves = response.data.data || [];
      const approvedLeaves = allLeaves.filter(
        (leave) => leave.status === "APPROVED",
      );
      setLeaves(approvedLeaves);
    } catch (error) {
      console.error("Error loading approved leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const filteredLeaves = leaves.filter((leave) => {
    if (filter === "ALL") return true;
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Approved Leaves
        </h1>
        <p className="text-gray-600">View all approved leave requests</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">
            Filter by Type:
          </span>
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
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Approved Leaves
          </h3>
          <p className="text-gray-500">No approved leave requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeaves.map((leave) => (
            <div
              key={leave._id}
              className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="text-gray-400" size={20} />
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {leave.user?.profile?.firstName}{" "}
                      {leave.user?.profile?.lastName}
                    </h3>
                    <span className="text-sm text-gray-500">
                      ({leave.user?.profile?.employeeId})
                    </span>
                    <LeaveStatusBadge status={leave.status} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Leave Type</p>
                      <p className="font-medium capitalize">
                        {leave.leaveType.toLowerCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Dates</p>
                      <p className="font-medium">
                        {formatDate(leave.startDate)} -{" "}
                        {formatDate(leave.endDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Approved By</p>
                      <p className="font-medium">Admin</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Approved On</p>
                      <p className="font-medium">
                        {formatDate(leave.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Reason</p>
                    <p className="text-gray-800">{leave.reason}</p>
                  </div>

                  {leave.adminRemarks && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">
                        Admin Remarks
                      </p>
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
  const [pagination, setPagination] = useState(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL"); // Simple dropdown filter
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      const response = await api.get("/leaves/history");

      let leavesData = [];

      if (response.data?.success && response.data?.data?.leaves) {
        leavesData = response.data.data.leaves;
        if (response.data.data.pagination) {
          setPagination(response.data.data.pagination);
        } else if (response.data.meta) {
          setPagination(response.data.meta);
        }
      }

      setLeaves(leavesData);
    } catch (error) {
      console.error(error);
      setLeaves([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getStatusColor = (status) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getLeaveTypeColor = (type) => {
    switch (type) {
      case "CASUAL":
        return "text-blue-600 bg-blue-50";
      case "SICK":
        return "text-orange-600 bg-orange-50";
      case "PAID":
        return "text-purple-600 bg-purple-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "TRAINER":
        return "bg-green-100 text-green-800";
      case "HR":
        return "bg-purple-100 text-purple-800";
      case "ADMIN":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Filtering Logic with Role Filter
  const filteredLeaves = leaves.filter((leave) => {
    const trainer = leave.trainerId || leave.user;
    const applicantRole = leave.applicantRole || leave.applicantId?.role || 'TRAINER';

    const employeeName = trainer?.profile
      ? `${trainer.profile.firstName || ""} ${trainer.profile.lastName || ""}`.toLowerCase()
      : leave.applicantName?.toLowerCase() || "";

    if (statusFilter !== "ALL" && leave.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && leave.leaveType !== typeFilter) return false;
    if (roleFilter !== "ALL" && applicantRole !== roleFilter) return false;
    if (searchTerm && !employeeName.includes(searchTerm.toLowerCase()))
      return false;

    return true;
  });

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  // Stat Card Component
  const StatCard = ({ label, count, status, color }) => {
    const isActive = statusFilter === status;

    return (
      <div
        onClick={() => setStatusFilter(status)}
        className={`cursor-pointer rounded-xl p-5 shadow-sm border transition-all
        ${isActive ? "ring-2 ring-blue-500 scale-[1.02]" : "hover:shadow-md"}
        bg-white`}
      >
        <p className={`text-3xl font-bold ${color}`}>{count}</p>
        <p className="text-sm text-gray-600">{label}</p>
      </div>
    );
  };

  // Helper function to get action name
  const getActionByName = (leave) => {
    if (leave.status === "APPROVED") {
      return leave.approvedByName || leave.approvedBy?.profile?.firstName || "Admin";
    } else if (leave.status === "REJECTED") {
      return leave.rejectedByName || leave.rejectedBy?.profile?.firstName || "Admin";
    }
    return "—";
  };

  // Helper function to get action date
  const getActionDate = (leave) => {
    if (leave.status === "APPROVED") {
      return leave.updatedAt;
    } else if (leave.status === "REJECTED") {
      return leave.rejectedAt || leave.updatedAt;
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          {user?.role === "ADMIN" || user?.role === "HR"
            ? "Leave Reports"
            : "My Leave History"}
        </h1>
        <p className="text-gray-500 mt-1">
          Showing {filteredLeaves.length} {filteredLeaves.length === 1 ? 'record' : 'records'}
          {roleFilter !== "ALL" && ` • ${roleFilter.toLowerCase()} only`}
        </p>
      </div>

      {/* Status Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total"
          count={leaves.length}
          status="ALL"
          color="text-blue-600"
        />
        <StatCard
          label="Approved"
          count={leaves.filter((l) => l.status === "APPROVED").length}
          status="APPROVED"
          color="text-green-600"
        />
        <StatCard
          label="Pending"
          count={leaves.filter((l) => l.status === "PENDING").length}
          status="PENDING"
          color="text-yellow-600"
        />
        <StatCard
          label="Rejected"
          count={leaves.filter((l) => l.status === "REJECTED").length}
          status="REJECTED"
          color="text-red-600"
        />
      </div>

      {/* Simple Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex flex-wrap items-center gap-3">
          {/* Leave Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">All Types</option>
            <option value="CASUAL">Casual</option>
            <option value="SICK">Sick</option>
            <option value="PAID">Paid</option>
          </select>

          {/* Role Filter Dropdown - Simple & Clean */}
          {(user?.role === "ADMIN" || user?.role === "HR") && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Roles</option>
              <option value="TRAINER">Trainers Only</option>
              <option value="HR">HR Only</option>
            </select>
          )}

          {/* Search Input */}
          {(user?.role === "ADMIN" || user?.role === "HR") && (
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] border border-gray-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          )}

          {/* Reset Button */}
          <button
            onClick={() => {
              setStatusFilter("ALL");
              setTypeFilter("ALL");
              setRoleFilter("ALL");
              setSearchTerm("");
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {(user?.role === "ADMIN" || user?.role === "HR") && (
                <th className="px-6 py-3 text-left">Employee</th>
              )}
              <th className="px-6 py-3 text-left">Type</th>
              <th className="px-6 py-3 text-left">Days</th>
              <th className="px-6 py-3 text-left">Dates</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Action By</th>
              <th className="px-6 py-3 text-left">Applied</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filteredLeaves.map((leave) => {
              const employeeName = 
                leave.applicantName || 
                (leave.trainerId?.profile 
                  ? `${leave.trainerId.profile.firstName || ""} ${leave.trainerId.profile.lastName || ""}`
                  : leave.user?.profile
                  ? `${leave.user.profile.firstName || ""} ${leave.user.profile.lastName || ""}`
                  : "Unknown");

              const applicantRole = leave.applicantRole || leave.applicantId?.role || 'TRAINER';
              const actionByName = getActionByName(leave);
              const actionDate = getActionDate(leave);

              return (
                <tr key={leave._id || leave.id} className="hover:bg-gray-50">
                  {(user?.role === "ADMIN" || user?.role === "HR") && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{employeeName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(applicantRole)}`}>
                          {applicantRole}
                        </span>
                      </div>
                    </td>
                  )}

                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getLeaveTypeColor(
                        leave.leaveType,
                      )}`}
                    >
                      {leave.leaveType}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-medium text-sm">
                    {leave.numberOfDays || leave.totalDays}d
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {formatDate(leave.fromDate)}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        leave.status,
                      )}`}
                    >
                      {leave.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {actionByName !== "—" ? (
                      <div>
                        <span className={leave.status === "APPROVED" ? "text-green-600" : "text-red-600"}>
                          {actionByName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(leave.appliedOn || leave.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* No results */}
        {filteredLeaves.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No leave records found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="text-sm text-gray-500 text-right">
          Page {pagination.page || 1} of {pagination.pages || 1}
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
