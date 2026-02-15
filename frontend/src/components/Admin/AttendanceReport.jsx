import React, { useState, useEffect } from "react";
import {
  Download,
  Filter,
  Calendar,
  Users,
  Clock,
  Loader2,
  ChevronDown,
  UserCheck,
  CalendarDays,
  FileText,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import api from "../../config/api.js";

export default function AttendanceReport() {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fetchingTrainers, setFetchingTrainers] = useState(true);
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    trainerCategory: "",
    trainerId: "",
    showDetails: false,
    showJoinedDuringMonth: false, // New filter
  });
  const [trainers, setTrainers] = useState([]);
  const [filteredTrainers, setFilteredTrainers] = useState([]); // For dropdown

  // Fetch trainers for dropdown
  useEffect(() => {
    fetchTrainers();
  }, []);

  // Filter trainers based on category when category changes
  useEffect(() => {
    if (trainers.length > 0) {
      let filtered = trainers;

      // Filter by category if selected
      if (filters.trainerCategory) {
        filtered = filtered.filter(
          (trainer) => trainer.trainerCategory === filters.trainerCategory,
        );
      }

      // Filter by active status
      filtered = filtered.filter((trainer) =>
        ["ACTIVE", "ON_LEAVE"].includes(trainer.status),
      );

      setFilteredTrainers(filtered);
    }
  }, [trainers, filters.trainerCategory]);

  const fetchTrainers = async () => {
    try {
      setFetchingTrainers(true);
      const response = await api.get("/users");
      console.log("Trainers API Response:", response.data);

      if (response.data.success) {
        const trainersData = response.data.data?.trainers || [];

        // Filter only TRAINER role users
        const trainerUsers =
          trainersData.filter((user) => user.role === "TRAINER") || [];

        console.log(`Filtered ${trainerUsers.length} trainers from response`);
        setTrainers(trainerUsers);
        setFilteredTrainers(trainerUsers);
      } else {
        console.error("API did not return success:", response.data);
        setTrainers([]);
        setFilteredTrainers([]);
      }
    } catch (error) {
      console.error("Error fetching trainers:", error);
      setTrainers([]);
      setFilteredTrainers([]);
    } finally {
      setFetchingTrainers(false);
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      console.log("Generating report with filters:", filters);

      const response = await api.get("/leaves/reports/balance", {
        params: filters,
      });

      console.log("Report API Response:", response.data);

      if (response.data.success) {
        const reportData = response.data.data || [];
        console.log(`Received ${reportData.length} reports`);

        // Apply additional frontend filters if needed
        let filteredReports = reportData;

        // Filter to show only trainers who joined during the selected month
        if (filters.showJoinedDuringMonth) {
          filteredReports = reportData.filter(
            (report) => report.attendance?.joinedDuringMonth === true,
          );
          console.log(
            `Filtered to ${filteredReports.length} trainers who joined during the month`,
          );
        }

        // Transform data to ensure consistent structure
        const transformedReports = filteredReports.map((item) => ({
          ...item,
          trainer: {
            ...item.trainer,
            name: item.trainer?.name || "Unknown",
            employeeId: item.trainer?.employeeId || "N/A",
            email: item.trainer?.email || "N/A",
            category: item.trainer?.category || "N/A",
          },
          attendance: {
            ...item.attendance,
            present: item.attendance?.present || 0,
            absent: item.attendance?.absent || 0,
            halfDays: item.attendance?.halfDays || 0,
            percentage: item.attendance?.percentage || 0,
            totalWorkingDays: item.attendance?.totalWorkingDays || 0,
          },
          leaves: {
            ...item.leaves,
            balance: {
              sick: item.leaves?.balance?.sick || 0,
              casual: item.leaves?.balance?.casual || 0,
              paid: item.leaves?.balance?.paid || 0,
            },
            taken: {
              sick: item.leaves?.taken?.sick || 0,
              casual: item.leaves?.taken?.casual || 0,
              paid: item.leaves?.taken?.paid || 0,
              total: item.leaves?.taken?.total || 0,
            },
            totalTaken: item.leaves?.totalTaken || 0,
            remaining: item.leaves?.remaining || {
              sick: 0,
              casual: 0,
              paid: 0,
            },
          },
        }));

        setReports(transformedReports);
      } else {
        alert(response.data.message || "Failed to generate report");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      console.error("Error details:", error.response?.data);
      alert(error.response?.data?.message || "Error generating report");
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async () => {
    try {
      setLoading(true);
      const response = await api.get("/leaves/reports/balance/download", {
        params: filters,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `attendance-report-${filters.month}-${filters.year}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to download report");
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month - 1] || "";
  };

  // Function to safely get paid leave value
  const getPaidLeaveValue = (value) => {
    if (value === "Unlimited" || value >= 9999) {
      return "Unlimited";
    }
    return value || 0;
  };

  // Calculate summary statistics
  const getSummaryStats = () => {
    if (reports.length === 0) return null;

    const totalTrainers = reports.length;
    const activeTrainers = reports.filter((r) => r.status === "ACTIVE").length;
    const onLeaveTrainers = reports.filter(
      (r) => r.status === "ON_LEAVE",
    ).length;
    const avgAttendance = Math.round(
      reports.reduce(
        (acc, report) => acc + (report.attendance?.percentage || 0),
        0,
      ) / totalTrainers,
    );
    const totalLeavesTaken = reports.reduce(
      (acc, report) => acc + (report.leaves?.totalTaken || 0),
      0,
    );
    const avgWorkingDays =
      reports.length > 0
        ? Math.round(
            reports.reduce(
              (acc, report) => acc + (report.attendance?.totalWorkingDays || 0),
              0,
            ) / reports.length,
          )
        : 0;

    // New metrics
    const joinedDuringMonth = reports.filter(
      (r) => r.attendance?.joinedDuringMonth,
    ).length;
    const permanentTrainers = reports.filter(
      (r) => r.trainer?.category === "PERMANENT",
    ).length;
    const contractedTrainers = reports.filter(
      (r) => r.trainer?.category === "CONTRACTED",
    ).length;

    return {
      totalTrainers,
      activeTrainers,
      onLeaveTrainers,
      avgAttendance,
      totalLeavesTaken,
      avgWorkingDays,
      joinedDuringMonth,
      permanentTrainers,
      contractedTrainers,
    };
  };

  const summaryStats = getSummaryStats();

  // Reset trainer filter when category changes
  const handleCategoryChange = (category) => {
    setFilters((prev) => ({
      ...prev,
      trainerCategory: category,
      trainerId: "", // Reset specific trainer when category changes
    }));
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Attendance & Leave Reports
        </h1>
        <button
          onClick={downloadReport}
          disabled={loading || reports.length === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Download size={20} />
          )}
          Download Excel
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">
            Report Filters
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Month Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              value={filters.month}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  month: parseInt(e.target.value),
                }))
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {getMonthName(i + 1)}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={filters.year}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  year: parseInt(e.target.value),
                }))
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Trainer Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trainer Category
            </label>
            <select
              value={filters.trainerCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              <option value="PERMANENT">Permanent</option>
              <option value="CONTRACTED">Contracted</option>
            </select>
          </div>

          {/* Specific Trainer Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specific Trainer
            </label>
            <select
              value={filters.trainerId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, trainerId: e.target.value }))
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={fetchingTrainers}
            >
              <option value="">All Trainers</option>
              {fetchingTrainers ? (
                <option disabled>Loading trainers...</option>
              ) : filteredTrainers.length === 0 ? (
                <option disabled>No trainers available</option>
              ) : (
                filteredTrainers.map((trainer) => (
                  <option key={trainer._id} value={trainer._id}>
                    {trainer.profile?.firstName} {trainer.profile?.lastName}
                    {trainer.trainerCategory
                      ? ` (${trainer.trainerCategory})`
                      : ""}
                    {trainer.status === "ON_LEAVE" ? " [On Leave]" : ""}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showDetails"
              checked={filters.showDetails}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  showDetails: e.target.checked,
                }))
              }
              className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="showDetails" className="text-sm text-gray-700">
              Show detailed leave breakdown
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="showJoinedDuringMonth"
              checked={filters.showJoinedDuringMonth}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  showJoinedDuringMonth: e.target.checked,
                }))
              }
              className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="showJoinedDuringMonth"
              className="text-sm text-gray-700"
            >
              Show only trainers who joined during selected month
            </label>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Filter Summary:</strong> Report for{" "}
            {getMonthName(filters.month)} {filters.year}
            {filters.trainerCategory &&
              ` • Category: ${filters.trainerCategory}`}
            {filters.trainerId && ` • Specific Trainer: Selected`}
            {filters.showJoinedDuringMonth &&
              ` • Showing only trainers who joined during month`}
          </p>
        </div>

        {/* Generate Button */}
        <div className="mt-6">
          <button
            onClick={generateReport}
            disabled={generating}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Generating...
              </>
            ) : (
              <>
                <BarChart3 size={20} />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Summary */}
      {reports.length > 0 && summaryStats && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-green-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              Report Summary
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="text-blue-600" size={20} />
                <h3 className="font-medium text-blue-800">Total Trainers</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {summaryStats.totalTrainers}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {summaryStats.activeTrainers} active,{" "}
                {summaryStats.onLeaveTrainers} on leave
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-green-600" size={20} />
                <h3 className="font-medium text-green-800">Avg. Attendance</h3>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {summaryStats.avgAttendance}%
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="text-purple-600" size={20} />
                <h3 className="font-medium text-purple-800">Total Leaves</h3>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {summaryStats.totalLeavesTaken}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="text-yellow-600" size={20} />
                <h3 className="font-medium text-yellow-800">
                  Avg. Working Days
                </h3>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {summaryStats.avgWorkingDays}
              </p>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="text-indigo-600" size={20} />
                <h3 className="font-medium text-indigo-800">Joined in Month</h3>
              </div>
              <p className="text-2xl font-bold text-indigo-600">
                {summaryStats.joinedDuringMonth}
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-orange-600" size={20} />
                <h3 className="font-medium text-orange-800">Report Period</h3>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {getMonthName(filters.month)} {filters.year}
              </p>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800">
                  Permanent Trainers
                </span>
                <span className="text-lg font-bold text-green-600">
                  {summaryStats.permanentTrainers}
                </span>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-800">
                  Contracted Trainers
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {summaryStats.contractedTrainers}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Detailed Report Table */}
      {reports.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trainer Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leaves Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leaves Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">
                          {report.trainer?.name || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {report.trainer?.employeeId || "N/A"} •{" "}
                          {report.trainer?.category || "N/A"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {report.trainer?.email || "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          report.trainer?.category === "PERMANENT"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {report.trainer?.category || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${report.attendance?.percentage || 0}%`,
                              }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm font-medium">
                            {report.attendance?.percentage || 0}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {report.attendance?.present || 0} present,{" "}
                          {report.attendance?.absent || 0} absent
                          {report.attendance?.halfDays ? (
                            <span>
                              , {report.attendance.halfDays} half-days
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {filters.showDetails ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Sick:</span>
                            <span className="font-medium">
                              {report.leaves?.balance?.sick || 0}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Casual:</span>
                            <span className="font-medium">
                              {report.leaves?.balance?.casual || 0}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Paid:</span>
                            <span className="font-medium">
                              {getPaidLeaveValue(report.leaves?.balance?.paid)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <span className="font-medium">Total: </span>
                          {(report.leaves?.balance?.sick || 0) +
                            (report.leaves?.balance?.casual || 0) +
                            (getPaidLeaveValue(report.leaves?.balance?.paid) ===
                            "Unlimited"
                              ? 0
                              : report.leaves?.balance?.paid || 0)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {filters.showDetails ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Sick:</span>
                            <span className="font-medium">
                              {report.leaves?.taken?.sick || 0}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Casual:</span>
                            <span className="font-medium">
                              {report.leaves?.taken?.casual || 0}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Paid:</span>
                            <span className="font-medium">
                              {report.leaves?.taken?.paid || 0}
                            </span>
                          </div>
                          <div className="border-t pt-1 mt-1">
                            <div className="flex justify-between text-sm font-medium">
                              <span>Total:</span>
                              <span>{report.leaves?.totalTaken || 0}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm font-medium">
                          {report.leaves?.totalTaken || 0} days
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          report.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : report.status === "ON_LEAVE"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {report.status || "ACTIVE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with total counts */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-600">
              <div>
                Showing {reports.length} trainer
                {reports.length !== 1 ? "s" : ""}
                {summaryStats && (
                  <span className="ml-2">
                    ({summaryStats.activeTrainers} active,{" "}
                    {summaryStats.onLeaveTrainers} on leave)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="font-medium">Total Leaves:</span>{" "}
                  {summaryStats?.totalLeavesTaken || 0}
                </div>
                <div>
                  <span className="font-medium">Avg. Attendance:</span>{" "}
                  {summaryStats?.avgAttendance || 0}%
                </div>
                <div>
                  <span className="font-medium">Working Days:</span>{" "}
                  {summaryStats?.avgWorkingDays || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Report Generated
          </h3>
          <p className="text-gray-600 mb-6">
            Use the filters above to generate an attendance and leave report.
          </p>
          <button
            onClick={generateReport}
            disabled={generating}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Generating...
              </>
            ) : (
              <>
                <BarChart3 size={20} />
                Generate Your First Report
              </>
            )}
          </button>
        </div>
      )}

      {/* Debug Section */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <details>
            <summary className="cursor-pointer font-medium text-gray-700">
              Debug Information
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-medium text-gray-700">Trainers Data:</h4>
                <p className="text-sm text-gray-600">
                  Total trainers: {trainers.length} | Loading:{" "}
                  {fetchingTrainers ? "Yes" : "No"}
                </p>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40">
                  {JSON.stringify(trainers.slice(0, 3), null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-medium text-gray-700">Current Filters:</h4>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                  {JSON.stringify(filters, null, 2)}
                </pre>
              </div>
              {reports.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700">
                    Sample Report Data:
                  </h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40">
                    {JSON.stringify(reports[0], null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
