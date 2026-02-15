// components/auth/ForgotPassword.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Mail, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Clock,
  KeyRound
} from "lucide-react";
import api from "../../config/api";
import { useAuth } from "../../hooks/useAuth";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // Step 1: Email verification
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Rate limiting
  const [attempts, setAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitTimeRemaining, setRateLimitTimeRemaining] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState(null);

  // Step 2: Reset password with 6-digit token
  const [token, setToken] = useState("");
  const [manualToken, setManualToken] = useState(""); // For manual entry
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  
  // Check for token in URL (6-digit token)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    if (tokenParam) {
      // Validate it's a 6-digit number
      if (/^\d{6}$/.test(tokenParam)) {
        setToken(tokenParam);
      } else {
        setError("Invalid reset token format");
      }
    }
  }, []);

  // Pre-fill email if user is already logged in
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setEmail(user.email);
    }
  }, [isAuthenticated, user]);

  // Restore rate limit state from localStorage
  useEffect(() => {
    const storedAttempts = localStorage.getItem("forgotPasswordAttempts");
    const storedTime = localStorage.getItem("forgotPasswordLastAttempt");
    const rateLimitUntil = localStorage.getItem("forgotPasswordRateLimit");
    
    if (storedAttempts) setAttempts(parseInt(storedAttempts));
    if (storedTime) setLastAttemptTime(parseInt(storedTime));
    
    if (rateLimitUntil) {
      const remaining = Math.ceil((parseInt(rateLimitUntil) - Date.now()) / 1000);
      if (remaining > 0) {
        setIsRateLimited(true);
        setRateLimitTimeRemaining(remaining);
      } else {
        localStorage.removeItem("forgotPasswordRateLimit");
        localStorage.removeItem("forgotPasswordAttempts");
        localStorage.removeItem("forgotPasswordLastAttempt");
      }
    }
  }, []);

  // Rate limit countdown
  useEffect(() => {
    if (!isRateLimited || rateLimitTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setRateLimitTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRateLimited(false);
          localStorage.removeItem("forgotPasswordRateLimit");
          localStorage.removeItem("forgotPasswordAttempts");
          localStorage.removeItem("forgotPasswordLastAttempt");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRateLimited, rateLimitTimeRemaining]);

  // Password validation rules
  const [passwordRules, setPasswordRules] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  // Validate password on change
  useEffect(() => {
    if (!newPassword) {
      setPasswordRules({
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
      });
      return;
    }

    setPasswordRules({
      minLength: newPassword.length >= 8,
      hasUpperCase: /[A-Z]/.test(newPassword),
      hasLowerCase: /[a-z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      hasSpecialChar: /[!@#$%^&*]/.test(newPassword),
    });
  }, [newPassword]);

  // Calculate password strength score (0-5)
  const passwordStrength = Object.values(passwordRules).filter(Boolean).length;
  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return "bg-red-500";
    if (passwordStrength <= 2) return "bg-orange-500";
    if (passwordStrength <= 3) return "bg-yellow-500";
    if (passwordStrength <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return "Very Weak";
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 3) return "Fair";
    if (passwordStrength <= 4) return "Good";
    return "Strong";
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle forgot password with security best practices
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Rate limiting check
    if (isRateLimited) {
      setError(`Too many attempts. Please try again in ${formatTime(rateLimitTimeRemaining)}`);
      return;
    }

    // Check if making too many attempts
    const now = Date.now();
    if (lastAttemptTime && (now - lastAttemptTime) < 60000) { // 1 minute window
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem("forgotPasswordAttempts", newAttempts);
      localStorage.setItem("forgotPasswordLastAttempt", now);
      
      if (newAttempts >= 3) {
        const lockUntil = now + (15 * 60 * 1000); // 15 minutes
        localStorage.setItem("forgotPasswordRateLimit", lockUntil);
        setIsRateLimited(true);
        setRateLimitTimeRemaining(900);
        setError("Too many attempts. Please try again in 15 minutes.");
        setLoading(false);
        return;
      }
    } else {
      // Reset attempts if more than 1 minute has passed
      setAttempts(1);
      localStorage.setItem("forgotPasswordAttempts", 1);
      localStorage.setItem("forgotPasswordLastAttempt", now);
    }

    if (!email.trim()) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    // If user is logged in, verify the email matches their account
    if (isAuthenticated && user?.email && user.email !== email) {
      setError("Email does not match your authenticated account.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/forgot-password", { 
        email: isAuthenticated ? user.email : email
      });
      
      if (response.data?.success) {
        setEmailVerified(true);
        setSuccess("If an account exists with this email, you will receive a password reset link.");
        
        // Reset attempts on success
        localStorage.removeItem("forgotPasswordAttempts");
        localStorage.removeItem("forgotPasswordLastAttempt");
        setAttempts(0);
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      
      // Always show generic message to prevent email enumeration
      setSuccess("If an account exists with this email, you will receive a password reset link.");
      setEmailVerified(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle reset password with 6-digit token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Get the token to use (from URL or manual input)
    const resetToken = token || manualToken;

    // Validate token
    if (!resetToken) {
      setError("Please enter the 6-digit reset token");
      setLoading(false);
      return;
    }

    if (!/^\d{6}$/.test(resetToken)) {
      setError("Reset token must be exactly 6 digits");
      setLoading(false);
      return;
    }

    // Password validation
    if (!newPassword || !confirmPassword) {
      setError("Please enter both password fields");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Check all password requirements
    if (passwordStrength < 5) {
      setError("Password must meet all security requirements");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/reset-password", {
        token: resetToken,
        newPassword
      });
      
      if (response.data?.success) {
        setResetSuccess(true);
        setSuccess("Password reset successful! Redirecting to login...");
        
        // Clear any rate limiting data
        localStorage.removeItem("forgotPasswordAttempts");
        localStorage.removeItem("forgotPasswordLastAttempt");
        localStorage.removeItem("forgotPasswordRateLimit");
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setError(
        error.response?.data?.message || 
        "Invalid or expired token. Please request a new reset link."
      );
    } finally {
      setLoading(false);
    }
  };

  // Copy token to clipboard
  const copyTokenToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setSuccess("Token copied to clipboard!");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  // If token exists in URL, show reset password form
  if (token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full mb-4">
              <KeyRound className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {resetSuccess ? "Password Reset!" : "Reset Your Password"}
            </h1>
            <p className="text-gray-600 mt-2">
              {resetSuccess 
                ? "Your password has been updated successfully"
                : "Enter your new password below"
              }
            </p>
          </div>

          {/* Token Display */}
          {!resetSuccess && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Reset Token:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-blue-700">{token}</span>
                  <button
                    onClick={copyTokenToClipboard}
                    className="text-blue-600 hover:text-blue-800"
                    title="Copy token"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                This token will expire in 15 minutes
              </p>
            </div>
          )}

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-start gap-3">
              <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{success}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          {!resetSuccess && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {/* New Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    disabled={loading || resetSuccess}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    disabled={loading || resetSuccess}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading || resetSuccess}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading || resetSuccess}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">
                      Password Strength
                    </span>
                    <span className={`text-xs font-bold ${getPasswordStrengthColor().replace('bg-', 'text-')}`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Password Requirements */}
              {(isPasswordFocused || newPassword) && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Password Requirements:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${passwordRules.minLength ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className={`text-xs ${passwordRules.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                        At least 8 characters
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${passwordRules.hasUpperCase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className={`text-xs ${passwordRules.hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}>
                        One uppercase letter (A-Z)
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${passwordRules.hasLowerCase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className={`text-xs ${passwordRules.hasLowerCase ? 'text-green-600' : 'text-gray-500'}`}>
                        One lowercase letter (a-z)
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${passwordRules.hasNumber ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className={`text-xs ${passwordRules.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                        One number (0-9)
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${passwordRules.hasSpecialChar ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className={`text-xs ${passwordRules.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                        One special character (!@#$%^&*)
                      </span>
                    </li>
                  </ul>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || resetSuccess || passwordStrength < 5}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={18} />
                      <span>Resetting...</span>
                    </div>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // If no token but showTokenInput is true, show manual token entry
  if (showTokenInput) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
              <KeyRound className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Enter Reset Token</h1>
            <p className="text-gray-600 mt-2">
              Enter the 6-digit token sent to your email
            </p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (/^\d{6}$/.test(manualToken)) {
              setToken(manualToken);
              setShowTokenInput(false);
            } else {
              setError("Please enter a valid 6-digit token");
            }
          }} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                6-Digit Reset Token
              </label>
              <input
                type="text"
                value={manualToken}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setManualToken(value);
                }}
                className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Check your email for the 6-digit reset token
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle size={16} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowTokenInput(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={manualToken.length !== 6}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500"
              >
                Verify Token
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Step 1: Forgot Password Form (Email Input)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
            <Mail className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {emailVerified ? "Check Your Email" : "Forgot Password?"}
          </h1>
          <p className="text-gray-600 mt-2">
            {emailVerified 
              ? "We've sent a 6-digit reset token to your email" 
              : "Enter your email to receive a reset token"}
          </p>
        </div>

        {/* Rate Limit Warning */}
        {isRateLimited && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl flex items-start gap-3">
            <Clock size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Too many attempts</p>
              <p className="text-sm mt-1">
                Please try again in {formatTime(rateLimitTimeRemaining)}
              </p>
            </div>
          </div>
        )}

        {/* Authenticated User Badge */}
        {isAuthenticated && user?.email && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <Shield size={18} className="text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-800">Authenticated as</p>
              <p className="text-sm font-semibold text-blue-900">{user.email}</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Logged In
            </span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-start gap-3">
            <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{success}</p>
              <p className="text-sm mt-1 opacity-90">
                The token will expire in 15 minutes
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && !isRateLimited && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {!emailVerified ? (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || emailVerified || isRateLimited || isAuthenticated}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                  placeholder={isAuthenticated ? "Using authenticated email" : "Enter your email address"}
                  autoComplete="email"
                  readOnly={isAuthenticated}
                />
              </div>
              
              {/* Email Verification Notice */}
              {isAuthenticated && user?.email && (
                <p className="text-xs text-gray-500 mt-2">
                  ℹ️ Reset token will be sent to your authenticated email
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !email || isRateLimited}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    <span>Sending...</span>
                  </div>
                ) : (
                  "Send Reset Token"
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">
                    <strong className="font-semibold">
                      {isAuthenticated ? user.email : email}
                    </strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Didn't receive the email? Check your spam folder or 
                    <button
                      onClick={() => setEmailVerified(false)}
                      className="text-blue-700 underline ml-1"
                    >
                      try again
                    </button>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowTokenInput(true)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300"
              >
                I Have a Reset Token
              </button>
              
              <button
                onClick={() => {
                  setEmailVerified(false);
                  setSuccess("");
                  if (!isAuthenticated) {
                    setEmail("");
                  }
                }}
                className="w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Try another email
              </button>
              
              <button
                onClick={() => navigate("/login")}
                className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}

        {/* Security Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">Security Notice</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• For security, we don't reveal if an email exists in our system</li>
                <li>• Reset tokens expire after 15 minutes</li>
                <li>• Never share your reset token with anyone</li>
                <li>• Maximum 3 attempts per minute, 15 minute lockout</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}