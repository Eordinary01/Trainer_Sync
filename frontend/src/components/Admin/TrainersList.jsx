import React, { useState, useEffect, useMemo } from "react";
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
  Eye,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { formatDate } from "../../utils/dateFormat.js";
import api from "../../config/api.js";
import EditTrainerModal from "../Common/EditTrainerModal.jsx";

export default function TrainersList() {
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate(); 
  const [trainers, setTrainers] = useState([]);
  const [allTrainers, setAllTrainers] = useState([]); // Store all trainers for search
  const [clockedInList, setClockedInList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch paginated trainers
  useEffect(() => {
    if (
      isAuthenticated &&
      (currentUser?.role === "ADMIN" || currentUser?.role === "HR")
    ) {
      fetchTrainersData();
      fetchAllTrainers(); // Fetch all trainers once for search
    }
  }, [isAuthenticated, currentUser, pagination.page, pagination.limit, statusFilter]);

  // Fetch all trainers (for search)
  const fetchAllTrainers = async () => {
    try {
      const response = await api.get("/users?limit=1000"); // Get all trainers
      const responseData = response.data.data;
      const trainersData = responseData?.trainers || [];
      setAllTrainers(trainersData.filter((user) => user.role === "TRAINER"));
    } catch (error) {
      console.error("Error fetching all trainers:", error);
    }
  };

  // Search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm.trim() !== "") {
      performSearch();
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  }, [debouncedSearchTerm, statusFilter]);

  const performSearch = async () => {
    setIsSearching(true);
    setSearchLoading(true);
    
    // Filter all trainers based on search term and status
    const searchLower = debouncedSearchTerm.toLowerCase();
    const filtered = allTrainers.filter((trainer) => {
      // Apply status filter first
      if (statusFilter === "ACTIVE" && trainer.status !== "ACTIVE") return false;
      if (statusFilter === "INACTIVE" && trainer.status !== "INACTIVE") return false;
      
      // Then apply search
      const fullName = `${trainer.profile?.firstName || ''} ${trainer.profile?.lastName || ''}`.toLowerCase();
      const email = (trainer.email || '').toLowerCase();
      const username = (trainer.username || '').toLowerCase();
      const employeeId = (trainer.profile?.employeeId || '').toLowerCase();
      
      return (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        username.includes(searchLower) ||
        employeeId.includes(searchLower)
      );
    });

    // Get clocked-in status for search results
    try {
      const clockedInResponse = await api.get("/attendance/today/clocked-in-list");
      const clockedInUsers = clockedInResponse.data.data || [];

      const resultsWithStatus = filtered.map((trainer) => {
        const todayAttendance = clockedInUsers.find((clockedIn) => {
          return (
            clockedIn.userId === trainer._id ||
            clockedIn.user?._id === trainer._id ||
            clockedIn.userId?._id === trainer._id ||
            clockedIn.id === trainer._id
          );
        });

        return {
          ...trainer,
          todayAttendance: todayAttendance || null,
          isClockedIn: !!todayAttendance && !todayAttendance.clockOutTime,
        };
      });

      setSearchResults(resultsWithStatus);
    } catch (error) {
      console.error("Error fetching clocked-in status for search:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setIsSearching(false);
    setSearchResults([]);
  };

  const handleViewTrainerDetails = (trainerId) => {
    navigate(`/admin/trainers/${trainerId}`);
  };

  const handleEditTrainer = (trainer) => {
    setEditingTrainer(trainer);
  };

  const handleCloseEditModal = () => {
    setEditingTrainer(null);
  };

  const handleTrainerUpdated = (updatedTrainer) => {
    setTrainers(trainers.map(t => t._id === updatedTrainer._id ? { ...t, ...updatedTrainer } : t));
    // Also update in allTrainers
    setAllTrainers(allTrainers.map(t => t._id === updatedTrainer._id ? { ...t, ...updatedTrainer } : t));
    // Update search results if searching
    if (isSearching) {
      setSearchResults(searchResults.map(t => t._id === updatedTrainer._id ? { ...t, ...updatedTrainer } : t));
    }
  };

  const fetchTrainersData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
      });

      if (statusFilter === 'ACTIVE' || statusFilter === 'INACTIVE') {
        params.append('status', statusFilter);
      }

      const usersResponse = await api.get(`/users?${params.toString()}`);
      const clockedInResponse = await api.get("/attendance/today/clocked-in-list");

      const responseData = usersResponse.data.data;
      const trainersData = responseData?.trainers || [];
      const paginationData = responseData?.pagination || {
        total: 0,
        page: pagination.page,
        limit: pagination.limit,
        pages: 1
      };

      const clockedInUsers = clockedInResponse.data.data || [];

      setPagination({
        page: paginationData.page || 1,
        limit: paginationData.limit || 10,
        total: paginationData.total || 0,
        pages: paginationData.pages || 1
      });

      const trainersWithStatus = trainersData
        .filter((user) => user.role === "TRAINER")
        .map((trainer) => {
          const todayAttendance = clockedInUsers.find((clockedIn) => {
            return (
              clockedIn.userId === trainer._id ||
              clockedIn.user?._id === trainer._id ||
              clockedIn.userId?._id === trainer._id ||
              clockedIn.id === trainer._id
            );
          });

          return {
            ...trainer,
            todayAttendance: todayAttendance || null,
            isClockedIn: !!todayAttendance && !todayAttendance.clockOutTime,
          };
        });

      setTrainers(trainersWithStatus);
      setClockedInList(clockedInUsers);
      
    } catch (error) {
      console.error("❌ Error fetching trainers data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTrainersData();
    await fetchAllTrainers();
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLimitChange = (e) => {
    setPagination(prev => ({ 
      ...prev, 
      limit: parseInt(e.target.value),
      page: 1
    }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: { color: "bg-green-100 text-green-800", label: "Active", icon: UserCheck },
      INACTIVE: { color: "bg-gray-100 text-gray-800", label: "Inactive", icon: UserX },
      SUSPENDED: { color: "bg-red-100 text-red-800", label: "Suspended", icon: UserX },
      ON_LEAVE: { color: "bg-yellow-100 text-yellow-800", label: "On Leave", icon: Calendar },
    };

    const config = statusConfig[status] || statusConfig.INACTIVE;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
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

  // Determine what to display
  const displayTrainers = isSearching ? searchResults : trainers;
  const displayLoading = isSearching ? searchLoading : loading;

  // Authorization check
  if (
    isAuthenticated &&
    !(currentUser?.role === "ADMIN" || currentUser?.role === "HR")
  ) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <UserX className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-yellow-800 mb-2">Access Denied</h2>
          <p className="text-yellow-700">
            You need Admin or HR privileges to access the trainers list.
          </p>
        </div>
      </div>
    );
  }

  if (displayLoading && !refreshing) {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
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
              <span>Total: {pagination.total}</span>
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
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={handleStatusFilter}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Trainers</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="CLOCKED_IN">Clocked In</option>
              <option value="NOT_CLOCKED_IN">Not Clocked In</option>
            </select>
            
            <select
              value={pagination.limit}
              onChange={handleLimitChange}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="5">5 per page</option>
              <option value="10">10 per page</option>
              <option value="15">15 per page</option>
              <option value="20">20 per page</option>
            </select>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600">
        {isSearching ? (
          <>Found <span className="font-semibold text-blue-600">{searchResults.length}</span> matching trainers for "{searchTerm}"</>
        ) : (
          <>Showing {trainers.length} of {pagination.total} trainers</>
        )}
      </div>

      {/* Trainers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayTrainers.map((trainer) => (
          <div
            key={trainer._id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
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
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewTrainerDetails(trainer._id)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEditTrainer(trainer)}
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Edit Profile"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex justify-between items-center mb-4 gap-2">
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
                      {trainer.todayAttendance.clockOutTime ? "Clock Out" : "Working Hours"}
                    </div>
                    <div className="font-medium">
                      {trainer.todayAttendance.clockOutTime
                        ? formatDate(trainer.todayAttendance.clockOutTime, "HH:MM")
                        : getWorkingHours(trainer.todayAttendance)}
                    </div>
                  </div>
                </div>
                {trainer.todayAttendance.location?.address && (
                  <div className="text-xs text-gray-500 mt-2 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate">{trainer.todayAttendance.location.address}</span>
                  </div>
                )}
              </div>
            )}

            {/* Additional Info */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-xs text-gray-500">
              <div>
                Joined: {trainer.createdAt ? formatDate(trainer.createdAt, "DD/MM/YYYY") : "N/A"}
              </div>
              <div className={`px-2 py-1 rounded ${
                trainer.status === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}>
                {trainer.status === "ACTIVE" ? "Active" : "Inactive"}
              </div>
            </div>

            {/* Search result indicator */}
            {isSearching && (
              <div className="mt-2 text-xs text-blue-600 text-right">
                Found in search
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No Results */}
      {displayTrainers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No trainers found</h3>
          <p className="text-gray-500">
            {searchTerm
              ? `No results found for "${searchTerm}"`
              : statusFilter !== "ALL"
              ? "No trainers match the selected filter"
              : "No trainers are currently registered in the system"}
          </p>
        </div>
      )}

      {/* Pagination Controls - Only show when NOT searching */}
      {!isSearching && pagination.pages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-medium">{pagination.total}</span> trainers
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={pagination.page === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="First Page"
            >
              <ChevronFirst className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                let pageNum;
                if (pagination.pages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.pages - 2) {
                  pageNum = pagination.pages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      pagination.page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => handlePageChange(pagination.pages)}
              disabled={pagination.page === pagination.pages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Last Page"
            >
              <ChevronLast className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Edit Trainer Modal */}
      {editingTrainer && (
        <EditTrainerModal
          trainer={editingTrainer}
          onClose={handleCloseEditModal}
          onSuccess={handleTrainerUpdated}
        />
      )}
    </div>
  );
}