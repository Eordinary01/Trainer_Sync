import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Calendar,
  TrendingUp,
  BarChart3,
  Download,
  Filter,
  User,
  Mail,
  Phone,
  MapPin,
  Users,
  Building,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { formatDate } from "../../utils/dateFormat.js";
import api from "../../config/api.js";

export default function TrainerDetailedView() {
  const { trainerId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();

  const [trainer, setTrainer] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [workingHours, setWorkingHours] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (
      isAuthenticated &&
      (currentUser?.role === "ADMIN" || currentUser?.role === "HR")
    ) {
      fetchTrainerData();
    }
  }, [trainerId, isAuthenticated, currentUser]);

  const fetchTrainerData = async () => {
    try {
      setLoading(true);

      // ✅ USING EXISTING ROUTES ONLY
      const [trainerResponse, historyResponse, hoursResponse, monthlyResponse] =
        await Promise.all([
          api.get(`/users/${trainerId}`),
          api.get(`/attendance/history/${trainerId}?limit=50`),
          api.get(`/attendance/working-hours/${trainerId}`),
          api.get(`/attendance/report/monthly/${trainerId}`),
        ]);

      console.log("📊 Trainer detailed data:", {
        trainer: trainerResponse.data,
        history: historyResponse.data,
        hours: hoursResponse.data,
        monthly: monthlyResponse.data,
      });

      setTrainer(trainerResponse.data.data);
      setAttendanceHistory(
        historyResponse.data.data?.attendance || historyResponse.data.data || []
      );
      setWorkingHours(hoursResponse.data.data);
      setMonthlyReport(monthlyResponse.data.data || {});
    } catch (error) {
      console.error("❌ Error fetching trainer details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeFilter = async () => {
    try {
      let url = `/attendance/history/${trainerId}?limit=50`;
      if (dateRange.startDate && dateRange.endDate) {
        url += `&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      }

      const response = await api.get(url);
      setAttendanceHistory(
        response.data.data?.attendance || response.data.data || []
      );
    } catch (error) {
      console.error("❌ Error filtering attendance:", error);
    }
  };

  const getWorkingHours = (clockInTime, clockOutTime) => {
    if (!clockInTime) return "N/A";

    const clockIn = new Date(clockInTime);
    const clockOut = clockOutTime ? new Date(clockOutTime) : new Date();

    const diffMs = clockOut - clockIn;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (clockOutTime) => {
    return clockOutTime
      ? "bg-blue-100 text-blue-800"
      : "bg-green-100 text-green-800";
  };

  const getStatusText = (clockOutTime) => {
    return clockOutTime ? "Clocked Out" : "Clocked In";
  };

  const calculateSummaryFromHistory = () => {
    if (!attendanceHistory.length) return null;

    const last30Days = attendanceHistory.filter((record) => {
      const recordDate = new Date(record.date || record.clockInTime);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return recordDate >= thirtyDaysAgo;
    });

    const totalDays = last30Days.length;
    const clockedInDays = last30Days.filter(
      (record) => record.clockInTime
    ).length;
    const totalWorkingHours = last30Days.reduce((total, record) => {
      if (record.clockInTime && record.clockOutTime) {
        const hours =
          (new Date(record.clockOutTime) - new Date(record.clockInTime)) /
          (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);

    const averageHoursPerDay =
      clockedInDays > 0 ? totalWorkingHours / clockedInDays : 0;

    return {
      totalDays,
      clockedInDays,
      absentDays: totalDays - clockedInDays,
      totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
      averageHoursPerDay: parseFloat(averageHoursPerDay.toFixed(2)),
      attendanceRate: totalDays > 0 ? (clockedInDays / totalDays) * 100 : 0,
    };
  };

  const summary = calculateSummaryFromHistory();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Trainer not found
          </h3>
          <button
            onClick={() => navigate("/admin/trainers")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Trainers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/admin/trainers")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {trainer.profile?.firstName} {trainer.profile?.lastName}
            </h1>
            <p className="text-gray-600">
              @{trainer.username} • {trainer.profile?.employeeId || "No ID"}
            </p>
          </div>
        </div>
        {/* <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Download className="w-4 h-4" />
          Export Report
        </button> */}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {["overview", "attendance", "analytics"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Attendance Rate
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summary.attendanceRate?.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {summary.clockedInDays} of {summary.totalDays} days (Last 30
                  days)
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Hours
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summary.totalWorkingHours}h
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Avg {summary.averageHoursPerDay?.toFixed(1)}h/day
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Working Days
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summary.clockedInDays}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {summary.absentDays} absent days
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <p className="text-2xl font-bold text-gray-900 capitalize">
                      {trainer.status?.toLowerCase() || "active"}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <User className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Joined{" "}
                  {trainer.createdAt
                    ? formatDate(trainer.createdAt, "DD MMM YYYY")
                    : "N/A"}
                </p>
              </div>
            </div>
          )}

          {/* Trainer Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">
                Personal Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Mail className="w-4 h-4 mr-3 text-gray-400" />
                  <span>{trainer.email}</span>
                </div>
                {trainer.profile?.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="w-4 h-4 mr-3 text-gray-400" />
                    <span>{trainer.profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                  <span>
                    Joined:{" "}
                    {trainer.createdAt
                      ? formatDate(trainer.createdAt, "DD MMM YYYY")
                      : "N/A"}
                  </span>
                </div>
                {trainer.profile?.client?.name && (
                  <div className="flex items-center text-sm">
                    <Building className="w-4 h-4 mr-3 text-gray-400" />
                    <span>Client: {trainer.profile.client.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {attendanceHistory.slice(0, 5).map((record, index) => (
                  <div
                    key={record._id || index}
                    className="flex justify-between items-center text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {formatDate(
                          record.date || record.clockInTime,
                          "DD MMM"
                        )}
                      </span>
                      <span className="text-gray-500 ml-2">
                        {getWorkingHours(
                          record.clockInTime,
                          record.clockOutTime
                        )}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                        record.clockOutTime
                      )}`}
                    >
                      {getStatusText(record.clockOutTime)}
                    </span>
                  </div>
                ))}
                {attendanceHistory.length === 0 && (
                  <p className="text-gray-500 text-sm">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {/* Attendance Tab */}
{activeTab === "attendance" && (
  <div className="space-y-6">
    {/* Filters */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  startDate: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  endDate: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleDateRangeFilter}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Apply Filter
        </button>
      </div>
    </div>

    {/* Attendance Table */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Clock In
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Clock Out
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Working Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Clock In Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Clock Out Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {attendanceHistory.map((record, index) => (
              <tr key={record._id || index} className="hover:bg-gray-50">
                
                {/* Date */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(
                    record.date || record.clockInTime,
                    "DD MMM YYYY"
                  )}
                </td>

                {/* Clock In */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.clockInTime
                    ? formatDate(record.clockInTime, "HH:mm")
                    : "N/A"}
                </td>

                {/* Clock Out */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.clockOutTime
                    ? formatDate(record.clockOutTime, "HH:mm")
                    : "N/A"}
                </td>

                {/* Working Hours */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getWorkingHours(
                    record.clockInTime,
                    record.clockOutTime
                  )}
                </td>

                {/* Clock In Location */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.clockInLocation?.address ||
                    record.clockInLocation?.name ||
                    "N/A"}
                </td>

                {/* Clock Out Location */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.clockOutLocation?.address ||
                    record.clockOutLocation?.name ||
                    "N/A"}
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      record.clockOutTime
                    )}`}
                  >
                    {getStatusText(record.clockOutTime)}
                  </span>
                </td>

              </tr>
            ))}

            {attendanceHistory.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  No attendance records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}


      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Report</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Working Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Hours/Day
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(monthlyReport || {}).length > 0 ? (
                    Object.entries(monthlyReport || {}).map(
                      ([day, hours], index) => (
                        <tr key={day || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {day.replace("Day ", "")}{" "}
                            {/* Shows just the day number */}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {day} {/* Shows "Day 1", "Day 2", etc. */}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {hours ? `${hours}h` : "0h"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {hours > 0 ? "Present" : "Absent"}
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No monthly report data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
