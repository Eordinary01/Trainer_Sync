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
  Briefcase,
  Infinity,
  FolderGit2,
  Award,
  TrendingUp,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Dropdown states
  const [openMenu, setOpenMenu] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === "ADMIN";
  const isHR = user?.role === "HR";
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
    if (isAdmin || isHR) navigate("/admin/dashboard");
    else navigate("/trainer/dashboard");
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        {/* Logo */}
        <div
          onClick={handleDashboardNavigation}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="text-2xl font-bold text-blue-600">TrainerSync</div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-2">
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
            <span>Dashboard</span>
          </button>

          {/* Portfolio Menu - For All Users */}
          {(isAdmin || isHR || isTrainer) && (
            <div className="relative">
              <button
                onClick={() => toggleMenu("portfolio")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname.includes("/portfolio")
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <FolderGit2 size={18} />
                <span>Portfolio</span>
                <ChevronDown size={16} />
              </button>
              {openMenu === "portfolio" && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50 py-1">
                  {isTrainer && (
                    <button
                      onClick={() => handleNavigation("/trainer/portfolio")}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                    >
                      <FolderGit2 size={16} className="text-gray-500" /> My Portfolio
                    </button>
                  )}
                  {(isAdmin || isHR) && (
                    <>
                      <button
                        onClick={() => handleNavigation("/admin/portfolio")}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                      >
                        <FolderGit2 size={16} className="text-gray-500" /> All Portfolios
                      </button>
                      <div className="border-t my-1"></div>
                      <div className="px-4 py-1.5 text-xs text-gray-500 font-semibold">
                        QUICK LINKS
                      </div>
                      <button
                        onClick={() => handleNavigation("/admin/portfolio?tab=qualifications")}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                      >
                        <Award size={16} className="text-gray-500" /> Qualifications
                      </button>
                      <button
                        onClick={() => handleNavigation("/admin/portfolio?tab=projects")}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                      >
                        <FolderGit2 size={16} className="text-gray-500" /> Projects
                      </button>
                      <button
                        onClick={() => handleNavigation("/admin/portfolio?tab=placement")}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                      >
                        <TrendingUp size={16} className="text-gray-500" /> Placement Records
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* HR/Admin Menu - Only for Admin (Create HR) */}
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
                <span>HR/Admin</span>
                <ChevronDown size={16} />
              </button>
              {openMenu === "hr" && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50 py-1">
                  <button
                    onClick={() => handleNavigation("/admin/hr/create")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                  >
                    <UserPlus size={16} className="text-gray-500" /> Create HR/Admin
                  </button>
                </div>
              )}
            </div>
          )}

          {/* HR Leave Menu - For HR to view their own leaves */}
          {isHR && (
            <div className="relative">
              <button
                onClick={() => toggleMenu("hr-leaves")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname.includes("/hr/leaves")
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Briefcase size={18} />
                <span>My Leaves</span>
                <Infinity size={14} className="text-purple-500" />
                <ChevronDown size={16} />
              </button>
              {openMenu === "hr-leaves" && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50 py-1">
                  <button
                    onClick={() => handleNavigation("/hr/leaves/my-leaves")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                  >
                    <FileText size={16} className="text-gray-500" /> My Leave Requests
                  </button>
                  <button
                    onClick={() => handleNavigation("/hr/apply-leave")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Calendar size={16} className="text-gray-500" /> Apply for Leave
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Trainers Menu - For Admin/HR */}
          {(isAdmin || isHR) && (
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
                <span>Trainers</span>
                <ChevronDown size={16} />
              </button>
              {openMenu === "trainers" && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50 py-1">
                  <button
                    onClick={() => handleNavigation("/admin/trainers")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Users size={16} className="text-gray-500" /> All Trainers
                  </button>
                  <button
                    onClick={() => handleNavigation("/admin/trainers/create")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                  >
                    <User size={16} className="text-gray-500" /> Create Trainer
                  </button>
                  <button
                    onClick={() => handleNavigation("/admin/clocked-in")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Clock size={16} className="text-gray-500" /> Currently Clocked In
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Attendance Menu - For Admin/HR */}
          {(isAdmin || isHR) && (
            <button
              onClick={() => handleNavigation("/admin/attendance")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                location.pathname.includes("/admin/attendance")
                  ? "bg-orange-100 text-orange-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Clock size={18} />
              <span>Attendance</span>
            </button>
          )}

          {/* HR Leave Approvals - Only for ADMIN */}
          {isAdmin && (
            <button
              onClick={() => handleNavigation("/admin/leaves/hr-approvals")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                location.pathname.includes("/admin/leaves/hr-approvals")
                  ? "bg-purple-100 text-purple-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Briefcase size={18} />
              <span>HR Leaves</span>
            </button>
          )}

          {/* Leaves Menu - For Admin/HR (Trainer Leave Management) */}
          {(isAdmin || isHR) && (
            <div className="relative">
              <button
                onClick={() => toggleMenu("leaves")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname.includes("/admin/leaves") && 
                  !location.pathname.includes("/admin/leaves/hr-approvals")
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Calendar size={18} />
                <span>Trainer Leaves</span>
                <ChevronDown size={16} />
              </button>
              {openMenu === "leaves" && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50 py-1">
                  <button
                    onClick={() => handleNavigation("/admin/leaves")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                  >
                    <FileText size={16} className="text-gray-500" /> Leave Management
                  </button>
                  <button
                    onClick={() => handleNavigation("/admin/leaves/reports")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                  >
                    <FileText size={16} className="text-gray-500" /> Leave Reports
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Trainer Leaves Menu - For Trainers only */}
          {isTrainer && (
            <div className="relative">
              <button
                onClick={() => toggleMenu("trainer-leaves")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname.includes("/trainer/leaves") || 
                  location.pathname.includes("/trainer/apply-leave")
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Calendar size={18} />
                <span>My Leaves</span>
                <ChevronDown size={16} />
              </button>
              {openMenu === "trainer-leaves" && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50 py-1">
                  <button
                    onClick={() => handleNavigation("/trainer/apply-leave")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Calendar size={16} className="text-gray-500" /> Apply for Leave
                  </button>
                  <button
                    onClick={() => handleNavigation("/trainer/leaves/reports")}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                  >
                    <FileText size={16} className="text-gray-500" /> Leave History
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ✅ MERGED: User Menu with Profile & Logout */}
          <div className="relative ml-2">
            <button
              onClick={() => toggleMenu("user")}
              className="flex items-center gap-3 pl-3 border-l border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-white" />
              </div>
              <div className="hidden lg:block text-right min-w-[100px]">
                <div className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
                  {user?.profile?.firstName} {user?.profile?.lastName}
                </div>
                <div className="text-xs text-gray-500 capitalize flex items-center justify-end gap-1">
                  {user?.role?.toLowerCase()}
                  {isHR && (
                    <span className="text-purple-500 flex items-center gap-0.5">
                      <Infinity size={12} />
                    </span>
                  )}
                </div>
              </div>
              <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />
            </button>
            
            {openMenu === "user" && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                {/* Profile Section */}
                <button
                  onClick={() => 
                    isAdmin || isHR
                      ? handleNavigation("/admin/profile") 
                      : handleNavigation("/trainer/profile")
                  }
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <UserCog size={16} className="text-gray-500" />
                  <span>My Profile</span>
                </button>
                
                {/* Change Password */}
                <button
                  onClick={() => handleNavigation("/change-password")}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <Settings size={16} className="text-gray-500" />
                  <span>Change Password</span>
                </button>
                
                {/* Divider */}
                <div className="border-t border-gray-100 my-1"></div>
                
                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-3 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Dashboard */}
            <button
              onClick={handleDashboardNavigation}
              className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Home size={20} className="text-gray-500" />
              <span className="font-medium">Dashboard</span>
            </button>

            {/* Portfolio Section */}
            {(isAdmin || isHR || isTrainer) && (
              <>
                <div className="text-xs font-semibold text-gray-500 px-4 py-2 mt-2">
                  PORTFOLIO
                </div>
                {isTrainer && (
                  <button
                    onClick={() => handleNavigation("/trainer/portfolio")}
                    className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <FolderGit2 size={20} className="text-gray-500" />
                    <span className="font-medium">My Portfolio</span>
                  </button>
                )}
                {(isAdmin || isHR) && (
                  <>
                    <button
                      onClick={() => handleNavigation("/admin/portfolio")}
                      className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <FolderGit2 size={20} className="text-gray-500" />
                      <span className="font-medium">All Portfolios</span>
                    </button>
                    <button
                      onClick={() => handleNavigation("/admin/portfolio?tab=qualifications")}
                      className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Award size={20} className="text-gray-500" />
                      <span className="font-medium">Qualifications</span>
                    </button>
                    <button
                      onClick={() => handleNavigation("/admin/portfolio?tab=projects")}
                      className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <FolderGit2 size={20} className="text-gray-500" />
                      <span className="font-medium">Projects</span>
                    </button>
                    <button
                      onClick={() => handleNavigation("/admin/portfolio?tab=placement")}
                      className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <TrendingUp size={20} className="text-gray-500" />
                      <span className="font-medium">Placement Records</span>
                    </button>
                  </>
                )}
              </>
            )}

            {/* Admin - Create HR */}
            {isAdmin && (
              <button
                onClick={() => handleNavigation("/admin/hr/create")}
                className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Shield size={20} className="text-gray-500" />
                <span className="font-medium">Create HR/Admin</span>
              </button>
            )}

            {/* HR - My Leaves */}
            {isHR && (
              <>
                <button
                  onClick={() => handleNavigation("/hr/leaves/my-leaves")}
                  className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <FileText size={20} className="text-gray-500" />
                  <span className="font-medium">My Leave Requests</span>
                </button>
                <button
                  onClick={() => handleNavigation("/hr/apply-leave")}
                  className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Calendar size={20} className="text-gray-500" />
                  <span className="font-medium">Apply for Leave</span>
                </button>
              </>
            )}

            {/* Admin/HR - Trainer Management */}
            {(isAdmin || isHR) && (
              <>
                <div className="text-xs font-semibold text-gray-500 px-4 py-2 mt-2">
                  TRAINER MANAGEMENT
                </div>
                <button
                  onClick={() => handleNavigation("/admin/trainers")}
                  className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Users size={20} className="text-gray-500" />
                  <span className="font-medium">All Trainers</span>
                </button>
                <button
                  onClick={() => handleNavigation("/admin/trainers/create")}
                  className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <User size={20} className="text-gray-500" />
                  <span className="font-medium">Create Trainer</span>
                </button>
                <button
                  onClick={() => handleNavigation("/admin/clocked-in")}
                  className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Clock size={20} className="text-gray-500" />
                  <span className="font-medium">Currently Clocked In</span>
                </button>
                <button
                  onClick={() => handleNavigation("/admin/attendance")}
                  className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Clock size={20} className="text-gray-500" />
                  <span className="font-medium">Attendance Reports</span>
                </button>
              </>
            )}

            {/* Admin - HR Leave Approvals */}
            {isAdmin && (
              <>
                <div className="text-xs font-semibold text-gray-500 px-4 py-2 mt-2">
                  HR MANAGEMENT
                </div>
                <button
                  onClick={() => handleNavigation("/admin/leaves/hr-approvals")}
                  className="flex items-center gap-3 w-full px-4 py-3 bg-purple-50 text-purple-700 rounded-lg transition-colors"
                >
                  <Briefcase size={20} className="text-purple-500" />
                  <span className="font-medium">HR Leave Approvals</span>
                  <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    Pending
                  </span>
                </button>
              </>
            )}

            {/* Admin/HR - Trainer Leaves */}
            {(isAdmin || isHR) && (
              <>
                <div className="text-xs font-semibold text-gray-500 px-4 py-2 mt-2">
                  TRAINER LEAVES
                </div>
                <button
                  onClick={() => handleNavigation("/admin/leaves")}
                  className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <FileText size={20} className="text-gray-500" />
                  <span className="font-medium">Leave Management</span>
                </button>
                <button
                  onClick={() => handleNavigation("/admin/leaves/reports")}
                  className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <FileText size={20} className="text-gray-500" />
                  <span className="font-medium">Leave Reports</span>
                </button>
              </>
            )}

            {/* Trainer - My Leaves */}
            {isTrainer && (
              <>
                <div className="text-xs font-semibold text-gray-500 px-4 py-2 mt-2">
                  MY LEAVES
                </div>
                <button
                  onClick={() => handleNavigation("/trainer/apply-leave")}
                  className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Calendar size={20} className="text-gray-500" />
                  <span className="font-medium">Apply for Leave</span>
                </button>
                <button
                  onClick={() => handleNavigation("/trainer/leaves/reports")}
                  className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <FileText size={20} className="text-gray-500" />
                  <span className="font-medium">Leave History</span>
                </button>
              </>
            )}

            {/* Trainer - Attendance History */}
            {isTrainer && (
              <button
                onClick={() => handleNavigation("/trainer/attendance/history")}
                className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Clock size={20} className="text-gray-500" />
                <span className="font-medium">Attendance History</span>
              </button>
            )}

            {/* Account Section - Merged Profile & Logout */}
            <div className="border-t border-gray-200 mt-4 pt-4">
              <div className="text-xs font-semibold text-gray-500 px-4 py-2">
                ACCOUNT
              </div>
              
              {/* Profile */}
              <button
                onClick={() => 
                  isAdmin || isHR
                    ? handleNavigation("/admin/profile") 
                    : handleNavigation("/trainer/profile")
                }
                className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <UserCog size={20} className="text-gray-500" />
                <span className="font-medium">My Profile</span>
              </button>
              
              {/* Change Password */}
              <button
                onClick={() => handleNavigation("/change-password")}
                className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Settings size={20} className="text-gray-500" />
                <span className="font-medium">Change Password</span>
              </button>
              
              {/* User Info & Logout */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {user?.profile?.firstName} {user?.profile?.lastName}
                    </div>
                    <div className="text-xs text-gray-500 capitalize flex items-center gap-1">
                      {user?.role?.toLowerCase()}
                      {isHR && (
                        <span className="text-purple-500 flex items-center gap-0.5">
                          <Infinity size={12} />
                          unlimited
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
                >
                  <LogOut size={20} />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}