import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { Bell, LogOut, User, Home, Users, Calendar, ChevronDown, BarChart3, FileText, Shield, UserPlus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  // Dummy notification data
  const [notifications] = useState([
    { id: 1, type: 'leave', message: 'New leave request from John Doe', time: '2 hours ago', unread: true },
    { id: 2, type: 'attendance', message: 'Attendance reminder for today', time: '5 hours ago', unread: true },
    { id: 3, type: 'system', message: 'System update completed', time: '1 day ago', unread: false },
  ]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showTrainerMenu, setShowTrainerMenu] = useState(false);
  const [showLeaveMenu, setShowLeaveMenu] = useState(false);
  const [showHRMenu, setShowHRMenu] = useState(false);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Check if user is admin or HR
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    // Close all dropdowns
    setShowNotifications(false);
    setShowTrainerMenu(false);
    setShowLeaveMenu(false);
    setShowHRMenu(false);
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-3">
        {/* Main Navigation Row */}
        <div className="flex justify-between items-center">
          
          {/* Logo and Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => handleNavigation('/admin/dashboard')}
          >
            <div className="text-2xl mx-7 font-bold text-blue-600">TrainerSync</div>
            <div className="hidden md:block text-sm text-gray-500">
              {user?.role === 'ADMIN' && 'Administrator Panel'}
              {user?.role === 'HR' && 'HR Management Panel'}
              {user?.role === 'TRAINER' && 'Trainer Dashboard'}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            
            {/* Dashboard Link */}
            <button
              onClick={() => handleNavigation('/admin/dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                location.pathname === '/admin/dashboard' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Home size={18} />
              <span className="hidden sm:block">Dashboard</span>
            </button>

            {/* HR/Admin Management Section (ADMIN only) */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowHRMenu(!showHRMenu)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname.includes('/hr') || location.pathname.includes('/admin-management')
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Shield size={18} />
                  <span className="hidden sm:block">HR/Admin</span>
                  <ChevronDown size={16} />
                </button>

                {/* HR/Admin Management Dropdown */}
                {showHRMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => handleNavigation('/admin/hr/create')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <UserPlus size={16} />
                        Create HR/Admin
                      </button>
                      {/* <button
                        onClick={() => handleNavigation('/admin/hr/manage')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Shield size={16} />
                        Manage HR/Admin
                      </button>
                      <button
                        onClick={() => handleNavigation('/admin/hr/permissions')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FileText size={16} />
                        Permission Settings
                      </button> */}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trainer Management Section (Admin/HR only) */}
            {isAdminOrHR && (
              <div className="relative">
                <button
                  onClick={() => setShowTrainerMenu(!showTrainerMenu)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname.includes('/trainers') || location.pathname.includes('/attendance')
                      ? 'bg-green-100 text-green-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Users size={18} />
                  <span className="hidden sm:block">Trainers</span>
                  <ChevronDown size={16} />
                </button>

                {/* Trainer Management Dropdown */}
                {showTrainerMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => handleNavigation('/admin/trainers')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Users size={16} />
                        All Trainers
                      </button>
                      <button
                        onClick={() => handleNavigation('/admin/trainers/create')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <User size={16} />
                        Create New Trainer
                      </button>
                      <button
                        onClick={() => handleNavigation('/admin/attendance')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <BarChart3 size={16} />
                        Attendance Report
                      </button>
                      <button
                        onClick={() => handleNavigation('/admin/trainers/performance')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FileText size={16} />
                        Performance Metrics
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Leave Management Section (Admin/HR only) */}
            {isAdminOrHR && (
              <div className="relative">
                <button
                  onClick={() => setShowLeaveMenu(!showLeaveMenu)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname.includes('/leaves') 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Calendar size={18} />
                  <span className="hidden sm:block">Leaves</span>
                  <ChevronDown size={16} />
                </button>

                {/* Leave Management Dropdown */}
                {showLeaveMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => handleNavigation('/admin/leaves/pending')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Calendar size={16} />
                        Pending Requests
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          3
                        </span>
                      </button>
                      <button
                        onClick={() => handleNavigation('/admin/leaves/approved')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FileText size={16} />
                        Approved Leaves
                      </button>
                      <button
                        onClick={() => handleNavigation('/admin/leaves/reports')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <BarChart3 size={16} />
                        Leave Reports
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bell size={20} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                    <p className="text-xs text-gray-500">{unreadCount} unread</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map(notification => (
                      <div 
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          notification.unread ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          if (notification.type === 'leave') {
                            handleNavigation('/admin/leaves/pending');
                          }
                        }}
                      >
                        <p className="text-sm font-medium text-gray-800">{notification.message}</p>
                        <span className="text-xs text-gray-500 mt-1">{notification.time}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <button 
                      onClick={() => handleNavigation('/admin/notifications')}
                      className="w-full text-center text-sm text-blue-600 font-medium hover:text-blue-700"
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-gray-800">
                  {user?.profile?.firstName} {user?.profile?.lastName}
                </div>
                <div className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut size={18} /> 
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar (Admin/HR only) */}
        {isAdminOrHR && (
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-200 text-sm">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-500" />
              <span className="text-gray-600">
                <strong className="text-gray-800">12</strong> Active Trainers
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              <span className="text-gray-600">
                <strong className="text-gray-800">3</strong> Pending Leaves
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-gray-500" />
              <span className="text-gray-600">
                <strong className="text-gray-800">8</strong> Clocked In Today
              </span>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-gray-500" />
                <span className="text-gray-600">
                  <strong className="text-gray-800">4</strong> HR Managers
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Close dropdowns when clicking outside */}
      {(showNotifications || showTrainerMenu || showLeaveMenu || showHRMenu) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowNotifications(false);
            setShowTrainerMenu(false);
            setShowLeaveMenu(false);
            setShowHRMenu(false);
          }}
        />
      )}
    </nav>
  );
}