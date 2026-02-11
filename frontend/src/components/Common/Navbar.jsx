import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import {
  LogOut,
  User,
  Home,
  Users,
  Calendar,
  ChevronDown,
  Shield,
  UserPlus,
  Settings,
  UserCog,
  Menu,
  X,
  FileText,
  Clock,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Dropdown states
  const [openMenu, setOpenMenu] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdminOrHR = user?.role === "ADMIN" || user?.role === "HR";
  const isAdmin = user?.role === "ADMIN";
  const isTrainer = user?.role === "TRAINER";

  const toggleMenu = (menuName) => {
    setOpenMenu((prev) => (prev === menuName ? null : menuName));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNavigation = (path) => {
    navigate(path);
    setOpenMenu(null);
    setIsMobileMenuOpen(false);
  };

  const handleDashboardNavigation = () => {
    if (isAdminOrHR) navigate("/admin/dashboard");
    else navigate("/trainer/dashboard");
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        {/* Logo */}
        <div
          onClick={handleDashboardNavigation}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="text-2xl font-bold text-blue-600">TrainerSync</div>
          <div className="hidden md:block text-sm text-gray-500">
            {user?.role === "ADMIN" && "Administrator Panel"}
            {user?.role === "HR" && "HR Management Panel"}
            {user?.role === "TRAINER" && "Trainer Dashboard"}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-4">
          {/* Dashboard */}
          <button
            onClick={handleDashboardNavigation}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              location.pathname.includes("/dashboard")
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Home size={18} />
            <span className="hidden sm:block">Dashboard</span>
          </button>

          {/* HR/Admin Menu - Only for Admin */}
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => toggleMenu("hr")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname.includes("/admin/hr")
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Shield size={18} />
                <span className="hidden sm:block">HR/Admin</span>
                <ChevronDown size={16} />
              </button>
              {openMenu === "hr" && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50">
                  <button
                    onClick={() => handleNavigation("/admin/hr/create")}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <UserPlus size={16} /> Create HR/Admin
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Trainers Menu - Only for Admin/HR */}
          {isAdminOrHR && (
            <div className="relative">
              <button
                onClick={() => toggleMenu("trainers")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname.includes("/admin/trainers")
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Users size={18} />
                <span className="hidden sm:block">Trainers</span>
                <ChevronDown size={16} />
              </button>
              {openMenu === "trainers" && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50">
                  <button
                    onClick={() => handleNavigation("/admin/trainers")}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Users size={16} /> All Trainers
                  </button>
                  <button
                    onClick={() => handleNavigation("/admin/trainers/create")}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <User size={16} /> Create Trainer
                  </button>
                  <button
                    onClick={() => handleNavigation("/admin/clocked-in")}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Clock size={16} /> Currently Clocked In
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Attendance Menu - For Admin/HR */}
          {isAdminOrHR && (
            <div className="relative">
              <button
                onClick={() => handleNavigation("/admin/attendance")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname.includes("/admin/attendance")
                    ? "bg-orange-100 text-orange-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Clock size={18} />
                <span className="hidden sm:block">Attendance</span>
              </button>
            </div>
          )}

          {/* Leaves Menu - Different options for Admin/HR vs Trainer */}
          {(isAdminOrHR || isTrainer) && (
            <div className="relative">
              <button
                onClick={() => toggleMenu("leaves")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname.includes("/leaves") ||
                  location.pathname.includes("/leave")
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Calendar size={18} />
                <span className="hidden sm:block">Leaves</span>
                <ChevronDown size={16} />
              </button>
              {openMenu === "leaves" && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                  {/* For Admin/HR - Comprehensive Leave Management */}
                  {isAdminOrHR && (
                    <button
                      onClick={() => handleNavigation("/admin/leaves")}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FileText size={16} /> Leave Management
                    </button>
                  )}
                  
                  {/* For Trainers - Apply Leave Only */}
                  {isTrainer && (
                    <>
                      <button
                        onClick={() => handleNavigation("/trainer/apply-leave")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Calendar size={16} /> Apply for Leave
                      </button>
                      <button
                        onClick={() => handleNavigation("/trainer/leaves/reports")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FileText size={16} /> Leave History
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Profile Menu - For All Users */}
          <div className="relative">
            <button
              onClick={() => toggleMenu("profile")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                location.pathname.includes("/profile")
                  ? "bg-orange-100 text-orange-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <User size={18} />
              <span className="hidden sm:block">Profile</span>
              <ChevronDown size={16} />
            </button>
            {openMenu === "profile" && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                <button
                  onClick={() => 
                    isAdminOrHR 
                      ? handleNavigation("/admin/profile") 
                      : handleNavigation("/trainer/profile")
                  }
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <UserCog size={16} /> My Profile
                </button>
                <button
                  onClick={() => 
                    isAdminOrHR 
                      ? handleNavigation("/admin/settings") 
                      : handleNavigation("/trainer/settings")
                  }
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <Settings size={16} /> Settings
                </button>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleMenu("user")}
              className="flex items-center gap-3 pl-3 border-l border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-gray-800">
                  {user?.profile?.firstName} {user?.profile?.lastName}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {user?.role?.toLowerCase()}
                </div>
              </div>
              <ChevronDown size={16} className="text-gray-500" />
            </button>
            {openMenu === "user" && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                <button
                  onClick={() => handleNavigation("/change-password")}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <Settings size={16} /> Change Password
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t shadow-lg">
          <div className="flex flex-col px-4 py-3 space-y-3">
            <button
              onClick={handleDashboardNavigation}
              className="flex gap-2 items-center hover:bg-gray-100 px-4 py-2 rounded"
            >
              <Home size={18} /> Dashboard
            </button>

            {/* HR/Admin - Mobile */}
            {isAdmin && (
              <button
                onClick={() => handleNavigation("/admin/hr/create")}
                className="flex gap-2 items-center hover:bg-gray-100 px-4 py-2 rounded"
              >
                <Shield size={18} /> HR/Admin
              </button>
            )}

            {/* Trainers - Mobile */}
            {isAdminOrHR && (
              <>
                <button
                  onClick={() => handleNavigation("/admin/trainers")}
                  className="flex gap-2 items-center hover:bg-gray-100 px-4 py-2 rounded"
                >
                  <Users size={18} /> All Trainers
                </button>
                <button
                  onClick={() => handleNavigation("/admin/trainers/create")}
                  className="flex gap-2 items-center hover:bg-gray-100 px-4 py-2 rounded"
                >
                  <User size={18} /> Create Trainer
                </button>
                <button
                  onClick={() => handleNavigation("/admin/clocked-in")}
                  className="flex gap-2 items-center hover:bg-gray-100 px-4 py-2 rounded"
                >
                  <Clock size={18} /> Currently Clocked In
                </button>
              </>
            )}

            {/* Attendance - Mobile */}
            {isAdminOrHR && (
              <button
                onClick={() => handleNavigation("/admin/attendance")}
                className="flex gap-2 items-center hover:bg-gray-100 px-4 py-2 rounded"
              >
                <Clock size={18} /> Attendance Reports
              </button>
            )}

            {/* Leaves - Mobile */}
            {(isAdminOrHR || isTrainer) && (
              <div className="border-t pt-2">
                <div className="text-xs font-semibold text-gray-500 px-4 py-1">
                  LEAVES
                </div>
                
                {/* Admin/HR Leave Management */}
                {isAdminOrHR && (
                  <button
                    onClick={() => handleNavigation("/admin/leaves")}
                    className="flex gap-2 items-center hover:bg-gray-100 px-4 py-2 rounded w-full text-left"
                  >
                    <FileText size={18} /> Leave Management
                  </button>
                )}
                
                {/* Trainer - Apply Leave and Leave History */}
                {isTrainer && (
                  <>
                    <button
                      onClick={() => handleNavigation("/trainer/apply-leave")}
                      className="flex gap-2 items-center hover:bg-gray-100 px-4 py-2 rounded w-full text-left"
                    >
                      <Calendar size={18} /> Apply for Leave
                    </button>
                    <button
                      onClick={() => handleNavigation("/trainer/leaves/reports")}
                      className="flex gap-2 items-center hover:bg-gray-100 px-4 py-2 rounded w-full text-left"
                    >
                      <FileText size={18} /> Leave History
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Profile - Mobile */}
            <div className="border-t pt-2">
              <div className="text-xs font-semibold text-gray-500 px-4 py-1">
                PROFILE
              </div>
              <button
                onClick={() => 
                  isAdminOrHR 
                    ? handleNavigation("/admin/profile") 
                    : handleNavigation("/trainer/profile")
                }
                className="flex gap-2 items-center hover:bg-gray-100 px-4 py-2 rounded w-full text-left"
              >
                <UserCog size={18} /> My Profile
              </button>
              <button
                onClick={() => handleNavigation("/change-password")}
                className="flex gap-2 items-center hover:bg-gray-100 px-4 py-2 rounded w-full text-left"
              >
                <Settings size={18} /> Change Password
              </button>
            </div>

            {/* Mobile User Profile & Logout */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {user?.profile?.firstName} {user?.profile?.lastName}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {user?.role?.toLowerCase()}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex gap-2 items-center text-red-500 hover:bg-red-50 px-4 py-2 rounded w-full mt-2"
              >
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}