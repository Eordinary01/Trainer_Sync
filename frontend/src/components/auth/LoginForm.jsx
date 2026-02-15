// components/auth/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Eye, EyeOff, Lock, User, AlertCircle, CheckCircle } from "lucide-react";

export default function Login() {
  const { login, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [accountLocked, setAccountLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [userFeedback, setUserFeedback] = useState({ type: "", message: "" });

  // Restore lock state
  useEffect(() => {
    const lockUntil = localStorage.getItem("accountLockedUntil");
    const attempts = localStorage.getItem("loginAttempts");

    if (attempts) setLoginAttempts(Number(attempts));

    if (lockUntil) {
      const remaining = Math.ceil(
        (new Date(lockUntil) - new Date()) / 1000
      );
      if (remaining > 0) {
        setAccountLocked(true);
        setLockTimeRemaining(remaining);
      } else {
        localStorage.removeItem("accountLockedUntil");
        localStorage.removeItem("loginAttempts");
      }
    }
  }, []);

  // Lock countdown
  useEffect(() => {
    if (!accountLocked || lockTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setLockTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAccountLocked(false);
          localStorage.removeItem("accountLockedUntil");
          localStorage.removeItem("loginAttempts");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [accountLocked, lockTimeRemaining]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
      s % 60
    ).padStart(2, "0")}`;

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    clearError();
    setUserFeedback({ type: "", message: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous feedback
    clearError();
    setUserFeedback({ type: "", message: "" });

    // Check account lock FIRST
    if (accountLocked) {
      setUserFeedback({
        type: "error",
        message: `Account locked. Try again in ${formatTime(lockTimeRemaining)}`,
      });
      return;
    }

    // Validate inputs
    if (!formData.username.trim()) {
      setUserFeedback({
        type: "error",
        message: "Please enter your username",
      });
      return;
    }

    if (!formData.password) {
      setUserFeedback({
        type: "error",
        message: "Please enter your password",
      });
      return;
    }

    // Attempt login
    const result = await login(formData.username.trim(), formData.password);
    
    // LOGIN FAILED
    if (!result.success) {
      const attempts = loginAttempts + 1;
      setLoginAttempts(attempts);
      localStorage.setItem("loginAttempts", attempts);

      if (attempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        localStorage.setItem("accountLockedUntil", lockUntil);
        setAccountLocked(true);
        setLockTimeRemaining(900);
      }

      // Show error message from backend
      setUserFeedback({
        type: "error",
        message: result.error || "Invalid credentials",
      });
      return;
    }

    // LOGIN SUCCESS
    localStorage.removeItem("loginAttempts");
    localStorage.removeItem("accountLockedUntil");
    setLoginAttempts(0);
    setAccountLocked(false);

    // ✅ Show success message briefly
    setUserFeedback({
      type: "success",
      message: "Login successful!",
    });

    // ✅ Redirect immediately - no timeout for success message
    if (result.isFirstLogin) {
      navigate("/change-password");
    } else if (result.user.role === "ADMIN" || result.user.role === "HR") {
      navigate("/admin/dashboard");
    } else {
      navigate("/trainer/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">TrainerSync</h1>
          <p className="text-gray-600 mt-2">Secure Login Portal</p>
        </div>

        {/* ✅ User Feedback Message - Shows errors only (success is brief) */}
        {userFeedback.message && userFeedback.type === "error" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{userFeedback.message}</p>
              {accountLocked && (
                <p className="text-sm mt-1 opacity-90">
                  Account will unlock in {formatTime(lockTimeRemaining)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ✅ Fallback error from store - only shown if no userFeedback */}
        {error && !userFeedback.message && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400" />
              </div>
              <input
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                disabled={loading || accountLocked}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading || accountLocked}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                disabled={loading || accountLocked}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading || accountLocked}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Checking credentials...</span>
              </div>
            ) : accountLocked ? (
              `Account Locked (${formatTime(lockTimeRemaining)})`
            ) : (
              "Log In"
            )}
          </button>

          {/* Additional Links */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Having trouble?{" "}
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot Password?
              </button>
            </p>
          </div>
        </form>

        {/* Security Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">Security Notice</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Account locks after 5 failed attempts for 15 minutes</li>
                <li>• Never share your credentials</li>
                <li>• Log out after each session</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}