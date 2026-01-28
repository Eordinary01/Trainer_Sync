import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Login() {
  const { login, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [accountLocked, setAccountLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [userFeedback, setUserFeedback] = useState({ type: "", message: "" });

  // 🔄 Restore lock state
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

  // ⏱ Lock countdown
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    clearError();
    setUserFeedback({ type: "", message: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setUserFeedback({ type: "", message: "" });

    if (accountLocked) {
      setUserFeedback({
        type: "error",
        message: `Account locked. Try again in ${formatTime(
          lockTimeRemaining
        )}`,
      });
      return;
    }

    if (!formData.username.trim() || !formData.password) {
      setUserFeedback({
        type: "error",
        message: "Please enter both username and password",
      });
      return;
    }

    const result = await login(
      formData.username.trim(),
      formData.password
    );

    // ❌ LOGIN FAILED
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

      setUserFeedback({
        type: "error",
        message: result.error || "Invalid credentials",
      });
      return;
    }

    // ✅ LOGIN SUCCESS
    localStorage.removeItem("loginAttempts");
    setLoginAttempts(0);

    setUserFeedback({
      type: "success",
      message: result.isFirstLogin
        ? "First login detected. Please update your password."
        : "Login successful! Redirecting...",
    });

    setTimeout(() => {
      // 🔐 FIRST LOGIN LOGIC (REQUIRED)
      if (result.isFirstLogin) {
        navigate("/change-password");
        return;
      }

      // 🧭 NORMAL ROUTING
      navigate(
        result.user.role === "ADMIN" || result.user.role === "HR"
          ? "/admin/dashboard"
          : "/trainer/dashboard"
      );
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">
          TrainerSync Login
        </h1>

        {userFeedback.message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              userFeedback.type === "error"
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {userFeedback.message}
          </div>
        )}

        {error && !userFeedback.message && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            disabled={loading || accountLocked}
            className="w-full p-3 border rounded-lg"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading || accountLocked}
            className="w-full p-3 border rounded-lg"
          />

          <button
            disabled={loading || accountLocked}
            className="w-full py-3 bg-blue-600 text-white rounded-lg"
          >
            {loading ? "Checking credentials..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
