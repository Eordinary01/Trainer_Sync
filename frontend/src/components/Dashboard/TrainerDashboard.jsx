import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGeolocation } from "../../hooks/useGeolocation.js";
import { useAttendanceStore } from "../../store/attendanceStore.js";
import { useAuth } from "../../hooks/useAuth.js";
import {
  Clock,
  Calendar,
  TrendingUp,
  Loader2,
  MapPin,
  History,
  AlertCircle,
  User,
  Briefcase,
  Target,
  Award,
  Lock,
} from "lucide-react";
import { formatTime, formatDate, getDayName } from "../../utils/dateFormat.js";
import api from "../../config/api.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // ✅ Geolocation hook
  const { error: geoError, getLocation } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  });

  // ✅ Attendance store
  const {
    todayStatus,
    loading: attendanceLoading,
    error: attendanceError,
    getTodayStatus,
    clockIn,
    clockOut,
    getWeeklyReport,
    clearError,
  } = useAttendanceStore();

  const [weeklyData, setWeeklyData] = useState([]);
  const [processingAction, setProcessingAction] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [leaveBalance, setLeaveBalance] = useState({
    sick: { available: 0, used: 0, carryForward: 0 },
    casual: { available: 0, used: 0, carryForward: 0 },
    paid: { available: Infinity, used: 0, carryForward: 0 },
  });
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [trainerStats, setTrainerStats] = useState({
    totalLeaves: 0,
    approvedLeaves: 0,
    pendingLeaves: 0,
    rejectedLeaves: 0,
  });

  // Check if user is a contracted trainer
  const isContracted = useMemo(() => {
    return user?.trainerCategory === "CONTRACTED";
  }, [user]);

  // Helper to safely get balance value
  const getBalanceValue = useMemo(() => {
    return (type) => {
      const balanceData = leaveBalance[type];
      if (!balanceData) return 0;
      if (typeof balanceData === 'object') {
        return balanceData.available === Infinity ? Infinity : (balanceData.available || 0);
      }
      return balanceData === Infinity ? Infinity : (balanceData || 0);
    };
  }, [leaveBalance]);

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setDashboardLoading(true);

        // Load all data in parallel
        const [
          todayStatusRes,
          weeklyReportRes,
          recentLeavesRes,
          balanceRes,
          statsRes,
        ] = await Promise.allSettled([
          getTodayStatus(),
          getWeeklyReport(),
          api.get("/leaves/history?limit=5"),
          api.get("/leaves/balance"),
          api.get("/leaves/statistics"),
        ]);

        // Set today's status
        if (todayStatusRes.status === "fulfilled") {
          // status already set in store
        }

        // Set weekly data
        if (weeklyReportRes.status === "fulfilled" && weeklyReportRes.value) {
          const weeklyReport = weeklyReportRes.value;
          // Convert object to array for easier mapping
          const weeklyArray = Object.entries(weeklyReport).map(
            ([day, hours]) => ({
              day: getDayName(day, "short"),
              hours: hours || 0,
            }),
          );
          setWeeklyData(weeklyArray);
        }

        // Set leave data
        if (recentLeavesRes.status === "fulfilled") {
          const leavesData = recentLeavesRes.value.data;
          setLeaveHistory(leavesData?.data?.leaves || leavesData?.leaves || []);
        }

        // Set leave balance
        if (balanceRes.status === "fulfilled") {
          const balanceData = balanceRes.value.data?.data || balanceRes.value.data;
          if (balanceData) {
            // Ensure each balance type has the proper structure
            const formattedBalance = {
              sick: typeof balanceData.sick === 'object' ? balanceData.sick : { available: balanceData.sick || 0, used: 0, carryForward: 0 },
              casual: typeof balanceData.casual === 'object' ? balanceData.casual : { available: balanceData.casual || 0, used: 0, carryForward: 0 },
              paid: typeof balanceData.paid === 'object' ? balanceData.paid : { available: balanceData.paid === Infinity ? Infinity : (balanceData.paid || 0), used: 0, carryForward: 0 },
            };
            setLeaveBalance(formattedBalance);
          }
        }

        // Set leave statistics
        if (statsRes.status === "fulfilled") {
          const statsData = statsRes.value.data;
          if (statsData?.success) {
            setTrainerStats(
              statsData.data?.statistics || {
                totalLeaves: 0,
                approvedLeaves: 0,
                pendingLeaves: 0,
                rejectedLeaves: 0,
              },
            );
          }
        }
      } catch (error) {
        console.error("❌ Error loading dashboard:", error);
      } finally {
        setDashboardLoading(false);
      }
    };
    initializeDashboard();

    // Set up auto-refresh for clock status (every 30 seconds)
    const interval = setInterval(() => {
      getTodayStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const isClockedIn = todayStatus?.status === "CLOCKED_IN";
  const clockInTime = todayStatus?.clockInTime || null;
  const clockOutTime = todayStatus?.clockOutTime || null;
  const todayLocation = todayStatus?.location;

  // Calculate total available leave balance
  const calculateTotalLeaveBalance = () => {
    if (isContracted) {
      // Contracted trainers only have paid leave
      return getBalanceValue("paid");
    }
    
    const sick = getBalanceValue("sick");
    const casual = getBalanceValue("casual");
    const paid = getBalanceValue("paid");

    if (paid === Infinity) {
      return Infinity;
    }

    return sick + casual + (paid || 0);
  };

  // ⭐ Helper for total display
  const getTotalLeaveDisplay = () => {
    const total = calculateTotalLeaveBalance();
    if (total === Infinity) return "Unlimited";
    return `${total} days`;
  };

  /**
   * ✅ Unified clock-in/out handler
   */
  const handleClockAction = async () => {
    if (processingAction || fetchingLocation) return;

    try {
      setProcessingAction(true);
      setFetchingLocation(true);
      clearError();

      console.log("📍 Fetching your location...");
      const locationData = await getLocation();
      console.log("✅ Coordinates obtained:", locationData);
      setFetchingLocation(false);

      if (!locationData?.latitude || !locationData?.longitude) {
        throw new Error(
          "Unable to get your location. Please ensure location services are enabled.",
        );
      }

      if (!isClockedIn) {
        console.log("⏰ Sending clock-in request...");
        await clockIn(locationData.latitude, locationData.longitude);
        console.log("✅ Clocked in successfully");
      } else {
        console.log("⏰ Sending clock-out request...");
        await clockOut(locationData.latitude, locationData.longitude);
        console.log("✅ Clocked out successfully");
      }

      // Refresh data
      await Promise.all([getTodayStatus(), getWeeklyReport()]);
    } catch (error) {
      console.error("❌ Error during clock action:", error);
    } finally {
      setProcessingAction(false);
      setFetchingLocation(false);
    }
  };

  const handleApplyLeave = () => navigate("/trainer/apply-leave");
  const handleViewHistory = () => navigate("/trainer/attendance-history");
  const handleViewLeaveHistory = () => navigate("/trainer/leaves/history");
  const handleViewLeaveBalance = () => navigate("/trainer/leaves/balance");

  const trainerName = user?.profile?.firstName
    ? `${user.profile.firstName} ${user.profile.lastName || ""}`.trim()
    : user?.username || "Trainer";

  const getButtonText = () => {
    if (fetchingLocation) return "FETCHING LOCATION...";
    if (processingAction || attendanceLoading) {
      return isClockedIn ? "PROCESSING CLOCK OUT..." : "PROCESSING CLOCK IN...";
    }
    return isClockedIn ? "CLOCK OUT" : "CLOCK IN";
  };

  // Calculate total weekly hours
  const totalWeeklyHours = weeklyData.reduce(
    (sum, day) => sum + (day.hours || 0),
    0,
  );

  // Format today's working hours
  const getTodayHours = () => {
    if (!todayStatus?.clockInTime) return "0h";
    const start = new Date(todayStatus.clockInTime);
    const end = todayStatus.clockOutTime
      ? new Date(todayStatus.clockOutTime)
      : new Date();
    const hours = (end - start) / (1000 * 60 * 60);
    return `${hours.toFixed(1)}h`;
  };

  // Get location display
  const getLocationDisplay = () => {
    if (!todayLocation) return null;
    if (todayLocation.address) return todayLocation.address;
    return `${todayLocation.latitude?.toFixed(4)}, ${todayLocation.longitude?.toFixed(4)}`;
  };

  // Get recent leave status
  const getRecentLeaveStatus = () => {
    if (leaveHistory.length === 0) return "No recent leaves";

    const recentLeave = leaveHistory[0];
    const statusColor =
      {
        APPROVED: "text-green-600",
        PENDING: "text-yellow-600",
        REJECTED: "text-red-600",
      }[recentLeave.status] || "text-gray-600";

    return (
      <span className={statusColor}>
        {recentLeave.leaveType} - {recentLeave.status}
      </span>
    );
  };

  // Get trainer category badge
  const getTrainerCategoryBadge = () => {
    const category = user?.trainerCategory;
    if (!category) return null;

    const config = {
      PERMANENT: { color: "bg-green-100 text-green-800", label: "Permanent" },
      CONTRACTED: { color: "bg-blue-100 text-blue-800", label: "Contracted" },
    };

    const { color, label } = config[category] || {
      color: "bg-gray-100 text-gray-800",
      label: category,
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  // Format leave balance display
  const formatLeaveBalance = (type) => {
    const value = getBalanceValue(type);
    if (type === "paid" && value === Infinity) {
      return "Unlimited";
    }
    return value;
  };

  // Get used days safely
  const getUsedDays = (type) => {
    const balanceData = leaveBalance[type];
    if (!balanceData) return 0;
    if (typeof balanceData === 'object') {
      return balanceData.used || 0;
    }
    return 0;
  };

  // Get carry forward days safely
  const getCarryForwardDays = (type) => {
    const balanceData = leaveBalance[type];
    if (!balanceData) return 0;
    if (typeof balanceData === 'object') {
      return balanceData.carryForward || 0;
    }
    return 0;
  };

  // Get available leave types for display
  const getAvailableLeaveTypes = () => {
    if (isContracted) {
      // Contracted trainers only see paid leave
      return ["paid"];
    }
    // Permanent trainers see all types
    return ["sick", "casual", "paid"];
  };

  const availableLeaveTypes = getAvailableLeaveTypes();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}

      <main className="p-4 md:p-8">
        {/* Error Display */}
        {(attendanceError || geoError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 animate-pulse">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <div>
              <p className="text-red-700 font-medium">Attention Required</p>
              <p className="text-red-600 text-sm">
                {attendanceError || geoError}
              </p>
            </div>
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Clock Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Daily Attendance
                    </h3>
                    <p className="text-sm text-gray-600">
                      Record your work hours
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Today</p>
                  <p className="font-semibold text-gray-800">
                    {formatDate(new Date())}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Section */}
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-xl ${isClockedIn ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">
                        Current Status
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${isClockedIn ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                      >
                        {isClockedIn ? "Clocked In" : "Not Clocked In"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {clockInTime && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Clock In</span>
                          <span className="font-mono font-semibold">
                            {formatTime(clockInTime)}
                          </span>
                        </div>
                      )}

                      {clockOutTime && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Clock Out</span>
                          <span className="font-mono font-semibold">
                            {formatTime(clockOutTime)}
                          </span>
                        </div>
                      )}

                      {isClockedIn && (
                        <div className="flex items-center justify-between pt-3 border-t">
                          <span className="text-gray-600">Today's Hours</span>
                          <span className="font-bold text-green-600 text-lg">
                            {getTodayHours()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  {todayLocation && (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin size={16} className="text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Today's Location
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 break-words">
                        {getLocationDisplay()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Section */}
                <div className="flex flex-col justify-between">
                  <div>
                    <h4 className="text-gray-700 font-medium mb-3">
                      Quick Actions
                    </h4>
                    <div className="space-y-3">
                      <button
                        disabled
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
                      >
                        <History size={16} />
                        View Attendance History
                      </button>

                      <button
                        disabled
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
                      >
                        <User size={16} />
                        Update Profile
                      </button>
                    </div>
                  </div>

                  {/* Clock Button */}
                  <div className="mt-6">
                    {fetchingLocation ? (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                        <div className="flex justify-center mb-2">
                          <Loader2
                            className="animate-spin text-blue-600"
                            size={24}
                          />
                        </div>
                        <p className="text-sm font-medium text-blue-900">
                          Getting your location...
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Please enable location access
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handleClockAction}
                        disabled={processingAction || attendanceLoading}
                        className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all duration-300 flex items-center justify-center gap-3
                          ${
                            isClockedIn
                              ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                              : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                          }
                          ${processingAction || attendanceLoading ? "opacity-75 cursor-not-allowed" : "hover:shadow-lg"}`}
                      >
                        {(processingAction || attendanceLoading) && (
                          <Loader2 className="animate-spin" size={20} />
                        )}
                        <span>{getButtonText()}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Leave Balance Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Calendar className="text-yellow-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Leave Balance
                  </h3>
                  <p className="text-sm text-gray-600">Your available leaves</p>
                </div>
                {getTrainerCategoryBadge()}
              </div>

              {isContracted && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700 text-sm">
                    <Lock size={14} className="text-amber-600" />
                    <span>
                      <strong>Contracted Trainer:</strong> Only Paid Leave is available
                    </span>
                  </div>
                </div>
              )}

              {/* Leave Breakdown */}
              <div className="space-y-4">
                {/* Sick Leave - Only show for permanent trainers */}
                {availableLeaveTypes.includes("sick") && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Sick Leave
                        </span>
                      </div>
                      <span className="font-bold text-green-600">
                        {formatLeaveBalance("sick")} days
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                      <div className="text-center">
                        <div className="font-semibold">
                          {getUsedDays("sick")}
                        </div>
                        <div className="text-gray-500">Used</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">
                          {getCarryForwardDays("sick")}
                        </div>
                        <div className="text-gray-500">Carry Forward</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">
                          {formatLeaveBalance("sick")}
                        </div>
                        <div className="text-gray-500">Available</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Casual Leave - Only show for permanent trainers */}
                {availableLeaveTypes.includes("casual") && (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Casual Leave
                        </span>
                      </div>
                      <span className="font-bold text-orange-600">
                        {formatLeaveBalance("casual")} days
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                      <div className="text-center">
                        <div className="font-semibold">
                          {getUsedDays("casual")}
                        </div>
                        <div className="text-gray-500">Used</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">
                          {getCarryForwardDays("casual")}
                        </div>
                        <div className="text-gray-500">Carry Forward</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">
                          {formatLeaveBalance("casual")}
                        </div>
                        <div className="text-gray-500">Available</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Paid Leave - Show for all trainers */}
                {availableLeaveTypes.includes("paid") && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Paid Leave
                        </span>
                      </div>
                      <span className="font-bold text-purple-600">
                        {formatLeaveBalance("paid")}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                      <div className="text-center">
                        <div className="font-semibold">
                          {getUsedDays("paid")}
                        </div>
                        <div className="text-gray-500">Used</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">
                          {getCarryForwardDays("paid")}
                        </div>
                        <div className="text-gray-500">Carry Forward</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">
                          {formatLeaveBalance("paid") === "Unlimited" 
                            ? "∞" 
                            : formatLeaveBalance("paid")}
                        </div>
                        <div className="text-gray-500">Available</div>
                      </div>
                    </div>
                    {isContracted && (
                      <div className="mt-2 text-xs text-gray-500 italic">
                        Available for contracted trainers
                      </div>
                    )}
                  </div>
                )}

                {/* Message for contracted trainers when no leaves are available */}
                {availableLeaveTypes.length === 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-3 text-red-700">
                      <Lock size={20} className="text-red-500" />
                      <div>
                        <p className="font-medium">No Leaves Available</p>
                        <p className="text-sm">As a contracted trainer, you don't have access to any leave types. Please contact HR for assistance.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleApplyLeave}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Calendar size={16} />
                  Apply for Leave
                </button>

                <button
                  onClick={handleViewLeaveHistory}
                  className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <History size={16} />
                  View Leave History
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row - Stats & Weekly Report */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Weekly Hours Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Weekly Hours
                  </h3>
                  <p className="text-sm text-gray-600">
                    This week's attendance
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total This Week</p>
                <p className="font-bold text-green-600 text-xl">
                  {totalWeeklyHours.toFixed(1)} hours
                </p>
              </div>
            </div>

            {dashboardLoading ? (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
                <Loader2 className="animate-spin text-gray-400" size={32} />
                <span className="ml-3 text-gray-500">
                  Loading weekly data...
                </span>
              </div>
            ) : weeklyData.length > 0 ? (
              <>
                <div className="h-64 flex items-end justify-around p-4 bg-gray-50 rounded-xl border border-gray-200">
                  {weeklyData.map((dayData, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center w-1/7"
                    >
                      <div
                        className="w-10 rounded-t-lg transition-all duration-500 hover:w-12 cursor-pointer bg-gradient-to-t from-blue-500 to-blue-600"
                        style={{
                          height: `${Math.min(((dayData.hours || 0) / 10) * 100, 100)}%`,
                        }}
                        title={`${dayData.day}: ${dayData.hours?.toFixed(1) || 0}h`}
                      />
                      <span className="mt-2 text-xs font-medium text-gray-700">
                        {dayData.day}
                      </span>
                      <span className="text-xs text-gray-500">
                        {dayData.hours?.toFixed(1) || 0}h
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Working Hours</span>
                  </div>
                  <button
                    onClick={handleViewHistory}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Full Report →
                  </button>
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
                <Target className="text-gray-400 mb-3" size={48} />
                <p className="text-gray-500 text-center mb-2">
                  No attendance data this week
                </p>
                <p className="text-sm text-gray-400">
                  Start by clocking in for the day
                </p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">
              Quick Stats
            </h3>
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3">
                  <Briefcase className="text-blue-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Employee ID</p>
                    <p className="font-bold text-blue-700">
                      {user?.profile?.employeeId || "Not Assigned"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trainer Category */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-3">
                  <Award className="text-green-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Trainer Category</p>
                    <p className="font-bold text-green-700">
                      {user?.trainerCategory || "N/A"}
                    </p>
                  </div>
                </div>
                {user?.trainerCategory === "PERMANENT" && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Monthly leave increments
                  </p>
                )}
                {user?.trainerCategory === "CONTRACTED" && (
                  <p className="text-xs text-blue-600 mt-2">
                    ✓ Paid leave only
                  </p>
                )}
              </div>

              {/* Leave Statistics */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Leave Statistics
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                    This Year
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {trainerStats.approvedLeaves || 0}
                    </div>
                    <div className="text-xs text-gray-500">Approved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">
                      {trainerStats.pendingLeaves || 0}
                    </div>
                    <div className="text-xs text-gray-500">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">
                      {trainerStats.rejectedLeaves || 0}
                    </div>
                    <div className="text-xs text-gray-500">Rejected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {trainerStats.totalLeaves || 0}
                    </div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                </div>
              </div>

              {/* Recent Leave */}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Recent Leave
                </h4>
                {leaveHistory.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {leaveHistory[0]?.leaveType || "N/A"}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          leaveHistory[0]?.status === "APPROVED"
                            ? "bg-green-100 text-green-800"
                            : leaveHistory[0]?.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {leaveHistory[0]?.status || "N/A"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {leaveHistory[0]?.fromDate
                        ? formatDate(leaveHistory[0].fromDate)
                        : ""}{" "}
                      -
                      {leaveHistory[0]?.toDate
                        ? formatDate(leaveHistory[0].toDate)
                        : ""}
                    </p>
                    <button
                      onClick={handleViewLeaveHistory}
                      className="mt-3 w-full text-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      View all leaves →
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-2">
                    No recent leaves
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <div className="px-8 py-4 border-t border-gray-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between text-sm text-gray-500">
          <p>© {new Date().getFullYear()} TrainerSync. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-2 md:mt-0">
            <span>Employee ID: {user?.profile?.employeeId || "N/A"}</span>
            <span>•</span>
            <span>Role: {user?.role}</span>
            <span>•</span>
            <span>Category: {user?.trainerCategory || "N/A"}</span>
            <span>•</span>
            <button
              onClick={logout}
              className="text-red-600 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}