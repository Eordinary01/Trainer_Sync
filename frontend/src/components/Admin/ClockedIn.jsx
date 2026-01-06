// pages/ClockedInNow.jsx
import React, { useState, useEffect } from 'react';
import{ useAuth } from '../../hooks/useAuth.js';
import { Clock, Users, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../../config/api.js';
import { formatTime, formatDuration } from '../../utils/dateFormat.js';

export default function ClockedInNow() {
  const { user } = useAuth();
  const [clockedInUsers, setClockedInUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadClockedInUsers = async () => {
    try {
      setError(null);
      const response = await api.get('/attendance/today/clocked-in-list');
      
      if (response.data.success) {
        setClockedInUsers(response.data.data || []);
      } else {
        throw new Error('Failed to fetch clocked-in users');
      }
    } catch (error) {
      console.error('Error loading clocked-in users:', error);
      setError('Failed to load clocked-in users data');
      setClockedInUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClockedInUsers();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadClockedInUsers();
  };

  const handleAutoRefresh = () => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (!refreshing) {
        loadClockedInUsers();
      }
    }, 30000);

    return () => clearInterval(interval);
  };

  useEffect(() => {
    const cleanup = handleAutoRefresh();
    return cleanup;
  }, []);

  if (user?.role !== 'ADMIN' && user?.role !== 'HR') {
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading clocked-in users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Users className="text-blue-600" />
              Currently Clocked In
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time view of trainers who are currently working
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="mt-4 sm:mt-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-red-500" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clocked In</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {clockedInUsers.length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Users className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Duration</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {clockedInUsers.length > 0 
                    ? formatDuration(
                        clockedInUsers.reduce((acc, user) => acc + user.duration.totalMinutes, 0) / clockedInUsers.length
                      )
                    : '0h 0m'
                  }
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Clock className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-lg font-bold text-gray-800 mt-2">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <RefreshCw className="text-purple-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Clocked In Users List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Currently Working ({clockedInUsers.length})
            </h2>
          </div>

          {clockedInUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-400" size={48} />
              <p className="text-gray-500 mt-4 text-lg">No one is currently clocked in</p>
              <p className="text-gray-400 mt-2">Users will appear here when they clock in</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {clockedInUsers.map((user) => (
                <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-3 rounded-full">
                        <Users className="text-green-600" size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">
                          {user.name}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          ID: {user.employeeId} • @{user.username}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Clock size={14} />
                            Clocked in: {formatTime(user.clockInTime)}
                          </div>
                          {user.location && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin size={14} />
                              {user.location.latitude?.toFixed(4)}, {user.location.longitude?.toFixed(4)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="bg-blue-50 px-4 py-2 rounded-lg">
                        <p className="text-blue-800 font-semibold text-lg">
                          {user.duration.hours}h {user.duration.minutes}m
                        </p>
                        <p className="text-blue-600 text-sm">Duration</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto-refresh notice */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            🔄 List auto-refreshes every 30 seconds
          </p>
        </div>
      </div>
    </div>
  );
}