// components/Trainer/TrainerAttendanceHistory.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import api from '../../config/api';
import { formatTime, formatDate } from '../../utils/dateFormat';
import { useAuth } from '../../hooks/useAuth';

export default function TrainerAttendanceHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filters
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  
  // Summary stats
  const [summary, setSummary] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    totalHours: 0,
    averageHours: 0
  });

  const loadAttendanceHistory = async (page = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query params
      const params = new URLSearchParams({
        page,
        limit: 10
      });
      
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      
      console.log('Fetching attendance history...'); // Debug log
      const response = await api.get(`/attendance/history?${params.toString()}`);
      console.log('API Response:', response.data); // Debug log
      
      // ✅ FIXED: Correct data extraction based on your API response
      if (response.data?.success) {
        const attendanceData = response.data.data?.attendance || [];
        const paginationData = response.data.data?.pagination || {};
        
        setAttendance(attendanceData);
        setTotalPages(paginationData.pages || 1);
        setTotalRecords(paginationData.total || 0);
        setCurrentPage(paginationData.page || page);
        
        // Calculate summary from the attendance data
        calculateSummary(attendanceData);
      } else {
        setAttendance([]);
      }
      
    } catch (error) {
      console.error('Error loading attendance history:', error);
      setError('Failed to load attendance history. Please try again.');
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceHistory(1);
  }, [dateRange.startDate, dateRange.endDate, statusFilter]); // ✅ Fixed dependencies

  const calculateSummary = (records) => {
    const summary = records.reduce((acc, record) => {
      acc.totalDays += 1;
      
      // ✅ FIXED: Handle CLOCKED_OUT status correctly
      if (record.status === 'CLOCKED_OUT' || record.status === 'PRESENT') {
        acc.presentDays += 1;
        
        if (record.clockInTime && record.clockOutTime) {
          const start = new Date(record.clockInTime);
          const end = new Date(record.clockOutTime);
          const hours = (end - start) / (1000 * 60 * 60);
          acc.totalHours += hours;
        }
      }
      
      // ✅ FIXED: Add status mapping for your API response
      if (record.status === 'LATE') acc.lateDays += 1;
      if (record.status === 'ABSENT') acc.absentDays += 1;
      
      return acc;
    }, {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      totalHours: 0,
      averageHours: 0
    });
    
    summary.averageHours = summary.presentDays > 0 
      ? (summary.totalHours / summary.presentDays).toFixed(1) 
      : 0;
    
    setSummary(summary);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadAttendanceHistory(newPage);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv'
      });
      
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const response = await api.get(`/attendance/history/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_history_${formatDate(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (error) {
      console.error('Error exporting attendance:', error);
      setError('Failed to export attendance data.');
    }
  };

  const resetFilters = () => {
    setDateRange({ startDate: '', endDate: '' });
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  // ✅ FIXED: Updated status badge to handle CLOCKED_OUT
  const getStatusBadge = (status) => {
    const config = {
      CLOCKED_OUT: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Present' },
      PRESENT: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Present' },
      LATE: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'Late' },
      ABSENT: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Absent' },
      HOLIDAY: { color: 'bg-blue-100 text-blue-800', icon: Calendar, label: 'Holiday' },
      LEAVE: { color: 'bg-purple-100 text-purple-800', icon: Calendar, label: 'Leave' }
    };
    
    const { color, icon: Icon, label } = config[status] || { 
      color: 'bg-gray-100 text-gray-800', 
      icon: Clock, 
      label: status 
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon size={12} />
        {label}
      </span>
    );
  };

  const formatDuration = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return '—';
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const hours = (end - start) / (1000 * 60 * 60);
    return `${hours.toFixed(1)}h`;
  };

  // ✅ FIXED: Get location from either clockInLocation or location field
  const getLocationDisplay = (record) => {
    const location = record.clockInLocation || record.location;
    if (!location) return null;
    
    if (location.address) return location.address;
    if (location.latitude && location.longitude) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Attendance History</h1>
          <p className="text-sm text-gray-600 mt-1">
            View your complete attendance record
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Filter size={18} />
            Filters
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards - Only show if there's data */}
      {!loading && attendance.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Days</p>
            <p className="text-2xl font-bold text-gray-800">{summary.totalDays}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Present</p>
            <p className="text-2xl font-bold text-green-600">{summary.presentDays}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-yellow-200">
            <p className="text-sm text-gray-600 mb-1">Late</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.lateDays}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-red-200">
            <p className="text-sm text-gray-600 mb-1">Absent</p>
            <p className="text-2xl font-bold text-red-600">{summary.absentDays}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Avg Hours</p>
            <p className="text-2xl font-bold text-blue-600">{summary.averageHours}h</p>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-medium text-gray-800 mb-4">Filter Attendance Records</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="CLOCKED_OUT">Present</option>
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="ABSENT">Absent</option>
                <option value="LEAVE">Leave</option>
                <option value="HOLIDAY">Holiday</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500" size={20} />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clock In
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clock Out
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="animate-spin text-blue-600 mb-3" size={32} />
                      <p className="text-gray-500">Loading attendance records...</p>
                    </div>
                  </td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Calendar className="text-gray-400 mb-3" size={48} />
                      <p className="text-gray-500 font-medium">No attendance records found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {dateRange.startDate || dateRange.endDate || statusFilter !== 'ALL' 
                          ? 'Try adjusting your filters' 
                          : 'Start clocking in to see your history'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                attendance.map((record) => {
                  const locationDisplay = getLocationDisplay(record);
                  return (
                    <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(record.date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.clockInTime ? (
                          <span className="text-sm font-mono text-gray-900">
                            {formatTime(record.clockInTime)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.clockOutTime ? (
                          <span className="text-sm font-mono text-gray-900">
                            {formatTime(record.clockOutTime)}
                          </span>
                        ) : (
                          <span className="text-sm text-yellow-600">Working</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {record.totalWorkingHours 
                            ? `${record.totalWorkingHours.toFixed(1)}h` 
                            : formatDuration(record.clockInTime, record.clockOutTime)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {locationDisplay ? (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin size={12} className="flex-shrink-0" />
                            <span className="truncate max-w-[150px]" title={locationDisplay}>
                              {locationDisplay}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalRecords)} of {totalRecords} records
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}