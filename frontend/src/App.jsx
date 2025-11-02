import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginForm from "./components/auth/LoginForm.jsx";
import AdminDashboard from "./components/Admin/AdminDashboard.jsx";
import TrainerDashboard from "./components/Dashboard/TrainerDashboard.jsx";
import CreateTrainerForm from "./components/Admin/CreateTrainerForm.jsx";
import TrainersList from "./components/Admin/TrainersList.jsx";
import AttendanceReport from "./components/Admin/AttendanceReport.jsx";
import {
  PendingLeaves,
  ApprovedLeaves,
  LeaveReports,
} from "./components/Admin/LeavePage.jsx";
import LeaveApplicationForm from "./components/Leave/LeaveApplicationForm.jsx";
import { CreateAdminForm } from "./components/Admin/CreateAdminForm.jsx";
import ProtectedRoute from "./components/Common/ProtectedRoute.jsx";
import Navbar from "./components/Common/Navbar.jsx";
import { useAuth } from "./hooks/useAuth.js";

export default function App() {
  const { isAuthenticated, loading, user } = useAuth();

  console.log("🚀 App Component Debug:", {
    isAuthenticated,
    user: user,
    userRole: user?.role,
    loading,
  });

  // Show loading while checking auth
  if (loading) {
    console.log("🔄 App: Still loading auth...");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Helper function to determine default route based on role
  const getDefaultRoute = () => {
    console.log("📍 getDefaultRoute - User role:", user?.role);

    if (user?.role === "ADMIN" || user?.role === "HR") {
      return "/admin/dashboard";
    } else if (user?.role === "TRAINER") {
      return "/trainer/dashboard";
    }
    return "/login";
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={getDefaultRoute()} replace />
            ) : (
              <LoginForm />
            )
          }
        />

        {/* Trainer Routes */}
        <Route
          path="/trainer/*"
          element={
            <ProtectedRoute requiredRole="TRAINER">
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="container mx-auto px-4 py-6">
                  <Routes>
                    <Route path="dashboard" element={<TrainerDashboard />} />
                    <Route
                      path="apply-leave"
                      element={<LeaveApplicationForm />}
                    />
                  </Routes>
                </div>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole={["ADMIN", "HR"]}>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="container mx-auto px-4 py-6">
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />

                    <Route
                      path="trainers/create"
                      element={<CreateTrainerForm />}
                    />
                    <Route path="trainers" element={<TrainersList />} />
                    <Route path="attendance" element={<AttendanceReport />} />
                    <Route path="leaves/pending" element={<PendingLeaves />} />
                    <Route
                      path="leaves/approved"
                      element={<ApprovedLeaves />}
                    />
                    <Route path="leaves/reports" element={<LeaveReports />} />
                    <Route path="hr/create" element={<CreateAdminForm />} />
                  </Routes>
                </div>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Redirects */}
        <Route
          path="/"
          element={
            <Navigate
              to={isAuthenticated ? getDefaultRoute() : "/login"}
              replace
            />
          }
        />

        {/* Add unauthorized route */}
        <Route
          path="/unauthorized"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">
                  Unauthorized
                </h1>
                <p className="text-gray-600">
                  You don't have permission to access this page.
                </p>
                <button
                  onClick={() => window.history.back()}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
