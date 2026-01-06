import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import api from "../../config/api.js";
import { formatTime } from "../../utils/dateFormat.js";

export default function AdminDashboard() {
  const { user } = useAuth();
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
        year: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const handleViewLeaves = () => {
    window.location.href = "/admin/leaves/pending";
    setSidebarOpen(false);
  };

  const handleViewClockedIn = () => {
    window.location.href = "/admin/clocked-in";
    setSidebarOpen(false);
  };

  if (user?.role !== "ADMIN" && user?.role !== "HR") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 font-bold text-xl">❌ Access Denied</p>
          <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const StatCard = ({ title, value, sub, icon, iconBg }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-5">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start">
        <div className="min-w-0 flex-1">
          <p className="text-xs md:text-sm text-gray-600 truncate">{title}</p>
          <p className="text-xl md:text-2xl font-bold text-gray-800 mt-1 md:mt-2">{value}</p>
          <p className="text-xs md:text-sm text-gray-600 mt-1 truncate">{sub}</p>
        </div>
        <div className={`${iconBg} p-2 md:p-3 rounded-full mt-2 md:mt-0 md:ml-2 flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const ClockedInUser = ({ user }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 md:p-4 hover:bg-white transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-800 text-sm truncate">{user.name}</h3>
          <p className="text-xs text-gray-500 truncate">ID: {user.employeeId}</p>
        </div>
        <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ml-2">
          {formatDuration(user.duration)}
        </div>
      </div>
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex items-center gap-1 truncate">
          <Clock size={12} className="flex-shrink-0" />
          <span className="truncate">Clocked in: {safeFormatTime(user.clockInTime)}</span>
        </div>
        {user.location && (
          <div className="flex items-center gap-1 truncate">
            <MapPin size={12} className="flex-shrink-0" />
            <span className="truncate">
              {user.location.latitude?.toFixed(4)}, {user.location.longitude?.toFixed(4)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const LeaveItem = ({ leave }) => (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg gap-2">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-800 text-sm truncate">
          {leave.trainerId?.profile?.firstName} {leave.trainerId?.profile?.lastName}
        </h3>
        <p className="text-xs text-gray-600 truncate">
          {leave.leaveType} • {formatLeaveDate(leave.fromDate)} to {formatLeaveDate(leave.toDate)}
        </p>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
          Reason: {leave.reason?.substring(0, 50)}...
        </p>
      </div>
      <button
        onClick={() => (window.location.href = `/admin/leaves/${leave._id || leave.id}`)}
        className="bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 transition-colors inline-flex items-center gap-1 whitespace-nowrap flex-shrink-0"
      >
        <Eye size={14} /> View
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-md p-4 flex items-center justify-between sticky top-0 z-40">
          <h1 className="text-lg font-bold text-gray-800">Dashboard</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
          className={`fixed lg:static inset-y-0 left-0 bg-white shadow-lg overflow-y-auto z-40 transform transition-all duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 ${sidebarCollapsed ? "lg:w-20" : "lg:w-80"} w-80 lg:h-screen lg:sticky lg:top-0`}
        >
          {/* Desktop Collapse Button */}
          <div className="hidden lg:flex p-4 border-b border-gray-200 justify-between items-center">
            <h3 className={`font-bold text-gray-800 transition-opacity ${
              sidebarCollapsed ? "opacity-0 w-0" : "opacity-100"
            }`}>
              Menu
            </h3>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
              title={sidebarCollapsed ? "Expand" : "Collapse"}
            >
              <ChevronLeft size={20} className={`transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Mobile Close Button */}
          <div className="lg:hidden p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">Currently Working</h2>
            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded">
              <X size={20} />
            </button>
          </div>

          {/* Desktop Header */}
          <div className="p-4 md:p-6 border-b border-gray-200 hidden lg:block">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold text-gray-800 flex items-center gap-2 transition-opacity ${
                sidebarCollapsed ? "opacity-0" : "opacity-100"
              }`}>
                <Users className="text-green-600 flex-shrink-0" size={20} />
                <span className="truncate">Currently Working</span>
              </h2>
              <span className={`bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex-shrink-0 transition-opacity ${
                sidebarCollapsed ? "opacity-0 w-0 px-0" : "opacity-100"
              }`}>
                {clockedInUsers.length}
              </span>
            </div>
            <p className={`text-xs md:text-sm text-gray-500 mt-2 transition-opacity ${
              sidebarCollapsed ? "opacity-0 h-0" : "opacity-100"
            }`}>
              Real-time clocked-in users
            </p>
          </div>

          {/* Desktop Content */}
          <div className="p-3 md:p-4 hidden lg:block">
            {clockedInLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : clockedInUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto text-gray-400" size={32} />
                <p className={`text-gray-500 mt-2 text-xs md:text-sm transition-opacity ${
                  sidebarCollapsed ? "opacity-0 h-0" : "opacity-100"
                }`}>
                  No one is clocked in
                </p>
              </div>
            ) : (
              <div className={`space-y-2 md:space-y-3 transition-opacity ${
                sidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}>
                {clockedInUsers.map((user) => (
                  <ClockedInUser key={user.id} user={user} />
                ))}
              </div>
            )}

            {clockedInUsers.length > 0 && (
              <button
                onClick={handleViewClockedIn}
                className={`w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium ${
                  sidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              >
                View Detailed Report
              </button>
            )}

            <div className={`mt-4 text-center transition-opacity ${
              sidebarCollapsed ? "opacity-0 h-0" : "opacity-100"
            }`}>
              <p className="text-xs text-gray-400">🔄 Auto-refreshes every 30s</p>
            </div>
          </div>

          {/* Mobile Content */}
          <div className="p-3 md:p-4 lg:hidden">
            {clockedInLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : clockedInUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto text-gray-400" size={32} />
                <p className="text-gray-500 mt-2 text-xs md:text-sm">No one is clocked in</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {clockedInUsers.map((user) => (
                  <ClockedInUser key={user.id} user={user} />
                ))}
              </div>
            )}

            {clockedInUsers.length > 0 && (
              <button
                onClick={handleViewClockedIn}
                className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View Detailed Report
              </button>
            )}

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">🔄 Auto-refreshes every 30s</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full overflow-x-hidden overflow-y-auto">
          <div className="p-3 md:p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-4 md:mb-8">
                <h1 className="text-xl md:text-3xl font-bold text-gray-800">
                  {user?.role === "ADMIN" ? "Admin Dashboard" : "HR Dashboard"}
                </h1>
                <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2 truncate">
                  Welcome back, {String(user?.profile?.firstName || "User")}
                </p>
                {error && (
                  <div className="mt-3 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg text-sm">
                    <AlertCircle size={16} className="inline mr-2" />
                    {error}
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-6 mb-6 md:mb-8">
                <StatCard
                  title="Total Trainers"
                  value={stats.totalTrainers}
                  sub={`${stats.activeTrainers} active`}
                  icon={<Users className="text-blue-600" size={20} />}
                  iconBg="bg-blue-100"
                />
                <StatCard
                  title="Pending Leaves"
                  value={stats.pendingLeaves}
                  sub="Requires attention"
                  icon={<Calendar className="text-purple-600" size={20} />}
                  iconBg="bg-purple-100"
                />
                <StatCard
                  title="Clocked In"
                  value={stats.clockedInToday}
                  sub={`of ${stats.totalTrainers}`}
                  icon={<Clock className="text-green-600" size={20} />}
                  iconBg="bg-green-100"
                />
                <StatCard
                  title="Attendance"
                  value={`${stats.attendanceRate}%`}
                  sub="Today"
                  icon={<BarChart3 className="text-orange-600" size={20} />}
                  iconBg="bg-orange-100"
                />
              </div>

              {/* Sections Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Pending Leaves */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-4">
                    <h2 className="text-base md:text-xl font-bold">Pending Leave Requests</h2>
                    <button
                      onClick={handleViewLeaves}
                      className="text-xs md:text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    {pendingLeaves.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="mx-auto text-gray-400 mb-2" size={32} />
                        <p className="text-sm">No pending leave requests</p>
                      </div>
                    ) : (
                      pendingLeaves.map((leave) => (
                        <LeaveItem key={leave._id || leave.id} leave={leave} />
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Overview */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
                  <h2 className="text-base md:text-xl font-bold mb-4">Quick Overview</h2>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold text-blue-800 text-sm mb-1">Attendance Summary</h3>
                      <p className="text-xs md:text-sm text-blue-700">
                        {stats.clockedInToday} of {stats.totalTrainers} trainers are working ({stats.attendanceRate}%)
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h3 className="font-semibold text-purple-800 text-sm mb-1">Leave Management</h3>
                      <p className="text-xs md:text-sm text-purple-700">
                        {stats.pendingLeaves} leave requests pending
                      </p>
                      {pendingLeaves.length > 0 && (
                        <button
                          onClick={handleViewLeaves}
                          className="mt-2 text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition-colors"
                        >
                          Manage
                        </button>
                      )}
                    </div>
                    {user?.role === "ADMIN" && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <h3 className="font-semibold text-green-800 text-sm mb-1">HR Management</h3>
                        <p className="text-xs md:text-sm text-green-700">{stats.totalHR} HR personnel in system</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Refresh Button */}
              <div className="mt-6 md:mt-8 flex justify-center">
                <button
                  onClick={loadDashboardData}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors inline-flex items-center gap-2 text-sm md:text-base"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}