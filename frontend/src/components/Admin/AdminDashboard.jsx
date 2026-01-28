import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import {
  Users,
  Calendar,
  Clock,
  BarChart3,
  AlertCircle,
  MapPin,
  RefreshCw,
  Eye,
  Menu,
  X,
  ChevronLeft,
  ArrowRight,
  Activity,
} from "lucide-react";
import api from "../../config/api.js";
import { formatTime } from "../../utils/dateFormat.js";

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    totalTrainers: 0,
    activeTrainers: 0,
    pendingLeaves: 0,
    clockedInToday: 0,
    totalHR: 0,
    attendanceRate: 0,
  });
  const [clockedInUsers, setClockedInUsers] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockedInLoading, setClockedInLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
    loadClockedInUsers();
    loadPendingLeaves();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        trainersCountResponse,
        activeTrainersResponse,
        attendanceRateResponse,
        hrCountResponse,
        pendingLeavesResponse,
      ] = await Promise.all([
        api.get("/users/count/by-role?role=TRAINER"),
        api.get("/users/count/active-trainers"),
        api.get("/attendance/stats/attendance-rate"),
        user?.role === "ADMIN"
          ? api.get("/users/count/by-role?role=HR")
          : Promise.resolve({ data: { data: { count: 0 } } }),
        api.get("/leaves/pending"),
      ]);

      const totalTrainers = Number(trainersCountResponse.data.data?.count) || 0;
      const activeTrainers = Number(activeTrainersResponse.data.data?.count) || 0;
      const attendanceData = attendanceRateResponse.data.data || {};
      const totalHR = Number(hrCountResponse.data.data?.count) || 0;
      const pendingLeavesData = pendingLeavesResponse.data.data || [];

      setStats({
        totalTrainers: Number(attendanceData.totalTrainers) || totalTrainers,
        activeTrainers,
        pendingLeaves: Array.isArray(pendingLeavesData) ? pendingLeavesData.length : 0,
        clockedInToday: Number(attendanceData.clockedInToday) || 0,
        totalHR,
        attendanceRate: Number(attendanceData.attendanceRate) || 0,
      });
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setError("Failed to load dashboard data");
      setStats({
        totalTrainers: 24,
        activeTrainers: 22,
        pendingLeaves: 3,
        clockedInToday: 18,
        totalHR: user?.role === "ADMIN" ? 4 : 0,
        attendanceRate: 85,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClockedInUsers = async () => {
    try {
      setClockedInLoading(true);
      const response = await api.get("/attendance/today/clocked-in-list");

      if (response.data.success) {
        const users = response.data.data || [];
        const validatedUsers = users.map((user) => ({
          id: user.id || user._id || `user-${Math.random()}`,
          employeeId: String(user.employeeId || "N/A"),
          name: String(user.name || "Unknown User"),
          clockInTime: user.clockInTime,
          duration: user.duration || { hours: 0, minutes: 0 },
          location: user.location || null,
        }));
        setClockedInUsers(validatedUsers);
      }
    } catch (error) {
      console.error("Error loading clocked-in users:", error);
    } finally {
      setClockedInLoading(false);
    }
  };

  const loadPendingLeaves = async () => {
    try {
      const response = await api.get("/leaves/pending");
      if (response.data.success) {
        setPendingLeaves((response.data.data || []).slice(0, 5));
      }
    } catch (error) {
      console.error("Error loading pending leaves:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!clockedInLoading) loadClockedInUsers();
    }, 30000);
    return () => clearInterval(interval);
  }, [clockedInLoading]);

  const formatDuration = (duration) => {
    if (!duration || typeof duration !== "object") return "0h 0m";
    const hours = Number(duration.hours) || 0;
    const minutes = Number(duration.minutes) || 0;
    return `${hours}h ${minutes}m`;
  };

  const safeFormatTime = (time) => {
    if (!time) return "Unknown";
    try {
      return formatTime(time);
    } catch {
      return "Invalid Time";
    }
  };

  const formatLeaveDate = (date) => {
    if (!date) return "Unknown";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const navigateToClockedIn = () => {
    navigate("/admin/clocked-in");
    setSidebarOpen(false);
  };

  const navigateToPendingLeaves = () => {
    navigate("/admin/leaves/pending");
    setSidebarOpen(false);
  };

  if (user?.role !== "ADMIN" && user?.role !== "HR") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-6">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-bold text-xl">Access Denied</p>
          <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, sub, icon, iconBg, onClick }) => (
    <div
      className="bg-white rounded-lg shadow hover:shadow-md transition-all border border-gray-100 p-4 sm:p-5 cursor-pointer hover:border-blue-200"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{value}</p>
          <p className="text-xs text-gray-500 mt-2">{sub}</p>
        </div>
        <div className={`${iconBg} p-3 rounded-lg flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const ClockedInUser = ({ user }) => (
    <div className="bg-white border border-gray-100 rounded-lg p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{user.name}</h3>
          <p className="text-xs text-gray-500 mt-1">ID: {user.employeeId}</p>
        </div>
        <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ml-2">
          {formatDuration(user.duration)}
        </span>
      </div>
      <div className="space-y-2 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-blue-600 flex-shrink-0" />
          <span className="truncate">{safeFormatTime(user.clockInTime)}</span>
        </div>
        {user.location && (
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-red-600 flex-shrink-0" />
            <span className="text-xs text-gray-500">
              {user.location.latitude?.toFixed(4)}, {user.location.longitude?.toFixed(4)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen flex-col lg:flex-row">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-40">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-500">Welcome back</p>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <div
          className={`fixed lg:static inset-y-14 left-0 lg:inset-y-0 bg-white border-r border-gray-200 overflow-y-auto z-40 transition-all duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0 w-80" : "-translate-x-full"
          } lg:translate-x-0 ${sidebarCollapsed ? "lg:w-20" : "lg:w-72"} lg:h-screen lg:sticky lg:top-0`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
            <h3 className={`font-bold text-gray-900 transition-opacity ${sidebarCollapsed ? "opacity-0 w-0" : "opacity-100"}`}>
              Currently Working
            </h3>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden lg:flex text-gray-700"
              title={sidebarCollapsed ? "Expand" : "Collapse"}
            >
              <ChevronLeft size={18} className={`transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg lg:hidden text-gray-700"
            >
              <X size={18} />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="p-4">
            {clockedInLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-4 border-gray-300 border-t-blue-600"></div>
              </div>
            ) : clockedInUsers.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="mx-auto text-gray-300 mb-3" size={32} />
                <p className={`text-gray-500 text-sm transition-opacity ${sidebarCollapsed ? "opacity-0 h-0" : "opacity-100"}`}>
                  No one clocked in
                </p>
              </div>
            ) : (
              <div className={`space-y-3 transition-opacity ${sidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                {clockedInUsers.map((u) => (
                  <div key={u.id} className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{u.name}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      <Clock size={12} className="inline mr-1" />
                      {safeFormatTime(u.clockInTime)}
                    </p>
                    <p className="text-xs font-semibold text-green-700 mt-2">{formatDuration(u.duration)}</p>
                  </div>
                ))}
              </div>
            )}

            {clockedInUsers.length > 0 && (
              <button
                onClick={navigateToClockedIn}
                className={`w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium inline-flex items-center justify-center gap-1 ${
                  sidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              >
                View Details
                <ArrowRight size={14} />
              </button>
            )}

            <p className={`text-center text-xs text-gray-400 mt-4 transition-opacity ${sidebarCollapsed ? "opacity-0 h-0" : "opacity-100"}`}>
              🔄 Updates every 30s
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {user?.role === "ADMIN" ? "Admin Dashboard" : "HR Dashboard"}
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                Welcome, {String(user?.profile?.firstName || "User")}
              </p>
              {error && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Total Trainers"
                value={stats.totalTrainers}
                sub={`${stats.activeTrainers} active`}
                icon={<Users className="text-blue-600" size={22} />}
                iconBg="bg-blue-100"
              />
              <StatCard
                title="Pending Leaves"
                value={stats.pendingLeaves}
                sub="Awaiting approval"
                icon={<Calendar className="text-purple-600" size={22} />}
                iconBg="bg-purple-100"
                onClick={navigateToPendingLeaves}
              />
              <StatCard
                title="Clocked In Today"
                value={stats.clockedInToday}
                sub={`of ${stats.totalTrainers}`}
                icon={<Clock className="text-green-600" size={22} />}
                iconBg="bg-green-100"
                onClick={navigateToClockedIn}
              />
              <StatCard
                title="Attendance Rate"
                value={`${stats.attendanceRate}%`}
                sub="Today's average"
                icon={<BarChart3 className="text-orange-600" size={22} />}
                iconBg="bg-orange-100"
              />
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Clocked In Users */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow border border-gray-100">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Activity size={20} className="text-green-600" />
                      Currently Working
                    </h2>
                    <span className="bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">
                      {clockedInUsers.length}
                    </span>
                  </div>

                  <div className="p-5">
                    {clockedInLoading ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
                      </div>
                    ) : clockedInUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="mx-auto text-gray-300 mb-3" size={40} />
                        <p className="text-gray-500">No trainers clocked in</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {clockedInUsers.slice(0, 5).map((u) => (
                          <ClockedInUser key={u.id} user={u} />
                        ))}
                      </div>
                    )}

                    {clockedInUsers.length > 5 && (
                      <button
                        onClick={navigateToClockedIn}
                        className="w-full mt-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        View All ({clockedInUsers.length})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Pending Leaves */}
              <div>
                <div className="bg-white rounded-lg shadow border border-gray-100">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Calendar size={20} className="text-purple-600" />
                      Pending
                    </h2>
                    <span className="bg-purple-100 text-purple-700 text-sm font-semibold px-3 py-1 rounded-full">
                      {stats.pendingLeaves}
                    </span>
                  </div>

                  <div className="p-5">
                    {pendingLeaves.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="mx-auto text-gray-300 mb-2" size={32} />
                        <p className="text-gray-500 text-sm">No pending leaves</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingLeaves.slice(0, 3).map((leave) => (
                          <div key={leave._id} className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                            <h4 className="font-semibold text-gray-900 text-sm truncate">
                              {leave.trainerId?.profile?.firstName} {leave.trainerId?.profile?.lastName}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">{leave.leaveType}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatLeaveDate(leave.fromDate)} - {formatLeaveDate(leave.toDate)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {pendingLeaves.length > 0 && (
                      <button
                        onClick={navigateToPendingLeaves}
                        className="w-full mt-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        Manage All
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-2">Today's Summary</h3>
                <p className="text-2xl font-bold text-blue-600">{stats.clockedInToday}/{stats.totalTrainers}</p>
                <p className="text-xs text-gray-600 mt-1">Trainers working ({stats.attendanceRate}%)</p>
              </div>
              {user?.role === "ADMIN" && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-5">
                  <h3 className="font-bold text-gray-900 text-sm mb-2">HR Personnel</h3>
                  <p className="text-2xl font-bold text-green-600">{stats.totalHR}</p>
                  <p className="text-xs text-gray-600 mt-1">Active in system</p>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <div className="flex justify-center mb-6">
              <button
                onClick={loadDashboardData}
                className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors inline-flex items-center gap-2 text-sm font-medium"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}