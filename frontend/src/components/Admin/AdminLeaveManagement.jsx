// AdminLeaveManagement.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../config/api.js";
import {
  Zap,
  Users,
  FileText,
  RefreshCw,
  TrendingUp,
  Shield,
  Edit,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Mail,
  Briefcase,
  AlertCircle,
  Loader2,
  Eye,
  Clock,
  CheckSquare,
  XSquare,
  PlusCircle,
  MinusCircle,
  Activity,
  BarChart3,
  AlertTriangle,
  Lock,
  CalendarX,
} from "lucide-react";
import { toast } from "react-toastify";
import { formatDate, formatTime } from "../../utils/dateFormat.js";

export default function AdminLeaveManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [automationStatus, setAutomationStatus] = useState(null);
  const [loading, setLoading] = useState({
    pending: false,
    all: false,
    trainers: false,
    automation: false,
  });
  const [filters, setFilters] = useState({
    status: "",
    leaveType: "",
    applicantId: "",
    fromDate: "",
    toDate: "",
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
    page: 1,
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Check if user is admin/HR
  const isAdmin = user?.role === "ADMIN" || user?.role === "HR";

  // Fetch pending leaves
  const fetchPendingLeaves = async () => {
    try {
      setLoading((prev) => ({ ...prev, pending: true }));
      const response = await api.get("/leaves/pending");
      if (response.data.success) {
        setPendingLeaves(response.data.data || []);
      }
    } catch (error) {
      setError("Failed to fetch pending leaves");
      console.error("Error fetching pending leaves:", error);
    } finally {
      setLoading((prev) => ({ ...prev, pending: false }));
    }
  };

  // Fetch all leaves with filters
  const fetchAllLeaves = async () => {
    try {
      setLoading((prev) => ({ ...prev, all: true }));
      const queryParams = new URLSearchParams();

      if (filters.status) queryParams.append("status", filters.status);
      if (filters.leaveType) queryParams.append("leaveType", filters.leaveType);
      if (filters.applicantId)
        queryParams.append("applicantId", filters.applicantId);
      if (filters.fromDate) queryParams.append("fromDate", filters.fromDate);
      if (filters.toDate) queryParams.append("toDate", filters.toDate);
      queryParams.append("page", filters.page);
      queryParams.append("limit", filters.limit);

      const response = await api.get(
        `/leaves/history?${queryParams.toString()}`,
      );
      if (response.data.success) {
        setAllLeaves(response.data.data?.leaves || response.data.data || []);
        setPagination({
          total: response.data.meta?.total || 0,
          pages: response.data.meta?.pages || 1,
          page: filters.page,
        });
      }
    } catch (error) {
      setError("Failed to fetch leaves");
      console.error("Error fetching leaves:", error);
    } finally {
      setLoading((prev) => ({ ...prev, all: false }));
    }
  };

  // Fetch all trainers
  const fetchTrainers = async () => {
    try {
      setLoading((prev) => ({ ...prev, trainers: true }));

      // Use the correct endpoint: /users with query parameters
      const response = await api.get("/users", {
        params: {
          role: "TRAINER",
          status: "ACTIVE",
          limit: 100, // Get all active trainers
        },
      });

      console.log("Trainers API Response:", response.data);

      if (response.data.success) {
        // Handle the response structure
        let trainersData = [];

        // Check if data is in response.data.data
        if (response.data.data && Array.isArray(response.data.data)) {
          trainersData = response.data.data;
        }
        // Check if there's a nested data structure
        else if (
          response.data.data &&
          response.data.data.data &&
          Array.isArray(response.data.data.data)
        ) {
          trainersData = response.data.data.data;
        }
        // Check if there's a users property
        else if (
          response.data.data &&
          response.data.data.users &&
          Array.isArray(response.data.data.users)
        ) {
          trainersData = response.data.data.users;
        }
        // If data is an object with pagination
        else if (
          response.data.data &&
          response.data.data.trainers &&
          Array.isArray(response.data.data.trainers)
        ) {
          trainersData = response.data.data.trainers;
        }

        console.log("Extracted trainers:", trainersData);
        setTrainers(trainersData);
      } else {
        console.warn("API returned success: false");
        setTrainers([]);
      }
    } catch (error) {
      console.error("Error fetching trainers:", error);
      console.error("Error details:", error.response?.data);
      setTrainers([]);
    } finally {
      setLoading((prev) => ({ ...prev, trainers: false }));
    }
  };

  // Fetch automation status
  const fetchAutomationStatus = async () => {
    try {
      setLoading((prev) => ({ ...prev, automation: true }));
      const response = await api.get("/leaves/automation/status");
      if (response.data.success) {
        setAutomationStatus(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching automation status:", error);
    } finally {
      setLoading((prev) => ({ ...prev, automation: false }));
    }
  };

  // Handle approve leave
  const handleApprove = async (leaveId, comments = "") => {
    try {
      setError(null);
      const response = await api.post(`/leaves/${leaveId}/approve`, {
        comments,
      });
      if (response.data.success) {
        setSuccess(`Leave approved successfully`);
        fetchPendingLeaves();
        fetchAllLeaves();
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to approve leave");
    }
  };

  // Handle reject leave
  const handleReject = async (leaveId, comments = "") => {
    try {
      setError(null);
      const response = await api.post(`/leaves/${leaveId}/reject`, {
        comments,
      });
      if (response.data.success) {
        setSuccess(`Leave rejected successfully`);
        fetchPendingLeaves();
        fetchAllLeaves();
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to reject leave");
    }
  };

  // Handle update leave balance
  const handleUpdateBalance = async (
    applicantId,
    leaveType,
    newBalance,
    reason,
  ) => {
    try {
      setError(null);
      const response = await api.put(`/leaves/balance/${applicantId}/edit`, {
        leaveType,
        newBalance,
        reason,
      });
      if (response.data.success) {
        setSuccess(`Leave balance updated successfully`);
        // Refresh trainers data
        fetchTrainers();
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update balance");
    }
  };

  // Handle trigger automation
  // In your parent component where you call onTriggerIncrement:
  const handleTriggerIncrement = async (testMode = false, testDays = 30) => {
    try {
      const response = await api.post("/leaves/automation/increment", {
        testMode,
        testDays,
      });

      if (response.data.success) {
        toast.success(response.data.message);
        // Refresh data or show results
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error triggering increment:", error);
      toast.error("Failed to trigger increment");
    }
  };

  const handleTriggerRollover = async () => {
    try {
      setError(null);
      const response = await api.post("/leaves/automation/rollover");
      if (response.data.success) {
        setSuccess(`Year-end rollover triggered successfully`);
        fetchAutomationStatus();
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to trigger rollover");
    }
  };

  // Handle generate report
  const handleGenerateReport = async () => {
    try {
      setError(null);
      const response = await api.get("/leaves/reports/balance", {
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `leave-balance-report-${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess("Report generated successfully");
    } catch (error) {
      setError("Failed to generate report");
    }
  };

  // Handle cancel leave
  const handleCancelLeave = async (leaveId, comments = "") => {
    try {
      setError(null);
      const response = await api.put(`/leaves/${leaveId}/cancel`, { comments });
      if (response.data.success) {
        setSuccess(`Leave cancelled successfully`);
        fetchAllLeaves();
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to cancel leave");
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (!isAdmin) return;

    switch (activeTab) {
      case "pending":
        fetchPendingLeaves();
        break;
      case "all":
        fetchAllLeaves();
        break;
      case "balance":
        fetchTrainers();
        break;
      case "automation":
        fetchAutomationStatus();
        break;
    }
  }, [
    activeTab,
    isAdmin,
    filters.page,
    filters.status,
    filters.leaveType,
    filters.applicantId,
  ]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center">
          <Shield className="w-24 h-24 mx-auto text-red-400 mb-6" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Access Denied
          </h2>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            You don't have permission to access the admin panel. This area is
            restricted to ADMIN and HR roles only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Leave Management Panel
        </h1>
        <p className="text-gray-600 mt-2">
          Manage leave requests, balances, and automation for all trainers
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {user?.role}
          </span>
          <span className="text-sm text-gray-500">
            Logged in as {user?.profile?.firstName || user?.username}
          </span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-pulse">
          <AlertCircle
            className="text-red-500 flex-shrink-0 mt-0.5"
            size={20}
          />
          <div className="flex-1">
            <p className="text-red-700 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle
            className="text-green-500 flex-shrink-0 mt-0.5"
            size={20}
          />
          <div className="flex-1">
            <p className="text-green-700 font-medium">Success</p>
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto border-b border-gray-200 mb-6">
        {[
          {
            id: "pending",
            label: "Pending Requests",
            icon: FileText,
            badge: pendingLeaves.length,
          },
          {
            id: "all",
            label: "All Leaves",
            icon: Users,
            badge: pagination.total,
          },
          { id: "balance", label: "Balance Management", icon: Edit },
          { id: "automation", label: "Automation", icon: RefreshCw },
          { id: "reports", label: "Reports", icon: TrendingUp },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-blue-600 text-blue-700 bg-blue-50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
            {tab.badge > 0 && (
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {activeTab === "pending" && (
          <PendingRequestsTab
            pendingLeaves={pendingLeaves}
            loading={loading.pending}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {activeTab === "all" && (
          <AllLeavesTab
            leaves={allLeaves}
            loading={loading.all}
            trainers={trainers}
            filters={filters}
            pagination={pagination}
            onFilter={(newFilters) =>
              setFilters((prev) => ({ ...prev, ...newFilters }))
            }
            onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            onCancel={handleCancelLeave}
          />
        )}

        {activeTab === "balance" && (
          <BalanceManagementTab
            trainers={trainers}
            loading={loading.trainers}
            onUpdateBalance={handleUpdateBalance}
          />
        )}

        {activeTab === "automation" && (
          <AutomationTab
            status={automationStatus}
            loading={loading.automation}
            onTriggerIncrement={handleTriggerIncrement}
            onTriggerRollover={handleTriggerRollover}
          />
        )}

        {activeTab === "reports" && (
          <ReportsTab onGenerateReport={handleGenerateReport} />
        )}
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function PendingRequestsTab({ pendingLeaves, loading, onApprove, onReject }) {
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [comments, setComments] = useState("");

  // ✅ FILTER: Only show pending leaves from TRAINER role, exclude HR
  const trainerPendingLeaves = pendingLeaves.filter(
    (leave) => 
      leave.applicantRole === "TRAINER" || 
      leave.applicantId?.role === "TRAINER"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600 mr-3" size={24} />
        <span className="text-gray-600">Loading pending requests...</span>
      </div>
    );
  }

  if (trainerPendingLeaves.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No Pending Trainer Requests
        </h3>
        <p className="text-gray-500">
          There are no pending leave requests from trainers at the moment.
        </p>
        {pendingLeaves.length > 0 && (
          <p className="text-sm text-gray-400 mt-2">
            Note: {pendingLeaves.length} HR leave request(s) are filtered out and managed separately.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Pending Leave Requests
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Showing only trainer requests • HR leaves are managed separately
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-500 block">
            {trainerPendingLeaves.length} trainer request
            {trainerPendingLeaves.length !== 1 ? "s" : ""} pending
          </span>
          {pendingLeaves.length > trainerPendingLeaves.length && (
            <span className="text-xs text-gray-400">
              ({pendingLeaves.length - trainerPendingLeaves.length} HR request
              {pendingLeaves.length - trainerPendingLeaves.length !== 1 ? "s" : ""} filtered)
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trainer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Leave Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Days
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Applied On
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {trainerPendingLeaves.map((leave) => (
              <tr key={leave._id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {leave.applicantId?.profile?.firstName}{" "}
                      {leave.applicantId?.profile?.lastName || leave.applicantName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {leave.applicantId?.username || leave.applicantId?.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        Trainer
                      </span>
                      <span className="text-xs text-gray-500">
                        {leave.applicantId?.trainerCategory || 'N/A'}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      leave.leaveType === "SICK"
                        ? "bg-blue-100 text-blue-800"
                        : leave.leaveType === "CASUAL"
                          ? "bg-green-100 text-green-800"
                          : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {leave.leaveType}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900">
                    {formatDate(leave.fromDate)} <span className="text-gray-400">to</span>{" "}
                    {formatDate(leave.toDate)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {getDayCount(leave.fromDate, leave.toDate)} calendar days
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">
                    {leave.numberOfDays || leave.totalDays} day
                    {(leave.numberOfDays || leave.totalDays) !== 1 ? "s" : ""}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-500">
                    {formatDate(leave.appliedOn || leave.createdAt)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {getTimeAgo(leave.appliedOn || leave.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedLeave(leave);
                        setComments("");
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => onApprove(leave._id, "")}
                      className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onReject(leave._id, "")}
                      className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leave Details Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-gray-800">
                      Trainer Leave Request
                    </h3>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Trainer
                    </span>
                  </div>
                  <p className="text-gray-600">
                    Review before taking action
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLeave(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trainer Information
                    </label>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900">
                        {selectedLeave.applicantId?.profile?.firstName}{" "}
                        {selectedLeave.applicantId?.profile?.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedLeave.applicantId?.username || selectedLeave.applicantId?.email}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded">
                          ID: {selectedLeave.applicantId?.profile?.employeeId || 'N/A'}
                        </span>
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded">
                          {selectedLeave.applicantId?.trainerCategory || 'Trainer'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Leave Details
                    </label>
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Type:</span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            selectedLeave.leaveType === "SICK"
                              ? "bg-blue-100 text-blue-800"
                              : selectedLeave.leaveType === "CASUAL"
                                ? "bg-green-100 text-green-800"
                                : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {selectedLeave.leaveType}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Working Days:</span>
                        <span className="font-medium">
                          {selectedLeave.numberOfDays || selectedLeave.totalDays} days
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Applied On:</span>
                        <span>{formatDate(selectedLeave.appliedOn || selectedLeave.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Updated:</span>
                        <span>{formatDate(selectedLeave.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Leave Period
                    </label>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-center mb-3">
                        <span className="text-3xl font-bold text-blue-600">
                          {selectedLeave.numberOfDays || selectedLeave.totalDays}
                        </span>
                        <span className="text-gray-600 ml-1">
                          day{(selectedLeave.numberOfDays || selectedLeave.totalDays) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <div className="text-xs text-gray-500 mb-1">From</div>
                          <div className="font-medium text-sm">
                            {formatDate(selectedLeave.fromDate)}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDay(selectedLeave.fromDate)}
                          </div>
                        </div>
                        <div className="text-gray-400 px-3">→</div>
                        <div className="text-center flex-1">
                          <div className="text-xs text-gray-500 mb-1">To</div>
                          <div className="font-medium text-sm">
                            {formatDate(selectedLeave.toDate)}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDay(selectedLeave.toDate)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Leave
                    </label>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-wrap text-sm">
                        {selectedLeave.reason || "No reason provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments / Remarks
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Add comments for the trainer (optional)..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  These comments will be visible to the trainer
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setSelectedLeave(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onReject(selectedLeave._id, comments);
                    setSelectedLeave(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <XSquare size={16} />
                  Reject Leave
                </button>
                <button
                  onClick={() => {
                    onApprove(selectedLeave._id, comments);
                    setSelectedLeave(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <CheckSquare size={16} />
                  Approve Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ Helper functions for better UX
const getDayCount = (fromDate, toDate) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffTime = Math.abs(to - from);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

const getTimeAgo = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  return formatDate(date);
};

const formatDay = (date) => {
  return new Date(date).toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric' 
  });
};

function AllLeavesTab({
  leaves,
  loading,
  trainers,
  filters,
  pagination,
  onFilter,
  onPageChange,
  onCancel,
}) {
  const [expandedRow, setExpandedRow] = useState(null);

  const handleFilterChange = (key, value) => {
    onFilter({ [key]: value, page: 1 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600 mr-3" size={24} />
        <span className="text-gray-600">Loading leaves...</span>
      </div>
    );
  }

  // ✅ FILTER: Only show leaves from TRAINER role, exclude HR
  const trainerLeaves = leaves.filter(
    (leave) => 
      leave.applicantRole === "TRAINER" || 
      leave.applicantId?.role === "TRAINER"
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">All Leave Requests</h2>
        <span className="text-sm text-gray-500">
          Total: {pagination.total} leaves • Showing: {trainerLeaves.length} trainer leaves
        </span>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leave Type
          </label>
          <select
            value={filters.leaveType}
            onChange={(e) => handleFilterChange("leaveType", e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="SICK">Sick Leave</option>
            <option value="CASUAL">Casual Leave</option>
            <option value="PAID">Paid Leave</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trainer
          </label>
          <select
            value={filters.applicantId}
            onChange={(e) => handleFilterChange("applicantId", e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Trainers</option>
            {trainers
              .filter(trainer => trainer.role === "TRAINER") // ✅ Only show trainers in dropdown
              .map((trainer) => (
                <option key={trainer._id} value={trainer._id}>
                  {trainer.profile?.firstName} {trainer.profile?.lastName}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(e) => handleFilterChange("fromDate", e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={filters.toDate}
            onChange={(e) => handleFilterChange("toDate", e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* No Trainer Leaves Message */}
      {trainerLeaves.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500 font-medium">No trainer leave requests found</p>
          <p className="text-sm text-gray-400 mt-1">
            All displayed leaves are from trainers only. HR leaves are managed separately.
          </p>
        </div>
      ) : (
        /* Leaves Table */
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trainer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leave Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {trainerLeaves.map((leave) => (
                <React.Fragment key={leave._id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {leave.applicantId?.profile?.firstName}{" "}
                          {leave.applicantId?.profile?.lastName || leave.applicantName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {leave.applicantId?.profile?.employeeId || "Trainer"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full mb-1 inline-block ${
                            leave.leaveType === "SICK"
                              ? "bg-blue-100 text-blue-800"
                              : leave.leaveType === "CASUAL"
                                ? "bg-green-100 text-green-800"
                                : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {leave.leaveType}
                        </span>
                        <p className="text-sm text-gray-600">
                          {leave.numberOfDays || leave.totalDays} days
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900">
                          {formatDate(leave.fromDate)}
                        </p>
                        <p className="text-gray-500">
                          to {formatDate(leave.toDate)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Applied: {formatDate(leave.appliedOn || leave.createdAt)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          leave.status === "APPROVED"
                            ? "bg-green-100 text-green-800"
                            : leave.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : leave.status === "REJECTED"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setExpandedRow(
                              expandedRow === leave._id ? null : leave._id,
                            )
                          }
                          className="p-1 text-gray-600 hover:text-gray-900"
                          title="View details"
                        >
                          {expandedRow === leave._id ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                        {leave.status === "APPROVED" && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Are you sure you want to cancel this approved leave?",
                                )
                              ) {
                                onCancel(leave._id, "Admin cancelled");
                              }
                            }}
                            className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedRow === leave._id && (
                    <tr>
                      <td colSpan="5" className="px-4 py-4 bg-blue-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">
                              Reason
                            </h4>
                            <p className="text-sm text-gray-600 bg-white p-3 rounded">
                              {leave.reason || "No reason provided"}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">
                              Details
                            </h4>
                            <div className="space-y-2 text-sm bg-white p-3 rounded">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Applied On:</span>
                                <span className="font-medium">
                                  {formatDate(leave.appliedOn || leave.createdAt)}
                                </span>
                              </div>
                              {leave.approvedBy && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">
                                    Approved By:
                                  </span>
                                  <span className="font-medium text-green-600">
                                    {typeof leave.approvedBy === 'object' 
                                      ? `${leave.approvedBy?.profile?.firstName || ''} ${leave.approvedBy?.profile?.lastName || ''}`.trim() 
                                      : leave.approvedBy}
                                  </span>
                                </div>
                              )}
                              {leave.rejectedBy && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">
                                    Rejected By:
                                  </span>
                                  <span className="font-medium text-red-600">
                                    {typeof leave.rejectedBy === 'object'
                                      ? `${leave.rejectedBy?.profile?.firstName || ''} ${leave.rejectedBy?.profile?.lastName || ''}`.trim()
                                      : leave.rejectedBy}
                                  </span>
                                </div>
                              )}
                              {leave.adminRemarks && (
                                <div className="mt-2 pt-2 border-t">
                                  <span className="text-gray-600">Admin Remarks:</span>
                                  <p className="text-gray-800 mt-1 italic">
                                    "{leave.adminRemarks}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination - Only show if there are trainer leaves and more than 1 page */}
      {pagination.pages > 1 && trainerLeaves.length > 0 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            onClick={() => onPageChange(Math.max(1, filters.page - 1))}
            disabled={filters.page === 1}
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {filters.page} of {pagination.pages}
          </span>
          <button
            onClick={() =>
              onPageChange(Math.min(pagination.pages, filters.page + 1))
            }
            disabled={filters.page === pagination.pages}
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function BalanceManagementTab({ trainers, loading, onUpdateBalance }) {
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [balanceData, setBalanceData] = useState({
    leaveType: "CASUAL",
    actionType: "ADD", // ADD or DEDUCT
    amount: "",
    reason: "",
  });
  const [trainerBalance, setTrainerBalance] = useState(null);
  const [isContractedTrainer, setIsContractedTrainer] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTrainerSelect = async (applicantId) => {
    setSelectedTrainer(applicantId);
    setIsContractedTrainer(false);
    setTrainerBalance(null);
    // Reset form when changing trainer
    setBalanceData({
      leaveType: "CASUAL",
      actionType: "ADD",
      amount: "",
      reason: "",
    });

    if (applicantId) {
      setIsLoadingBalance(true);
      try {
        const response = await api.get(`/leaves/balance/${applicantId}`);
        if (response.data.success) {
          setTrainerBalance(response.data.data);

          // Check if trainer is CONTRACTED
          const trainerInfo = trainers.find((t) => t._id === applicantId);
          if (trainerInfo?.trainerCategory === "CONTRACTED") {
            setIsContractedTrainer(true);
          }
        }
      } catch (error) {
        console.error("Error fetching trainer balance:", error);
      } finally {
        setIsLoadingBalance(false);
      }
    }
  };

  const getCurrentBalance = (leaveType) => {
    if (!trainerBalance) return 0;

    const balance = trainerBalance[leaveType.toLowerCase()];
    if (typeof balance === "object") {
      return balance.available || 0;
    }
    return balance || 0;
  };

  const calculateNewBalance = () => {
    const currentBalance = getCurrentBalance(balanceData.leaveType);
    const amount = Number(balanceData.amount) || 0;

    if (balanceData.actionType === "ADD") {
      return currentBalance + amount;
    } else {
      // DEDUCT - ensure it doesn't go below 0
      return Math.max(0, currentBalance - amount);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTrainer) {
      alert("Please select a trainer first");
      return;
    }

    if (isContractedTrainer) {
      alert("Cannot update leave balance for CONTRACTED trainers");
      return;
    }

    // Check if amount is a valid positive integer
    const amount = Number(balanceData.amount);
    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      alert("Please enter a valid positive whole number (no decimals)");
      return;
    }

    // Get current balance for validation
    const currentBalance = getCurrentBalance(balanceData.leaveType);

    // For DEDUCT action, check if we have enough balance
    if (balanceData.actionType === "DEDUCT" && amount > currentBalance) {
      alert(
        `Cannot deduct ${amount} days. Current ${balanceData.leaveType} balance is only ${currentBalance} days.`,
      );
      return;
    }

    // For PAID leave, check if it's unlimited
    if (balanceData.leaveType === "PAID" && currentBalance >= 9999) {
      const confirmed = window.confirm(
        "⚠️ PAID LEAVE IS UNLIMITED ⚠️\n\n" +
          "Paid leave balance is already set to Unlimited.\n" +
          "Are you sure you want to update the balance?",
      );
      if (!confirmed) return;
    }

    const newBalance = calculateNewBalance();

    setIsSubmitting(true);
    try {
      await onUpdateBalance(
        selectedTrainer,
        balanceData.leaveType,
        newBalance,
        `${balanceData.actionType === "ADD" ? "Added" : "Deducted"} ${amount} days ${balanceData.actionType === "ADD" ? "to" : "from"} ${balanceData.leaveType.toLowerCase()} leave. ${balanceData.reason}`,
      );

      // Show success message
      alert(
        `${balanceData.actionType === "ADD" ? "Added" : "Deducted"} ${amount} days ${balanceData.actionType === "ADD" ? "to" : "from"} ${balanceData.leaveType} leave successfully!`,
      );

      // Reset form
      setBalanceData({
        leaveType: "CASUAL",
        actionType: "ADD",
        amount: "",
        reason: "",
      });

      // Refresh trainer balance data
      await handleTrainerSelect(selectedTrainer);

      // Refresh the page after 1 second to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error updating balance:", error);
      alert("Failed to update balance. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to check if deduction is valid
  const isDeductValid = () => {
    if (balanceData.actionType !== "DEDUCT") return true;

    const amount = Number(balanceData.amount);
    const currentBalance = getCurrentBalance(balanceData.leaveType);

    return !isNaN(amount) && amount > 0 && amount <= currentBalance;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600 mr-3" size={24} />
        <span className="text-gray-600">Loading trainers...</span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        Leave Balance Management
      </h2>

      {/* Warning Banner for Contracted Trainers */}
      {isContractedTrainer && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">
                Contracted Trainer
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                This trainer is marked as{" "}
                <span className="font-semibold">CONTRACTED</span>. Leave balance
                management is not applicable for contracted trainers.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Trainer Selection & Current Balance */}
        <div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Trainer
            </label>
            <select
              value={selectedTrainer}
              onChange={(e) => handleTrainerSelect(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a trainer...</option>
              {trainers?.map((trainer) => (
                <option key={trainer._id} value={trainer._id}>
                  {trainer.profile?.firstName} {trainer.profile?.lastName}(
                  {trainer.username}) - {trainer.trainerCategory}
                  {trainer.trainerCategory === "CONTRACTED" && " (Contracted)"}
                </option>
              ))}
            </select>
          </div>

          {isLoadingBalance ? (
            <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-600 mr-3" size={24} />
              <span className="text-gray-600">Loading balance...</span>
            </div>
          ) : trainerBalance ? (
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-800">Current Balance</h3>
                {isContractedTrainer && (
                  <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    Contracted
                  </span>
                )}
              </div>

              {isContractedTrainer ? (
                <div className="text-center py-8">
                  <CalendarX className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    Leave balance management is not available for contracted
                    trainers
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Sick Leave Balance */}
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Sick Leave
                      </span>
                      <span className="font-bold text-blue-600">
                        {getCurrentBalance("SICK")}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                      <div className="text-center">
                        <div>Used</div>
                        <div className="font-medium">
                          {typeof trainerBalance.sick === "object"
                            ? trainerBalance.sick.used || 0
                            : 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div>Carry Forward</div>
                        <div className="font-medium">
                          {typeof trainerBalance.sick === "object"
                            ? trainerBalance.sick.carryForward || 0
                            : 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div>Available</div>
                        <div className="font-medium">
                          {getCurrentBalance("SICK")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Casual Leave Balance */}
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Casual Leave
                      </span>
                      <span className="font-bold text-green-600">
                        {getCurrentBalance("CASUAL")}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                      <div className="text-center">
                        <div>Used</div>
                        <div className="font-medium">
                          {typeof trainerBalance.casual === "object"
                            ? trainerBalance.casual.used || 0
                            : 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div>Carry Forward</div>
                        <div className="font-medium">
                          {typeof trainerBalance.casual === "object"
                            ? trainerBalance.casual.carryForward || 0
                            : 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div>Available</div>
                        <div className="font-medium">
                          {getCurrentBalance("CASUAL")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Paid Leave Balance */}
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Paid Leave
                      </span>
                      <span className="font-bold text-purple-600">
                        {getCurrentBalance("PAID") >= 9999
                          ? "Unlimited"
                          : getCurrentBalance("PAID")}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                      <div className="text-center">
                        <div>Used</div>
                        <div className="font-medium">
                          {typeof trainerBalance.paid === "object"
                            ? trainerBalance.paid.used || 0
                            : 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div>Carry Forward</div>
                        <div className="font-medium">
                          {typeof trainerBalance.paid === "object"
                            ? trainerBalance.paid.carryForward || 0
                            : 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div>Available</div>
                        <div className="font-medium">
                          {getCurrentBalance("PAID") >= 9999
                            ? "∞"
                            : getCurrentBalance("PAID")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <p className="text-gray-500">
                Select a trainer to view their leave balance
              </p>
            </div>
          )}
        </div>

        {/* Right: Balance Update Form */}
        <div>
          {isContractedTrainer ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-medium text-gray-800 mb-2">
                Balance Management Locked
              </h3>
              <p className="text-gray-600 mb-4">
                Cannot update leave balance for CONTRACTED trainers
              </p>
              <div className="text-sm text-gray-500">
                Contracted trainers have different leave policies managed
                separately.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-medium text-gray-800 mb-4">
                Update Leave Balance
              </h3>

              <div className="space-y-4">
                {/* Leave Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Type
                  </label>
                  <select
                    value={balanceData.leaveType}
                    onChange={(e) =>
                      setBalanceData((prev) => ({
                        ...prev,
                        leaveType: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={!selectedTrainer || isSubmitting}
                  >
                    <option value="CASUAL">Casual Leave</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="PAID">Paid Leave</option>
                  </select>
                </div>

                {/* Action Type Selection (Add/Deduct) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setBalanceData((prev) => ({
                          ...prev,
                          actionType: "ADD",
                          amount: "", // Reset amount when changing action
                        }))
                      }
                      className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        balanceData.actionType === "ADD"
                          ? "bg-green-100 border-green-300 text-green-700"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                      disabled={!selectedTrainer || isSubmitting}
                    >
                      <PlusCircle className="w-5 h-5" />
                      <span className="font-medium">Add Days</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setBalanceData((prev) => ({
                          ...prev,
                          actionType: "DEDUCT",
                          amount: "", // Reset amount when changing action
                        }))
                      }
                      className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        balanceData.actionType === "DEDUCT"
                          ? "bg-red-100 border-red-300 text-red-700"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                      disabled={!selectedTrainer || isSubmitting}
                    >
                      <MinusCircle className="w-5 h-5" />
                      <span className="font-medium">Deduct Days</span>
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {balanceData.actionType === "ADD"
                      ? "Days to Add"
                      : "Days to Deduct"}
                  </label>
                  <input
                    type="number"
                    value={balanceData.amount}
                    onChange={(e) => {
                      // Remove any decimal values
                      const value = e.target.value.includes(".")
                        ? e.target.value.split(".")[0]
                        : e.target.value;

                      // Remove any negative values
                      const cleanValue = value.replace(/[^0-9]/g, "");

                      // Ensure minimum value is 1
                      const finalValue = cleanValue === "0" ? "1" : cleanValue;

                      setBalanceData((prev) => ({
                        ...prev,
                        amount: finalValue,
                      }));
                    }}
                    onKeyPress={(e) => {
                      // Prevent decimal point, negative sign, and 'e' (scientific notation)
                      if ([".", "-", "e", "E"].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Enter days to ${balanceData.actionType.toLowerCase()}`}
                    min="1"
                    required
                    disabled={!selectedTrainer || isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter whole number of days (no decimals)
                  </p>
                </div>

                {/* Reason Textarea */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Update
                  </label>
                  <textarea
                    value={balanceData.reason}
                    onChange={(e) =>
                      setBalanceData((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    placeholder="Explain why you're updating the balance..."
                    required
                    disabled={!selectedTrainer || isSubmitting}
                  />
                </div>

                {/* Preview Section */}
                {selectedTrainer &&
                  balanceData.amount &&
                  !isNaN(balanceData.amount) &&
                  balanceData.amount > 0 && (
                    <div
                      className={`p-4 border rounded-lg ${
                        balanceData.actionType === "DEDUCT" && !isDeductValid()
                          ? "bg-red-50 border-red-200"
                          : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <h4
                        className={`font-medium mb-2 ${
                          balanceData.actionType === "DEDUCT" &&
                          !isDeductValid()
                            ? "text-red-800"
                            : "text-blue-800"
                        }`}
                      >
                        Preview
                      </h4>
                      <div
                        className={`text-sm space-y-1 ${
                          balanceData.actionType === "DEDUCT" &&
                          !isDeductValid()
                            ? "text-red-700"
                            : "text-blue-700"
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>Current {balanceData.leaveType} Balance:</span>
                          <span className="font-medium">
                            {getCurrentBalance(balanceData.leaveType)} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Action:</span>
                          <span className="font-medium">
                            {balanceData.actionType === "ADD" ? (
                              <span className="text-green-600">
                                +{balanceData.amount} days
                              </span>
                            ) : (
                              <span className="text-red-600">
                                -{balanceData.amount} days
                              </span>
                            )}
                          </span>
                        </div>
                        {balanceData.actionType === "DEDUCT" &&
                          !isDeductValid() && (
                            <div className="text-red-600 text-xs font-medium mt-2">
                              ⚠️ Warning: Cannot deduct {balanceData.amount}{" "}
                              days. Available balance is only{" "}
                              {getCurrentBalance(balanceData.leaveType)} days.
                            </div>
                          )}
                        <div className="flex justify-between border-t pt-1">
                          <span className="font-medium">New Balance:</span>
                          <span className="font-bold">
                            {calculateNewBalance()} days
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={
                    !selectedTrainer ||
                    isSubmitting ||
                    (balanceData.actionType === "DEDUCT" && !isDeductValid())
                  }
                  className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    balanceData.actionType === "ADD"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed text-white`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processing...
                    </>
                  ) : !selectedTrainer ? (
                    "Select a trainer first"
                  ) : balanceData.actionType === "ADD" ? (
                    <>
                      <Plus className="w-5 h-5" />
                      Add {balanceData.amount || "0"} Days to{" "}
                      {balanceData.leaveType} Leave
                    </>
                  ) : (
                    <>
                      <Minus className="w-5 h-5" />
                      Deduct {balanceData.amount || "0"} Days from{" "}
                      {balanceData.leaveType} Leave
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function AutomationTab({
  status,
  loading,
  onTriggerIncrement,
  onTriggerRollover,
}) {
  const [isTriggering, setIsTriggering] = useState(false);
  const [showTestOptions, setShowTestOptions] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [testDaysAgo, setTestDaysAgo] = useState(30);

  const handleTriggerIncrement = async () => {
    if (!testMode) {
      // Normal mode - show confirmation
      if (
        window.confirm(
          "Are you sure you want to trigger monthly leave increment for ALL eligible permanent trainers?\n\n" +
            "Note: Only trainers who have worked 30+ days since last increment will receive leaves.",
        )
      ) {
        setIsTriggering(true);
        await onTriggerIncrement(false); // Pass false for normal mode
        setIsTriggering(false);
      }
    } else {
      // Test mode - ask for confirmation with test info
      if (
        window.confirm(
          `⚠️ TEST MODE ACTIVATED ⚠️\n\n` +
            `This will simulate that all permanent trainers had their last increment ${testDaysAgo} days ago.\n\n` +
            `All PERMANENT trainers will receive:\n` +
            `• +1 Casual leaves\n` +
            `• +1 Sick leave\n\n` +
            `Continue?`,
        )
      ) {
        setIsTriggering(true);
        await onTriggerIncrement(true, testDaysAgo); // Pass true for test mode and days
        setIsTriggering(false);
        setTestMode(false);
        setShowTestOptions(false);
      }
    }
  };

  const handleTriggerRollover = async () => {
    if (
      window.confirm(
        "Are you sure you want to trigger year-end rollover for ALL permanent trainers?\n\n" +
          "This will carry forward unused leaves (up to limits) and reset used leaves.",
      )
    ) {
      setIsTriggering(true);
      await onTriggerRollover();
      setIsTriggering(false);
    }
  };

  const toggleTestMode = () => {
    setShowTestOptions(!showTestOptions);
    if (!showTestOptions) {
      setTestMode(true);
    } else {
      setTestMode(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600 mr-3" size={24} />
        <span className="text-gray-600">Loading automation status...</span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        Automation Controls
      </h2>

      {/* Test Mode Banner */}
      {testMode && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <Zap className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-yellow-800">
                    Test Mode Active
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    In test mode, the system will simulate that all permanent
                    trainers are eligible for increment.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTestMode(false);
                    setShowTestOptions(false);
                  }}
                  className="text-sm text-yellow-700 hover:text-yellow-800"
                >
                  Exit Test Mode
                </button>
              </div>

              {showTestOptions && (
                <div className="mt-4 p-3 bg-white border border-yellow-100 rounded">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-yellow-800 mb-2">
                      Simulate days since last increment:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="90"
                        value={testDaysAgo}
                        onChange={(e) => setTestDaysAgo(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-lg font-bold text-yellow-700 min-w-[60px]">
                        {testDaysAgo} days
                      </span>
                    </div>
                    <div className="text-xs text-yellow-600 mt-2 flex justify-between">
                      <span>1 day</span>
                      <span>30 days (standard)</span>
                      <span>90 days</span>
                    </div>
                  </div>

                  <div className="text-sm text-yellow-700">
                    <p className="font-medium">What will happen:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>
                        All PERMANENT trainers will receive +1 casual leaves
                      </li>
                      <li>All PERMANENT trainers will receive +1 sick leave</li>
                      <li>
                        Trainers' lastIncrementDate will be updated to today
                      </li>
                      <li>Next increment will be in 30 days from now</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Automation Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="text-blue-600" size={24} />
            <h3 className="font-bold text-blue-800">System Status</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-700">Permanent Trainers</span>
              <span className="font-bold">
                {status?.stats?.permanentTrainers || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Contracted Trainers</span>
              <span className="font-bold">
                {status?.stats?.contractedTrainers || 0}
              </span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-700 font-medium">Total Trainers</span>
              <span className="font-bold text-blue-600">
                {status?.stats?.totalTrainers || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="text-green-600" size={24} />
            <h3 className="font-bold text-green-800">Automation Schedule</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">
                  Monthly Increment
                </span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  {status?.automation?.monthlyIncrement?.schedule ||
                    "Daily at 2:00 AM"}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {status?.automation?.monthlyIncrement?.description ||
                  "Checks and increments leaves for PERMANENT trainers every 30 days"}
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">
                  Year-end Rollover
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    status?.automation?.yearEndRollover?.isDecember
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {status?.automation?.yearEndRollover?.schedule ||
                    "1st of every month at 3:00 AM"}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {status?.automation?.yearEndRollover?.description ||
                  "Rolls over unused leaves for PERMANENT trainers"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Controls */}
      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Manual Controls
          </h3>
          <button
            onClick={toggleTestMode}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              testMode
                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {testMode ? (
              <>
                <Zap size={16} />
                Test Mode Active
              </>
            ) : (
              <>
                <AlertTriangle size={16} />
                Enable Test Mode
              </>
            )}
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          {testMode
            ? "Test mode allows you to simulate monthly increments even for new trainers. Use this for testing only."
            : "Use these controls to manually trigger automated processes for testing or immediate execution."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Increment Card */}
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <PlusCircle className="text-green-600" size={24} />
              <h4 className="font-bold text-gray-800">Monthly Increment</h4>
            </div>
            <p className="text-gray-600 mb-4">
              {testMode
                ? `Simulate that trainers had their last increment ${testDaysAgo} days ago. All PERMANENT trainers will receive leaves.`
                : "Manually trigger monthly leave increment for all PERMANENT trainers who have worked 30+ days since last increment."}
            </p>

            <div className="space-y-3">
              <button
                onClick={handleTriggerIncrement}
                disabled={isTriggering}
                className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 ${
                  testMode
                    ? "bg-yellow-600 text-white hover:bg-yellow-700"
                    : "bg-green-600 text-white hover:bg-green-700"
                } disabled:opacity-50`}
              >
                {isTriggering ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Processing...
                  </>
                ) : testMode ? (
                  <>
                    <Zap size={16} />
                    Test Increment ({testDaysAgo} days ago)
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Trigger Monthly Increment
                  </>
                )}
              </button>

              {!testMode && (
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} />
                  <span>
                    Only trainers with 30+ days since last increment will be
                    updated
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Year-end Rollover Card */}
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="text-purple-600" size={24} />
              <h4 className="font-bold text-gray-800">Year-end Rollover</h4>
            </div>
            <p className="text-gray-600 mb-4">
              Manually trigger year-end leave rollover for all PERMANENT
              trainers. Carries forward unused leaves (up to limits) and resets
              used leaves.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleTriggerRollover}
                disabled={isTriggering}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isTriggering ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Calendar size={16} />
                    Trigger Year-end Rollover
                  </>
                )}
              </button>

              <div className="text-xs text-gray-500 flex items-center gap-1">
                <AlertTriangle size={12} />
                <span>
                  This process is typically run once a year (December)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsTab({ onGenerateReport }) {
  const [reportType, setReportType] = useState("balance");
  const [dateRange, setDateRange] = useState({
    from: "",
    to: "",
  });
  const [format, setFormat] = useState("csv");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    await onGenerateReport();
    setGenerating(false);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        Reports & Analytics
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Report Options */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-medium text-gray-800 mb-4">Generate Report</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      id: "balance",
                      label: "Leave Balance",
                      description: "Current leave balances for all trainers",
                    },
                    {
                      id: "usage",
                      label: "Leave Usage",
                      description: "Leave usage statistics by period",
                    },
                    {
                      id: "pending",
                      label: "Pending Requests",
                      description: "All pending leave requests",
                    },
                    {
                      id: "history",
                      label: "Leave History",
                      description: "Complete leave history",
                    },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setReportType(type.id)}
                      className={`p-4 border rounded-lg text-left ${
                        reportType === type.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="font-medium text-gray-800">
                        {type.label}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {type.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        from: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, to: e.target.value }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format
                </label>
                <div className="flex gap-3">
                  {["csv", "excel", "pdf"].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className={`px-4 py-2 rounded-lg ${
                        format === fmt
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Generate{" "}
                    {reportType.charAt(0).toUpperCase() +
                      reportType.slice(1)}{" "}
                    Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Quick Reports */}
        <div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-medium text-gray-800 mb-4">Quick Reports</h3>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setReportType("balance");
                  setDateRange({ from: "", to: "" });
                  setFormat("csv");
                }}
                className="w-full p-4 bg-white border border-blue-200 rounded-lg hover:border-blue-300 text-left"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-blue-600" size={20} />
                  <div>
                    <div className="font-medium text-gray-800">
                      Current Balances
                    </div>
                    <div className="text-sm text-gray-500">
                      All trainers' current leave balances
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setReportType("pending");
                  setDateRange({ from: "", to: "" });
                  setFormat("csv");
                }}
                className="w-full p-4 bg-white border border-yellow-200 rounded-lg hover:border-yellow-300 text-left"
              >
                <div className="flex items-center gap-3">
                  <Clock className="text-yellow-600" size={20} />
                  <div>
                    <div className="font-medium text-gray-800">
                      Pending Requests
                    </div>
                    <div className="text-sm text-gray-500">
                      All pending leave requests
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1,
                  );
                  setReportType("usage");
                  setDateRange({
                    from: firstDay.toISOString().split("T")[0],
                    to: today.toISOString().split("T")[0],
                  });
                  setFormat("excel");
                }}
                className="w-full p-4 bg-white border border-green-200 rounded-lg hover:border-green-300 text-left"
              >
                <div className="flex items-center gap-3">
                  <Activity className="text-green-600" size={20} />
                  <div>
                    <div className="font-medium text-gray-800">
                      This Month's Usage
                    </div>
                    <div className="text-sm text-gray-500">
                      Leave usage for current month
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Report Tips</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>
                <span>CSV format is best for data analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5"></div>
                <span>Excel format includes formatting and formulas</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5"></div>
                <span>PDF format is best for printing and sharing</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
