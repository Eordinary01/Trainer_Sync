import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user, loading } = useAuth();

  console.log("🔐 ProtectedRoute Debug:", {
    isAuthenticated,
    user: user,
    userRole: user?.role,
    requiredRole,
    loading
  });

  // Show loading while checking authentication
  if (loading) {
    console.log("🔄 ProtectedRoute: Still loading...");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log("❌ ProtectedRoute: Not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Check if user data is available
  if (!user) {
    console.log("❌ ProtectedRoute: User data not available, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Check role permissions
  if (requiredRole) {
    const hasAccess = Array.isArray(requiredRole) 
      ? requiredRole.includes(user.role)
      : user.role === requiredRole;

    console.log("🎯 Role Check:", {
      userRole: user.role,
      requiredRole,
      hasAccess
    });

    if (!hasAccess) {
      console.log("🚫 ProtectedRoute: Role mismatch, redirecting to unauthorized");
      return <Navigate to="/unauthorized" replace />;
    }
  }

  console.log("✅ ProtectedRoute: Access granted");
  return children;
}