import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../../hooks/useGeolocation.js';
import { useAttendanceStore } from '../../store/attendanceStore.js';
import { useAuth } from '../../hooks/useAuth.js';
import { Clock, Calendar, TrendingUp, Loader2, MapPin, History, AlertCircle } from 'lucide-react';
import { formatTime, formatDate } from '../../utils/dateFormat.js';
import api from '../../config/api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ✅ Geolocation hook - only gets coordinates
  const { 
    error: geoError,
    getLocation,
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  });

  // ✅ Attendance store - has address from backend
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
  const [leaveBalance, setLeaveBalance] = useState({ casual: 0, sick: 0, paid: 0 });
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setDashboardLoading(true);
        
        // Load all data in parallel
        const [todayStatus, weeklyReport, recentLeaves, balance] = await Promise.all([
          getTodayStatus(),
          getWeeklyReport(),
          api.get('/leaves/history?limit=5').then(res => res.data?.data?.leaves || []),
          api.get('/leaves/balance').then(res => res.data?.data || { casual: 0, sick: 0, paid: 0 })
        ]);

        // Set weekly data
        if (weeklyReport) {
          setWeeklyData(Object.entries(weeklyReport).map(([day, hours]) => ({ day, hours })));
        }

        // Set leave data
        setLeaveHistory(recentLeaves);
        setLeaveBalance(balance);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setDashboardLoading(false);
      }
    };
    initializeDashboard();
  }, []);

  const isClockedIn = todayStatus?.status === 'CLOCKED_IN';
  const clockInTime = todayStatus?.clockInTime || null;
  const clockOutTime = todayStatus?.clockOutTime || null;
  // ✅ Get location from store (includes address from backend)
  const todayLocation = todayStatus?.location;

  /**
   * ✅ Unified clock-in/out handler
   * Gets coordinates → sends to backend → backend fetches address
   */
  const handleClockAction = async () => {
    if (processingAction || fetchingLocation) return;

    try {
      setProcessingAction(true);
      setFetchingLocation(true);
      clearError(); // Clear any previous errors

      console.log('📍 Fetching your location...');

      // Get coordinates from browser
      const locationData = await getLocation();

      console.log('✅ Coordinates obtained:', locationData);
      setFetchingLocation(false);

      if (!locationData?.latitude || !locationData?.longitude) {
        throw new Error('Unable to get your location. Please ensure location services are enabled.');
      }

      // Send to backend - backend will fetch address
      if (!isClockedIn) {
        console.log('⏰ Sending clock-in request...');
        await clockIn(locationData.latitude, locationData.longitude);
        console.log('✅ Clocked in successfully');
      } else {
        console.log('⏰ Sending clock-out request...');
        await clockOut(locationData.latitude, locationData.longitude);
        console.log('✅ Clocked out successfully');
      }

      // Refresh data
      await Promise.all([getTodayStatus(), getWeeklyReport()]);
    } catch (error) {
      console.error('❌ Error during clock action:', error);
      // Error is already set in store by clockIn/clockOut
    } finally {
      setProcessingAction(false);
      setFetchingLocation(false);
    }
  };

  const handleApplyLeave = () => {
    navigate('/trainer/apply-leave');
  };

  const handleViewHistory = () => {
    navigate('/trainer/attendance-history');
  };

  const handleViewLeaveHistory = () => {
    navigate('/trainer/leaves/reports');
  };

  const trainerName = user?.profile?.firstName
    ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
    : user?.username || 'Trainer';

  const getButtonText = () => {
    if (fetchingLocation) {
      return 'FETCHING LOCATION...';
    }
    if (processingAction || attendanceLoading) {
      return isClockedIn ? 'PROCESSING CLOCK OUT...' : 'PROCESSING CLOCK IN...';
    }
    return isClockedIn ? 'CLOCK OUT' : 'CLOCK IN';
  };

  // Calculate total hours
  const totalWeeklyHours = weeklyData.reduce((sum, day) => sum + (day.hours || 0), 0);
  const totalLeaveBalance = leaveBalance.casual + leaveBalance.sick + leaveBalance.paid;

  // Format today's working hours
  const getTodayHours = () => {
    if (!todayStatus?.clockInTime) return '0h';
    const start = new Date(todayStatus.clockInTime);
    const end = todayStatus.clockOutTime ? new Date(todayStatus.clockOutTime) : new Date();
    const hours = (end - start) / (1000 * 60 * 60);
    return `${hours.toFixed(1)}h`;
  };

  // Get location display
  const getLocationDisplay = () => {
    if (!todayLocation) return null;
    // ✅ Display address if available (from backend), otherwise coordinates
    if (todayLocation.address) {
      return todayLocation.address;
    }
    return `${todayLocation.latitude?.toFixed(4)}, ${todayLocation.longitude?.toFixed(4)}`;
  };

  // Get recent leave status
  const getRecentLeaveStatus = () => {
    if (leaveHistory.length === 0) return 'No recent leaves';
    
    const recentLeave = leaveHistory[0];
    const statusColor = {
      'APPROVED': 'text-green-600',
      'PENDING': 'text-yellow-600',
      'REJECTED': 'text-red-600'
    }[recentLeave.status] || 'text-gray-600';
    
    return (
      <span className={statusColor}>
        {recentLeave.leaveType} - {recentLeave.status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Welcome, {trainerName}</h2>
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <div className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`}></div>
            <span className="text-sm text-gray-600">
              {isClockedIn ? 'Clocked In' : 'Online'}
            </span>
          </div>
        </div>

        {/* Error Display */}
        {attendanceError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-red-500" size={20} />
            <p className="text-red-700 text-sm">{attendanceError}</p>
          </div>
        )}

        {geoError && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-orange-500" size={20} />
            <p className="text-orange-700 text-sm">{geoError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* ✅ Clock In / Clock Out Card */}
          <div className="bg-white p-6 rounded-xl shadow-lg col-span-1 border-t-4 border-blue-600">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="text-blue-600" size={24} />
              <h3 className="text-lg font-medium text-gray-700">Daily Check-In</h3>
            </div>

            <div className="space-y-4 mb-6">
              <p className={`text-xl font-bold ${isClockedIn ? 'text-green-600' : 'text-red-600'}`}>
                {isClockedIn ? '🟢 Clocked In' : '🔴 Not Clocked In'}
              </p>
              
              {clockInTime && (
                <div className="text-sm text-gray-600 space-y-1">
                  <p>⏰ Clock In: {formatTime(clockInTime)}</p>
                  {clockOutTime && (
                    <p>⏰ Clock Out: {formatTime(clockOutTime)}</p>
                  )}
                  {isClockedIn && (
                    <p className="text-green-600 font-medium">Today: {getTodayHours()}</p>
                  )}
                </div>
              )}

              {/* ✅ Display location with address from backend */}
              {todayLocation && (
                <div className="flex items-start gap-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  <MapPin size={14} className="flex-shrink-0 mt-0.5" />
                  <span className="break-words">
                    {getLocationDisplay()}
                  </span>
                </div>
              )}
            </div>

            {/* Loading State */}
            {fetchingLocation && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <div className="flex justify-center mb-2">
                  <Loader2 className="animate-spin text-blue-600" size={24} />
                </div>
                <p className="text-sm font-medium text-blue-900">
                  Fetching your location...
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Please wait and enable location access
                </p>
              </div>
            )}

            {/* Clock Button */}
            <button
              onClick={handleClockAction}
              disabled={processingAction || attendanceLoading || fetchingLocation}
              className={`w-full py-4 rounded-lg font-bold text-lg text-white transition-colors flex items-center justify-center gap-2
                ${isClockedIn ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300' : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'}
                ${(processingAction || attendanceLoading || fetchingLocation) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {(processingAction || fetchingLocation) && <Loader2 className="animate-spin" size={20} />}
              {getButtonText()}
            </button>

            {/* Info Message */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <p className="flex items-center gap-2 mb-1">
                <MapPin size={14} />
                <strong>Note:</strong>
              </p>
              <p className="ml-6">
                You can clock in from anywhere - office, home, or client location
              </p>
            </div>
          </div>

          {/* ✅ Weekly Working Hours Card */}
          <div className="bg-white p-6 rounded-xl shadow-lg col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <TrendingUp size={24} className="text-green-600" />
                <h3 className="text-lg font-medium text-gray-700">Weekly Report</h3>
              </div>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {formatDate(new Date().toISOString())}
              </span>
            </div>

            {dashboardLoading ? (
              <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                <Loader2 className="animate-spin text-gray-400" size={32} />
                <span className="ml-2 text-gray-500">Loading weekly data...</span>
              </div>
            ) : weeklyData.length > 0 ? (
              <>
                <div className="h-40 flex justify-around items-end p-2 bg-gray-50 rounded-lg border border-gray-200">
                  {weeklyData.map((dayData, index) => (
                    <div
                      key={index}
                      className="w-1/6 bg-blue-400 rounded-t-sm transition-all duration-300 hover:bg-blue-600 cursor-pointer"
                      style={{ height: `${((dayData.hours || 0) / 12) * 100}%` }}
                      title={`${dayData.day}: ${dayData.hours || 0}h`}
                    />
                  ))}
                </div>

                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  {weeklyData.map((day, i) => (
                    <span key={i} className="font-medium">{day.day.substring(0, 3)}</span>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 text-center font-semibold">
                    Total: {totalWeeklyHours.toFixed(1)} hours this week
                  </p>
                </div>
              </>
            ) : (
              <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500 text-center">
                  No attendance data available for this week
                </p>
              </div>
            )}
          </div>

          {/* ✅ Leave Status & Quick Actions */}
          <div className="bg-white p-6 rounded-xl shadow-lg col-span-1 border-l-4 border-yellow-500">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="text-yellow-600" size={24} />
              <h3 className="text-lg font-medium text-gray-700">Leave Status</h3>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-gray-700 font-medium">Total Balance:</span>
                <span className="font-bold text-blue-600 text-lg">
                  {totalLeaveBalance} Days
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-green-50 rounded">
                  <p className="text-xs text-gray-600">Casual</p>
                  <p className="font-semibold text-green-600">{leaveBalance.casual}</p>
                </div>
                <div className="p-2 bg-orange-50 rounded">
                  <p className="text-xs text-gray-600">Sick</p>
                  <p className="font-semibold text-orange-600">{leaveBalance.sick}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded">
                  <p className="text-xs text-gray-600">Paid</p>
                  <p className="font-semibold text-purple-600">{leaveBalance.paid}</p>
                </div>
              </div>

              {/* Recent Leave Status */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Recent Leave</p>
                <p className="text-sm font-medium">
                  {getRecentLeaveStatus()}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                className="w-full bg-yellow-500 text-white py-3 rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                onClick={handleApplyLeave}
              >
                <Calendar size={16} />
                Apply for Leave
              </button>
              
              <button
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                onClick={handleViewLeaveHistory}
              >
                <History size={16} />
                View Leave History
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Summary */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={20} />
              Today's Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Status</p>
                <p className={`text-lg font-semibold ${isClockedIn ? 'text-green-600' : 'text-gray-600'}`}>
                  {isClockedIn ? 'Clocked In' : 'Not Clocked In'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Hours Today</p>
                <p className="text-lg font-semibold text-blue-600">{getTodayHours()}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Last Action</p>
                <p className="text-lg font-semibold text-purple-600">
                  {clockInTime ? formatTime(clockInTime) : 'No action'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Location</p>
                <p className={`text-lg font-semibold ${todayLocation ? 'text-green-600' : 'text-orange-600'}`}>
                  {todayLocation ? '✓ Recorded' : 'Pending'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                <span className="text-gray-700">Employee ID</span>
                <span className="font-mono font-semibold text-blue-600">
                  {user?.profile?.employeeId || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                <span className="text-gray-700">Role</span>
                <span className="font-semibold text-green-600">{user?.role || 'Trainer'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                <span className="text-gray-700">This Week</span>
                <span className="font-semibold text-purple-600">{totalWeeklyHours.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg">
                <span className="text-gray-700">Leave Balance</span>
                <span className="font-semibold text-yellow-600">{totalLeaveBalance} days</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}