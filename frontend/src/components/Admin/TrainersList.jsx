import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import {
  Users,
  Clock,
  Mail,
  Phone,
  MapPin,
  UserCheck,
  UserX,
  Search,
  Calendar,
  TrendingUp,
  RefreshCw,
  Eye, // ✅ ADD EYE ICON
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { formatDate } from "../../utils/dateFormat.js";
import api from "../../config/api.js";

export default function TrainersList() {
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate(); 
  const [trainers, setTrainers] = useState([]);
  const [clockedInList, setClockedInList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    if (
      isAuthenticated &&
      (currentUser?.role === "ADMIN" || currentUser?.role === "HR")
    ) {
      fetchTrainersData();
    }
  }, [isAuthenticated, currentUser]);

  
  const handleViewTrainerDetails = (trainerId) => {
    navigate(`/admin/trainers/${trainerId}`);
  };

  const fetchTrainersData = async () => {
    try {
      setLoading(true);

      console.log("🔄 Fetching trainers data using existing routes...");

      
      const [usersResponse, clockedInResponse] = await Promise.all([
        api.get("/users"), // Your existing users endpoint
        api.get("/attendance/today/clocked-in-list"), 
      ]);

      console.log("📊 Raw API responses:", {
        users: usersResponse.data,
        clockedIn: clockedInResponse.data,
      });

      // Process trainers from users response
      const allUsers =
        usersResponse.data.data?.trainers || usersResponse.data.data || [];
      const clockedInUsers = clockedInResponse.data.data || [];

      console.log("👥 Processing trainers:", {
        totalUsers: allUsers.length,
        clockedInCount: clockedInUsers.length,
      });

      // Filter only trainers and map with today's status
      const trainersWithStatus = allUsers
        .filter((user) => user.role === "TRAINER")
        .map((trainer) => {
          // Find today's attendance in clocked-in list
          const todayAttendance = clockedInUsers.find((clockedIn) => {
            // Check different possible ID fields
            return (
              clockedIn.userId === trainer._id ||
              clockedIn.user?._id === trainer._id ||
              clockedIn.userId?._id === trainer._id
            );
          });

          console.log(
            `🔍 Trainer ${trainer.profile?.firstName} attendance:`,
            todayAttendance
          );

          return {
            ...trainer,
            todayAttendance: todayAttendance || null,
            isClockedIn: !!todayAttendance && !todayAttendance.clockOutTime,
          };
        });

      console.log("✅ Final trainers data:", trainersWithStatus);

      setTrainers(trainersWithStatus);
      setClockedInList(clockedInUsers);
    } catch (error) {
      console.error("❌ Error fetching trainers data:", error);

      // Fallback: Try to get at least basic user list
      try {
        const usersResponse = await api.get("/users");
        const allUsers =
          usersResponse.data.data?.trainers || usersResponse.data.data || [];
        const trainers = allUsers
          .filter((user) => user.role === "TRAINER")
          .map((trainer) => ({
            ...trainer,
            todayAttendance: null,
            isClockedIn: false,
          }));
        setTrainers(trainers);
      } catch (fallbackError) {
        console.error("❌ Fallback also failed:", fallbackError);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTrainersData();
  };

  const filteredTrainers = trainers.filter((trainer) => {
    const matchesSearch =
      trainer.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.profile?.firstName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      trainer.profile?.lastName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      trainer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.profile?.employeeId
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "CLOCKED_IN" && trainer.isClockedIn) ||
      (statusFilter === "NOT_CLOCKED_IN" && !trainer.isClockedIn) ||
      (statusFilter === "ACTIVE" && trainer.status === "ACTIVE") ||
      (statusFilter === "INACTIVE" && trainer.status === "INACTIVE");

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: {
        color: "bg-green-100 text-green-800",
        label: "Active",
        icon: UserCheck,
      },
      INACTIVE: {
        color: "bg-gray-100 text-gray-800",
        label: "Inactive",
        icon: UserX,
      },
      SUSPENDED: {
        color: "bg-red-100 text-red-800",
        label: "Suspended",
        icon: UserX,
      },
      ON_LEAVE: {
        color: "bg-yellow-100 text-yellow-800",
        label: "On Leave",
        icon: Calendar,
      },
    };

    const config = statusConfig[status] || statusConfig.INACTIVE;
    const IconComponent = config.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getAttendanceBadge = (trainer) => {
    if (!trainer.todayAttendance) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Clock className="w-3 h-3 mr-1" />
          Not Clocked In
        </span>
      );
    }

    if (trainer.todayAttendance.clockOutTime) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="w-3 h-3 mr-1" />
          Clocked Out
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <TrendingUp className="w-3 h-3 mr-1" />
        Clocked In
      </span>
    );
  };

  const getWorkingHours = (attendance) => {
    if (!attendance?.clockInTime) return "N/A";

    const clockIn = new Date(attendance.clockInTime);
    const clockOut = attendance.clockOutTime
      ? new Date(attendance.clockOutTime)
      : new Date();

    const diffMs = clockOut - clockIn;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  // Show unauthorized message for non-admin/hr users
  if (
    isAuthenticated &&
    !(currentUser?.role === "ADMIN" || currentUser?.role === "HR")
  ) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <UserX className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-yellow-800 mb-2">
            Access Denied
          </h2>
          <p className="text-yellow-700">
            You need Admin or HR privileges to access the trainers list.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">All Trainers</h1>
          <p className="text-gray-600 mt-2">
            Manage and monitor all trainers in the system
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="flex items-center bg-green-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Clocked In: {clockedInList.length}</span>
            </div>
            <div className="flex items-center bg-gray-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
              <span>Total: {trainers.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search trainers by name, email, username, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Trainers</option>
              <option value="CLOCKED_IN">Clocked In</option>
              <option value="NOT_CLOCKED_IN">Not Clocked In</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Trainers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrainers.map((trainer) => (
          <div
            key={trainer._id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" // ✅ ADD CURSOR POINTER
            onClick={() => handleViewTrainerDetails(trainer._id)} // ✅ ADD CLICK HANDLER
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {trainer.profile?.firstName?.[0]}
                  {trainer.profile?.lastName?.[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {trainer.profile?.firstName} {trainer.profile?.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">@{trainer.username}</p>
                  {trainer.profile?.employeeId && (
                    <p className="text-xs text-gray-400">
                      ID: {trainer.profile.employeeId}
                    </p>
                  )}
                </div>
              </div>
              {/* ✅ ADD VIEW DETAILS BUTTON */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click event
                  handleViewTrainerDetails(trainer._id);
                }}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {/* Status Badges */}
            <div className="flex justify-between items-center mb-4">
              {getStatusBadge(trainer.status)}
              {getAttendanceBadge(trainer)}
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                <span className="truncate">{trainer.email}</span>
              </div>
              {trainer.profile?.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  {trainer.profile.phone}
                </div>
              )}
              {trainer.profile?.client?.name && (
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  Client: {trainer.profile.client.name}
                </div>
              )}
            </div>

            {/* Today's Attendance Details */}
            {trainer.todayAttendance && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Today's Attendance
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500">Clock In</div>
                    <div className="font-medium">
                      {formatDate(trainer.todayAttendance.clockInTime, "HH:MM")}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">
                      {trainer.todayAttendance.clockOutTime
                        ? "Clock Out"
                        : "Working Hours"}
                    </div>
                    <div className="font-medium">
                      {trainer.todayAttendance.clockOutTime
                        ? formatDate(
                            trainer.todayAttendance.clockOutTime,
                            "HH:MM"
                          )
                        : getWorkingHours(trainer.todayAttendance)}
                    </div>
                  </div>
                </div>
                {trainer.todayAttendance.location?.address && (
                  <div className="text-xs text-gray-500 mt-2 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate">
                      {trainer.todayAttendance.location.address}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Additional Info */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-xs text-gray-500">
              <div>
                Joined:{" "}
                {trainer.createdAt
                  ? formatDate(trainer.createdAt, "DD/MM/YYYY")
                  : "N/A"}
              </div>
              <div
                className={`px-2 py-1 rounded ${
                  trainer.status === "ACTIVE"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {trainer.status === "ACTIVE" ? "Active" : "Inactive"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTrainers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No trainers found
          </h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== "ALL"
              ? "Try adjusting your search or filters"
              : "No trainers are currently registered in the system"}
          </p>
        </div>
      )}
    </div>
  );
}
