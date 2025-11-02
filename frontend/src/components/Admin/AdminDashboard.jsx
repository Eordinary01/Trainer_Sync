import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { Users, Calendar, Clock, BarChart3, TrendingUp, AlertCircle, UserPlus } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTrainers: 0,
    activeTrainers: 0,
    pendingLeaves: 0,
    clockedInToday: 0,
    totalHR: 0,
    attendanceRate: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Simulate API calls - replace with actual API calls
      setTimeout(() => {
        setStats({
          totalTrainers: 24,
          activeTrainers: 22,
          pendingLeaves: 3,
          clockedInToday: 18,
          totalHR: user?.role === 'ADMIN' ? 4 : 0,
          attendanceRate: 85
        });

        setRecentActivities([
          { id: 1, type: 'leave', message: 'John Doe requested sick leave', time: '2 hours ago', user: 'John Doe' },
          { id: 2, type: 'attendance', message: 'Sarah Smith clocked in late', time: '4 hours ago', user: 'Sarah Smith' },
          { id: 3, type: 'trainer', message: 'New trainer Mike Johnson added', time: '1 day ago', user: 'Mike Johnson' },
          { id: 4, type: 'system', message: 'Monthly report generated', time: '1 day ago', user: 'System' },
          { id: 5, type: 'leave', message: 'Emily Brown leave approved', time: '2 days ago', user: 'Emily Brown' }
        ]);

        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  };

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'leave': return <Calendar className="text-purple-600" size={16} />;
      case 'attendance': return <Clock className="text-blue-600" size={16} />;
      case 'trainer': return <UserPlus className="text-green-600" size={16} />;
      default: return <BarChart3 className="text-gray-600" size={16} />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'leave': return 'bg-purple-50 border-purple-200';
      case 'attendance': return 'bg-blue-50 border-blue-200';
      case 'trainer': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            {user?.role === 'ADMIN' ? 'Admin Dashboard' : 'HR Dashboard'}
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.profile?.firstName} {user?.profile?.lastName}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Trainers */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Trainers</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalTrainers}</p>
                <p className="text-sm text-green-600 mt-1">
                  +{stats.activeTrainers} active
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          {/* Pending Leaves */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Leaves</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{stats.pendingLeaves}</p>
                <p className="text-sm text-red-600 mt-1">
                  Requires attention
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Calendar className="text-purple-600" size={24} />
              </div>
            </div>
          </div>

          {/* Clocked In Today */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clocked In Today</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{stats.clockedInToday}</p>
                <p className="text-sm text-gray-600 mt-1">
                  of {stats.totalTrainers} trainers
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Clock className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          {/* Attendance Rate */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{stats.attendanceRate}%</p>
                <p className="text-sm text-green-600 mt-1">
                  <TrendingUp size={14} className="inline mr-1" />
                  +5% this week
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <BarChart3 className="text-orange-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Admin-only Stats */}
        {user?.role === 'ADMIN' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">HR Managers</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalHR}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Managing trainers
                  </p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-full">
                  <Users className="text-indigo-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">System Health</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">98%</p>
                  <p className="text-sm text-green-600 mt-1">
                    All systems operational
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <AlertCircle className="text-green-600" size={24} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activities and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activities</h2>
              <div className="space-y-4">
                {recentActivities.map(activity => (
                  <div 
                    key={activity.id}
                    className={`flex items-center gap-4 p-3 rounded-lg border ${getActivityColor(activity.type)}`}
                  >
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        By {activity.user} • {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 justify-center">
                <BarChart3 size={18} />
                Generate Report
              </button>
              
              <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 justify-center">
                <Calendar size={18} />
                View Leaves
              </button>
              
              <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 justify-center">
                <Clock size={18} />
                Check Attendance
              </button>

              {user?.role === 'ADMIN' && (
                <button className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 justify-center">
                  <Users size={18} />
                  Manage HR
                </button>
              )}
            </div>

            {/* System Status */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">System Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">API Services</span>
                  <span className="text-green-600 font-medium">✓ Operational</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Database</span>
                  <span className="text-green-600 font-medium">✓ Connected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email Service</span>
                  <span className="text-green-600 font-medium">✓ Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}