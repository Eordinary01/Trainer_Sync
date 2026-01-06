import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  console.log("🔐 ProtectedRoute Debug:", {
    isAuthenticated,
    user: user,
    userRole: user?.role,
    requiredRole,
    loading,
    isFirstLogin: user?.isFirstLogin,
    currentPath: location.pathname
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
  if (!isAuthenticated || !user) {
    console.log("❌ ProtectedRoute: Not authenticated or user data missing, redirecting to login");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // ✅ Handle temporary password flow
  const isChangePasswordPage = location.pathname === '/change-password';
  
  if (user.isFirstLogin) {
    if (!isChangePasswordPage) {
      console.log("⚠️ ProtectedRoute: User has temporary password, redirecting to change-password");
      return <Navigate to="/change-password" replace state={{ from: location }} />;
    }
    // Allow access to change-password page even with temporary password
    console.log("✅ ProtectedRoute: Allowing access to change-password with temporary password");
    return children;
  }

  // If user is on change-password page but doesn't have temporary password, redirect to dashboard
  if (isChangePasswordPage && !user.isFirstLogin) {
    console.log("🔄 ProtectedRoute: User on change-password but no temporary password, redirecting to dashboard");
    const redirectPath = user.role === 'ADMIN' || user.role === 'HR' 
      ? '/admin/dashboard' 
      : '/trainer/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // Check role permissions (skip for change-password page)
  if (requiredRole && !isChangePasswordPage) {
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

  console.log("✅ ProtectedRoute: Access granted to", location.pathname);
  return children;
}